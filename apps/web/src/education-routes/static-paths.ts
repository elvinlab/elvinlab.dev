import { type EducationSort, loadEducationPages } from '@/features/credentials/index.ts';

/**
 * `getStaticPaths` of the later pages of `/education/`: one path per page from the second on, and
 * none while the entries fit in `perPage`. Page 1 is the base URL, so `/page/1/` answers 404.
 */
export async function laterPagePaths(): Promise<{ params: { page: string } }[]> {
  const { pages } = await loadEducationPages();
  return pages
    .filter(({ page }) => page > 1)
    .map(({ page }) => ({ params: { page: String(page) } }));
}

/**
 * `getStaticPaths` of `/education/<sort>/`: one path per offered sort that is not the default, and
 * none while the entries are below `education.sortFrom`.
 */
export async function sortPaths(): Promise<{ params: { sort: EducationSort } }[]> {
  const { offered, defaultSort } = await loadEducationPages();
  return offered.filter((sort) => sort !== defaultSort).map((sort) => ({ params: { sort } }));
}

/** `getStaticPaths` of `/education/<sort>/page/N/`: the later pages of each alternate sort. */
export async function sortPagePaths(): Promise<
  { params: { sort: EducationSort; page: string } }[]
> {
  const paths: { params: { sort: EducationSort; page: string } }[] = [];
  for (const { params } of await sortPaths()) {
    const { pages } = await loadEducationPages(params.sort);
    for (const { page } of pages) {
      if (page > 1) paths.push({ params: { sort: params.sort, page: String(page) } });
    }
  }
  return paths;
}
