import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * `publish-note.ts` is a CLI that runs on import, so its local check sequence is asserted on the
 * source: it must stay the same as the `notes-gate` job of CI (ADR 0016), cheapest check first.
 */
const source = readFileSync(join(import.meta.dirname, 'publish-note.ts'), 'utf8');
const ci = readFileSync(join(import.meta.dirname, '../../../.github/workflows/ci.yml'), 'utf8');

const localChecks = [...source.matchAll(/run\('pnpm', \['(check:[a-z-]+)'\]\)/g)].map((m) => m[1]);

describe('publish-note local checks', () => {
  it('builds first, then runs the budgets and the built-output check, cheapest first', () => {
    const build = source.indexOf("run('pnpm', ['--filter', 'web', 'build'])");
    expect(build).toBeGreaterThan(-1);
    expect(localChecks).toEqual(['check:js-budget', 'check:page-weight', 'check:built-notes']);
    expect(source.indexOf("['check:js-budget']")).toBeGreaterThan(build);
  });

  it('runs every check of the CI notes-gate job that does not need a browser', () => {
    const gate = /notes-gate:[\s\S]*?\n {2}\S/.exec(ci)?.[0] ?? '';
    for (const check of localChecks) expect(gate).toContain(`pnpm ${check}`);
  });
});
