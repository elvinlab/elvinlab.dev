import { type Page, test } from '@playwright/test';

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

/** Whether everything in `needs` is on, for conditions inside a test (a nav entry, a link, a section). */
export const has = (needs: E2eNeeds): boolean => missingNeeds(profile, needs).length === 0;

/** Skips every test of the file (or of the enclosing `describe`) when something it needs is off. */
export function requires(needs: E2eNeeds): void {
  const missing = missingNeeds(profile, needs);
  test.skip(missing.length > 0, `needs ${missing.join(', ')}`);
}

/** Keeps the entries of a page list whose route (or flags) exist in this profile. */
export function livePages<T extends { needs?: E2eNeeds }>(pages: readonly T[]): T[] {
  return pages.filter((page) => missingNeeds(profile, page.needs ?? {}).length === 0);
}

const PATH_ROUTES = [
  'notes',
  'contact',
  'changelog',
  'experiments',
  'education',
  'subscribe',
] as const;

/** The optional route a URL path belongs to (`/en/contact/` is `contact`); none for the always-built pages. */
export function routeNeeds(path: string): E2eNeeds {
  const first = path.replace(/^\/en(?=\/)/, '').split('/')[1] ?? '';
  const route = PATH_ROUTES.find((name) => name === first);
  return route ? { routes: [route] } : {};
}

/** Keeps the entries of a list whose URL belongs to a route that exists in this profile. */
export function liveByPath<T>(list: readonly T[], pathOf: (entry: T) => string): T[] {
  return list.filter((entry) => missingNeeds(profile, routeNeeds(pathOf(entry))).length === 0);
}

/**
 * Makes the page paint `theme` from the first frame. The stored choice is what the toggle writes; with
 * `features.themeToggle` off the boot script forgets it and follows the system preference instead, so
 * the same theme is reached through the emulated color scheme.
 */
export async function seedTheme(page: Page, theme: string): Promise<void> {
  await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
  if (!profile.features.themeToggle) {
    await page.emulateMedia({ colorScheme: theme.endsWith('light') ? 'light' : 'dark' });
  }
}
