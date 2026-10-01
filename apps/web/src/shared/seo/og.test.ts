import { describe, expect, it } from 'vitest';

import { articleMetaTags, DEFAULT_OG_IMAGE, noteCardPath, ogLocale } from './og.ts';

describe('ogLocale', () => {
  it('maps site locales to the language_TERRITORY form Open Graph expects', () => {
    expect(ogLocale('es')).toBe('es_ES');
    expect(ogLocale('en')).toBe('en_US');
  });

  it('keeps an already qualified or unknown locale as is', () => {
    expect(ogLocale('es_CR')).toBe('es_CR');
    expect(ogLocale('fr')).toBe('fr');
  });
});

describe('noteCardPath', () => {
  it('points each note at its own generated card', () => {
    expect(noteCardPath('como-construi-este-sitio')).toBe('/og/notes/como-construi-este-sitio.png');
  });

  it('keeps the default card for everything else', () => {
    expect(DEFAULT_OG_IMAGE).toBe('/og-image.png');
  });
});

describe('articleMetaTags', () => {
  it('emits the published time and one tag entry per tag', () => {
    const tags = articleMetaTags({
      pubDate: new Date('2026-10-01T00:00:00Z'),
      tags: ['astro', 'ci'],
    });
    expect(tags).toEqual([
      { property: 'article:published_time', content: '2026-10-01T00:00:00.000Z' },
      { property: 'article:tag', content: 'astro' },
      { property: 'article:tag', content: 'ci' },
    ]);
  });

  it('adds the modified time only when the note was updated', () => {
    const tags = articleMetaTags({
      pubDate: new Date('2026-10-01T00:00:00Z'),
      updatedDate: new Date('2026-10-05T00:00:00Z'),
    });
    expect(tags.map((tag) => tag.property)).toEqual([
      'article:published_time',
      'article:modified_time',
    ]);
    expect(tags[1]?.content).toBe('2026-10-05T00:00:00.000Z');
  });
});
