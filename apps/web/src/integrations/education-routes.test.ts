import { describe, expect, it } from 'vitest';

import { educationRoutes } from './education-routes.ts';

describe('educationRoutes', () => {
  it('returns the Spanish and English education routes when the flag is on', () => {
    expect(educationRoutes(true).map((route) => route.pattern)).toEqual([
      '/education',
      '/en/education',
      '/education/page/[page]',
      '/en/education/page/[page]',
      '/education/[sort]',
      '/en/education/[sort]',
      '/education/[sort]/page/[page]',
      '/en/education/[sort]/page/[page]',
    ]);
  });

  it('points every route at a file under education-routes/', () => {
    for (const route of educationRoutes(true)) {
      expect(route.entrypoint).toMatch(/\/education-routes\/[^/]+$/);
    }
  });

  it('returns no routes when the flag is off', () => {
    expect(educationRoutes(false)).toEqual([]);
  });
});
