import {
  experimentsSettings,
  loadExperiments,
  paginateExperiments,
} from '@/features/portfolio/index.ts';

/**
 * `getStaticPaths` of the later pages of `/experiments/`: one path per page from the second on, and
 * none while the compact tier fits in `perPage`. Page 1 is the base URL, so `/page/1/` is never
 * generated and answers 404.
 */
export async function laterPagePaths(): Promise<{ params: { page: string } }[]> {
  const { perPage, meRows } = experimentsSettings;
  const pages = paginateExperiments(await loadExperiments(), { perPage, pinFirst: meRows });
  return pages
    .filter(({ page }) => page > 1)
    .map(({ page }) => ({ params: { page: String(page) } }));
}
