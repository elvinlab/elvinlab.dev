import { site } from '@/shared/config/index.ts';

import {
  type ExperimentSort,
  experimentsPagePath,
  resolveExperimentsSettings,
} from './pagination.ts';

/**
 * The `experiments` block of `site.config.ts` with the `/me` clamp applied: the single place the
 * list size, the featured limit, the sorts and the `/me` rows are read from.
 */
export const experimentsSettings = resolveExperimentsSettings(site.experiments);

/** Path of a page of the experiments list (no locale prefix) with the configured default sort. */
export const experimentsHref = (page: number, sort?: ExperimentSort): string =>
  experimentsPagePath(page, sort, experimentsSettings.defaultSort);
