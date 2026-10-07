import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

interface ExperimentsRoute {
  pattern: string;
  entrypoint: string;
}

const entry = (file: string): string =>
  fileURLToPath(new URL(`../experiments-routes/${file}`, import.meta.url));

/**
 * The experiments page (and its later pages) in both languages. Like the blog and contact routes they live outside
 * `src/pages` so they can be left out: with the flag off the pages do not exist at all.
 */
export function experimentsRoutes(enabled: boolean): ExperimentsRoute[] {
  if (!enabled) return [];
  return [
    { pattern: '/experiments', entrypoint: entry('index.astro') },
    { pattern: '/en/experiments', entrypoint: entry('en-index.astro') },
    // Page 2 onwards of the paginated list; page 1 is the base URL, so `/page/1/` never exists.
    // `getStaticPaths` in the entrypoints generates a page only while the compact tier needs one.
    { pattern: '/experiments/page/[page]', entrypoint: entry('page.astro') },
    { pattern: '/en/experiments/page/[page]', entrypoint: entry('en-page.astro') },
  ];
}

/** Registers the experiments pages only when `features.experiments` is on. */
export function experimentsRoutesIntegration(enabled: boolean): AstroIntegration {
  return {
    name: 'experiments-routes',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        for (const route of experimentsRoutes(enabled)) injectRoute(route);
      },
    },
  };
}
