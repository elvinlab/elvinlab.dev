import { describe, expect, it } from 'vitest';

import { isCurrent, navItems } from './nav.ts';

const allOn = { blog: true, comments: true, contact: true, credentials: true, experiments: true };

describe('navItems', () => {
  it('lists every section in design order when all features are on', () => {
    expect(navItems(allOn).map((item) => item.key)).toEqual([
      'home',
      'notes',
      'experiments',
      'about',
      'contact',
    ]);
  });

  it('hides the entries of disabled features', () => {
    const items = navItems({ ...allOn, blog: false, contact: false, experiments: false });

    expect(items.map((item) => item.key)).toEqual(['home', 'about']);
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
