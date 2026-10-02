import { type ChildProcess, spawn } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  createFixtureWorkspace,
  enableFixtureComments,
  enableFixtureNotice,
  neutralizeFixtureIntegrations,
  overrideFixtureAppearance,
} from './fixture-workspace.ts';

const source = resolve(import.meta.dirname, '../../..');
const workspace = createFixtureWorkspace(source, join(source, 'tests/fixtures/notes'));
enableFixtureComments(workspace.web);
enableFixtureNotice(workspace.web);
neutralizeFixtureIntegrations(workspace.web);
overrideFixtureAppearance(workspace.web, process.env['FIXTURE_APPEARANCE']);
const cli = join(realpathSync(join(source, 'apps/web/node_modules/astro')), 'bin/astro.mjs');
let child: ChildProcess | undefined;
let stopping = false;

const stop = (): void => {
  stopping = true;
  child?.kill('SIGTERM');
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

const run = (args: string[]): Promise<void> =>
  new Promise((accept, reject) => {
    child = spawn(process.execPath, [cli, ...args], {
      cwd: workspace.web,
      stdio: 'inherit',
      env: { ...process.env, SITE_INDEXABLE: 'true', PUBLIC_TURNSTILE_SITE_KEY: 'e2e-site-key' },
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0 || stopping) accept();
      else reject(new Error(`Astro ${args[0]} exited with ${code}`));
    });
  });

try {
  await run(['build']);
  // Astro auto-backgrounds under coding agents; Playwright must own a foreground server.
  if (!stopping)
    await run([
      'preview',
      '--ignore-lock',
      '--host',
      '127.0.0.1',
      '--port',
      process.argv[2] ?? '4322',
    ]);
} finally {
  workspace.cleanup();
}
