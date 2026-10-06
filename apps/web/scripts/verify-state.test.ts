import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { CheckDef } from './verification-map.ts';
import {
  computeFingerprints,
  EMPTY_REGISTRY,
  readRegistry,
  staleIds,
  writeRegistry,
} from './verify-state.ts';

const check = (id: string, scope: string[]): CheckDef => ({
  id,
  kind: 'family',
  label: id,
  scope,
  exclude: [],
  responsive: false,
});
const checks = [check('a', ['src/a/**']), check('b', ['src/b/**'])];

function io(files: Record<string, string>) {
  return {
    list: () => Object.keys(files),
    hash: (paths: readonly string[]) => paths.map((path) => `h:${files[path]}`),
  };
}

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('computeFingerprints', () => {
  const base = { 'src/a/x.ts': '1', 'src/b/y.ts': '2', 'docs/z.md': '3' };

  it('gives the same fingerprint for the same content, whatever the order', () => {
    const one = computeFingerprints(checks, io(base));
    const reversed = computeFingerprints(
      checks,
      io(Object.fromEntries(Object.entries(base).reverse())),
    );
    expect(reversed).toEqual(one);
  });

  it('changes when a byte inside the scope changes, or a file is added', () => {
    const one = computeFingerprints(checks, io(base));
    const edited = computeFingerprints(checks, io({ ...base, 'src/a/x.ts': '9' }));
    const added = computeFingerprints(checks, io({ ...base, 'src/a/new.ts': '1' }));
    expect(edited['a']).not.toBe(one['a']);
    expect(added['a']).not.toBe(one['a']);
  });

  it('does not change for edits outside the scope', () => {
    const one = computeFingerprints(checks, io(base));
    const edited = computeFingerprints(checks, io({ ...base, 'src/a/x.ts': '9' }));
    expect(edited['b']).toBe(one['b']);
    expect(computeFingerprints(checks, io({ ...base, 'docs/z.md': 'x' }))).toEqual(one);
  });

  it('drops deleted files from the fingerprint', () => {
    const one = computeFingerprints(checks, io(base));
    const { 'src/a/x.ts': _gone, ...rest } = base;
    expect(computeFingerprints(checks, io(rest))['a']).not.toBe(one['a']);
  });
});

describe('registry', () => {
  it('treats a missing registry as everything stale', () => {
    const dir = mkdtempSync(join(tmpdir(), 'verify-state-'));
    dirs.push(dir);
    const registry = readRegistry(join(dir, 'missing.json'));
    expect(registry).toEqual(EMPTY_REGISTRY);
    expect(staleIds(checks, { a: 'x', b: 'y' }, registry)).toEqual(new Set(['a', 'b']));
  });

  it('round-trips and reports only the changed checks as stale', () => {
    const dir = mkdtempSync(join(tmpdir(), 'verify-state-'));
    dirs.push(dir);
    const file = join(dir, 'state.json');
    writeRegistry(file, {
      version: 1,
      checks: {
        a: { fingerprint: 'x', recordedAt: '2026-10-05T00:00:00.000Z', result: 'pass' },
        b: { fingerprint: 'old', recordedAt: '2026-10-05T00:00:00.000Z', result: 'pass' },
      },
    });
    const registry = readRegistry(file);
    expect(registry.checks['a']?.fingerprint).toBe('x');
    expect(staleIds(checks, { a: 'x', b: 'new' }, registry)).toEqual(new Set(['b']));
  });

  it('falls back to an empty registry on a corrupt file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'verify-state-'));
    dirs.push(dir);
    const file = join(dir, 'bad.json');
    writeFileSync(file, '{ not json');
    expect(readRegistry(file)).toEqual(EMPTY_REGISTRY);
  });
});
