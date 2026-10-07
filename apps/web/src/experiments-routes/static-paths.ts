import { type ExperimentSort, loadExperimentPages } from '@/features/portfolio/index.ts';
import { LISTING_SORTS } from '@/shared/config/index.ts';

/** The sort param of a route, checked: only a configured sort key can reach a page. */
export function sortParam(value: string | undefined): ExperimentSort {
  const sort = LISTING_SORTS.find((key) => key === value);
  if (sort === undefined) throw new Error(`"${value}" is not an experiments sort`);
  return sort;
}

/**
 * `getStaticPaths` of the later pages of `/experiments/`: one path per page from the second on, and
 * none while the compact tier fits in `perPage`. Page 1 is the base URL, so `/page/1/` is never
 * generated and answers 404.
 */
export async function laterPagePaths(): Promise<{ params: { page: string } }[]> {
  const { pages } = await loadExperimentPages();
  return pages
    .filter(({ page }) => page > 1)
    .map(({ page }) => ({ params: { page: String(page) } }));
}

/**
 * `getStaticPaths` of `/experiments/<sort>/`: one path per enabled sort that is not the default,
 * and none while the compact tier is below `experiments.sortFrom` (or only one sort is enabled).
 * The switch and these pages exist together or not at all.
 */
export async function sortPaths(): Promise<{ params: { sort: ExperimentSort } }[]> {
  const { offered, defaultSort } = await loadExperimentPages();
  return offered.filter((sort) => sort !== defaultSort).map((sort) => ({ params: { sort } }));
}

/** `getStaticPaths` of `/experiments/<sort>/page/N/`: the later pages of each alternate sort. */
export async function sortPagePaths(): Promise<
  { params: { sort: ExperimentSort; page: string } }[]
> {
  const paths: { params: { sort: ExperimentSort; page: string } }[] = [];
  for (const { params } of await sortPaths()) {
    const { pages } = await loadExperimentPages(params.sort);
    for (const { page } of pages) {
      if (page > 1) paths.push({ params: { sort: params.sort, page: String(page) } });
    }
  }
  return paths;
}
