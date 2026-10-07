import { describe, expect, it } from 'vitest';

import {
  clampMeRows,
  experimentsPagePath,
  pagerItems,
  paginateExperiments,
  resolveExperimentsSettings,
} from './pagination.ts';

type Entry = { id: string; year: number; featured: boolean };

const entry = (id: string, year: number, featured = false): Entry => ({ id, year, featured });

/** Sorted the way `sortExperiments` returns them: featured first, then newest year. */
function catalog(featured: number, compact: number): Entry[] {
  const big = Array.from({ length: featured }, (_, i) => entry(`big-${i + 1}`, 2026, true));
  const rest = Array.from({ length: compact }, (_, i) =>
    entry(`c-${String(i + 1).padStart(3, '0')}`, 2025 - Math.floor(i / 5)),
  );
  return [...big, ...rest];
}

const ids = (entries: readonly Entry[]) => entries.map((e) => e.id);
const compactIds = (page: ReturnType<typeof paginateExperiments<Entry>>[number]) =>
  page.groups.flatMap((group) => group.entries.map(({ entry: e }) => e.id));

describe('paginateExperiments', () => {
  it('returns one page, with no pager, when the compact tier fits in perPage', () => {
    const pages = paginateExperiments(catalog(2, 12), { perPage: 12, pinFirst: 3 });
    expect(pages).toHaveLength(1);
    expect(pages[0]?.pages).toBe(1);
    expect(ids(pages[0]?.big ?? [])).toEqual(['big-1', 'big-2']);
    expect(compactIds(pages[0] as never)).toHaveLength(12);
  });

  it('creates a second page only when the compact tier exceeds perPage', () => {
    expect(paginateExperiments(catalog(3, 13), { perPage: 12, pinFirst: 3 })).toHaveLength(2);
    expect(paginateExperiments(catalog(0, 0), { perPage: 12, pinFirst: 3 })).toHaveLength(1);
    expect(paginateExperiments([], { perPage: 12, pinFirst: 3 })[0]?.big).toEqual([]);
  });

  it('puts every big piece and the first perPage compact cards on page 1, only compact cards after', () => {
    const pages = paginateExperiments(catalog(3, 30), { perPage: 12, pinFirst: 3 });
    expect(pages.map((p) => p.page)).toEqual([1, 2, 3]);
    expect(pages.every((p) => p.pages === 3)).toBe(true);
    expect(ids(pages[0]?.big ?? [])).toEqual(['big-1', 'big-2', 'big-3']);
    expect(pages[1]?.big).toEqual([]);
    expect(pages[2]?.big).toEqual([]);
    expect(pages.map((p) => compactIds(p).length)).toEqual([12, 12, 6]);
  });

  it('lists every entry exactly once across pages and numbers them continuously', () => {
    const all = catalog(2, 40);
    const pages = paginateExperiments(all, { perPage: 12, pinFirst: 3 });
    const seen = pages.flatMap((p) => [...ids(p.big), ...compactIds(p)]);
    expect([...seen].sort()).toEqual(ids(all).sort());
    const numbers = pages.flatMap((p) => p.groups.flatMap((g) => g.entries.map((e) => e.index)));
    expect(numbers).toEqual(Array.from({ length: 40 }, (_, i) => i + 3));
  });

  it('repeats a year heading at the top of the next page when its group continues', () => {
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

  it('groups by year, newest first, inside each page', () => {
    const pages = paginateExperiments(catalog(1, 22), { perPage: 12, pinFirst: 3 });
    for (const page of pages) {
      const years = page.groups.map((g) => g.year);
      expect(years).toEqual([...years].sort((a, b) => b - a));
    }
  });

  it('keeps the first pinFirst entries of the sort on page 1 for several shapes', () => {
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
      const onFirst = new Set([...ids(first?.big ?? []), ...compactIds(first as never)]);
      for (const id of ids(all.slice(0, pinFirst))) expect(onFirst.has(id)).toBe(true);
    }
  });

  it('pulls an old entry that the sort ranks early (low order) onto page 1', () => {
    // Sorted by `order` first, so the oldest entry leads the compact tier of the sort but sits
    // last when the compact tier is grouped by year.
    const all = [
      entry('f', 2026, true),
      entry('old-but-first', 2020),
      ...Array.from({ length: 20 }, (_, i) => entry(`n-${i}`, 2025)),
    ];
    const pages = paginateExperiments(all, { perPage: 12, pinFirst: 3 });
    expect(compactIds(pages[0] as never)).toContain('old-but-first');
    expect(compactIds(pages[0] as never)).toHaveLength(12);
    expect(pages[0]?.groups.at(-1)?.year).toBe(2020);
  });
});

describe('clampMeRows and resolveExperimentsSettings', () => {
  it('never lets the /me rows exceed perPage', () => {
    expect(clampMeRows(6, 4)).toBe(4);
    expect(clampMeRows(3, 12)).toBe(3);
  });

  it('applies the documented defaults and the clamp', () => {
    expect(resolveExperimentsSettings({ perPage: 12, maxFeatured: 3, meRows: 3 })).toEqual({
      perPage: 12,
      maxFeatured: 3,
      meRows: 3,
    });
    expect(resolveExperimentsSettings({ perPage: 4, maxFeatured: 1, meRows: 6 }).meRows).toBe(4);
  });
});

describe('experimentsPagePath', () => {
  it('uses the base URL for page 1 and /page/N/ afterwards', () => {
    expect(experimentsPagePath(1)).toBe('/experiments/');
    expect(experimentsPagePath(2)).toBe('/experiments/page/2/');
    expect(experimentsPagePath(12)).toBe('/experiments/page/12/');
  });
});

describe('pagerItems', () => {
  const shape = (items: ReturnType<typeof pagerItems>) =>
    items.map((item) => (item.kind === 'ellipsis' ? '…' : item.page));

  it('shows every page up to seven', () => {
    expect(shape(pagerItems(1, 2))).toEqual([1, 2]);
    expect(shape(pagerItems(4, 7))).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('shows a window with ellipses beyond seven pages', () => {
    expect(shape(pagerItems(1, 9))).toEqual([1, 2, '…', 9]);
    expect(shape(pagerItems(5, 9))).toEqual([1, '…', 4, 5, 6, '…', 9]);
    expect(shape(pagerItems(9, 9))).toEqual([1, '…', 8, 9]);
    expect(shape(pagerItems(3, 9))).toEqual([1, 2, 3, 4, '…', 9]);
    expect(shape(pagerItems(8, 9))).toEqual([1, '…', 7, 8, 9]);
  });

  it('never hides a gap of a single page behind an ellipsis', () => {
    expect(shape(pagerItems(4, 8))).toEqual([1, 2, 3, 4, 5, '…', 8]);
  });
});
