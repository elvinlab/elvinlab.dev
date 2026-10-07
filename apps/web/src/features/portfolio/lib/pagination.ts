import { tierExperiments } from './experiments.ts';

/** The experiments settings of `site.config.ts` (`experiments` block), after validation. */
export type ExperimentsSettings = { perPage: number; maxFeatured: number; meRows: number };

/**
 * `/me` rows never exceed `perPage`: every row links to an anchor of `/experiments/`, and only page
 * 1 is guaranteed to hold them (see `paginateExperiments`).
 */
export const clampMeRows = (meRows: number, perPage: number): number => Math.min(meRows, perPage);

/** The settings with the `/me` clamp applied; every consumer reads the numbers from here. */
export function resolveExperimentsSettings(config: ExperimentsSettings): ExperimentsSettings {
  return { ...config, meRows: clampMeRows(config.meRows, config.perPage) };
}

/** One compact card with its running number across the whole list (big pieces come first). */
export type NumberedEntry<T> = { entry: T; index: number };

/** A page of `/experiments/`: big pieces (page 1 only) and the compact cards grouped by year. */
export type ExperimentsPageData<T> = {
  page: number;
  pages: number;
  big: T[];
  groups: { year: number; entries: NumberedEntry<T>[] }[];
};

type Paginable = { id: string; year: number; featured: boolean };

/**
 * Splits the already sorted experiments into pages. Page 1 holds every big piece plus `perPage`
 * compact cards; later pages hold only compact cards, `perPage` each. A year heading repeats on a
 * page when its group continues from the previous one. Extra pages exist only when the compact tier
 * exceeds `perPage`.
 *
 * The first `pinFirst` entries of the sort (the rows of `/me`) always land on page 1: a pinned
 * compact entry takes a slot of page 1 even when its year would place it later. The `/me` anchors
 * (`/experiments/#<id>`) therefore never point at another page.
 */
export function paginateExperiments<T extends Paginable>(
  sorted: readonly T[],
  { perPage, pinFirst }: { perPage: number; pinFirst: number },
): ExperimentsPageData<T>[] {
  const { big, compact } = tierExperiments(sorted);
  const flat = compact.flatMap(({ entries }) => entries);
  const pinned = new Set(sorted.slice(0, pinFirst));
  const firstPage = new Set<T>(flat.filter((entry) => pinned.has(entry)));
  for (const entry of flat) {
    if (firstPage.size >= perPage) break;
    firstPage.add(entry);
  }
  const chunks: T[][] = [flat.filter((entry) => firstPage.has(entry))];
  const rest = flat.filter((entry) => !firstPage.has(entry));
  for (let at = 0; at < rest.length; at += perPage) chunks.push(rest.slice(at, at + perPage));

  let index = big.length;
  return chunks.map((chunk, i) => {
    const groups: ExperimentsPageData<T>['groups'] = [];
    for (const entry of chunk) {
      const numbered = { entry, index: ++index };
      const last = groups.at(-1);
      if (last?.year === entry.year) last.entries.push(numbered);
      else groups.push({ year: entry.year, entries: [numbered] });
    }
    return { page: i + 1, pages: chunks.length, big: i === 0 ? big : [], groups };
  });
}

/** Path of a page of the experiments list, without locale prefix: page 1 is the base URL. */
export const experimentsPagePath = (page: number): string =>
  page <= 1 ? '/experiments/' : `/experiments/page/${page}/`;

export type PagerItem = { kind: 'page'; page: number } | { kind: 'ellipsis' };

/** Most pages the pager lists in full; beyond that it shows a window with ellipses. */
const PAGER_FULL_LIMIT = 7;

/**
 * The numbered items of the pager: every page up to seven, otherwise the first, the last, the
 * current page and its neighbours. A gap of one page is filled instead of hidden behind an ellipsis.
 */
export function pagerItems(current: number, pages: number): PagerItem[] {
  const shown = new Set<number>();
  if (pages <= PAGER_FULL_LIMIT) {
    for (let page = 1; page <= pages; page++) shown.add(page);
  } else {
    for (const page of [1, pages, current - 1, current, current + 1]) {
      if (page >= 1 && page <= pages) shown.add(page);
    }
  }
  const sorted = [...shown].sort((a, b) => a - b);
  const items: PagerItem[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (page - previous === 2) items.push({ kind: 'page', page: previous + 1 });
    else if (page - previous > 2) items.push({ kind: 'ellipsis' });
    items.push({ kind: 'page', page });
    previous = page;
  }
  return items;
}
