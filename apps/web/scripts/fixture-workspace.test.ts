import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, expect, it } from 'vitest';

import {
  createFixtureWorkspace,
  enableFixtureComments,
  enableFixtureNotice,
  enableFixtureSubscribe,
  neutralizeFixtureIntegrations,
  overrideFixtureAppearance,
} from './fixture-workspace.ts';

const temporary: string[] = [];
afterEach(() => {
  for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function write(root: string, path: string, content = '{}'): void {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function sourceWorkspace(): string {
  const root = mkdtempSync(join(tmpdir(), 'fixture-source-'));
  temporary.push(root);
  for (const path of [
    '.gitignore',
    'package.json',
    'tsconfig.base.json',
    'apps/web/package.json',
    'apps/web/tsconfig.json',
    'apps/web/astro.config.ts',
    'apps/web/wrangler.jsonc',
    'apps/web/public/favicon.svg',
    'apps/web/src/site.config.ts',
    'packages/core/package.json',
    'packages/core/tsconfig.json',
    'packages/core/src/tokens/tokens.json',
    'node_modules/external/index.js',
    'apps/web/node_modules/@astrojs/mdx/index.js',
    'apps/web/node_modules/@elvinlab/core/index.js',
    'packages/core/node_modules/zod/index.js',
    'fixtures/smoke-es/index.mdx',
  ])
    write(root, path);
  return root;
}

it('copies current source and fixtures without copying drafts, secrets or output', () => {
  const source = sourceWorkspace();
  for (const path of [
    '.env',
    'apps/web/.dev.vars',
    'apps/web/dist/index.html',
    'apps/web/src/content/drafts/private/index.mdx',
  ])
    write(source, path, 'private');
  write(source, 'apps/web/src/site.config.ts', 'current uncommitted configuration');
  const workspace = createFixtureWorkspace(source, join(source, 'fixtures'));
  temporary.push(workspace.root);
  expect(readFileSync(join(workspace.web, 'src/site.config.ts'), 'utf8')).toBe(
    'current uncommitted configuration',
  );
  expect(existsSync(join(workspace.web, 'src/content/notes/smoke-es/index.mdx'))).toBe(true);
  for (const path of [
    '.env',
    'apps/web/.dev.vars',
    'apps/web/dist',
    'apps/web/src/content/drafts',
  ]) {
    expect(existsSync(join(workspace.root, path))).toBe(false);
  }
  expect(existsSync(join(source, 'apps/web/src/content/notes/smoke-es/index.mdx'))).toBe(false);
});

it('builds with only the fixture notes, never the published ones', () => {
  const source = sourceWorkspace();
  write(source, 'apps/web/src/content/notes/real-note/index.mdx', 'published by the owner');
  const workspace = createFixtureWorkspace(source, join(source, 'fixtures'));
  temporary.push(workspace.root);
  expect(existsSync(join(workspace.web, 'src/content/notes/smoke-es/index.mdx'))).toBe(true);
  expect(existsSync(join(workspace.web, 'src/content/notes/real-note'))).toBe(false);
  workspace.cleanup();
});

it('copies the root .gitignore: without it the build inlines the site stylesheet twice', () => {
  const source = sourceWorkspace();
  write(source, '.gitignore', 'node_modules/\ndist/\n');
  const workspace = createFixtureWorkspace(source, join(source, 'fixtures'));
  temporary.push(workspace.root);
  expect(readFileSync(join(workspace.root, '.gitignore'), 'utf8')).toBe('node_modules/\ndist/\n');
  workspace.cleanup();
});

it('links external dependencies but keeps the copied core independent of the source', () => {
  const source = sourceWorkspace();
  const workspace = createFixtureWorkspace(source, join(source, 'fixtures'));
  temporary.push(workspace.root);
  expect(realpathSync(join(workspace.web, 'node_modules/@astrojs/mdx'))).toBe(
    join(source, 'apps/web/node_modules/@astrojs/mdx'),
  );
  expect(realpathSync(join(workspace.web, 'node_modules/@elvinlab/core'))).toBe(
    join(workspace.root, 'packages/core'),
  );
  write(workspace.root, 'packages/core/src/tokens/tokens.json', 'replacement');
  expect(readFileSync(join(source, 'packages/core/src/tokens/tokens.json'), 'utf8')).toBe('{}');
  workspace.cleanup();
  expect(existsSync(workspace.root)).toBe(false);
  expect(existsSync(source)).toBe(true);
});

function webWithConfig(config: string): string {
  const web = mkdtempSync(join(tmpdir(), 'fixture-web-'));
  temporary.push(web);
  write(web, 'src/site.config.ts', config);
  return web;
}

it('injects the fixture giscus block, replacing any real one', () => {
  const web = webWithConfig(
    "export const siteConfig = {\n  giscus: { repo: 'real/repo', repoId: 'R_real', category: 'C', categoryId: 'D_real' },\n  features: { comments: true },\n};\n",
  );
  enableFixtureComments(web);
  const config = readFileSync(join(web, 'src/site.config.ts'), 'utf8');
  expect(config).toContain("repo: 'fixture/fixture'");
  expect(config).not.toContain('real/repo');
  expect(config.match(/giscus:/g)).toHaveLength(1);
});

it('fails loudly when the config has no features block to anchor on', () => {
  const web = webWithConfig('export const siteConfig = {};\n');
  expect(() => enableFixtureComments(web)).toThrow(/giscus/);
});

it('injects a fixture site notice when the real config has none', () => {
  const web = webWithConfig('export const siteConfig = {\n  features: { comments: true },\n};\n');
  enableFixtureNotice(web);
  const config = readFileSync(join(web, 'src/site.config.ts'), 'utf8');
  expect(config).toContain('notice:');
  expect(config.match(/notice:/g)).toHaveLength(1);
});

it('replaces a real notice instead of duplicating it', () => {
  const web = webWithConfig(
    "export const siteConfig = {\n  notice: {\n    es: 'real',\n    en: 'real',\n  },\n  features: { comments: true },\n};\n",
  );
  enableFixtureNotice(web);
  const config = readFileSync(join(web, 'src/site.config.ts'), 'utf8');
  expect(config.match(/notice:/g)).toHaveLength(1);
  expect(config).not.toContain("'real'");
});

it('fails loudly when the config has no features block to anchor the notice on', () => {
  const web = webWithConfig('export const siteConfig = {};\n');
  expect(() => enableFixtureNotice(web)).toThrow(/notice/);
});

it('turns the subscribe flag on in the fixture config', () => {
  const web = webWithConfig(
    'export const siteConfig = {\n  features: { subscribe: false, blog: true },\n};\n',
  );
  enableFixtureSubscribe(web);
  expect(readFileSync(join(web, 'src/site.config.ts'), 'utf8')).toContain('subscribe: true,');
});

it('keeps the subscribe flag on when the real config already has it on', () => {
  const web = webWithConfig(
    'export const siteConfig = {\n  features: { subscribe: true, blog: true },\n};\n',
  );
  expect(() => enableFixtureSubscribe(web)).not.toThrow();
  expect(readFileSync(join(web, 'src/site.config.ts'), 'utf8')).toContain('subscribe: true,');
});

it('fails loudly when the config has no subscribe flag to turn on', () => {
  const web = webWithConfig('export const siteConfig = {};\n');
  expect(() => enableFixtureSubscribe(web)).toThrow(/subscribe/);
});

it('removes the real third-party ids from the fixture config', () => {
  const web = webWithConfig(
    "export const siteConfig = {\n  integrations: {\n    cloudflareAnalyticsToken: 'abc',\n    turnstileSiteKey: '0xKEY',\n  },\n  features: { comments: true },\n};\n",
  );
  neutralizeFixtureIntegrations(web);
  const config = readFileSync(join(web, 'src/site.config.ts'), 'utf8');
  expect(config).toContain('integrations: {}');
  expect(config).not.toContain('abc');
  expect(config).not.toContain('0xKEY');
});

it('does nothing to a config without integrations', () => {
  const original = 'export const siteConfig = { features: {} };\n';
  const web = webWithConfig(original);
  neutralizeFixtureIntegrations(web);
  expect(readFileSync(join(web, 'src/site.config.ts'), 'utf8')).toBe(original);
});

const APPEARANCE_CONFIG =
  "export const siteConfig = {\n  appearance: 'full',\n  features: {},\n};\n";

it.each(['minimal', 'full'])('rewrites the fixture appearance to %s when asked', (requested) => {
  const web = webWithConfig(
    APPEARANCE_CONFIG.replace("'full'", requested === 'full' ? "'minimal'" : "'full'"),
  );
  overrideFixtureAppearance(web, requested);
  const config = readFileSync(join(web, 'src/site.config.ts'), 'utf8');
  expect(config).toContain(`appearance: '${requested}',`);
  expect(config.match(/appearance:/g)).toHaveLength(1);
});

it.each([undefined, ''])('keeps the real appearance when the override is %j', (requested) => {
  const web = webWithConfig(APPEARANCE_CONFIG);
  overrideFixtureAppearance(web, requested);
  expect(readFileSync(join(web, 'src/site.config.ts'), 'utf8')).toBe(APPEARANCE_CONFIG);
});

it('rejects an unknown appearance instead of silently ignoring a typo', () => {
  const web = webWithConfig(APPEARANCE_CONFIG);
  expect(() => overrideFixtureAppearance(web, 'minimall')).toThrow(/FIXTURE_APPEARANCE/);
  expect(readFileSync(join(web, 'src/site.config.ts'), 'utf8')).toBe(APPEARANCE_CONFIG);
});

it('fails loudly when the config has no appearance line to rewrite', () => {
  const web = webWithConfig('export const siteConfig = {};\n');
  expect(() => overrideFixtureAppearance(web, 'minimal')).toThrow(/appearance/);
});
