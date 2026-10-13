import { LISTING_SORTS, type ListingSort } from '@/shared/config/schema.ts';
import {
  availableSorts,
  type Comparator,
  type ListingPage,
  listingPath,
  paginate,
  sortItems,
} from '@/shared/lib/listing.ts';

/** The orders of the education timeline: the education page offers the first two listing sorts only. */
export type EducationSort = Extract<ListingSort, 'oldest' | 'newest'>;

/** The default order is the newest entry first. The other one (oldest first) is an alternate page. */
export const EDUCATION_DEFAULT_SORT: EducationSort = 'newest';
const EDUCATION_SORTS = LISTING_SORTS.filter(
  (sort): sort is EducationSort => sort === 'oldest' || sort === 'newest',
);

/** Minimal shape the timeline helpers need; content entries and fixtures both satisfy it. */
type EducationLike = {
  id?: string;
  data: { year: number; month?: number | undefined; order?: number | undefined };
};

// The year orders entries. Inside a year: an explicit editorial `order` first (lower first, entries
// with one come before the rest), then the month in the direction of the sort (an unknown month
// counts as the start of the year: first when oldest first, last when newest first), then the id. The
// content store does not promise the order of the JSON file, so the id (not the incoming position)
// is the deterministic last tie-break.
const byEditorialOrder = (a: EducationLike, b: EducationLike): number =>
  (a.data.order ?? Number.MAX_SAFE_INTEGER) - (b.data.order ?? Number.MAX_SAFE_INTEGER);
const byId = (a: EducationLike, b: EducationLike): number => (a.id ?? '').localeCompare(b.id ?? '');
const monthOf = (entry: EducationLike): number => entry.data.month ?? 0;

const COMPARATORS: Record<EducationSort, Comparator<EducationLike>> = {
  oldest: (a, b) =>
    a.data.year - b.data.year || byEditorialOrder(a, b) || monthOf(a) - monthOf(b) || byId(a, b),
  newest: (a, b) =>
    b.data.year - a.data.year || byEditorialOrder(a, b) || monthOf(b) - monthOf(a) || byId(a, b),
};

/** A new array in the order of `sort`; inside a year: the entry `order`, then the month, then its id. */
export function sortEducation<T extends EducationLike>(
  entries: readonly T[],
  sort: EducationSort,
): T[] {
  return sortItems(entries, sort, COMPARATORS);
}

/** Entries grouped by year, in the incoming order (the list must already be sorted by year). */
export function groupEducationByYear<T extends EducationLike>(
  entries: readonly T[],
): { year: number; items: T[] }[] {
  const groups: { year: number; items: T[] }[] = [];
  for (const entry of entries) {
    const last = groups.at(-1);
    if (last && last.year === entry.data.year) last.items.push(entry);
    else groups.push({ year: entry.data.year, items: [entry] });
  }
  return groups;
}

/** The date as it is known: the year alone, or the short month and the year. */
export function educationDateLabel(
  year: number,
  month: number | undefined,
  locale: string,
): string {
  if (month === undefined) return String(year);
  const name = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
  return `${name} ${year}`;
}

/** The sorts the visitor can choose: none while the list is shorter than `sortFrom`. */
export function offeredEducationSorts(count: number, sortFrom: number): EducationSort[] {
  return availableSorts({
    sorts: EDUCATION_SORTS,
    defaultSort: EDUCATION_DEFAULT_SORT,
    count,
    from: sortFrom,
  });
}

/** Path of a page of the timeline (no locale prefix); the default order lives at the base. */
export const educationPath = (page: number, sort?: EducationSort): string =>
  listingPath({ base: 'education', sort, defaultSort: EDUCATION_DEFAULT_SORT, page });

/** The sorted entries split into pages; there is always at least one page. */
export function paginateEducation<T extends EducationLike>(
  entries: readonly T[],
  { perPage, sort }: { perPage: number; sort: EducationSort },
): ListingPage<T>[] {
  return paginate(sortEducation(entries, sort), { perPage });
}

/** The sort param of a route, checked: only an education sort can reach a page. */
export function educationSortParam(value: string | undefined): EducationSort {
  const sort = EDUCATION_SORTS.find((key) => key === value);
  if (sort === undefined) throw new Error(`"${value}" is not an education sort`);
  return sort;
}

/**
 * The newest entries for the compact block of `/me`: `rows` of them, newest first, each with the
 * page of the default (newest first) timeline that holds it, so its link lands on the right page.
 */
export function recentEducationRows<T extends EducationLike>(
  pages: readonly ListingPage<T>[],
  rows: number,
): (T & { page: number })[] {
  const placed = pages.flatMap((page) => page.items.map((item) => ({ ...item, page: page.page })));
  return sortEducation(placed, 'newest').slice(0, Math.max(0, rows));
}
