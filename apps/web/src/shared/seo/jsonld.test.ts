import { describe, expect, it } from 'vitest';

import { blogPostingJsonLd, breadcrumbJsonLd, jsonLdScript, personJsonLd } from './jsonld.ts';

const site = {
  url: 'https://example.dev',
  title: 'example.dev',
  identity: {
    name: 'Jane Doe',
    role: { es: 'Ingeniera', en: 'Engineer' },
    bio: { es: 'Bio', en: 'Bio' },
  },
  socials: [{ url: 'https://github.com/jane', label: 'GitHub', icon: 'github' }],
} as const;

describe('personJsonLd', () => {
  it('describes the site owner with sameAs socials', () => {
    const person = personJsonLd(site, 'es');
    expect(person['@type']).toBe('Person');
    expect(person['name']).toBe('Jane Doe');
    expect(person['sameAs']).toEqual(['https://github.com/jane']);
  });
});

describe('blogPostingJsonLd', () => {
  it('describes a note as a BlogPosting authored by the owner', () => {
    const post = blogPostingJsonLd({
      site,
      locale: 'es',
      url: 'https://example.dev/notes/x/',
      title: 'Title',
      description: 'Desc',
      pubDate: new Date('2026-09-20T00:00:00Z'),
    });
    expect(post['@type']).toBe('BlogPosting');
    expect(post['headline']).toBe('Title');
    expect(post['datePublished']).toBe('2026-09-20T00:00:00.000Z');
    expect((post['author'] as { name: string }).name).toBe('Jane Doe');
  });

  it('links the author to the site and includes the share image when given', () => {
    const post = blogPostingJsonLd({
      site,
      locale: 'es',
      url: 'https://example.dev/notes/x/',
      title: 'Title',
      description: 'Desc',
      pubDate: new Date('2026-09-20T00:00:00Z'),
      image: 'https://example.dev/og/notes/x.png',
    });
    expect((post['author'] as { url: string }).url).toBe('https://example.dev');
    expect(post['image']).toBe('https://example.dev/og/notes/x.png');
  });

  it('omits the image when none is given', () => {
    const post = blogPostingJsonLd({
      site,
      locale: 'es',
      url: 'https://example.dev/notes/x/',
      title: 'Title',
      description: 'Desc',
      pubDate: new Date('2026-09-20T00:00:00Z'),
    });
    expect(post).not.toHaveProperty('image');
  });
});

describe('breadcrumbJsonLd', () => {
  it('lists the trail in order with 1-based positions and absolute URLs', () => {
    const trail = breadcrumbJsonLd([
      { name: 'Inicio', url: 'https://example.dev/' },
      { name: 'Notas', url: 'https://example.dev/notes/' },
      { name: 'Tema', url: 'https://example.dev/notes/tag/tema/' },
    ]);
    expect(trail['@type']).toBe('BreadcrumbList');
    expect(trail['itemListElement']).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://example.dev/' },
      { '@type': 'ListItem', position: 2, name: 'Notas', item: 'https://example.dev/notes/' },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Tema',
        item: 'https://example.dev/notes/tag/tema/',
      },
    ]);
  });
});

describe('jsonLdScript', () => {
  it('escapes < to keep the script tag from being broken or injected', () => {
    const out = jsonLdScript({ name: '</script><x>' });
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c');
  });
});
