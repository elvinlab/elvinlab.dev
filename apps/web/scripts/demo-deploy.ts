/**
 * Builds the generic demo site (fictional author, sample notes, no secrets) in an isolated workspace
 * and, with `--deploy`, publishes it to its own Worker (`demo/wrangler.jsonc`). Run via
 * `pnpm demo:deploy [--deploy]`. Without `--deploy` it only builds and checks for owner strings.
 * Set `DEMO_URL` to the public address of the demo so canonical links and share cards point to it.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { createFixtureWorkspace } from './fixture-workspace.ts';

const source = resolve(import.meta.dirname, '../../..');
const demo = join(source, 'demo');
// Same owner tokens as the white-label check; `@elvinlab/core` and the theme ids are design-system names.
const OWNER = [/elvin/i, /gonz[aá]lez/i, /costa rica/i];
const DESIGN_SYSTEM = [/@elvinlab\/core/g, /elvinlab-(?:dark|light)/g];

const { values } = parseArgs({ options: { deploy: { type: 'boolean' } } });

function fail(message: string): never {
  console.error(`demo-deploy: ${message}`);
  process.exit(1);
}

function collectText(dir: string): string {
  let text = '';
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) text += collectText(path);
    else if (/\.(?:html|webmanifest|txt|xml)$/.test(entry.name)) text += readFileSync(path, 'utf8');
  }
  return text;
}

const workspace = createFixtureWorkspace(source, join(demo, 'notes'));
try {
  cpSync(join(demo, 'site.config.ts'), join(workspace.web, 'src/site.config.ts'));
  cpSync(join(demo, 'wrangler.jsonc'), join(workspace.web, 'wrangler.jsonc'));
  // The owner's identity-bearing content never reaches the demo.
  for (const file of ['experiments', 'credentials', 'changelog', 'releases']) {
    writeFileSync(join(workspace.web, `src/content/${file}.json`), '{}\n');
  }

  const astro = join(realpathSync(join(source, 'apps/web/node_modules/astro')), 'bin/astro.mjs');
  const build = spawnSync(process.execPath, [astro, 'build'], {
    cwd: workspace.web,
    stdio: 'inherit',
    env: { ...process.env, SITE_INDEXABLE: 'true' },
  });
  if (build.status !== 0) fail('the demo build failed.');

  const text = DESIGN_SYSTEM.reduce(
    (acc, token) => acc.replace(token, ''),
    collectText(join(workspace.web, 'dist/client')),
  );
  if (!text.includes('Jane Doe')) fail('the demo identity did not render.');
  const leaked = OWNER.filter((token) => token.test(text));
  if (leaked.length > 0) fail(`owner strings leaked into the demo: ${leaked.join(', ')}`);
  console.log('✓ demo built, no owner strings in the output.');

  if (!values.deploy) {
    console.log('Build only. Pass --deploy to publish it (needs `wrangler login`).');
  } else {
    const wrangler = join(
      realpathSync(join(source, 'apps/web/node_modules/wrangler')),
      'bin/wrangler.js',
    );
    const deploy = spawnSync(process.execPath, [wrangler, 'deploy'], {
      cwd: workspace.web,
      stdio: 'inherit',
    });
    if (deploy.status !== 0) fail('wrangler deploy failed.');
  }
} finally {
  workspace.cleanup();
}
