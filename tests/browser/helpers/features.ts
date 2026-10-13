import { test } from '@playwright/test';

import {
  E2E_PROFILE_ENV,
  type E2eNeeds,
  type E2eProfile,
  missingNeeds,
  parseE2eProfile,
} from '../../../apps/web/scripts/e2e-features.ts';

/**
 * What the site under test has on. `playwright.config.ts` resolves it from `site.config.ts` (with the
 * overrides the fixture build applies) and exports it, so a spec follows the config instead of
 * assuming this site's feature set. An adopter who turns a feature off gets its specs skipped with
 * the reason, never failed.
 */
export const profile: E2eProfile = parseE2eProfile(process.env[E2E_PROFILE_ENV]);

/** Skips every test of the file (or of the enclosing `describe`) when something it needs is off. */
export function requires(needs: E2eNeeds): void {
  const missing = missingNeeds(profile, needs);
  test.skip(missing.length > 0, `needs ${missing.join(', ')}`);
}

/** Keeps the entries of a page list whose route (or flags) exist in this profile. */
export function livePages<T extends { needs?: E2eNeeds }>(pages: readonly T[]): T[] {
  return pages.filter((page) => missingNeeds(profile, page.needs ?? {}).length === 0);
}
