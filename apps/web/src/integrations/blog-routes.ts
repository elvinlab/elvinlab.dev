import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

interface BlogRoute {
  pattern: string;
  entrypoint: string;
}

const entry = (file: string): string =>
  fileURLToPath(new URL(`../blog-routes/${file}`, import.meta.url));

/**
 * The routes that make up the blog. Files under `src/pages` cannot be skipped conditionally, so
 * these live in `src/blog-routes/` and are injected only when `features.blog` is on.
 */
export function blogRoutes(enabled: boolean): BlogRoute[] {
  if (!enabled) return [];
  return [
    { pattern: '/notes', entrypoint: entry('notes-index.astro') },
    { pattern: '/notes/[slug]', entrypoint: entry('notes-slug.astro') },
    { pattern: '/en/notes/[slug]', entrypoint: entry('en-notes-slug.astro') },
    { pattern: '/rss.xml', entrypoint: entry('rss.xml.ts') },
  ];
}

/** Registers the blog routes (notes pages and RSS feed) only when the blog feature is enabled. */
export function blogRoutesIntegration(enabled: boolean): AstroIntegration {
  return {
    name: 'blog-routes',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        for (const route of blogRoutes(enabled)) injectRoute(route);
      },
    },
  };
}
