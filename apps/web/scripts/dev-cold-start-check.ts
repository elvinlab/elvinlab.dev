/**
 * Dev-server cold-start check: starts `astro dev` with an empty Vite cache in an isolated
 * workspace (never your own dev server) and visits the main routes once, like a first visitor.
 * It fails when Vite discovers a dependency late ("new dependencies found" / "reloading") or when
 * a page comes back blank, which is how the contact page used to behave on a first visit.
 * Run via `pnpm check:dev-cold-start` after changing dependencies. Set DEV_CHECK_STRIP_DEPS=1 to
 * remove the `optimizeDeps` block first: the check must then fail (negative control).
 */
import { type ChildProcess, spawn } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { chromium } from '@playwright/test';

import { createFixtureWorkspace } from './fixture-workspace.ts';

const PORT = 4397;
const ROUTES = ['/', '/notes/', '/notes/smoke-es/', '/contact/', '/me/', '/privacy/', '/terms/'];
const LATE_DEPENDENCY = /new dependencies found|optimized dependencies changed|program reload/i;

const source = resolve(import.meta.dirname, '../../..');
const workspace = createFixtureWorkspace(source, join(source, 'tests/fixtures/notes'));
let child: ChildProcess | undefined;
let log = '';

const finish = (code: number): never => {
  child?.kill('SIGTERM');
  workspace.cleanup();
  process.exit(code);
};

// The isolated workspace links `node_modules` to this checkout, so assets imported with `?url`
// (the preloaded fonts) resolve outside the workspace root, which Vite's dev server denies by
// default. A real clone keeps `node_modules` inside the project root and needs no such rule.
{
  const config = join(workspace.web, 'astro.config.ts');
  const original = readFileSync(config, 'utf8');
  const allowed = JSON.stringify([workspace.root, source]);
  const patched = original.replace(
    'plugins: [tailwindcss()],',
    `plugins: [tailwindcss()],\n    server: { fs: { allow: ${allowed} } },`,
  );
  if (patched === original) throw new Error('dev check: could not allow the linked node_modules');
  writeFileSync(config, patched);
}

if (process.env['DEV_CHECK_STRIP_DEPS'] === '1') {
  const config = join(workspace.web, 'astro.config.ts');
  const stripped = readFileSync(config, 'utf8').replace(
    /\n {4}optimizeDeps: \{[\s\S]*?\n {4}\},/,
    '',
  );
  writeFileSync(config, stripped);
}

const cli = join(realpathSync(join(source, 'apps/web/node_modules/astro')), 'bin/astro.mjs');
child = spawn(
  process.execPath,
  [cli, 'dev', '--port', String(PORT), '--host', '127.0.0.1', '--ignore-lock'],
  { cwd: workspace.web, env: { ...process.env, DEBUG: 'vite:deps', SITE_INDEXABLE: 'true' } },
);
child.stdout?.on('data', (chunk) => {
  log += chunk;
});
child.stderr?.on('data', (chunk) => {
  log += chunk;
});

async function waitForServer(): Promise<boolean> {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      await fetch(`http://127.0.0.1:${PORT}/`);
      return true;
    } catch {
      await new Promise((accept) => setTimeout(accept, 500));
    }
  }
  return false;
}

if (!(await waitForServer())) {
  console.error(`✗ dev cold start: the dev server did not start\n${log.slice(-600)}`);
  finish(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ reducedMotion: 'no-preference' });
const problems: string[] = [];
for (const route of ROUTES) {
  await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForTimeout(2500);
  const text = await page.evaluate(() => document.body?.innerText.length ?? 0);
  if (text === 0) problems.push(`${route} came back blank`);
}
await browser.close();

const late = log
  .split('\n')
  .map((line) => stripVTControlCharacters(line))
  .filter((line) => LATE_DEPENDENCY.test(line));
for (const line of late) problems.push(`Vite: ${line.slice(0, 160)}`);

if (problems.length > 0) {
  console.error(`✗ dev cold start:\n  - ${problems.join('\n  - ')}`);
  finish(1);
}
console.log(`✓ dev cold start: ${ROUTES.length} routes rendered with no late dependency discovery`);
finish(0);
