import { describe, expect, it } from 'vitest';

import { experimentSchema } from '@/features/portfolio/schema.ts';

import {
  ALTERNATE_SORTS,
  checkPagerLinks,
  checkSortVariants,
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
    const galleries = featured.map(
      (entry) => (entry['images'] as unknown[] | undefined)?.length ?? 0,
    );
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

  it('leaves the third featured entry without an image, so the single-column panel is built', () => {
    const { entries } = generateExperiments(30);
    const featured = Object.values(entries).filter((entry) => entry['featured'] === true);
    expect(
      featured.map((entry) => (entry['images'] as unknown[] | undefined)?.length ?? 0),
    ).toEqual([4, 4, 0]);
  });

  it('gives every other compact entry a publishedAt inside its year, and the schema accepts it', () => {
    const schema = experimentSchema();
    const dated = Object.values(generateExperiments(40).entries).filter((e) => 'publishedAt' in e);
    expect(dated.length).toBeGreaterThan(5);
    for (const entry of dated) {
      expect(String(entry['publishedAt']).startsWith(`${entry['year']}-`)).toBe(true);
      expect(schema.safeParse(entry).success).toBe(true);
    }
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
</head><body><nav aria-label="main"><a href="/experiments/" aria-current="page">Experiments</a></nav><nav class="lk-pager" aria-label="x" data-listing-nav>${(opts.links ?? []).map((href) => `<a href="${href}">n</a>`).join('')}<span aria-current="page">${opts.current ?? 1}</span></nav></body></html>`;

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

  it('divides the byte difference by the card difference between later pages', () => {
    expect(
      perCardCost([
        { path: '/experiments/page/2/', bytes: 10_000, cards: 12 },
        { path: '/experiments/page/3/', bytes: 6_000, cards: 4 },
      ]),
    ).toBe(500);
    expect(perCardCost([{ path: '/experiments/page/2/', bytes: 10_000, cards: 12 }])).toBeNull();
    // Pages of an alternate sort are not part of the comparison.
    expect(
      perCardCost([
        { path: '/experiments/page/2/', bytes: 10_000, cards: 12 },
        { path: '/experiments/oldest/page/3/', bytes: 1_000, cards: 2 },
      ]),
    ).toBeNull();
    expect(perCardCost([])).toBeNull();
  });

  it('ignores page 1, which also holds the big pieces and so has another shell', () => {
    // Page 1 vs page 3 would give (123_000 - 99_000) / 9 = 2_667 B: the big pieces, not the cards.
    // Pages 2 and 3 share a shell: (108_000 - 99_000) / 9 = 1_000 B per card.
    expect(
      perCardCost([
        { path: '/experiments/', bytes: 123_000, cards: 12 },
        { path: '/experiments/page/2/', bytes: 108_000, cards: 12 },
        { path: '/experiments/page/3/', bytes: 99_000, cards: 3 },
      ]),
    ).toBe(1_000);
    expect(
      perCardCost([
        { path: '/en/experiments/', bytes: 123_000, cards: 12 },
        { path: '/en/experiments/page/2/', bytes: 99_000, cards: 3 },
      ]),
    ).toBeNull();
  });
});

/** A built page of an alternate sort (or of the default sort) with its sort switch. */
const sortedPage = (opts: {
  path: string;
  other: string;
  switchLinks: string[];
  noindex?: boolean;
  prev?: string;
  next?: string;
  pager?: string[];
}) => `<html><head>
${opts.noindex === false ? '' : '<meta name="robots" content="noindex, follow">'}
<link rel="canonical" href="https://stress.invalid${opts.path}">
<link rel="alternate" hreflang="es" href="https://stress.invalid${opts.other}">
${opts.prev ? `<link rel="prev" href="https://stress.invalid${opts.prev}">` : ''}
${opts.next ? `<link rel="next" href="https://stress.invalid${opts.next}">` : ''}
</head><body><nav data-listing-sort>${opts.switchLinks
  .map((href, i) => `<a href="${href}"${i === 0 ? ' aria-current="true"' : ''}>s</a>`)
  .join(
    '',
  )}</nav><nav data-listing-nav>${(opts.pager ?? []).map((href) => `<a href="${href}">n</a>`).join('')}</nav></body></html>`;

/** Two pages of the default sort and of each alternate sort, in both locales. */
function sortedSite(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const prefix of ['', '/en']) {
    const other = (path: string) => (prefix === '' ? `/en${path}` : path.replace(/^\/en/, ''));
    const switchLinks = [
      `${prefix}/experiments/`,
      ...ALTERNATE_SORTS.map((sort) => `${prefix}/experiments/${sort}/`),
    ];
    for (const sort of [undefined, ...ALTERNATE_SORTS]) {
      const base = sort === undefined ? `${prefix}/experiments/` : `${prefix}/experiments/${sort}/`;
      const second = `${base}page/2/`;
      out[base] = sortedPage({
        path: base,
        other: other(base),
        switchLinks,
        noindex: sort !== undefined,
        next: second,
        pager: [second],
      });
      out[second] = sortedPage({
        path: second,
        other: other(second),
        switchLinks,
        noindex: sort !== undefined,
        prev: base,
        pager: [base],
      });
    }
  }
  return out;
}

describe('checkSortVariants', () => {
  const options = {
    sorts: ALTERNATE_SORTS,
    absent: ['newest'],
    expectedPages: 2,
    defaultSort: 'newest',
  };

  it('accepts consistent sorted pages in both locales', () => {
    expect(checkSortVariants(sortedSite(), options)).toEqual([]);
  });

  it('reports a sorted page that is indexable, with a wrong canonical or a broken sort link', () => {
    const pages = sortedSite();
    pages['/experiments/oldest/'] = (pages['/experiments/oldest/'] ?? '').replace(
      /<meta name="robots"[^>]*>/,
      '',
    );
    pages['/experiments/title/'] = (pages['/experiments/title/'] ?? '').replace(
      'href="/experiments/oldest/"',
      'href="/experiments/oldest/9/"',
    );
    pages['/en/experiments/title/page/2/'] = (pages['/en/experiments/title/page/2/'] ?? '').replace(
      'https://stress.invalid/en/experiments/title/page/2/',
      'https://stress.invalid/en/experiments/title/',
    );
    const text = checkSortVariants(pages, options).join('\n');
    expect(text).toMatch(/\/experiments\/oldest\/: not noindex/);
    expect(text).toMatch(
      /\/experiments\/title\/: sort link \/experiments\/oldest\/9\/ does not resolve/,
    );
    expect(text).toMatch(/\/en\/experiments\/title\/page\/2\/: canonical is/);
  });

  it('reports broken prev/next and hreflang inside a sort, and a pager that leaves the sort', () => {
    const pages = sortedSite();
    pages['/experiments/oldest/'] = (pages['/experiments/oldest/'] ?? '').replace(
      /<link rel="next"[^>]*>/,
      '',
    );
    pages['/experiments/oldest/page/2/'] = (pages['/experiments/oldest/page/2/'] ?? '')
      .replace('href="/experiments/oldest/">n', 'href="/experiments/">n')
      .replace(/<link rel="alternate"[^>]*>/, '');
    const text = checkSortVariants(pages, options).join('\n');
    expect(text).toMatch(/\/experiments\/oldest\/: rel=next is missing/);
    expect(text).toMatch(/oldest\/page\/2\/: pager link \/experiments\/ leaves the sort/);
    expect(text).toMatch(/oldest\/page\/2\/: hreflang alternate/);
  });

  it('reports a sort page that should not exist and a page that was not built', () => {
    const pages = { ...sortedSite(), '/experiments/newest/': '<html></html>' };
    expect(checkSortVariants(pages, options).join('\n')).toMatch(/\/experiments\/newest\/ exists/);
    const missing = sortedSite();
    delete missing['/en/experiments/oldest/page/2/'];
    expect(checkSortVariants(missing, options).join('\n')).toMatch(
      /oldest\/page\/2\/ was not built/,
    );
  });

  it('reports a default page whose switch is missing', () => {
    const pages = sortedSite();
    pages['/experiments/'] = (pages['/experiments/'] ?? '').replace(
      /<nav data-listing-sort>[\s\S]*?<\/nav>/,
      '',
    );
    expect(checkSortVariants(pages, options).join('\n')).toMatch(/\/experiments\/: 0 sort links/);
  });
});
