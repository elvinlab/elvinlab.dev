import { describe, expect, it } from 'vitest';

import { experimentSchema } from '@/features/portfolio/schema.ts';

import {
  checkPagerLinks,
  countCards,
  generateExperiments,
  perCardCost,
} from './stress-experiments.ts';

describe('generateExperiments', () => {
  it('generates the requested number of entries, deterministically', () => {
    expect(Object.keys(generateExperiments(30).entries)).toHaveLength(30);
    expect(Object.keys(generateExperiments(100).entries)).toHaveLength(100);
    expect(generateExperiments(30)).toEqual(generateExperiments(30));
  });

  it('rejects a count that is not a positive integer', () => {
    expect(() => generateExperiments(0)).toThrow(/positive integer/);
    expect(() => generateExperiments(2.5)).toThrow(/positive integer/);
  });

  it('produces entries that pass the real experiment schema', () => {
    const schema = experimentSchema();
    for (const [id, entry] of Object.entries(generateExperiments(40).entries)) {
      expect(schema.safeParse(entry).success, id).toBe(true);
    }
  });

  it('features three entries, two with four images, and spreads the rest over several years', () => {
    const { entries } = generateExperiments(30);
    const list = Object.values(entries);
    const featured = list.filter((entry) => entry['featured'] === true);
    expect(featured).toHaveLength(3);
    const galleries = featured.map((entry) => (entry['images'] as unknown[]).length);
    expect(galleries.filter((n) => n === 4)).toHaveLength(2);
    const years = new Set(list.filter((entry) => entry['featured'] !== true).map((e) => e['year']));
    expect(years.size).toBeGreaterThanOrEqual(4);
  });

  it('lists exactly the image files its entries reference, and never a note', () => {
    const { entries, images } = generateExperiments(30);
    for (const { slug, files } of images) {
      const entry = entries[slug];
      if (!entry) throw new Error(`Missing generated experiment: ${slug}`);
      const referenced = (entry['images'] as { file: string }[]).map((i) => i.file);
      expect(files).toEqual(referenced);
    }
    expect(Object.values(entries).some((entry) => 'note' in entry)).toBe(false);
  });

  it('with fewer entries than featured slots, features them all', () => {
    const { entries } = generateExperiments(2);
    expect(Object.values(entries).every((entry) => entry['featured'] === true)).toBe(true);
  });
});

const page = (opts: {
  path: string;
  other: string;
  prev?: string;
  next?: string;
  links?: string[];
  current?: number;
}) => `<html><head>
<link rel="canonical" href="https://stress.invalid${opts.path}">
<link rel="alternate" hreflang="es" href="https://stress.invalid${opts.other}">
${opts.prev ? `<link rel="prev" href="https://stress.invalid${opts.prev}">` : ''}
${opts.next ? `<link rel="next" href="https://stress.invalid${opts.next}">` : ''}
</head><body><nav aria-label="main"><a href="/experiments/" aria-current="page">Experiments</a></nav><nav class="xp-pager" aria-label="x">${(opts.links ?? []).map((href) => `<a href="${href}">n</a>`).join('')}<span aria-current="page">${opts.current ?? 1}</span></nav></body></html>`;

function site(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const prefix of ['', '/en']) {
    const base = `${prefix}/experiments/`;
    const second = `${prefix}/experiments/page/2/`;
    const other = (path: string) => (prefix === '' ? `/en${path}` : path.replace(/^\/en/, ''));
    out[base] = page({ path: base, other: other(base), next: second, links: [second] });
    out[second] = page({
      path: second,
      other: other(second),
      prev: base,
      links: [base],
      current: 2,
    });
  }
  return out;
}

describe('checkPagerLinks', () => {
  it('accepts a consistent two-page site in both locales', () => {
    expect(checkPagerLinks(site(), 2)).toEqual([]);
  });

  it('reports a pager link that does not resolve', () => {
    const pages = site();
    pages['/experiments/'] = (pages['/experiments/'] ?? '').replace('page/2/">n', 'page/9/">n');
    expect(checkPagerLinks(pages, 2).join('\n')).toMatch(/page\/9\/ does not resolve/);
  });

  it('reports a page 1 URL that exists, a missing page and a wrong canonical', () => {
    const pages = { ...site(), '/experiments/page/1/': '<html></html>' };
    expect(checkPagerLinks(pages, 2).join('\n')).toMatch(/page\/1\/ exists/);
    expect(checkPagerLinks(site(), 3).join('\n')).toMatch(/page\/3\/ was not built/);
    const wrong = site();
    wrong['/experiments/page/2/'] = (wrong['/experiments/page/2/'] ?? '').replace(
      'https://stress.invalid/experiments/page/2/',
      'https://stress.invalid/experiments/',
    );
    expect(checkPagerLinks(wrong, 2).join('\n')).toMatch(/canonical is \/experiments\//);
  });

  it('reports a missing rel=next and a current page rendered as a link', () => {
    const pages = site();
    pages['/experiments/'] = (pages['/experiments/'] ?? '').replace(/<link rel="next"[^>]*>/, '');
    pages['/experiments/page/2/'] = (pages['/experiments/page/2/'] ?? '').replace(
      '<a href="/experiments/">n</a>',
      '<a href="/experiments/page/2/">n</a>',
    );
    const text = checkPagerLinks(pages, 2).join('\n');
    expect(text).toMatch(/\/experiments\/: rel=next is missing/);
    expect(text).toMatch(/\/experiments\/page\/2\/: the current page is a link/);
  });
});

describe('countCards and perCardCost', () => {
  it('counts compact cards by their class', () => {
    expect(countCards('<li id="a" class="xc"><li id="b" class="xc"><li id="c">')).toBe(2);
  });

  it('divides the byte difference by the card difference', () => {
    expect(
      perCardCost([
        { path: '/a/', bytes: 10_000, cards: 12 },
        { path: '/b/', bytes: 6_000, cards: 4 },
      ]),
    ).toBe(500);
    expect(perCardCost([{ path: '/a/', bytes: 10_000, cards: 12 }])).toBeNull();
    expect(perCardCost([])).toBeNull();
  });
});
