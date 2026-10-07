import { LOCALES } from '@/shared/i18n/index.ts';

import { loadExperiments } from './load-experiments.ts';
import {
  compactCount,
  type ExperimentSort,
  offeredExperimentSorts,
  paginateExperiments,
} from './pagination.ts';
import { experimentsSettings } from './settings.ts';

/**
 * The experiments of one sort, already paged: the data every page of `/experiments/` renders from
 * and every `getStaticPaths` counts with. Without `sort` it is the default sort (the base URLs).
 * A sort that is not offered (disabled, the compact list is below `sortFrom`, or it is the default
 * one asked for by name) fails the build instead of rendering a page that should not exist.
 */
export async function loadExperimentPages(sort?: ExperimentSort) {
  const experiments = await loadExperiments();
  const { defaultSort, perPage, meRows } = experimentsSettings;
  const offered = offeredExperimentSorts(compactCount(experiments), experimentsSettings);
  const active = sort ?? defaultSort;
  if (sort !== undefined && (sort === defaultSort || !offered.includes(sort))) {
    throw new Error(`/experiments/ does not offer the sort "${sort}"`);
  }
  const pages = paginateExperiments(experiments, {
    perPage,
    // Only the default sort answers the `/me` anchors; no row links to another sort.
    pinFirst: active === defaultSort ? meRows : 0,
    sort: active,
    locale: LOCALES.defaultLocale,
  });
  return { experiments, pages, sort: active, defaultSort, offered };
}
