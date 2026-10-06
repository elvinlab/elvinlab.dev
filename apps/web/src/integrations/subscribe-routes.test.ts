import { describe, expect, it } from 'vitest';

import { subscribeRoutes } from './subscribe-routes.ts';

describe('subscribeRoutes', () => {
  it('returns the two pages in both languages and the notify endpoint when enabled', () => {
    expect(subscribeRoutes(true).map((route) => route.pattern)).toEqual([
      '/subscribe/confirm',
      '/subscribe/unsubscribe',
      '/en/subscribe/confirm',
      '/en/subscribe/unsubscribe',
      '/api/subscribe/notify',
    ]);
  });

  it('points every route at a file under subscribe-routes/', () => {
    for (const route of subscribeRoutes(true)) {
      expect(route.entrypoint).toMatch(/\/subscribe-routes\/[^/]+$/);
    }
  });

  it('returns no routes when disabled', () => {
    expect(subscribeRoutes(false)).toEqual([]);
  });
});
