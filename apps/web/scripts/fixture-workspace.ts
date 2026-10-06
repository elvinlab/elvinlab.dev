import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

/**
 * Gives the copied site config a fixture `giscus` block so the lazy comments loader is exercised
 * (the real config has no ids until Discussions is enabled; the giscus origin is stubbed in e2e).
 */
export function enableFixtureComments(web: string): void {
  const configPath = join(web, 'src/site.config.ts');
  const withoutGiscus = readFileSync(configPath, 'utf8').replace(/\n {2}giscus: \{[^}]*\},/, '');
  const patched = withoutGiscus.replace(
    '\n  features: {',
    "\n  giscus: { repo: 'fixture/fixture', repoId: 'R_fixture', category: 'Comments', categoryId: 'DIC_fixture' },\n  features: {",
  );
  if (patched === withoutGiscus) throw new Error('fixture: could not inject the giscus config');
  writeFileSync(configPath, patched);
}

/**
 * Gives the copied site config a fixture site notice so the notice strip stays covered by the
 * browser tests (the real config has none now that the site is live).
 */
export function enableFixtureNotice(web: string): void {
  const configPath = join(web, 'src/site.config.ts');
  const withoutNotice = readFileSync(configPath, 'utf8').replace(/\n {2}notice: \{[^}]*\},/, '');
  const patched = withoutNotice.replace(
    '\n  features: {',
    "\n  notice: { es: 'Aviso de prueba', en: 'Test notice' },\n  features: {",
  );
  if (patched === withoutNotice) throw new Error('fixture: could not inject the site notice');
  writeFileSync(configPath, patched);
}

/**
 * Turns the subscription flag on in the copied site config so the notes form and the confirm and
 * unsubscribe pages are built and covered. The Turnstile site key comes from the environment
 * override that `fixture-preview.ts` sets; the widget script and the Actions are mocked in e2e.
 */
export function enableFixtureSubscribe(web: string): void {
  const configPath = join(web, 'src/site.config.ts');
  const config = readFileSync(configPath, 'utf8');
  const patched = config.replace(/subscribe: false,/, 'subscribe: true,');
  if (patched === config) throw new Error('fixture: could not enable the subscribe flag');
  writeFileSync(configPath, patched);
}

/**
 * Drops the real third-party ids (analytics token, Turnstile key) from the copied site config, so
 * fixture builds never load the Cloudflare beacon or call out to the network. Tests that need a
 * Turnstile key set it through the environment override.
 */
export function neutralizeFixtureIntegrations(web: string): void {
  const configPath = join(web, 'src/site.config.ts');
  const config = readFileSync(configPath, 'utf8');
  writeFileSync(
    configPath,
    config.replace(/\n {2}integrations: \{[^}]*\},/, '\n  integrations: {},'),
  );
}

/**
 * Lets a verification run pick the visual preset of the fixture build (`FIXTURE_APPEARANCE`), so
 * the browser tests can prove both presets without touching the real config. Only the copy in the
 * temporary workspace is rewritten; an unset or empty value keeps the real config as it is.
 */
export function overrideFixtureAppearance(web: string, requested: string | undefined): void {
  if (requested === undefined || requested === '') return;
  if (requested !== 'minimal' && requested !== 'full') {
    throw new Error(`fixture: FIXTURE_APPEARANCE must be 'minimal' or 'full', got '${requested}'`);
  }
  const configPath = join(web, 'src/site.config.ts');
  const config = readFileSync(configPath, 'utf8');
  const patched = config.replace(/appearance: '(?:minimal|full)'/, `appearance: '${requested}'`);
  if (patched === config && !config.includes(`appearance: '${requested}'`)) {
    throw new Error('fixture: could not find the appearance line to override');
  }
  writeFileSync(configPath, patched);
}

/** Copies only build inputs; fixture builds never write into publishable content or local drafts. */
export function createFixtureWorkspace(source: string, fixtures: string) {
  const root = mkdtempSync(join(tmpdir(), 'elvinlab-verification-'));
  const web = join(root, 'apps/web');
  const publishedNotes = join(source, 'apps/web/src/content/notes');
  const cleanup = (): void => rmSync(root, { recursive: true, force: true });
  try {
    for (const path of [
      // Without the root `.gitignore` the build inlines the site stylesheet twice (the fixture home
      // grew from 75 KB to 119 KB of HTML and the Lighthouse gate measured a page production never serves).
      '.gitignore',
      'package.json',
      'tsconfig.base.json',
      'apps/web/package.json',
      'apps/web/tsconfig.json',
      'apps/web/astro.config.ts',
      'apps/web/wrangler.jsonc',
      'apps/web/public',
      'apps/web/src',
      'packages/core/package.json',
      'packages/core/tsconfig.json',
      'packages/core/src',
    ]) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      cpSync(join(source, path), join(root, path), {
        recursive: true,
        // Drafts and the owner's published notes never enter a fixture build: it must contain
        // only the fixture notes (deterministic) and no owner-specific text (white-label).
        filter: (path) => basename(path) !== 'drafts' && path !== publishedNotes,
      });
    }
    cpSync(fixtures, join(web, 'src/content/notes'), {
      recursive: true,
      force: false,
      errorOnExist: true,
    });
    symlinkSync(join(source, 'node_modules'), join(root, 'node_modules'), 'dir');
    symlinkSync(
      join(source, 'packages/core/node_modules'),
      join(root, 'packages/core/node_modules'),
      'dir',
    );
    // External packages are reused; the workspace package must resolve to our copy.
    const linkPackages = (relative: string): void => {
      const target = join(root, relative);
      mkdirSync(target, { recursive: true });
      for (const entry of readdirSync(join(source, relative), { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        const path = join(relative, entry.name);
        if (entry.name.startsWith('@')) linkPackages(path);
        else
          symlinkSync(
            path === 'apps/web/node_modules/@elvinlab/core'
              ? join(root, 'packages/core')
              : realpathSync(join(source, path)),
            join(root, path),
            'dir',
          );
      }
    };
    linkPackages('apps/web/node_modules');
    return { root, web, cleanup };
  } catch (error) {
    cleanup();
    throw error;
  }
}
