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

// Owner text of the "Now" card: the alternative config has no `now` block, so none of it may render.
const NOW_FOCUS = ['Optimizar IA y proyectos personales', 'Optimizing AI and personal projects'];

// Negative control: the tokens we search for really are owner strings present in the real config.
const realConfig = readFileSync(join(source, 'apps/web/src/site.config.ts'), 'utf8');
if (!OWNER.every((token) => token.test(realConfig))) {
  fail('owner tokens not found in the real site.config.ts — the check would be vacuous');
}

if (!NOW_FOCUS.every((text) => realConfig.includes(text))) {
  fail('the Now card text is not in the real site.config.ts — the check would be vacuous');
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

function collectServerText(dir: string): string {
  let text = '';
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) text += collectServerText(path);
    else if (/\.(?:mjs|js|json)$/.test(entry.name)) text += readFileSync(path, 'utf8');
  }
  return text;
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

  // The owner's notify endpoint is a server route: with `features.subscribe` off it must not exist.
  if (collectServerText(join(workspace.web, 'dist/server')).includes('/api/subscribe/')) {
    fail('the /api/subscribe/ endpoint exists although features.subscribe is off');
  }

  const rawHtml = collectHtml(join(workspace.web, 'dist/client'));
  if (!rawHtml.includes('Jane Doe') || !rawHtml.includes('janedoe')) {
    fail('the alternative identity did not render — the grep would be meaningless');
  }
  // Comments stay inert without a `giscus` block, even though the alternative config enables the flag.
  if (/<section[^>]*data-comments/.test(rawHtml)) {
    fail('comments rendered although the config has no giscus block');
  }
  // `features.marks` is off in the alternative config: no footprint markup, icon sprite or inline CSS.
  if (/data-marks|marks-footprint|@keyframes marks-/.test(rawHtml)) {
    fail('the footprint button (markup, icon or CSS) rendered although features.marks is off');
  }
  // The reading mode is off in the alternative config: no toggle, exit button or stored key.
  if (
    /data-reading-(?:toggle|exit)|html\[data-reading\]|localStorage\.\w+Item\(['"]reading-mode['"]/.test(
      rawHtml,
    )
  ) {
    fail('the reading mode rendered although features.readingMode is off');
  }
  // No `now` block in the alternative config: the card renders nothing, not even an empty wrapper.
  if (/data-now-card/.test(rawHtml) || NOW_FOCUS.some((text) => rawHtml.includes(text))) {
    fail('the Now card rendered although the config has no `now` block');
  }
  // The owner's images live in `src/assets` and are named by `identity.avatar` / `identity.photo`.
  // The alternative config names none, so no page may reference them (the raw files still reach
  // `_astro/` because the eager asset glob emits every image of the folder; a fork replaces them).
  if (/_astro\/(?:photo|avatar)\./.test(rawHtml)) {
    fail('a page of the alternative-identity build references an owner image (photo or avatar)');
  }
  const html = DESIGN_SYSTEM.reduce((acc, token) => acc.replace(token, ''), rawHtml);
  const leaked = OWNER.filter((token) => token.test(html));
  if (leaked.length > 0) fail(`owner strings leaked into the build: ${leaked.join(', ')}`);

  console.log('✓ white-label: no owner strings in an alternative-identity build');
} finally {
  workspace.cleanup();
}
