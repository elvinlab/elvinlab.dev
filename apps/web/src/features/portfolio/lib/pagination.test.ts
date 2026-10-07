import { describe, expect, it } from 'vitest';

import {
  clampMeRows,
  compactCount,
  type ExperimentsSettings,
  experimentDate,
  experimentsPagePath,
  offeredExperimentSorts,
  paginateExperiments,
  resolveExperimentsSettings,
  showYearHeadings,
  sortExperimentList,
} from './pagination.ts';

type Entry = {
  id: string;
  title: string;
  year: number;
  featured: boolean;
  publishedAt?: string;
  order?: number;
};

const entry = (id: string, year: number, extra: Partial<Entry> = {}): Entry => ({
  id,
  title: id,
  year,
  featured: false,
  ...extra,
});

/** Sorted the way `sortExperiments` returns them: featured first, then newest year. */
function catalog(featured: number, compact: number): Entry[] {
  const big = Array.from({ length: featured }, (_, i) =>
    entry(`big-${i + 1}`, 2026, { featured: true }),
  );
  const rest = Array.from({ length: compact }, (_, i) =>
    entry(`c-${String(i + 1).padStart(3, '0')}`, 2025 - Math.floor(i / 5)),
  );
  return [...big, ...rest];
}

const ids = (entries: readonly Entry[]) => entries.map((e) => e.id);

const settings: ExperimentsSettings = {
  perPage: 12,
  maxFeatured: 3,
  meRows: 3,
  defaultSort: 'newest',
  sorts: ['newest', 'oldest', 'title'],
  sortFrom: 4,
};

describe('experimentDate', () => {
  it('uses publishedAt, else 1 January of the year', () => {
    expect(experimentDate(entry('a', 2025, { publishedAt: '2025-07-04' }))).toBe('2025-07-04');
    expect(experimentDate(entry('a', 2025))).toBe('2025-01-01');
  });
});

describe('sortExperimentList', () => {
  const list = [
    entry('b', 2024, { title: 'banana' }),
    entry('a', 2025, { title: 'Apple' }),
    entry('c', 2025, { title: 'cherry', publishedAt: '2025-09-01' }),
    entry('d', 2023, { title: 'Éclair' }),
  ];

  it('newest puts the latest date first, a publishedAt after 1 January of the same year', () => {
    expect(ids(sortExperimentList(list, 'newest', 'es'))).toEqual(['c', 'a', 'b', 'd']);
  });

  it('oldest is the exact reverse order of dates', () => {
    expect(ids(sortExperimentList(list, 'oldest', 'es'))).toEqual(['d', 'b', 'a', 'c']);
  });

  it('title is A to Z, case-insensitive and accent-aware', () => {
    expect(ids(sortExperimentList(list, 'title', 'es'))).toEqual(['a', 'b', 'c', 'd']);
    const mixed = [entry('x', 2025, { title: 'zebra' }), entry('y', 2025, { title: 'Alpha' })];
    expect(ids(sortExperimentList(mixed, 'title', 'en'))).toEqual(['y', 'x']);
  });

  it('breaks ties by order ascending (default 100), then by id', () => {
    const tied = [
      entry('z', 2025),
      entry('m', 2025, { order: 5 }),
      entry('a', 2025),
      entry('q', 2025, { order: 200 }),
    ];
    expect(ids(sortExperimentList(tied, 'newest', 'es'))).toEqual(['m', 'a', 'z', 'q']);
    expect(ids(sortExperimentList(tied, 'oldest', 'es'))).toEqual(['m', 'a', 'z', 'q']);
    const sameTitle = [entry('b', 2025, { title: 'same' }), entry('a', 2025, { title: 'same' })];
    expect(ids(sortExperimentList(sameTitle, 'title', 'es'))).toEqual(['a', 'b']);
  });
});

