import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

interface EducationRoute {
  pattern: string;
  entrypoint: string;
}

const entry = (file: string): string =>
  fileURLToPath(new URL(`../education-routes/${file}`, import.meta.url));

/**
 * The education timeline, its later pages and its alternate order in both languages. Like the
 * experiments routes they live outside `src/pages` so they can be left out: with the flag off the
 * pages do not exist at all.
 */
export function educationRoutes(enabled: boolean): EducationRoute[] {
  if (!enabled) return [];
  return [
    { pattern: '/education', entrypoint: entry('index.astro') },
    { pattern: '/en/education', entrypoint: entry('en-index.astro') },
    // Page 2 onwards; page 1 is the base URL. `getStaticPaths` generates a page only when needed.
    { pattern: '/education/page/[page]', entrypoint: entry('page.astro') },
    { pattern: '/en/education/page/[page]', entrypoint: entry('en-page.astro') },
    // The alternate order (`/education/oldest/`), generated only from `education.sortFrom` entries.
    { pattern: '/education/[sort]', entrypoint: entry('sort.astro') },
    { pattern: '/en/education/[sort]', entrypoint: entry('en-sort.astro') },
    { pattern: '/education/[sort]/page/[page]', entrypoint: entry('sort-page.astro') },
    { pattern: '/en/education/[sort]/page/[page]', entrypoint: entry('en-sort-page.astro') },
  ];
}

/** Registers the education pages only when `features.education` is on. */
export function educationRoutesIntegration(enabled: boolean): AstroIntegration {
  return {
    name: 'education-routes',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        for (const route of educationRoutes(enabled)) injectRoute(route);
      },
    },
  };
}
