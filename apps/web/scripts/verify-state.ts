/**
 * Fingerprints and the registry of `pnpm verify`. A check's fingerprint is the sha1 of the sorted
 * `path NUL contentHash` lines of every non-ignored file (tracked or untracked) in its scope, so
 * it depends on content only, never on commits, amends, rebases or time. Git is injectable.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { type CheckDef, inScope, matchesAny } from './verification-map.ts';

export interface FingerprintIo {
  /** Every non-ignored file of the repository, relative to the root (deleted files excluded). */
  list(): string[];
  /** Content hashes, in the order of the given paths. */
  hash(paths: readonly string[]): string[];
}

export interface RegistryEntry {
  readonly fingerprint: string;
  readonly recordedAt: string;
  readonly result: 'pass';
}

export interface Registry {
  readonly version: 1;
  readonly checks: Readonly<Record<string, RegistryEntry>>;
}

export const EMPTY_REGISTRY: Registry = { version: 1, checks: {} };

/**
 * Fingerprints of several checks, hashing each file once. The optional `wide` globs name the
 * FULL-wide files (dependencies, toolchain, this tool): they belong to no check's scope, but a change
 * to any of them invalidates every check, so they are part of every fingerprint.
 */
export function computeFingerprints(
  checks: readonly CheckDef[],
  io: FingerprintIo,
  wide: readonly string[] = [],
): Record<string, string> {
  const files = io.list();
  const wideFiles = wide.length > 0 ? files.filter((f) => matchesAny(f, wide)) : [];
  const perCheck = new Map(
    checks.map((check) => [
      check.id,
      [...new Set([...files.filter((f) => inScope(check, f)), ...wideFiles])],
    ]),
  );
  const needed = [...new Set([...perCheck.values()].flat())].sort();
  const hashes = io.hash(needed);
  if (hashes.length !== needed.length) throw new Error('could not fingerprint every file');
  const hashOf = new Map(needed.map((path, index) => [path, hashes[index] ?? '']));
  const result: Record<string, string> = {};
  for (const [id, scoped] of perCheck) {
    const digest = createHash('sha1');
    for (const path of [...scoped].sort()) digest.update(`${path}\0${hashOf.get(path)}\n`);
    result[id] = digest.digest('hex');
  }
  return result;
}

/** Ids whose current fingerprint differs from the registry (a missing entry is stale). */
export function staleIds(
  checks: readonly CheckDef[],
  current: Readonly<Record<string, string>>,
  registry: Registry,
): Set<string> {
  return new Set(
    checks
      .filter((check) => registry.checks[check.id]?.fingerprint !== current[check.id])
      .map((check) => check.id),
  );
}

export function readRegistry(path: string): Registry {
  if (!existsSync(path)) return EMPTY_REGISTRY;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<Registry>;
    if (parsed.version === 1 && parsed.checks && typeof parsed.checks === 'object') {
      return { version: 1, checks: parsed.checks };
    }
  } catch {
    // A corrupt registry means everything is stale, never a crash.
  }
  return EMPTY_REGISTRY;
}

export function writeRegistry(path: string, registry: Registry): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(registry, null, 2)}\n`);
}

/** The real git-backed lister and hasher, run from the repository root. */
export function gitIo(root: string): FingerprintIo {
  return {
    list() {
      const out = execFileSync(
        'git',
        ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
        { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
      );
      return [...new Set(out.split('\0').filter(Boolean))].filter((path) =>
        existsSync(`${root}/${path}`),
      );
    },
    hash(paths) {
      if (paths.length === 0) return [];
      const out = execFileSync('git', ['hash-object', '--stdin-paths'], {
        cwd: root,
        encoding: 'utf8',
        input: `${paths.join('\n')}\n`,
        maxBuffer: 64 * 1024 * 1024,
      });
      return out.split('\n').filter(Boolean);
    },
  };
}
