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
  readingMode: true,
  marks: true,
  subscribe: false,
  backToTop: true,
  languageHint: true,
  themeToggle: true,
  backgroundPicker: true,
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

  it('returns true for /experiments/ when the experiments feature is off', () => {
    const features = { ...allOn, experiments: false };
    expect(isHiddenFromSitemap('/experiments/', features)).toBe(true);
    expect(isHiddenFromSitemap('/en/experiments/', features)).toBe(true);
  });

  it('hides every page of the experiments list when the experiments feature is off', () => {
    const features = { ...allOn, experiments: false };
    for (const path of [
      '/experiments/page/2/',
      '/experiments/page/12/',
      '/en/experiments/page/2/',
      '/en/experiments/page/12/',
    ]) {
      expect(isHiddenFromSitemap(path, features), path).toBe(true);
      expect(isHiddenFromSitemap(path, allOn), path).toBe(false);
    }
  });

  it('never lists the alternate sorts of the experiments list, whatever the flags', () => {
    const paths = [
      '/experiments/oldest/',
      '/experiments/title/page/2/',
      '/experiments/newest/page/12/',
      '/en/experiments/oldest/',
      '/en/experiments/title/page/3/',
    ];
    for (const path of paths) {
      expect(isHiddenFromSitemap(path, allOn), path).toBe(true);
      expect(isHiddenFromSitemap(path, { ...allOn, experiments: false }), path).toBe(true);
    }
  });

  it('keeps the default order and its later pages, and ignores paths that are not a sort', () => {
    for (const path of [
      '/experiments/',
      '/experiments/page/2/',
      '/en/experiments/page/2/',
      '/experiments/some-case/',
      '/experiments/oldest/extra/',
    ]) {
      expect(isHiddenFromSitemap(path, allOn), path).toBe(false);
    }
  });

  it('returns true for /changelog/ when changelog feature is off', () => {
    const features = { ...allOn, changelog: false };
    expect(isHiddenFromSitemap('/changelog/', features)).toBe(true);
    expect(isHiddenFromSitemap('/en/changelog/', features)).toBe(true);
  });

  it('lists the later changelog pages only while the changelog feature is on', () => {
    for (const path of ['/changelog/page/2/', '/en/changelog/page/2/']) {
      expect(isHiddenFromSitemap(path, allOn), path).toBe(false);
      expect(isHiddenFromSitemap(path, { ...allOn, changelog: false }), path).toBe(true);
    }
  });

  it('returns false for unrelated paths regardless of feature flags', () => {
    const features = { ...allOn, me: false, experiments: false, changelog: false };
    expect(isHiddenFromSitemap('/notes/', features)).toBe(false);
    expect(isHiddenFromSitemap('/contact/', features)).toBe(false);
    expect(isHiddenFromSitemap('/', features)).toBe(false);
  });

  it('hides the notes index, note pages and English note pages when blog is off', () => {
    const features = { ...allOn, blog: false };
    expect(isHiddenFromSitemap('/notes/', features)).toBe(true);
    expect(isHiddenFromSitemap('/notes/x/', features)).toBe(true);
    expect(isHiddenFromSitemap('/en/notes/x/', features)).toBe(true);
  });

  it('keeps notes URLs when blog is on', () => {
    expect(isHiddenFromSitemap('/notes/x/', allOn)).toBe(false);
    expect(isHiddenFromSitemap('/en/notes/x/', allOn)).toBe(false);
  });

  it('always hides the noindex subscription pages and their English twins', () => {
    for (const path of [
      '/subscribe/confirm/',
      '/subscribe/unsubscribe/',
      '/en/subscribe/confirm/',
      '/en/subscribe/unsubscribe/',
    ]) {
      expect(isHiddenFromSitemap(path, allOn)).toBe(true);
    }
  });

  it('keeps the indexable subscription page and its English twin', () => {
    expect(isHiddenFromSitemap('/subscribe/', allOn)).toBe(false);
    expect(isHiddenFromSitemap('/en/subscribe/', allOn)).toBe(false);
  });

  it('returns true for /contact/ when the contact feature is off', () => {
    const features = { ...allOn, contact: false };
    expect(isHiddenFromSitemap('/contact/', features)).toBe(true);
    expect(isHiddenFromSitemap('/en/contact/', features)).toBe(true);
  });

  it('keeps /contact/ when the contact feature is on', () => {
    expect(isHiddenFromSitemap('/contact/', allOn)).toBe(false);
    expect(isHiddenFromSitemap('/en/contact/', allOn)).toBe(false);
  });
});
