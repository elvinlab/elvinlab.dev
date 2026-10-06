import { describe, expect, it } from 'vitest';

import { contactRoutes } from './contact-routes.ts';

describe('contactRoutes', () => {
  it('returns the page in both languages when the contact feature is on', () => {
    expect(contactRoutes(true).map((route) => route.pattern)).toEqual(['/contact', '/en/contact']);
  });

  it('points every route at a file under contact-routes/', () => {
    for (const route of contactRoutes(true)) {
      expect(route.entrypoint).toMatch(/\/contact-routes\/[^/]+$/);
    }
  });

  it('returns no routes when disabled', () => {
    expect(contactRoutes(false)).toEqual([]);
  });
});
