import { describe, expect, it } from 'vitest';

import { blogRoutes } from './blog-routes.ts';

describe('blogRoutes', () => {
  it('returns the four blog routes when the blog is enabled', () => {
    expect(blogRoutes(true).map((route) => route.pattern)).toEqual([
      '/notes',
      '/notes/[slug]',
      '/en/notes/[slug]',
      '/rss.xml',
    ]);
  });

  it('points every route at a file under blog-routes/', () => {
    for (const route of blogRoutes(true)) {
      expect(route.entrypoint).toMatch(/\/blog-routes\/[^/]+$|\/blog-routes\//);
    }
  });

  it('returns no routes when the blog is disabled', () => {
    expect(blogRoutes(false)).toEqual([]);
  });
});
