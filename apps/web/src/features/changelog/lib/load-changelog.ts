import { getCollection } from 'astro:content';

import { site } from '@/shared/config/index.ts';
import { paginate } from '@/shared/lib/listing.ts';

import { groupReleases } from './releases.ts';

/**
 * The changelog as pages of release days (newest first, `changelog.perPage` days per page), built
 * with the generic listing kit. Page 1 is `/changelog/`; a second page exists only above `perPage`.
 */
export async function loadChangelogPages() {
  const [entries, releaseMeta] = await Promise.all([
    getCollection('changelog'),
    getCollection('releases'),
  ]);
  const titles = Object.fromEntries(releaseMeta.map((meta) => [meta.id, meta.data]));
  const releases = groupReleases(entries, titles);
  const pages = paginate(releases, { perPage: site.changelog.perPage });
  return { releases, pages };
}

/** `getStaticPaths` of the later pages: one per page from the second on; `/page/1/` never exists. */
export async function laterChangelogPaths(): Promise<{ params: { page: string } }[]> {
  const { pages } = await loadChangelogPages();
  return pages
    .filter(({ page }) => page > 1)
    .map(({ page }) => ({ params: { page: String(page) } }));
}
