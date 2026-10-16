import { type Appearance, type ResolvedHome, resolveHome } from '@/shared/config/appearance.ts';
import { parseSiteConfig, type SiteConfig } from '@/shared/config/schema.ts';

/** The environment variable through which the Playwright config hands the profile to the specs. */
export const E2E_PROFILE_ENV = 'E2E_PROFILE';

/** Which optional routes the fixture build contains. `/me` is always built (it only turns noindex). */
export type E2eRoutes = Readonly<{
  notes: boolean;
  contact: boolean;
  changelog: boolean;
  experiments: boolean;
  education: boolean;
  subscribe: boolean;
  me: boolean;
}>;

/** What the browser specs need to know about the site they run against. */
export type E2eProfile = Readonly<{
  features: SiteConfig['features'];
  appearance: Appearance;
  home: ResolvedHome;
  routes: E2eRoutes;
  nudge: SiteConfig['nudge'];
}>;

/**
 * Resolves, from a site config, what the fixture build the specs run against will contain. It
 * applies the same overrides as the fixture patches (`fixture-workspace.ts`): `features.subscribe`
 * is forced on and `appearance` can be overridden (`FIXTURE_APPEARANCE`). Routes follow how
 * `astro.config.ts` injects them: the notes routes need `blog`, the subscribe routes need `blog`
 * and `subscribe`, and contact, changelog, experiments and education follow their own flag.
 */
export function resolveE2eProfile(
  input: unknown,
  options: { appearance?: string | undefined } = {},
): E2eProfile {
  const parsed = parseSiteConfig(input);
  const requested = options.appearance;
  if (
    requested !== undefined &&
    requested !== '' &&
    requested !== 'minimal' &&
    requested !== 'full'
  ) {
    throw new Error(`e2e: appearance must be 'minimal' or 'full', got '${requested}'`);
  }
  const appearance: Appearance =
    requested === 'minimal' || requested === 'full' ? requested : parsed.appearance;
  const features = { ...parsed.features, subscribe: true };
  return {
    features,
    appearance,
    home: resolveHome({ appearance, home: parsed.home, features }),
    nudge: parsed.nudge,
    routes: {
      notes: features.blog,
      contact: features.contact,
      changelog: features.changelog,
      experiments: features.experiments,
      education: features.education,
      subscribe: features.blog && features.subscribe,
      me: true,
    },
  };
}

/** What a spec (or one of its tests) needs to be on in order to make sense. */
export type E2eNeeds = Readonly<{
  flags?: readonly (keyof SiteConfig['features'])[];
  routes?: readonly (keyof E2eRoutes)[];
  home?: readonly (keyof ResolvedHome)[];
}>;

/** The things a spec needs that this profile has off, named for a skip reason; empty means run it. */
export function missingNeeds(profile: E2eProfile, needs: E2eNeeds): string[] {
  return [
    ...(needs.flags ?? [])
      .filter((flag) => !profile.features[flag])
      .map((flag) => `features.${String(flag)}`),
    ...(needs.routes ?? [])
      .filter((route) => !profile.routes[route])
      .map((route) => `route ${String(route)}`),
    ...(needs.home ?? [])
      .filter((section) => !profile.home[section])
      .map((section) => `home.${String(section)}`),
  ];
}

export const serializeE2eProfile = (profile: E2eProfile): string => JSON.stringify(profile);

/** Reads the profile back in a spec; fails loudly when the spec runs outside the Playwright config. */
export function parseE2eProfile(raw: string | undefined): E2eProfile {
  const fail = (): never => {
    throw new Error(
      `${E2E_PROFILE_ENV} is missing or invalid: run the specs through playwright.config.ts (pnpm test:e2e), which exports it.`,
    );
  };
  if (!raw) return fail();
  try {
    const value = JSON.parse(raw) as E2eProfile;
    if (!value.features || !value.routes || !value.home || !value.nudge) return fail();
    return value;
  } catch {
    return fail();
  }
}
