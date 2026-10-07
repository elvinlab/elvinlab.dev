import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

interface ProjectsRoute {
  pattern: string;
  entrypoint: string;
}

const entry = (file: string): string =>
  fileURLToPath(new URL(`../projects-routes/${file}`, import.meta.url));

/**
 * The projects page in both languages. Like the blog and contact routes they live outside
 * `src/pages` so they can be left out: with the flag off the pages do not exist at all.
 */
export function projectsRoutes(enabled: boolean): ProjectsRoute[] {
  if (!enabled) return [];
  return [
    { pattern: '/projects', entrypoint: entry('index.astro') },
    { pattern: '/en/projects', entrypoint: entry('en-index.astro') },
  ];
}

/** Registers the projects pages only when `features.experiments` is on. */
export function projectsRoutesIntegration(enabled: boolean): AstroIntegration {
  return {
    name: 'projects-routes',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        for (const route of projectsRoutes(enabled)) injectRoute(route);
      },
    },
  };
}