describe('paginateExperiments', () => {
  const options = { perPage: 12, pinFirst: 3 };
  const compactIds = (page: ReturnType<typeof paginateExperiments<Entry>>[number]) =>
    ids(page.entries);

  it('returns one page, with no pager, when the compact tier fits in perPage', () => {
    const pages = paginateExperiments(catalog(2, 12), options);
    expect(pages).toHaveLength(1);
    expect(pages[0]?.pages).toBe(1);
    expect(ids(pages[0]?.big ?? [])).toEqual(['big-1', 'big-2']);
    expect(pages[0]?.entries).toHaveLength(12);
  });

  it('creates a second page only when the compact tier exceeds perPage', () => {
    expect(paginateExperiments(catalog(3, 13), options)).toHaveLength(2);
    expect(paginateExperiments(catalog(0, 0), options)).toHaveLength(1);
    expect(paginateExperiments([], options)[0]?.big).toEqual([]);
  });

  it('puts every big piece and the first perPage compact cards on page 1, only compact cards after', () => {
    const pages = paginateExperiments(catalog(3, 30), options);
    expect(pages.map((p) => p.page)).toEqual([1, 2, 3]);
    expect(pages.every((p) => p.pages === 3)).toBe(true);
    expect(ids(pages[0]?.big ?? [])).toEqual(['big-1', 'big-2', 'big-3']);
    expect(pages[1]?.big).toEqual([]);
    expect(pages.map((p) => p.entries.length)).toEqual([12, 12, 6]);
  });

  it('reports the range of each page over the compact list (not counting the big pieces)', () => {
    const pages = paginateExperiments(catalog(3, 27), options);
    expect(pages.map((p) => [p.from, p.to, p.total])).toEqual([
      [1, 12, 27],
      [13, 24, 27],
      [25, 27, 27],
    ]);
  });

  it('lists every entry exactly once across pages, whatever the sort', () => {
    const all = catalog(2, 40);
    for (const sort of ['newest', 'oldest', 'title'] as const) {
      const pages = paginateExperiments(all, { ...options, sort });
      const seen = pages.flatMap((p) => [...ids(p.big), ...compactIds(p)]);
      expect([...seen].sort(), sort).toEqual(ids(all).sort());
    }
  });

  it('keeps the featured pieces on page 1, first, whatever the sort', () => {
    const all = [
      entry('f1', 2020, { featured: true, title: 'Zzz' }),
      entry('f2', 2019, { featured: true, title: 'Yyy' }),
      ...Array.from({ length: 20 }, (_, i) => entry(`c-${i}`, 2025 - i, { title: `t-${i}` })),
    ];
    for (const sort of ['newest', 'oldest', 'title'] as const) {
      const pages = paginateExperiments(all, { perPage: 12, pinFirst: 0, sort });
      expect(ids(pages[0]?.big ?? []), sort).toEqual(['f1', 'f2']);
      expect(pages.slice(1).every((p) => p.big.length === 0)).toBe(true);
    }
  });

  it('orders the compact list with the chosen sort across pages', () => {
    const all = Array.from({ length: 30 }, (_, i) =>
      entry(`e-${String(i).padStart(2, '0')}`, 2000 + i),
    );
    const oldest = paginateExperiments([entry('f', 2026, { featured: true }), ...all], {
      perPage: 12,
      pinFirst: 0,
      sort: 'oldest',
    });
    expect(oldest.flatMap(compactIds)).toEqual(ids(all));
    const newest = paginateExperiments([entry('f', 2026, { featured: true }), ...all], {
      perPage: 12,
      pinFirst: 0,
      sort: 'newest',
    });
    expect(newest.flatMap(compactIds)).toEqual(ids(all).reverse());
  });

  it('groups a page by year runs for the date sorts, repeating a year that continues', () => {
    const all = [
      entry('a', 2025),
      ...['b', 'c', 'd', 'e'].map((id) => entry(id, 2025)),
      entry('f', 2024),
    ];
    // No featured entry: the first entry is the big piece; five compact entries remain.
    const pages = paginateExperiments(all, { perPage: 3, pinFirst: 1 });
    expect(pages).toHaveLength(2);
    expect(pages[0]?.groups.map((g) => g.year)).toEqual([2025]);
    expect(pages[1]?.groups.map((g) => g.year)).toEqual([2025, 2024]);
  });

  it('keeps the first pinFirst entries of the incoming order on page 1 for several shapes', () => {
    const shapes: [number, number, number, number][] = [
      // featured, compact, perPage, pinFirst
      [0, 30, 12, 3],
      [1, 30, 12, 3],
      [2, 30, 12, 3],
      [3, 30, 4, 4],
      [3, 100, 12, 6],
      [1, 50, 4, 4],
    ];
    for (const [featured, compact, perPage, pinFirst] of shapes) {
      const all = catalog(featured, compact);
      const [first] = paginateExperiments(all, { perPage, pinFirst });
      const onFirst = new Set([...ids(first?.big ?? []), ...ids(first?.entries ?? [])]);
      for (const id of ids(all.slice(0, pinFirst))) expect(onFirst.has(id)).toBe(true);
    }
  });

  it('pulls an old entry that the incoming order ranks early (low order) onto page 1', () => {
    const all = [
      entry('f', 2026, { featured: true }),
      entry('old-but-first', 2020),
      ...Array.from({ length: 20 }, (_, i) => entry(`n-${i}`, 2025)),
    ];
    const pages = paginateExperiments(all, options);
    expect(pages[0] ? ids(pages[0].entries) : []).toContain('old-but-first');
    expect(pages[0]?.entries).toHaveLength(12);
    expect(pages[0]?.groups.at(-1)?.year).toBe(2020);
  });
});

