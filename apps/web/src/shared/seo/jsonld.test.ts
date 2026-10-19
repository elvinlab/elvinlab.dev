import { describe, expect, it } from 'vitest';

import {
  blogPostingJsonLd,
  breadcrumbJsonLd,
  jsonLdScript,
  pageJsonLd,
  personJsonLd,
} from './jsonld.ts';

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

describe('personJsonLd with the seo block', () => {
  const withSeo = {
    ...site,
    seo: {
      country: 'CR',
      knowsAbout: ['Astro', 'AI agents'],
      sameAs: ['https://github.com/jane', 'https://platzi.com/@jane/'],
    },
  };

  it('adds topics and country, and merges extra profiles without repeating one', () => {
    const person = personJsonLd(withSeo, 'es');
    expect(person['knowsAbout']).toEqual(['Astro', 'AI agents']);
    expect(person['address']).toEqual({ '@type': 'PostalAddress', addressCountry: 'CR' });
    expect(person['sameAs']).toEqual(['https://github.com/jane', 'https://platzi.com/@jane/']);
  });

  it('keeps the previous output when the site has no seo block', () => {
    const person = personJsonLd(site, 'es');
    expect(person).not.toHaveProperty('knowsAbout');
    expect(person).not.toHaveProperty('address');
  });
});

describe('pageJsonLd', () => {
  const input = {
    site,
    locale: 'es' as const,
    url: 'https://example.dev/me/',
    name: 'CV',
    description: 'Desc',
  };

  it('describes /me as a ProfilePage whose main entity is the owner', () => {
    const node = pageJsonLd('ProfilePage', input);
    expect(node['@type']).toBe('ProfilePage');
    expect(node['mainEntity']).toEqual({ '@id': 'https://example.dev/#person' });
    expect(node['isPartOf']).toEqual({ '@id': 'https://example.dev/#website' });
    expect(node['inLanguage']).toBe('es');
  });

  it('credits the owner as author of a Blog and carries keywords and image of a CreativeWork', () => {
    expect(pageJsonLd('Blog', input)['author']).toEqual({ '@id': 'https://example.dev/#person' });
    const work = pageJsonLd('CreativeWork', {
      ...input,
      keywords: ['Astro', 'D1'],
      image: 'https://example.dev/og/x.png',
    });
    expect(work['keywords']).toBe('Astro, D1');
    expect(work['image']).toBe('https://example.dev/og/x.png');
    expect(pageJsonLd('CollectionPage', input)).not.toHaveProperty('author');
  });
});
