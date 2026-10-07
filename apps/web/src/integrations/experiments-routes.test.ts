import { describe, expect, it } from 'vitest';

import { experimentsRoutes } from './experiments-routes.ts';

describe('experimentsRoutes', () => {
  it('returns the Spanish and English experiments routes when the flag is on', () => {
    expect(experimentsRoutes(true).map((route) => route.pattern)).toEqual([
      '/experiments',
      '/en/experiments',
      '/experiments/page/[page]',
      '/en/experiments/page/[page]',
    ]);
  });

  it('points every route at a file under experiments-routes/', () => {
    for (const route of experimentsRoutes(true)) {
      expect(route.entrypoint).toMatch(/\/experiments-routes\/[^/]+$/);
    }
  });

  it('names a dynamic entrypoint for the later pages, never a page 1 route', () => {
    const paged = experimentsRoutes(true).filter((route) => route.pattern.includes('[page]'));
    expect(paged.map((route) => route.entrypoint.split('/').at(-1))).toEqual([
      'page.astro',
      'en-page.astro',
    ]);
    expect(experimentsRoutes(true).some((route) => /page\/1\b/.test(route.pattern))).toBe(false);
  });

  it('returns no routes when the flag is off', () => {
    expect(experimentsRoutes(false)).toEqual([]);
  });
});
