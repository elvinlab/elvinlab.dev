import { type E2eNeeds, type E2eProfile, missingNeeds } from './e2e-features.ts';

/**
 * What each URL of `lighthouserc.json` needs to exist in the fixture build. Lighthouse audits the
 * pages the site actually has: an adopter who turns contact off must not get a failing audit of a
 * `/contact/` that no longer exists. A URL missing from this table is an error, so adding one to
 * the config forces the decision.
 */
export const LIGHTHOUSE_NEEDS: Readonly<Record<string, E2eNeeds>> = {
  '/': {},
  '/en/': {},
  // `/me/` is always built but turns noindex without `features.me`, and Lighthouse SEO (a minimum
  // score) fails a page that blocks itself from indexing: audit it only when it is meant to be found.
  '/me/': { flags: ['me'] },
  '/en/me/': { flags: ['me'] },
  '/experiments/': { routes: ['experiments'] },
  '/notes/': { routes: ['notes'] },
  '/notes/smoke-es/': { routes: ['notes'] },
  '/notes/tag/pruebas/': { routes: ['notes'] },
  '/contact/': { routes: ['contact'] },
  '/en/contact/': { routes: ['contact'] },
  '/subscribe/': { routes: ['subscribe'] },
};

/** The URLs whose pages exist in this profile, in their original order. */
export function liveLighthouseUrls(urls: readonly string[], profile: E2eProfile): string[] {
  return urls.filter((url) => {
    const path = new URL(url).pathname;
    const needs = LIGHTHOUSE_NEEDS[path];
    if (!needs) {
      throw new Error(
        `lighthouse: ${path} is not in LIGHTHOUSE_NEEDS (apps/web/scripts/lighthouse-pages.ts); say what it needs`,
      );
    }
    return missingNeeds(profile, needs).length === 0;
  });
}
