import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

interface ExperimentsRoute {
  pattern: string;
  entrypoint: string;
}

const entry = (file: string): string =>
  fileURLToPath(new URL(`../experiments-routes/${file}`, import.meta.url));

/**
 * The experiments page, its later pages and its alternate sorts in both languages. Like the blog and contact routes they live outside
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
    // The alternate sorts (`/experiments/oldest/`, `/experiments/oldest/page/2/`): `getStaticPaths`
    // generates them only for the enabled non-default sorts and only when the compact list reaches
    // `experiments.sortFrom`, so on a small list none of them exists.
    { pattern: '/experiments/[sort]', entrypoint: entry('sort.astro') },
    { pattern: '/en/experiments/[sort]', entrypoint: entry('en-sort.astro') },
    { pattern: '/experiments/[sort]/page/[page]', entrypoint: entry('sort-page.astro') },
    { pattern: '/en/experiments/[sort]/page/[page]', entrypoint: entry('en-sort-page.astro') },
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