describe('showYearHeadings', () => {
  const page = (...years: number[]) => ({ groups: years.map((year) => ({ year, entries: [] })) });

  it('shows year headings only for a date sort and two or more distinct years', () => {
    expect(showYearHeadings(page(2026, 2025), 'newest')).toBe(true);
    expect(showYearHeadings(page(2026, 2025), 'oldest')).toBe(true);
    expect(showYearHeadings(page(2026), 'newest')).toBe(false);
    expect(showYearHeadings(page(2026, 2025), 'title')).toBe(false);
    expect(showYearHeadings(page(2026, 2025, 2026), 'newest')).toBe(true);
    expect(showYearHeadings(page(2026, 2026), 'newest')).toBe(false);
  });
});

describe('compactCount and offeredExperimentSorts', () => {
  it('counts every entry that is not a big piece', () => {
    expect(compactCount(catalog(2, 5))).toBe(5);
    expect(compactCount(catalog(0, 5))).toBe(4);
    expect(compactCount([])).toBe(0);
  });

  it('offers the enabled sorts from sortFrom compact entries on, default first', () => {
    expect(offeredExperimentSorts(3, settings)).toEqual([]);
    expect(offeredExperimentSorts(4, settings)).toEqual(['newest', 'oldest', 'title']);
    expect(offeredExperimentSorts(9, { ...settings, defaultSort: 'title' })).toEqual([
      'title',
      'newest',
      'oldest',
    ]);
    expect(offeredExperimentSorts(9, { ...settings, sorts: ['newest'] })).toEqual([]);
  });
});

describe('clampMeRows and resolveExperimentsSettings', () => {
  it('never lets the /me rows exceed perPage', () => {
    expect(clampMeRows(6, 4)).toBe(4);
    expect(clampMeRows(3, 12)).toBe(3);
  });

  it('applies the clamp and keeps the rest', () => {
    expect(resolveExperimentsSettings(settings)).toEqual(settings);
    expect(resolveExperimentsSettings({ ...settings, perPage: 4, meRows: 6 }).meRows).toBe(4);
  });
});

describe('experimentsPagePath', () => {
  it('uses the base URL for page 1 and /page/N/ afterwards', () => {
    expect(experimentsPagePath(1)).toBe('/experiments/');
    expect(experimentsPagePath(2)).toBe('/experiments/page/2/');
    expect(experimentsPagePath(12)).toBe('/experiments/page/12/');
  });

  it('puts a non-default sort in the path', () => {
    expect(experimentsPagePath(1, 'oldest')).toBe('/experiments/oldest/');
    expect(experimentsPagePath(3, 'title')).toBe('/experiments/title/page/3/');
    expect(experimentsPagePath(1, 'newest')).toBe('/experiments/');
    expect(experimentsPagePath(2, 'newest', 'title')).toBe('/experiments/newest/page/2/');
    expect(experimentsPagePath(2, 'title', 'title')).toBe('/experiments/page/2/');
  });
});
