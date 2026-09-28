/**
 * Regenerates `src/tokens/tokens.css` from `src/tokens/tokens.json`.
 * Run with `pnpm --filter @elvinlab/core tokens`; a unit test fails when the two drift apart.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { renderTokensCss } from '../src/tokens/render-css.ts';
import { parseTokens } from '../src/tokens/schema.ts';

const source = new URL('../src/tokens/tokens.json', import.meta.url);
const target = new URL('../src/tokens/tokens.css', import.meta.url);

writeFileSync(target, renderTokensCss(parseTokens(JSON.parse(readFileSync(source, 'utf8')))));
console.log(`wrote ${target.pathname}`);
