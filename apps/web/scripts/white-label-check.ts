/**
 * White-label build check (deferred from T09): builds the site in an isolated workspace with an
 * alternative identity and asserts no owner-specific string leaks into the HTML. Proves a new
 * developer can take over through config + content only. Run via `pnpm test:white-label`.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { createFixtureWorkspace } from './fixture-workspace.ts';

const source = resolve(import.meta.dirname, '../../..');
// Site-owner identity strings that white-label must remove from the output.
const OWNER = [/elvin/i, /gonz[aá]lez/i];
// Design-system identifiers are intentionally kept: `@elvinlab/core` is the shared design base
// others adopt (like a framework name), and the theme names come from its tokens.
const DESIGN_SYSTEM = [/@elvinlab\/core/g, /elvinlab-(?:dark|light)/g];

function fail(message: string): never {
  console.error(`✗ white-label: ${message}`);
  process.exit(1);
}

// Negative control: the tokens we search for really are owner strings present in the real config.
const realConfig = readFileSync(join(source, 'apps/web/src/site.config.ts'), 'utf8');
if (!OWNER.every((token) => token.test(realConfig))) {
  fail('owner tokens not found in the real site.config.ts — the check would be vacuous');
}

function collectHtml(dir: string): string {
  let html = '';
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) html += collectHtml(path);
    else if (entry.name.endsWith('.html')) html += readFileSync(path, 'utf8');
  }
  return html;
}

const workspace = createFixtureWorkspace(source, join(source, 'tests/fixtures/notes'));
try {
  // Swap identity (config) and identity-bearing content (experiments) for neutral fixtures.
  writeFileSync(
    join(workspace.web, 'src/site.config.ts'),
    readFileSync(join(source, 'tests/fixtures/site.config.alt.ts'), 'utf8'),
  );
  writeFileSync(join(workspace.web, 'src/content/experiments.json'), '{}\n');

  const cli = join(realpathSync(join(source, 'apps/web/node_modules/astro')), 'bin/astro.mjs');
  const build = spawnSync(process.execPath, [cli, 'build'], {
    cwd: workspace.web,
    stdio: 'inherit',
    env: { ...process.env, SITE_INDEXABLE: 'true' },
  });
  if (build.status !== 0) fail('the alternative-identity build failed');

  const rawHtml = collectHtml(join(workspace.web, 'dist/client'));
  if (!rawHtml.includes('Jane Doe') || !rawHtml.includes('janedoe')) {
    fail('the alternative identity did not render — the grep would be meaningless');
  }
  // Comments stay inert without a `giscus` block, even though the alternative config enables the flag.
  if (/<section[^>]*data-comments/.test(rawHtml)) {
    fail('comments rendered although the config has no giscus block');
  }
  // The reading mode is off in the alternative config: no toggle, exit button or stored key.
  if (
    /data-reading-(?:toggle|exit)|html\[data-reading\]|localStorage\.\w+Item\(['"]reading-mode['"]/.test(
      rawHtml,
    )
  ) {
    fail('the reading mode rendered although features.readingMode is off');
  }
  const html = DESIGN_SYSTEM.reduce((acc, token) => acc.replace(token, ''), rawHtml);
  const leaked = OWNER.filter((token) => token.test(html));
  if (leaked.length > 0) fail(`owner strings leaked into the build: ${leaked.join(', ')}`);

  console.log('✓ white-label: no owner strings in an alternative-identity build');
} finally {
  workspace.cleanup();
}
