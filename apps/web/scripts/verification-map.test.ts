import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CHECKS,
  EMPTY_SCOPE_OK,
  inScope,
  matchesAny,
  UNMAPPED_OK,
  WIDE,
} from './verification-map.ts';

const root = resolve(import.meta.dirname, '../../..');
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);

describe('verification map drift guards', () => {
  it('has unique check ids', () => {
    const ids = CHECKS.map((check) => check.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every browser spec an e2e check, or lists it as unmapped on purpose', () => {
    const specs = files.filter((file) => /^tests\/browser\/[^/]+\.spec\.ts$/.test(file));
    const mapped = new Set(CHECKS.flatMap((check) => (check.spec ? [check.spec] : [])));
    const missing = specs.filter((spec) => !mapped.has(spec) && !UNMAPPED_OK.includes(spec));
    expect(missing).toEqual([]);
  });

  it('points every e2e check at an existing spec', () => {
    const missing = CHECKS.flatMap((check) =>
      check.spec && !files.includes(check.spec) ? [check.spec] : [],
    );
    expect(missing).toEqual([]);
  });

  it('only lists Lighthouse URLs that exist in lighthouserc.json, and all of them', () => {
    const rc = JSON.parse(readFileSync(resolve(root, 'lighthouserc.json'), 'utf8')) as {
      ci: { collect: { url: string[] } };
    };
    const paths = rc.ci.collect.url.map((url) => new URL(url).pathname);
    const mapped = CHECKS.flatMap((check) => (check.urlPath ? [check.urlPath] : []));
    expect(mapped.filter((path) => !paths.includes(path))).toEqual([]);
    expect(paths.filter((path) => !mapped.includes(path))).toEqual([]);
  });

  it('never has an empty scope glob, so a renamed folder cannot silently drop coverage', () => {
    const globs = new Set([...CHECKS.flatMap((check) => check.scope), ...WIDE]);
    const empty = [...globs].filter(
      (glob) => !EMPTY_SCOPE_OK.includes(glob) && !files.some((file) => matchesAny(file, [glob])),
    );
    expect(empty).toEqual([]);
  });

  it('keeps every scope meaningful after its excludes', () => {
    const empty = CHECKS.filter((check) => !files.some((file) => inScope(check, file))).map(
      (check) => check.id,
    );
    expect(empty).toEqual([]);
  });
});
