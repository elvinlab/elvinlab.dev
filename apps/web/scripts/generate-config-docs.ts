/**
 * Regenerates the tables of the configuration guides (and `.dev.vars.example`) from the schemas
 * and the ENV_VARS registry. `pnpm docs:config` writes them; `--check` only reports drift (the
 * unit test does the same, so CI fails when a guide is out of date).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildDocBlocks,
  DEV_VARS_EXAMPLE_PATH,
  DOC_BLOCKS,
  devVarsExample,
  ENV_EXAMPLE_PATH,
  envExample,
  undocumentedFields,
} from './config-docs.ts';
import { extractBlock, replaceBlock } from './docs-config.ts';

const root = resolve(import.meta.dirname, '../../..');
const check = process.argv.includes('--check');

const undocumented = undocumentedFields();
if (undocumented.length > 0) {
  console.error(`✗ add .describe() to these fields:\n  - ${undocumented.join('\n  - ')}`);
  process.exit(1);
}

const blocks = buildDocBlocks();
const stale: string[] = [];
const missing: string[] = [];

for (const [file, ids] of Object.entries(DOC_BLOCKS)) {
  const path = resolve(root, file);
  if (!existsSync(path)) {
    missing.push(file);
    continue;
  }
  let markdown = readFileSync(path, 'utf8');
  for (const id of ids) {
    const expected = blocks[id] ?? '';
    if (extractBlock(markdown, id) === expected) continue;
    stale.push(`${file} [${id}]`);
    if (!check) markdown = replaceBlock(markdown, id, expected);
  }
  if (!check) writeFileSync(path, markdown);
}

for (const [relative, expected] of [
  [DEV_VARS_EXAMPLE_PATH, devVarsExample()],
  [ENV_EXAMPLE_PATH, envExample()],
] as const) {
  const examplePath = resolve(root, relative);
  const current = existsSync(examplePath) ? readFileSync(examplePath, 'utf8') : null;
  if (current === expected) continue;
  stale.push(relative);
  if (!check) writeFileSync(examplePath, expected);
}

if (missing.length > 0) {
  console.error(
    `✗ missing guides (create them with the docs:start/docs:end markers): ${missing.join(', ')}`,
  );
  process.exit(1);
}
if (check && stale.length > 0) {
  console.error(`✗ out of date, run \`pnpm docs:config\`:\n  - ${stale.join('\n  - ')}`);
  process.exit(1);
}
console.log(
  stale.length === 0 ? '✓ docs are up to date' : `✓ regenerated:\n  - ${stale.join('\n  - ')}`,
);
