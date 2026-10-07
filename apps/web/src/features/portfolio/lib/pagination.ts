/**
 * The experiments side of the listing kit (`shared/lib/listing.ts`): what an experiment is sorted
 * by, which entries are big pieces, how the compact list is grouped by year, and the URLs of its
 * pages. The generic sorting, paging, windowing and path logic lives in the kit; this file only
 * says what is specific to experiments.
 */
import type { ListingSort } from '@/shared/config/schema.ts';
import {
  availableSorts,
  type Comparator,
  listingPath,
  paginate,
  sortItems,
} from '@/shared/lib/listing.ts';

import { splitTiers } from './experiments.ts';
import { DEFAULT_EXPERIMENT_ORDER } from './portfolio.ts';

export type ExperimentSort = ListingSort;

/** The experiments settings of `site.config.ts` (`experiments` block), after validation. */
export type ExperimentsSettings = {
  perPage: number;
  maxFeatured: number;
  meRows: number;
  defaultSort: ExperimentSort;
  sorts: readonly ExperimentSort[];
  sortFrom: number;
};

/**
 * `/me` rows never exceed `perPage`: every row links to an anchor of `/experiments/`, and only page
 * 1 is guaranteed to hold them (see `paginateExperiments`).
 */
export const clampMeRows = (meRows: number, perPage: number): number => Math.min(meRows, perPage);

/** The settings with the `/me` clamp applied; every consumer reads the numbers from here. */
export function resolveExperimentsSettings(config: ExperimentsSettings): ExperimentsSettings {
  return { ...config, meRows: clampMeRows(config.meRows, config.perPage) };
}

type Sortable = {
  id: string;
  title: string;
  year: number;
  featured: boolean;
  publishedAt?: string | undefined;
  order?: number | undefined;
};

/** The date an experiment sorts by: its `publishedAt`, else 1 January of its `year` (ISO, so it compares as text). */
export const experimentDate = ({
  publishedAt,
  year,
}: Pick<Sortable, 'publishedAt' | 'year'>): string =>
  publishedAt ?? `${String(year).padStart(4, '0')}-01-01`;

const text = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The comparators of the three sorts. Every one ends in the same tie-break (`order` ascending, then
 * the id), so equal dates or titles never depend on the loader. Titles use a collator that ignores
 * case and accents, in the locale the caller passes (use the site's default locale so the Spanish
 * and English twins of a page list the same entries).
 */
function comparators<T extends Sortable>(locale: string): Record<ExperimentSort, Comparator<T>> {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  const tie = (a: T, b: T): number =>
    (a.order ?? DEFAULT_EXPERIMENT_ORDER) - (b.order ?? DEFAULT_EXPERIMENT_ORDER) ||
    text(a.id, b.id);
  return {
    newest: (a, b) => text(experimentDate(b), experimentDate(a)) || tie(a, b),
    oldest: (a, b) => text(experimentDate(a), experimentDate(b)) || tie(a, b),
    title: (a, b) => collator.compare(a.title, b.title) || tie(a, b),
  };
}

/** A new array of `entries` in the order of `sort`. */
export function sortExperimentList<T extends Sortable>(
  entries: readonly T[],
  sort: ExperimentSort,
  locale: string,
): T[] {
  return sortItems(entries, sort, comparators<T>(locale));
}

/** A page of `/experiments/`: big pieces (page 1 only) and its slice of the compact list. */
export type ExperimentsPageData<T> = {
  page: number;
  pages: number;
  big: T[];
  entries: T[];
  /** `entries` as runs of the same year (meaningful for the date sorts). */
  groups: { year: number; entries: T[] }[];
  from: number;
  to: number;
  total: number;
};

/**
 * Splits the experiments into pages. The big pieces (featured entries) always lead page 1 and never
 * move with the sort; the rest, the compact list, is sorted by `sort` and paged `perPage` at a time.
 * Extra pages exist only when the compact list exceeds `perPage`.
 *
 * The first `pinFirst` entries of the incoming order (the rows of `/me`) always land on page 1: a
 * pinned compact entry takes a slot of page 1 even when the sort would place it later, so the
 * `/me` anchors (`/experiments/#<id>`) never point at another page. Pass 0 for a sort that is not
 * the default one: no anchor points at it.
 */
export function paginateExperiments<T extends Sortable>(
  incoming: readonly T[],
  {
    perPage,
    pinFirst,
    sort = 'newest',
    locale = 'es',
  }: { perPage: number; pinFirst: number; sort?: ExperimentSort; locale?: string },
): ExperimentsPageData<T>[] {
  const { big, rest } = splitTiers(incoming);
  const pinned = pinFirst > 0 ? new Set(incoming.slice(0, pinFirst)) : undefined;
  const pages = paginate(sortExperimentList(rest, sort, locale), {
    perPage,
    leading: big.length,
    ...(pinned ? { pinned } : {}),
  });
  return pages.map(({ page, pages: count, items, from, to, total }) => {
    const groups: ExperimentsPageData<T>['groups'] = [];
    for (const entry of items) {
      const last = groups.at(-1);
      if (last?.year === entry.year) last.entries.push(entry);
      else groups.push({ year: entry.year, entries: [entry] });
    }
    return {
      page,
      pages: count,
      big: page === 1 ? big : [],
      entries: items,
      groups,
      from,
      to,
      total,
    };
  });
}

/**
 * Year headings help to scan a date order and only there: not for A to Z, and not when the page
 * holds a single year (a lone heading above every card says nothing).
 */
export function showYearHeadings(
  page: { groups: readonly { year: number }[] },
  sort: ExperimentSort,
): boolean {
  return sort !== 'title' && new Set(page.groups.map((group) => group.year)).size >= 2;
}

/** How many experiments are in the compact list (everything that is not a big piece). */
export const compactCount = (entries: readonly Sortable[]): number =>
  splitTiers(entries).rest.length;

/** The sorts the page offers for a compact list of `count` entries, default first; none below `sortFrom`. */
export const offeredExperimentSorts = (
  count: number,
  { sorts, defaultSort, sortFrom }: ExperimentsSettings,
): ExperimentSort[] => availableSorts({ sorts, defaultSort, count, from: sortFrom });

/**
 * Path of a page of the experiments list, without locale prefix: page 1 of the default sort is the
 * base URL, another sort lives under its key (`/experiments/oldest/page/2/`).
 */
export const experimentsPagePath = (
  page: number,
  sort?: ExperimentSort,
  defaultSort: ExperimentSort = 'newest',
): string => listingPath({ base: '/experiments', sort, defaultSort, page });
