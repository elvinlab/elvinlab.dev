import { site } from '@/shared/config/index.ts';

import { resolveExperimentsSettings } from './pagination.ts';

/**
 * The `experiments` block of `site.config.ts` with the `/me` clamp applied: the single place the
 * list size, the featured limit and the `/me` rows are read from.
 */
export const experimentsSettings = resolveExperimentsSettings(site.experiments);
