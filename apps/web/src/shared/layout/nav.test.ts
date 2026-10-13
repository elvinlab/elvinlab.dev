import { describe, expect, it } from 'vitest';

import { isCurrent, isSingleLocaleRoute, navItems } from './nav.ts';

const allOn = {
  blog: true,
  comments: true,
  contact: true,
  credentials: true,
  experiments: true,
  changelog: true,
  readingMode: true,
  readingProgress: true,
  education: true,
  marks: true,
  subscribe: false,
  me: true,
  backToTop: true,
  languageHint: true,
  themeToggle: true,
  backgroundPicker: true,
  experimentNudge: false,
};

describe('navItems', () => {
  it('lists every section in design order when all features are on and notes exist (ES)', () => {
    expect(navItems(allOn, 'es', true).map((item) => item.key)).toEqual([
      'home',
      'notes',
      'experiments',
      'about',
      'education',
      'contact',
    ]);
  });

  it('lists every section in design order when all features are on and notes exist (EN)', () => {
    expect(navItems(allOn, 'en', true).map((item) => item.key)).toEqual([
      'home',
      'notes',
      'experiments',
      'about',
      'education',
      'contact',
    ]);
  });

  it('hides notes when no published notes exist (ES)', () => {
    expect(navItems(allOn, 'es', false).map((item) => item.key)).toEqual([
      'home',
      'experiments',
      'about',
      'education',
      'contact',
    ]);
  });

  it('hides notes when no published notes exist (EN)', () => {
    expect(navItems(allOn, 'en', false).map((item) => item.key)).toEqual([
      'home',
      'experiments',
      'about',
      'education',
      'contact',
    ]);
  });

  it('hides the entries of disabled features', () => {
    const items = navItems(
      { ...allOn, blog: false, contact: false, experiments: false, education: false },
      'es',
      true,
    );

    expect(items.map((item) => item.key)).toEqual(['home', 'about']);
  });

  it('hides about when me feature is off', () => {
    const items = navItems({ ...allOn, me: false }, 'es', true);
    expect(items.map((item) => item.key)).toEqual([
      'home',
      'notes',
      'experiments',
      'education',
      'contact',
    ]);
  });

  it('hides experiments when experiments feature is off', () => {
    const items = navItems({ ...allOn, experiments: false }, 'es', true);
    expect(items.map((item) => item.key)).toEqual([
      'home',
      'notes',
      'about',
      'education',
      'contact',
    ]);
  });

  it('preserves order when all features are on', () => {
    const items = navItems(allOn, 'es', true);
    expect(items.map((item) => item.key)).toEqual([
      'home',
      'notes',
      'experiments',
      'about',
      'education',
      'contact',
    ]);
  });

  it('EN notes item keeps the plain "Notes" label and only declares the Spanish target', () => {
    const items = navItems(allOn, 'en', true);
    const notesItem = items.find((item) => item.key === 'notes');
    expect(notesItem).not.toHaveProperty('labelOverride');
    expect(notesItem?.hreflang).toBe('es');
    expect(notesItem?.localize).toBe(false);
  });
});

describe('navItems education entry', () => {
  it('sits between about and contact and points at the localized /education/ page', () => {
    for (const locale of ['es', 'en'] as const) {
      const keys = navItems(allOn, locale, true).map((item) => item.key);
      expect(keys.indexOf('education')).toBe(keys.indexOf('about') + 1);
      expect(keys.indexOf('contact')).toBe(keys.indexOf('education') + 1);
      const item = navItems(allOn, locale, true).find((entry) => entry.key === 'education');
      expect(item).toMatchObject({ path: '/education/' });
      expect(item?.localize).not.toBe(false);
    }
  });

  it('is hidden while features.education is off', () => {
    const keys = navItems({ ...allOn, education: false }, 'es', true).map((item) => item.key);
    expect(keys).not.toContain('education');
  });
});

describe('navItems experiments entry', () => {
  it('points the experiments key at the localized /experiments/ page', () => {
    for (const locale of ['es', 'en'] as const) {
      const projects = navItems(allOn, locale, true).find((item) => item.key === 'experiments');
      expect(projects).toMatchObject({ path: '/experiments/' });
      expect(projects?.localize).not.toBe(false);
    }
  });
});

describe('navItems English notes entry', () => {
  it('keeps the Spanish path, since posts only exist in Spanish', () => {
    const notes = navItems(allOn, 'en', true).find((item) => item.key === 'notes');
    expect(notes).toMatchObject({ path: '/notes/', localize: false, hreflang: 'es' });
  });

  it('localizes every other entry', () => {
    const others = navItems(allOn, 'en', true).filter((item) => item.key !== 'notes');
    expect(others.every((item) => item.localize !== false)).toBe(true);
  });
});

describe('isSingleLocaleRoute', () => {
  it('is true for the notes section, which only exists in Spanish', () => {
    expect(isSingleLocaleRoute('/notes/')).toBe(true);
    expect(isSingleLocaleRoute('/notes/first-post/')).toBe(true);
  });

  it('is false for translated pages and look-alike paths', () => {
    expect(isSingleLocaleRoute('/')).toBe(false);
    expect(isSingleLocaleRoute('/me/')).toBe(false);
    expect(isSingleLocaleRoute('/notes-old/')).toBe(false);
  });
});

describe('isCurrent', () => {
  it('matches home only on the exact root', () => {
    expect(isCurrent('/', '/')).toBe(true);
    expect(isCurrent('/notes/', '/')).toBe(false);
  });

  it('matches a section and everything below it', () => {
    expect(isCurrent('/notes/', '/notes/')).toBe(true);
    expect(isCurrent('/notes/note-001/', '/notes/')).toBe(true);
    expect(isCurrent('/notes-old/', '/notes/')).toBe(false);
  });
});
