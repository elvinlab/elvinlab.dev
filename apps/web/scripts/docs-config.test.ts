import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { extractBlock, renderTable, replaceBlock, schemaRows } from './docs-config.ts';

const json = (schema: z.ZodType) => z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });

describe('schemaRows', () => {
  it('lists leaves with dotted paths, types, required flag and description', () => {
    const { rows, undocumented } = schemaRows(
      json(
        z.object({
          title: z.string().max(80).describe('The title.'),
          year: z.int().min(1970).describe('A year.'),
          draft: z.boolean().default(false).describe('Hidden when true.'),
          note: z.string().optional().describe('Optional text.'),
        }),
      ),
    );
    expect(undocumented).toEqual([]);
    expect(rows.map((row) => [row.path, row.type, row.required, row.default])).toEqual([
      ['title', 'string (max 80)', 'yes', ''],
      ['year', 'integer (min 1970)', 'yes', ''],
      ['draft', 'boolean', 'no', 'false'],
      ['note', 'string', 'no', ''],
    ]);
  });

  it('flattens nested objects and arrays of objects', () => {
    const { rows } = schemaRows(
      json(
        z.object({
          identity: z
            .object({ name: z.string().describe('Full name.') })
            .describe('Who the site is about.'),
          socials: z
            .array(z.object({ label: z.string().describe('Link text.') }))
            .describe('Social links.'),
        }),
      ),
    );
    expect(rows.map((row) => row.path)).toEqual([
      'identity',
      'identity.name',
      'socials',
      'socials[].label',
    ]);
  });

  it('renders enums, localized text maps, tag lists and URLs readably', () => {
    const { rows } = schemaRows(
      json(
        z.object({
          kind: z.enum(['degree', 'certificate']).describe('Kind.'),
          bio: z.record(z.string(), z.string()).describe('Text per locale.'),
          tags: z.array(z.string()).max(5).default([]).describe('Tags.'),
          url: z.url({ protocol: /^https$/ }).describe('A link.'),
        }),
      ),
    );
    const byPath = Object.fromEntries(rows.map((row) => [row.path, row.type]));
    expect(byPath['kind']).toBe("'degree' | 'certificate'");
    expect(byPath['bio']).toBe('{ <locale>: string }');
    expect(byPath['tags']).toBe('string[] (max 5)');
    expect(byPath['url']).toBe('URL');
  });

  it('shows ISO dates as YYYY-MM-DD', () => {
    const { rows } = schemaRows(json(z.object({ updated: z.iso.date().describe('When.') })));
    expect(rows[0]?.type).toBe('date (YYYY-MM-DD)');
  });

  it('uses an explicit x-type for types JSON Schema cannot express (dates, images)', () => {
    const { rows } = schemaRows(
      json(
        z.object({
          pubDate: z.coerce.date().meta({ description: 'When.', 'x-type': 'date (YYYY-MM-DD)' }),
        }),
      ),
    );
    expect(rows[0]?.type).toBe('date (YYYY-MM-DD)');
  });

  it('reports every field that has no description', () => {
    const { undocumented } = schemaRows(
      json(
        z.object({
          ok: z.string().describe('Documented.'),
          missing: z.string(),
          group: z.object({ inner: z.string() }),
        }),
      ),
    );
    expect(undocumented).toEqual(['missing', 'group', 'group.inner']);
  });
});

describe('renderTable', () => {
  it('renders a Markdown table and escapes pipes inside cells', () => {
    const table = renderTable([
      { path: 'a', type: "'x' | 'y'", required: 'yes', default: '', description: 'Pick one.' },
    ]);
    expect(table).toBe(
      [
        '| Key | Type | Required | Default | Description |',
        '| --- | --- | --- | --- | --- |',
        "| `a` | `'x' \\| 'y'` | yes |  | Pick one. |",
      ].join('\n'),
    );
  });
});

describe('doc blocks', () => {
  const doc = 'intro\n<!-- docs:start one -->\nold\n<!-- docs:end one -->\noutro\n';

  it('extracts a block by id', () => {
    expect(extractBlock(doc, 'one')).toBe('old');
    expect(extractBlock(doc, 'two')).toBeNull();
  });

  it('replaces only the block content and leaves the rest alone', () => {
    expect(replaceBlock(doc, 'one', 'new\nlines')).toBe(
      'intro\n<!-- docs:start one -->\nnew\nlines\n<!-- docs:end one -->\noutro\n',
    );
  });

  it('refuses to replace a block that does not exist', () => {
    expect(() => replaceBlock(doc, 'two', 'x')).toThrow(/two/);
  });
});
