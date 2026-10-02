import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildDocBlocks,
  DEV_VARS_EXAMPLE_PATH,
  DOC_BLOCKS,
  devVarsExample,
  ENV_EXAMPLE_PATH,
  envExample,
  undocumentedFields,
} from './config-docs.ts';
import { extractBlock } from './docs-config.ts';

const root = resolve(import.meta.dirname, '../../..');
const HINT = 'Run `pnpm docs:config` to regenerate.';

describe('configuration docs', () => {
  it('has a description for every field of every schema', () => {
    expect(undocumentedFields(), 'add .describe() to these fields').toEqual([]);
  });

  const blocks = buildDocBlocks();

  for (const [file, ids] of Object.entries(DOC_BLOCKS)) {
    describe(file, () => {
      it('exists', () => {
        expect(existsSync(resolve(root, file)), `${file} is missing`).toBe(true);
      });

      for (const id of ids) {
        it(`block "${id}" is in sync with the code. ${HINT}`, () => {
          const path = resolve(root, file);
          const markdown = existsSync(path) ? readFileSync(path, 'utf8') : '';
          expect(extractBlock(markdown, id), `block "${id}" not found in ${file}`).toBe(blocks[id]);
        });
      }
    });
  }

  it(`${DEV_VARS_EXAMPLE_PATH} is in sync with ENV_VARS. ${HINT}`, () => {
    const path = resolve(root, DEV_VARS_EXAMPLE_PATH);
    expect(existsSync(path) ? readFileSync(path, 'utf8') : null).toBe(devVarsExample());
  });

  it(`${ENV_EXAMPLE_PATH} is in sync with ENV_VARS and lists only build variables. ${HINT}`, () => {
    const path = resolve(root, ENV_EXAMPLE_PATH);
    expect(existsSync(path) ? readFileSync(path, 'utf8') : null).toBe(envExample());
    expect(envExample()).toContain('PUBLIC_TURNSTILE_SITE_KEY');
    expect(envExample()).not.toContain('RESEND_API_KEY');
  });
});
