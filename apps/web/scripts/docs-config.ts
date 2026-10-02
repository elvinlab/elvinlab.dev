/**
 * Pure helpers of the configuration-docs generator: JSON Schema (from zod's `toJSONSchema`) to
 * Markdown tables, and the `<!-- docs:start id -->` blocks of the guides. The runner is
 * `generate-config-docs.ts` (`pnpm docs:config`); a test fails when the guides drift from the code.
 */

type JsonSchema = {
  type?: string | string[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  additionalProperties?: JsonSchema | boolean;
  enum?: unknown[];
  anyOf?: JsonSchema[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  maxItems?: number;
  default?: unknown;
  'x-type'?: string;
};

export type DocRow = {
  path: string;
  type: string;
  required: string;
  default: string;
  description: string;
};

const SAFE_INTEGER_LIMIT = 9_000_000_000_000_000;

function constraints(node: JsonSchema): string {
  const parts: string[] = [];
  if (node.minimum !== undefined && Math.abs(node.minimum) < SAFE_INTEGER_LIMIT) {
    parts.push(`min ${node.minimum}`);
  }
  if (node.maximum !== undefined && Math.abs(node.maximum) < SAFE_INTEGER_LIMIT) {
    parts.push(`max ${node.maximum}`);
  }
  if (node.maxLength !== undefined) parts.push(`max ${node.maxLength}`);
  if (node.maxItems !== undefined) parts.push(`max ${node.maxItems}`);
  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

function typeOf(node: JsonSchema): string {
  if (node['x-type']) return node['x-type'];
  if (node.enum) return node.enum.map((value) => `'${String(value)}'`).join(' | ');
  if (node.anyOf) return node.anyOf.map(typeOf).join(' | ');
  if (node.format === 'uri' || node.format === 'url') return 'URL';
  if (node.format === 'date') return 'date (YYYY-MM-DD)';
  switch (node.type) {
    case 'array':
      return `${node.items ? typeOf(node.items) : 'any'}[]${constraints(node)}`;
    case 'object':
      if (!node.properties && typeof node.additionalProperties === 'object') {
        return `{ <locale>: ${typeOf(node.additionalProperties)} }`;
      }
      return 'object';
    case 'string':
    case 'integer':
    case 'number':
    case 'boolean':
      return `${node.type}${constraints(node)}`;
    default:
      return 'any';
  }
}

const format = (value: unknown): string =>
  typeof value === 'string' ? value : JSON.stringify(value);

/** Every documented field of a schema, flattened with dotted paths, plus the undocumented ones. */
/** `schema` is the object `z.toJSONSchema(...)` returns (typed loosely at the boundary). */
export function schemaRows(schema: object): { rows: DocRow[]; undocumented: string[] } {
  const rows: DocRow[] = [];
  const undocumented: string[] = [];

  const add = (path: string, node: JsonSchema, required: boolean, type: string): void => {
    const description = node.description?.trim() ?? '';
    if (!description) undocumented.push(path);
    rows.push({
      path,
      type,
      required: required && node.default === undefined ? 'yes' : 'no',
      default: node.default === undefined ? '' : format(node.default),
      description,
    });
  };

  const walk = (node: JsonSchema, path: string, required: boolean): void => {
    if (node.properties) {
      if (path) add(path, node, required, 'object');
      for (const [key, child] of Object.entries(node.properties)) {
        walk(child, path ? `${path}.${key}` : key, node.required?.includes(key) ?? false);
      }
    } else if (node.type === 'array' && node.items?.properties) {
      add(path, node, required, `object[]${constraints(node)}`);
      for (const [key, child] of Object.entries(node.items.properties)) {
        walk(child, `${path}[].${key}`, node.items.required?.includes(key) ?? false);
      }
    } else {
      add(path, node, required, typeOf(node));
    }
  };

  walk(schema as JsonSchema, '', true);
  return { rows, undocumented };
}

const cell = (text: string): string => text.replaceAll('|', '\\|').replaceAll('\n', ' ');

export function renderTable(rows: readonly DocRow[]): string {
  return [
    '| Key | Type | Required | Default | Description |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(
      (row) =>
        `| \`${row.path}\` | \`${cell(row.type)}\` | ${row.required} | ${row.default ? `\`${cell(row.default)}\`` : ''} | ${cell(row.description)} |`,
    ),
  ].join('\n');
}

const start = (id: string): string => `<!-- docs:start ${id} -->`;
const end = (id: string): string => `<!-- docs:end ${id} -->`;

/** The content between a block's markers, without the surrounding newlines, or null. */
export function extractBlock(markdown: string, id: string): string | null {
  const from = markdown.indexOf(start(id));
  const to = markdown.indexOf(end(id));
  if (from === -1 || to === -1 || to < from) return null;
  return markdown
    .slice(from + start(id).length, to)
    .replace(/^\n/, '')
    .replace(/\n$/, '');
}

export function replaceBlock(markdown: string, id: string, content: string): string {
  const from = markdown.indexOf(start(id));
  const to = markdown.indexOf(end(id));
  if (from === -1 || to === -1 || to < from) {
    throw new Error(`docs block "${id}" not found (add its start and end markers)`);
  }
  return `${markdown.slice(0, from + start(id).length)}\n${content}\n${markdown.slice(to)}`;
}
