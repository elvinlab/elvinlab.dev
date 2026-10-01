import { describe, expect, it } from 'vitest';

import { isCurrent, isSingleLocaleRoute, navItems } from './nav.ts';

const allOn = {
  blog: true,
  comments: true,
  contact: true,
  credentials: true,
  experiments: true,
  changelog: true,
  me: true,
};

describe('navItems', () => {
  it('lists every section in design order when all features are on and notes exist (ES)', () => {
    expect(navItems(allOn, 'es', true).map((item) => item.key)).toEqual([
      'home',
      'notes',
      'experiments',
      'about',
      'contact',
    ]);
  });

  it('lists every section in design order when all features are on and notes exist (EN)', () => {
    expect(navItems(allOn, 'en', true).map((item) => item.key)).toEqual([
      'home',
      'notes',
      'experiments',
      'about',
      'contact',
    ]);
  });

  it('hides notes when no published notes exist (ES)', () => {
    expect(navItems(allOn, 'es', false).map((item) => item.key)).toEqual([
      'home',
      'experiments',
      'about',
      'contact',
    ]);
  });

  it('hides notes when no published notes exist (EN)', () => {
    expect(navItems(allOn, 'en', false).map((item) => item.key)).toEqual([
      'home',
      'experiments',
      'about',
      'contact',
    ]);
  });

  it('hides the entries of disabled features', () => {
    const items = navItems(
      { ...allOn, blog: false, contact: false, experiments: false },
      'es',
      true,
    );

    expect(items.map((item) => item.key)).toEqual(['home', 'about']);
  });

  it('hides about when me feature is off', () => {
    const items = navItems({ ...allOn, me: false }, 'es', true);
    expect(items.map((item) => item.key)).toEqual(['home', 'notes', 'experiments', 'contact']);
  });

  it('hides experiments when experiments feature is off', () => {
    const items = navItems({ ...allOn, experiments: false }, 'es', true);
    expect(items.map((item) => item.key)).toEqual(['home', 'notes', 'about', 'contact']);
  });

  it('preserves order when all features are on', () => {
    const items = navItems(allOn, 'es', true);
    expect(items.map((item) => item.key)).toEqual([
      'home',
      'notes',
      'experiments',
      'about',
      'contact',
    ]);
  });

  it('EN notes item has labelOverride and hreflang when notes exist', () => {
    const items = navItems(allOn, 'en', true);
    const notesItem = items.find((item) => item.key === 'notes');
    expect(notesItem?.labelOverride).toBe('nav.notes.es');
    expect(notesItem?.hreflang).toBe('es');
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
