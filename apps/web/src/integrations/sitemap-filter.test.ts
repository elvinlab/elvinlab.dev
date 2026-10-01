import { describe, expect, it } from 'vitest';

import { isHiddenFromSitemap } from './sitemap-filter.ts';

const allOn = {
  blog: true,
  comments: true,
  contact: true,
  credentials: true,
  experiments: true,
  me: true,
  changelog: true,
};

describe('isHiddenFromSitemap', () => {
  it('returns false when all features are on', () => {
    expect(isHiddenFromSitemap('/me/', allOn)).toBe(false);
    expect(isHiddenFromSitemap('/en/me/', allOn)).toBe(false);
    expect(isHiddenFromSitemap('/experiments/', allOn)).toBe(false);
    expect(isHiddenFromSitemap('/en/experiments/', allOn)).toBe(false);
    expect(isHiddenFromSitemap('/changelog/', allOn)).toBe(false);
    expect(isHiddenFromSitemap('/en/changelog/', allOn)).toBe(false);
    expect(isHiddenFromSitemap('/notes/', allOn)).toBe(false);
  });

  it('returns true for /me/ when me feature is off', () => {
    const features = { ...allOn, me: false };
    expect(isHiddenFromSitemap('/me/', features)).toBe(true);
    expect(isHiddenFromSitemap('/en/me/', features)).toBe(true);
  });

  it('returns true for /experiments/ when experiments feature is off', () => {
    const features = { ...allOn, experiments: false };
    expect(isHiddenFromSitemap('/experiments/', features)).toBe(true);
    expect(isHiddenFromSitemap('/en/experiments/', features)).toBe(true);
  });

  it('returns true for /changelog/ when changelog feature is off', () => {
    const features = { ...allOn, changelog: false };
    expect(isHiddenFromSitemap('/changelog/', features)).toBe(true);
    expect(isHiddenFromSitemap('/en/changelog/', features)).toBe(true);
  });

  it('returns false for unrelated paths regardless of feature flags', () => {
    const features = { ...allOn, me: false, experiments: false, changelog: false };
    expect(isHiddenFromSitemap('/notes/', features)).toBe(false);
    expect(isHiddenFromSitemap('/contact/', features)).toBe(false);
    expect(isHiddenFromSitemap('/', features)).toBe(false);
  });
});
