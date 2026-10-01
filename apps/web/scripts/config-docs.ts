/**
 * Everything the configuration guides generate from code: the reference tables (from the zod
 * schemas and the ENV_VARS registry) and `.dev.vars.example`. Shared by the runner
 * (`generate-config-docs.ts`, `pnpm docs:config`) and the test that fails when the guides drift.
 */
import { z } from 'zod';

import { changelogSchema } from '@/features/changelog/schema.ts';
import { credentialSchema } from '@/features/credentials/schema.ts';
import { experienceSchema } from '@/features/me/schema.ts';
import { noteSchema } from '@/features/notes/schema.ts';
import { experimentSchema } from '@/features/portfolio/schema.ts';
import { ENV_VARS } from '@/shared/config/env-vars.ts';
import { siteConfigSchema } from '@/shared/config/schema.ts';

import { type DocRow, renderTable, schemaRows } from './docs-config.ts';

const json = (schema: z.ZodType): object =>
  z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });

/** Astro's `image()` helper, stood in for here: the docs only need the field to exist. */
const imageStub = () => z.string();

const SCHEMAS: Record<string, z.ZodType> = {
  'site-config': siteConfigSchema,
  'note-frontmatter': noteSchema(imageStub),
  experience: experienceSchema() as unknown as z.ZodType,
  credentials: credentialSchema(),
  experiments: experimentSchema(),
  changelog: changelogSchema(),
};

/** Fields without a description, as `block: path`; the test requires this to be empty. */
export function undocumentedFields(): string[] {
  return Object.entries(SCHEMAS).flatMap(([id, schema]) =>
    schemaRows(json(schema)).undocumented.map((path) => `${id}: ${path}`),
  );
}

function envTable(): string {
  const rows: DocRow[] = [];
  const header =
    '| Name | Where | Secret | Required | Description | Set it in |\n| --- | --- | --- | --- | --- | --- |';
  const scope = {
    build: 'build',
    worker: 'Worker (runtime)',
    ci: 'CI',
    local: 'local tooling',
  } as const;
  for (const variable of ENV_VARS) {
    rows.push({
      path: variable.name,
      type: scope[variable.scope],
      required: variable.secret ? 'yes' : 'no',
      default: variable.required ? 'yes' : 'no',
      description: `${variable.description}|${variable.setIn}`,
    });
  }
  const body = rows.map((row) => {
    const [description = '', setIn = ''] = row.description.split('|');
    return `| \`${row.path}\` | ${row.type} | ${row.required} | ${row.default} | ${description} | ${setIn} |`;
  });
  return [header, ...body].join('\n');
}

/** Contents of `apps/web/.dev.vars.example`: the Worker variables for local development. */
export function devVarsExample(): string {
  const lines = [
    '# Local Worker variables for `pnpm --filter web dev`. Copy to `.dev.vars` (git-ignored) and fill in.',
    '# Generated from ENV_VARS by `pnpm docs:config`: edit src/shared/config/env-vars.ts, not this file.',
    '# Never commit real values; in production these are Cloudflare Worker secrets.',
    '',
  ];
  for (const variable of ENV_VARS.filter((entry) => entry.scope === 'worker')) {
    lines.push(`# ${variable.description}`, `${variable.name}=`, '');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

/** Contents of `apps/web/.env.example`: the optional build-time variables for local work. */
export function envExample(): string {
  const lines = [
    '# Optional build-time variables. Copy to `.env` (git-ignored) only when you need an override.',
    '# Generated from ENV_VARS by `pnpm docs:config`: edit src/shared/config/env-vars.ts, not this file.',
    '',
  ];
  for (const variable of ENV_VARS.filter((entry) => entry.scope === 'build')) {
    lines.push(`# ${variable.description}`, `# ${variable.name}=`, '');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

/** Every generated block, by id. */
export function buildDocBlocks(): Record<string, string> {
  const blocks: Record<string, string> = {};
  for (const [id, schema] of Object.entries(SCHEMAS)) {
    blocks[id] = renderTable(schemaRows(json(schema)).rows);
  }
  blocks['env-vars'] = envTable();
  blocks['dev-vars-example'] = `\`\`\`ini\n${devVarsExample().trimEnd()}\n\`\`\``;
  return blocks;
}

/** Which guide holds which blocks (the Spanish and English guides share the same generated tables). */
export const DOC_BLOCKS: Record<string, string[]> = {
  'docs/CONFIGURATION.md': [
    'site-config',
    'experience',
    'credentials',
    'experiments',
    'changelog',
    'env-vars',
    'dev-vars-example',
  ],
  'docs/CONFIGURATION.en.md': [
    'site-config',
    'experience',
    'credentials',
    'experiments',
    'changelog',
    'env-vars',
    'dev-vars-example',
  ],
  'docs/NOTES.md': ['note-frontmatter'],
  'docs/NOTES.en.md': ['note-frontmatter'],
};

export const DEV_VARS_EXAMPLE_PATH = 'apps/web/.dev.vars.example';
export const ENV_EXAMPLE_PATH = 'apps/web/.env.example';
