import { describe, expect, it } from 'vitest';

import { changelogRoutes } from './changelog-routes.ts';

describe('changelogRoutes', () => {
  it('returns the page and its later pages in both languages when the changelog feature is on', () => {
    expect(changelogRoutes(true).map((route) => route.pattern)).toEqual([
      '/changelog',
      '/en/changelog',
      '/changelog/page/[page]',
      '/en/changelog/page/[page]',
    ]);
  });

  it('points every route at a file under changelog-routes/', () => {
    for (const route of changelogRoutes(true)) {
      expect(route.entrypoint).toMatch(/\/changelog-routes\/[^/]+$/);
    }
  });

  it('returns no routes when disabled', () => {
    expect(changelogRoutes(false)).toEqual([]);
  });
});
