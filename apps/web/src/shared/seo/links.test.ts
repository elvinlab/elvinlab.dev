import { describe, expect, it } from 'vitest';

import { seoLinks } from './links.ts';

const locales = { locales: ['es', 'en'], defaultLocale: 'es' } as const;
const site = new URL('https://example.dev');

describe('seoLinks', () => {
  it('points canonical at the current locale', () => {
    expect(seoLinks({ path: '/notes/', locale: 'en', site, locales }).canonical).toBe(
      'https://example.dev/en/notes/',
    );
  });

  it('lists every locale plus x-default on the default locale', () => {
    expect(seoLinks({ path: '/notes/', locale: 'es', site, locales }).alternates).toEqual([
      { hreflang: 'es', href: 'https://example.dev/notes/' },
      { hreflang: 'en', href: 'https://example.dev/en/notes/' },
      { hreflang: 'x-default', href: 'https://example.dev/notes/' },
    ]);
  });

  it('omits alternates for pages that exist in one locale only', () => {
    const links = seoLinks({
      path: '/notes/note-001/',
      locale: 'en',
      site,
      locales,
      translated: false,
    });

    expect(links.alternates).toEqual([]);
  });
});
