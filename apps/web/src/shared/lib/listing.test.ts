import { describe, expect, it } from 'vitest';

import {
  availableSorts,
  listingPath,
  type PageItem,
  pageWindow,
  paginate,
  sortItems,
  summaryRange,
} from './listing.ts';

type Item = { id: string; n: number };
const item = (id: string, n = 0): Item => ({ id, n });
const ids = (items: readonly Item[]) => items.map((i) => i.id);

describe('sortItems', () => {
  const comparators = {
    low: (a: Item, b: Item) => a.n - b.n,
    high: (a: Item, b: Item) => b.n - a.n,
  };

  it('sorts by the comparator of the key and returns a new array', () => {
    const input = [item('a', 2), item('b', 1), item('c', 3)];
    expect(ids(sortItems(input, 'low', comparators))).toEqual(['b', 'a', 'c']);
    expect(ids(sortItems(input, 'high', comparators))).toEqual(['c', 'a', 'b']);
    expect(ids(input)).toEqual(['a', 'b', 'c']);
  });

  it('keeps the incoming order of equal items, whatever the key', () => {
    const input = [item('a', 1), item('b', 1), item('c', 1), item('d', 0)];
    expect(ids(sortItems(input, 'low', comparators))).toEqual(['d', 'a', 'b', 'c']);
    expect(ids(sortItems(input, 'high', comparators))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('is deterministic: the same input always gives the same output', () => {
    const input = Array.from({ length: 30 }, (_, i) => item(`i-${i}`, i % 4));
    expect(sortItems(input, 'low', comparators)).toEqual(sortItems(input, 'low', comparators));
  });
});

describe('paginate', () => {
  const list = (count: number) => Array.from({ length: count }, (_, i) => item(`i-${i + 1}`));

  it('returns one empty page for an empty list', () => {
    const pages = paginate([], { perPage: 12 });
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({ page: 1, pages: 1, items: [], total: 0, from: 0, to: 0 });
  });

  it('returns one page while the list fits in perPage and a second one only beyond it', () => {
    expect(paginate(list(12), { perPage: 12 })).toHaveLength(1);
    expect(paginate(list(13), { perPage: 12 })).toHaveLength(2);
  });

  it('chunks the list in order and reports the range of each page', () => {
    const pages = paginate(list(30), { perPage: 12 });
    expect(pages.map((p) => p.items.length)).toEqual([12, 12, 6]);
    expect(pages.map((p) => [p.from, p.to, p.total])).toEqual([
      [1, 12, 30],
      [13, 24, 30],
      [25, 30, 30],
    ]);
    expect(pages.every((p) => p.pages === 3)).toBe(true);
    expect(pages.flatMap((p) => ids(p.items))).toEqual(ids(list(30)));
  });

  it('carries the leading content count on page 1 only, without using list slots', () => {
    const pages = paginate(list(25), { perPage: 12, leading: 3 });
    expect(pages.map((p) => p.leading)).toEqual([3, 0, 0]);
    expect(pages.map((p) => p.items.length)).toEqual([12, 12, 1]);
    expect(pages[0]?.total).toBe(25);
  });

  it('keeps pinned items on page 1, in list order, and fills the rest in order', () => {
    const all = list(30);
    const last = all.at(-1) as Item;
    const pages = paginate(all, { perPage: 12, pinned: new Set([last]) });
    expect(pages[0]?.items).toHaveLength(12);
    expect(ids(pages[0]?.items ?? [])).toContain(last.id);
    expect(ids(pages[0]?.items ?? []).slice(0, 11)).toEqual(ids(all).slice(0, 11));
    const seen = pages.flatMap((p) => ids(p.items));
    expect([...seen].sort()).toEqual(ids(all).sort());
    expect(pages.map((p) => [p.from, p.to])).toEqual([
      [1, 12],
      [13, 24],
      [25, 30],
    ]);
  });

  it('rejects a perPage that is not a positive integer', () => {
    expect(() => paginate([], { perPage: 0 })).toThrow(/perPage/);
    expect(() => paginate([], { perPage: 2.5 })).toThrow(/perPage/);
  });
});

describe('pageWindow', () => {
  const shape = (items: PageItem[]) =>
    items.map((entry) => (entry.kind === 'ellipsis' ? '…' : entry.page));

  it('shows every page up to seven', () => {
    expect(shape(pageWindow(1, 1))).toEqual([1]);
    expect(shape(pageWindow(1, 2))).toEqual([1, 2]);
    expect(shape(pageWindow(4, 7))).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('shows the first, the last, the current page and its neighbours beyond seven', () => {
    expect(shape(pageWindow(1, 9))).toEqual([1, 2, '…', 9]);
    expect(shape(pageWindow(5, 9))).toEqual([1, '…', 4, 5, 6, '…', 9]);
    expect(shape(pageWindow(9, 9))).toEqual([1, '…', 8, 9]);
    expect(shape(pageWindow(3, 9))).toEqual([1, 2, 3, 4, '…', 9]);
    expect(shape(pageWindow(8, 9))).toEqual([1, '…', 7, 8, 9]);
  });

  it('always keeps the first and the last page, so an ellipsis never hides them', () => {
    for (let current = 1; current <= 40; current++) {
      const pages = pageWindow(current, 40).flatMap((entry) =>
        entry.kind === 'page' ? [entry.page] : [],
      );
      expect(pages[0]).toBe(1);
      expect(pages.at(-1)).toBe(40);
      expect(pages).toContain(current);
    }
  });

  it('never hides a gap of a single page behind an ellipsis', () => {
    expect(shape(pageWindow(4, 8))).toEqual([1, 2, 3, 4, 5, '…', 8]);
  });
});

describe('summaryRange', () => {
  it('gives the 1-based range of a page and the total', () => {
    expect(summaryRange(1, 12, 27)).toEqual({ from: 1, to: 12, total: 27 });
    expect(summaryRange(2, 12, 27)).toEqual({ from: 13, to: 24, total: 27 });
    expect(summaryRange(3, 12, 27)).toEqual({ from: 25, to: 27, total: 27 });
  });

  it('is empty for an empty list', () => {
    expect(summaryRange(1, 12, 0)).toEqual({ from: 0, to: 0, total: 0 });
  });
});

describe('listingPath', () => {
  const base = '/experiments';

  it('uses the base URL for page 1 of the default sort and /page/N/ afterwards', () => {
    expect(listingPath({ base, sort: 'newest', defaultSort: 'newest', page: 1 })).toBe(
      '/experiments/',
    );
    expect(listingPath({ base, sort: 'newest', defaultSort: 'newest', page: 3 })).toBe(
      '/experiments/page/3/',
    );
  });

  it('puts the sort in the path for the other sorts, and never a /page/1/', () => {
    expect(listingPath({ base, sort: 'oldest', defaultSort: 'newest', page: 1 })).toBe(
      '/experiments/oldest/',
    );
    expect(listingPath({ base, sort: 'title', defaultSort: 'newest', page: 2 })).toBe(
      '/experiments/title/page/2/',
    );
  });

  it('treats a missing sort as the default and tolerates a trailing slash on the base', () => {
    expect(listingPath({ base: '/education/', defaultSort: 'oldest', page: 2 })).toBe(
      '/education/page/2/',
    );
    expect(
      listingPath({ base: '/education/', sort: 'newest', defaultSort: 'oldest', page: 1 }),
    ).toBe('/education/newest/');
  });

  it('treats a page below 1 as page 1', () => {
    expect(listingPath({ base, defaultSort: 'newest', page: 0 })).toBe('/experiments/');
  });
});

describe('availableSorts', () => {
  const sorts = ['newest', 'oldest', 'title'] as const;

  it('offers every enabled sort once the list reaches the threshold', () => {
    expect(availableSorts({ sorts, defaultSort: 'newest', count: 4, from: 4 })).toEqual([
      'newest',
      'oldest',
      'title',
    ]);
  });

  it('offers none below the threshold, or with a single enabled sort', () => {
    expect(availableSorts({ sorts, defaultSort: 'newest', count: 3, from: 4 })).toEqual([]);
    expect(
      availableSorts({ sorts: ['newest'], defaultSort: 'newest', count: 40, from: 4 }),
    ).toEqual([]);
  });

  it('puts the default sort first and keeps the order of the rest', () => {
    expect(availableSorts({ sorts, defaultSort: 'title', count: 9, from: 4 })).toEqual([
      'title',
      'newest',
      'oldest',
    ]);
  });
});
