import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

/** Copies only build inputs; fixture builds never write into publishable content or local drafts. */
export function createFixtureWorkspace(source: string, fixtures: string) {
  const root = mkdtempSync(join(tmpdir(), 'elvinlab-verification-'));
  const web = join(root, 'apps/web');
  const cleanup = (): void => rmSync(root, { recursive: true, force: true });
  try {
    for (const path of [
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
        filter: (path) => basename(path) !== 'drafts',
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
