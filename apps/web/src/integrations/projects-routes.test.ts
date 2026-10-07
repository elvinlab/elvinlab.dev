import { describe, expect, it } from 'vitest';

import { projectsRoutes } from './projects-routes.ts';

describe('projectsRoutes', () => {
  it('returns the Spanish and English projects routes when the flag is on', () => {
    expect(projectsRoutes(true).map((route) => route.pattern)).toEqual([
      '/projects',
      '/en/projects',
    ]);
  });

  it('points every route at a file under projects-routes/', () => {
    for (const route of projectsRoutes(true)) {
      expect(route.entrypoint).toMatch(/\/projects-routes\/[^/]+$/);
    }
  });

  it('returns no routes when the flag is off', () => {
    expect(projectsRoutes(false)).toEqual([]);
  });
});
