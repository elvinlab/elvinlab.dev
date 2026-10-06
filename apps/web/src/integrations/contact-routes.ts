import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

interface ContactRoute {
  pattern: string;
  entrypoint: string;
}

const entry = (file: string): string =>
  fileURLToPath(new URL(`../contact-routes/${file}`, import.meta.url));

/**
 * The contact page in both languages. Like the blog routes they live outside `src/pages`
 * so they can be left out: with the flag off the pages do not exist at all.
 */
export function contactRoutes(enabled: boolean): ContactRoute[] {
  if (!enabled) return [];
  return [
    { pattern: '/contact', entrypoint: entry('index.astro') },
    { pattern: '/en/contact', entrypoint: entry('en-index.astro') },
  ];
}

/** Registers the contact pages only when `features.contact` is on. */
export function contactRoutesIntegration(enabled: boolean): AstroIntegration {
  return {
    name: 'contact-routes',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        for (const route of contactRoutes(enabled)) injectRoute(route);
      },
    },
  };
}
