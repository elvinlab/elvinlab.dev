import { describe, expect, it } from 'vitest';

import { experimentsRoutes } from './experiments-routes.ts';

describe('experimentsRoutes', () => {
  it('returns the Spanish and English experiments routes when the flag is on', () => {
    expect(experimentsRoutes(true).map((route) => route.pattern)).toEqual([
      '/experiments',
      '/en/experiments',
    ]);
  });

  it('points every route at a file under experiments-routes/', () => {
    for (const route of experimentsRoutes(true)) {
      expect(route.entrypoint).toMatch(/\/experiments-routes\/[^/]+$/);
    }
  });

  it('returns no routes when the flag is off', () => {
    expect(experimentsRoutes(false)).toEqual([]);
  });
});
