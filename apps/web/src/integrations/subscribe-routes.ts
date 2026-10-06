import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

interface SubscribeRoute {
  pattern: string;
  entrypoint: string;
}

const entry = (file: string): string =>
  fileURLToPath(new URL(`../subscribe-routes/${file}`, import.meta.url));

/**
 * The confirmation and unsubscribe pages and the owner's notify endpoint. Like the blog routes they live
 * outside `src/pages` so they can be left out: with the flag off they do not exist at all.
 */
export function subscribeRoutes(enabled: boolean): SubscribeRoute[] {
  if (!enabled) return [];
  return [
    { pattern: '/subscribe/confirm', entrypoint: entry('confirm.astro') },
    { pattern: '/subscribe/unsubscribe', entrypoint: entry('unsubscribe.astro') },
    { pattern: '/en/subscribe/confirm', entrypoint: entry('en-confirm.astro') },
    { pattern: '/en/subscribe/unsubscribe', entrypoint: entry('en-unsubscribe.astro') },
    // Owner trigger: a server route, protected by a secret token (ADR 0014).
    { pattern: '/api/subscribe/notify', entrypoint: entry('notify.ts') },
  ];
}

/** Registers the subscription routes only when the blog and `features.subscribe` are both on. */
export function subscribeRoutesIntegration(enabled: boolean): AstroIntegration {
  return {
    name: 'subscribe-routes',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        for (const route of subscribeRoutes(enabled)) injectRoute(route);
      },
    },
  };
}
