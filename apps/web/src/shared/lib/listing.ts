/**
 * The listing kit: everything a paginated, sortable list page needs that does not depend on what
 * the list holds. Pure functions only (no config, no Astro), so any list page (experiments now,
 * education next) sorts, pages, builds its paths and sizes its pager with the same tested code.
 * The page itself stays static: every sort and page is its own URL, never client-side filtering.
 */

export type Comparator<T> = (a: T, b: T) => number;

/**
 * A new array sorted with the comparator of `key`. Items that compare equal keep their incoming
 * order, so the result never depends on the engine's sort stability or on a hidden tie-break.
 */
export function sortItems<T, K extends string>(
  items: readonly T[],
  key: K,
  comparators: Readonly<Record<K, Comparator<T>>>,
): T[] {
  const compare = comparators[key];
  return items
    .map((item, position) => ({ item, position }))
    .sort((a, b) => compare(a.item, b.item) || a.position - b.position)
    .map(({ item }) => item);
}

/** One page of a listing. `from`/`to` are 1-based positions across the whole list (0 when empty). */
export type ListingPage<T> = {
  page: number;
  pages: number;
  items: T[];
  /** Content shown before the list on page 1 (for example big pieces); it is not part of the list. */
  leading: number;
  from: number;
  to: number;
  total: number;
};

export type PaginateOptions<T> = {
  perPage: number;
  /** How many items of leading content page 1 also carries; they take no slot of the list. */
  leading?: number;
  /** Items that must land on page 1 even when the order would place them later (they keep list order). */
  pinned?: ReadonlySet<T>;
};

/**
 * Splits a sorted list into pages of `perPage`. There is always at least one page, and a second
 * one exists only when the list exceeds `perPage`. Pinned items take page 1 first, then the list
 * fills it in order; every item appears exactly once.
 */
export function paginate<T>(
  items: readonly T[],
  { perPage, leading = 0, pinned }: PaginateOptions<T>,
): ListingPage<T>[] {
  if (!Number.isInteger(perPage) || perPage < 1) {
    throw new Error(`perPage must be a positive integer, got ${perPage}`);
  }
  const firstPage = new Set<T>(pinned ? items.filter((item) => pinned.has(item)) : []);
  for (const item of items) {
    if (firstPage.size >= perPage) break;
    firstPage.add(item);
  }
  const chunks: T[][] = [items.filter((item) => firstPage.has(item))];
  const rest = items.filter((item) => !firstPage.has(item));
  for (let at = 0; at < rest.length; at += perPage) chunks.push(rest.slice(at, at + perPage));

  const total = items.length;
  let seen = 0;
  return chunks.map((chunk, index) => {
    const from = chunk.length === 0 ? 0 : seen + 1;
    seen += chunk.length;
    return {
      page: index + 1,
      pages: chunks.length,
      items: chunk,
      leading: index === 0 ? leading : 0,
      from,
      to: chunk.length === 0 ? 0 : seen,
      total,
    };
  });
}

export type PageItem = { kind: 'page'; page: number } | { kind: 'ellipsis' };

/** Most pages a pager lists in full; beyond that it shows a window with ellipses. */
const FULL_LIMIT = 7;

/**
 * The numbered items of a pager: every page up to seven, otherwise the first, the last, the
 * current page and its neighbours. The first and last page are always there, so an ellipsis never
 * hides them; a gap of a single page is filled instead of hidden behind an ellipsis.
 */
export function pageWindow(current: number, pages: number): PageItem[] {
  const shown = new Set<number>();
  if (pages <= FULL_LIMIT) {
    for (let page = 1; page <= pages; page++) shown.add(page);
  } else {
    for (const page of [1, pages, current - 1, current, current + 1]) {
      if (page >= 1 && page <= pages) shown.add(page);
    }
  }
  const items: PageItem[] = [];
  let previous = 0;
  for (const page of [...shown].sort((a, b) => a - b)) {
    if (page - previous === 2) items.push({ kind: 'page', page: previous + 1 });
    else if (page - previous > 2) items.push({ kind: 'ellipsis' });
    items.push({ kind: 'page', page });
    previous = page;
  }
  return items;
}

/** "13 to 24 of 27": the 1-based range a page shows and the size of the whole list. */
export function summaryRange(
  page: number,
  perPage: number,
  total: number,
): { from: number; to: number; total: number } {
  if (total <= 0) return { from: 0, to: 0, total: 0 };
  const from = (page - 1) * perPage + 1;
  return { from, to: Math.min(page * perPage, total), total };
}

/**
 * URL path of a listing page, with a trailing slash and without locale prefix. The default sort
 * lives at the base (`/experiments/`, `/experiments/page/2/`), any other sort under its key
 * (`/experiments/oldest/`, `/experiments/oldest/page/2/`). Page 1 never has `/page/1/`.
 */
export function listingPath({
  base,
  sort,
  defaultSort,
  page,
}: {
  base: string;
  sort?: string | undefined;
  defaultSort: string;
  page: number;
}): string {
  const root = `/${base.replace(/^\/+|\/+$/g, '')}`;
  const withSort = sort === undefined || sort === defaultSort ? root : `${root}/${sort}`;
  return page <= 1 ? `${withSort}/` : `${withSort}/page/${page}/`;
}

/**
 * The sorts a list offers its visitors, default first: none while the list has fewer than `from`
 * items or only one sort is enabled (a switch with nothing to switch to is noise).
 */
export function availableSorts<K extends string>({
  sorts,
  defaultSort,
  count,
  from,
}: {
  sorts: readonly K[];
  defaultSort: K;
  count: number;
  from: number;
}): K[] {
  if (count < from || sorts.length < 2) return [];
  return [defaultSort, ...sorts.filter((sort) => sort !== defaultSort)];
}
