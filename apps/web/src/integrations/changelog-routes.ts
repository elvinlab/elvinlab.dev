import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

interface ChangelogRoute {
  pattern: string;
  entrypoint: string;
}

const entry = (file: string): string =>
  fileURLToPath(new URL(`../changelog-routes/${file}`, import.meta.url));

/**
 * The changelog page and its later pages in both languages. Like the blog routes they live outside `src/pages`
 * so they can be left out: with the flag off the pages do not exist at all.
 */
export function changelogRoutes(enabled: boolean): ChangelogRoute[] {
  if (!enabled) return [];
  return [
    { pattern: '/changelog', entrypoint: entry('index.astro') },
    { pattern: '/en/changelog', entrypoint: entry('en-index.astro') },
    // Page 2 onwards; page 1 is the base URL, so `/page/1/` never exists. `getStaticPaths` in the
    // entrypoints generates a page only while the release days need one.
    { pattern: '/changelog/page/[page]', entrypoint: entry('page.astro') },
    { pattern: '/en/changelog/page/[page]', entrypoint: entry('en-page.astro') },
  ];
}

/** Registers the changelog pages only when `features.changelog` is on. */
export function changelogRoutesIntegration(enabled: boolean): AstroIntegration {
  return {
    name: 'changelog-routes',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        for (const route of changelogRoutes(enabled)) injectRoute(route);
      },
    },
  };
}
