import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { chromium } from '@playwright/test';

const root = resolve(import.meta.dirname, '../../..');
const cli = join(root, 'node_modules/@lhci/cli/src/cli.js');

/** The URL paths requested with repeated `--url <path>` flags (none: audit every configured URL). */
function requestedPaths(args: string[]): string[] {
  return args.flatMap((arg, index) =>
    arg === '--url' && args[index + 1] ? [args[index + 1] as string] : [],
  );
}

/**
 * Writes a temporary copy of lighthouserc.json holding only the requested URLs (same host and port
 * as the file) and returns its path, or undefined to use the committed configuration unchanged.
 */
function filteredConfig(paths: string[], dir: string): string | undefined {
  if (paths.length === 0) return undefined;
  const config = JSON.parse(readFileSync(join(root, 'lighthouserc.json'), 'utf8')) as {
    ci: { collect: { url: string[] } };
  };
  const urls = config.ci.collect.url.filter((url) => paths.includes(new URL(url).pathname));
  const unknown = paths.filter((path) => !urls.some((url) => new URL(url).pathname === path));
  if (unknown.length > 0) throw new Error(`not in lighthouserc.json: ${unknown.join(', ')}`);
  config.ci.collect.url = urls;
  const file = join(dir, 'lighthouserc.json');
  writeFileSync(file, JSON.stringify(config, null, 2));
  return file;
}

const scratch = mkdtempSync(join(tmpdir(), 'lhci-'));
try {
  const config = filteredConfig(requestedPaths(process.argv.slice(2)), scratch);
  const result = spawnSync(
    process.execPath,
    [cli, 'autorun', ...(config ? [`--config=${config}`] : [])],
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
