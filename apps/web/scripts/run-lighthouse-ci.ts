import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { chromium } from '@playwright/test';

export interface Shard {
  index: number;
  total: number;
}

const root = resolve(import.meta.dirname, '../../..');
const cli = join(root, 'node_modules/@lhci/cli/src/cli.js');

/** The URL paths requested with repeated `--url <path>` flags (none: audit every configured URL). */
function requestedPaths(args: string[]): string[] {
  return args.flatMap((arg, index) =>
    arg === '--url' && args[index + 1] ? [args[index + 1] as string] : [],
  );
}

/**
 * Runs per URL from `--runs <n>`. Undefined keeps `numberOfRuns` of lighthouserc.json (3: CI and
 * `pnpm test:lighthouse`); `pnpm verify` passes 1 for the local loop. Thresholds never change.
 */
function requestedRuns(args: string[]): number | undefined {
  const index = args.indexOf('--runs');
  if (index === -1) return undefined;
  const runs = Number(args[index + 1]);
  if (!Number.isInteger(runs) || runs < 1) throw new Error('--runs needs a positive integer');
  return runs;
}

/**
 * The slice from `--shard N/M` (also `--shard=N/M`), or undefined to audit every URL. CI splits the
 * gate across machines with it; locally `pnpm test:lighthouse` runs everything. N and M must be
 * integers with 1 <= N <= M.
 */
export function parseShard(args: string[]): Shard | undefined {
  const index = args.findIndex((arg) => arg === '--shard' || arg.startsWith('--shard='));
  if (index === -1) return undefined;
  const arg = args[index] as string;
  const value = arg.startsWith('--shard=') ? arg.slice('--shard='.length) : args[index + 1];
  const match = /^(\d+)\/(\d+)$/.exec(value ?? '');
  const shard = match ? { index: Number(match[1]), total: Number(match[2]) } : undefined;
  if (!shard || shard.index < 1 || shard.index > shard.total) {
    throw new Error(`--shard needs N/M with integers 1 <= N <= M (got ${JSON.stringify(value)})`);
  }
  return shard;
}

/** Every `total`-th item (index modulo total, in order) belongs to shard `index` (1-based). */
export function selectShard<T>(items: T[], { index, total }: Shard): T[] {
  return items.filter((_, position) => position % total === index - 1);
}

/**
 * The URLs of `lighthouserc.json` whose pages exist for the feature set under test (this site's
 * `site.config.ts`, or an adopter profile from `E2E_FEATURE_PROFILE`): Lighthouse must not audit a
 * `/contact/` that an adopter turned off. The alias hook is registered here, and the modules that
 * need it are imported afterwards, so the command that CI and `pnpm verify` run stays as it is.
 */
async function liveUrls(urls: string[]): Promise<string[]> {
  await import('./register-alias.mjs');
  const [{ siteConfig }, { resolveE2eProfile }, profiles, { liveLighthouseUrls }] =
    await Promise.all([
      import('@/site.config.ts'),
      import('./e2e-features.ts'),
      import('./e2e-profiles.ts'),
      import('./lighthouse-pages.ts'),
    ]);
  const profile = resolveE2eProfile(
    profiles.withProfileFeatures(siteConfig, process.env[profiles.E2E_FEATURE_PROFILE_ENV]),
    { appearance: process.env['FIXTURE_APPEARANCE'] },
  );
  return liveLighthouseUrls(urls, profile);
}

/**
 * Writes a temporary copy of lighthouserc.json holding only the requested URLs (same host and port
 * as the file) and returns its path, or undefined to use the committed configuration unchanged.
 * `--url` paths win and ignore `--shard`; otherwise a shard keeps its slice of the configured list.
 * Pages the feature set under test does not build are dropped first. Each process writes into its
 * own scratch directory, so shards need no coordination.
 */
async function filteredConfig(
  paths: string[],
  shard: Shard | undefined,
  dir: string,
): Promise<string | undefined> {
  const config = JSON.parse(readFileSync(join(root, 'lighthouserc.json'), 'utf8')) as {
    ci: { collect: { url: string[] } };
  };
  const available = await liveUrls(config.ci.collect.url);
  if (paths.length === 0 && !shard && available.length === config.ci.collect.url.length) {
    return undefined;
  }
  let urls: string[];
  if (paths.length > 0) {
    urls = available.filter((url) => paths.includes(new URL(url).pathname));
    const unknown = paths.filter((path) => !urls.some((url) => new URL(url).pathname === path));
    if (unknown.length > 0) {
      throw new Error(
        `not in lighthouserc.json, or not built for this feature set: ${unknown.join(', ')}`,
      );
    }
  } else if (shard) {
    urls = selectShard(available, shard);
    if (urls.length === 0) throw new Error('this shard has no URLs (more shards than URLs)');
  } else {
    urls = available;
  }
  console.log(`lighthouse URLs: ${urls.join(' ')}`);
  config.ci.collect.url = urls;
  const file = join(dir, 'lighthouserc.json');
  writeFileSync(file, JSON.stringify(config, null, 2));
  return file;
}

async function main(): Promise<void> {
  const scratch = mkdtempSync(join(tmpdir(), 'lhci-'));
  try {
    const args = process.argv.slice(2);
    const config = await filteredConfig(requestedPaths(args), parseShard(args), scratch);
    const runs = requestedRuns(args);
    const result = spawnSync(
      process.execPath,
      [
        cli,
        'autorun',
        ...(config ? [`--config=${config}`] : []),
        ...(runs ? [`--collect.numberOfRuns=${runs}`] : []),
      ],
      {
        cwd: root,
        env: { ...process.env, CHROME_PATH: chromium.executablePath(), SITE_INDEXABLE: 'true' },
        stdio: 'inherit',
      },
    );

    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
