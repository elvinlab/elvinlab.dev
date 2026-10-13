import type { SiteConfig } from '@/shared/config/schema.ts';

/** The environment variable that picks an adopter profile for an e2e run (unset: this site as it is). */
export const E2E_FEATURE_PROFILE_ENV = 'E2E_FEATURE_PROFILE';

export type E2eFeatureProfile = Readonly<{
  /** What the scenario stands for, shown in the docs. */
  description: string;
  /** The `features` it switches, over the real `site.config.ts`. */
  features: Readonly<Partial<SiteConfig['features']>>;
}>;

/**
 * The adopter scenarios the CI has to survive: someone replaces `site.config.ts`, turns things off,
 * and the pipeline must still pass and deploy. Each one is the real config with only these features
 * switched; the specs then follow the config (`tests/browser/helpers/features.ts`).
 */
export const E2E_PROFILES: Readonly<Record<string, E2eFeatureProfile>> = {
  quiet: {
    description:
      'Six optional features off: reading mode, footprints, contact, changelog, the experiment card and the theme button.',
    features: {
      readingMode: false,
      marks: false,
      contact: false,
      changelog: false,
      experimentNudge: false,
      themeToggle: false,
    },
  },
  'blog-only': {
    description:
      'Only the blog: no portfolio, no contact, no changelog, no footprints, no comments.',
    features: {
      me: false,
      credentials: false,
      education: false,
      experiments: false,
      experimentNudge: false,
      contact: false,
      changelog: false,
      marks: false,
      comments: false,
    },
  },
  'me-only': {
    description:
      'Only the portfolio: no blog (and so no notes, feed or subscription), no contact, no changelog.',
    features: {
      blog: false,
      comments: false,
      readingMode: false,
      readingProgress: false,
      marks: false,
      experimentNudge: false,
      contact: false,
      changelog: false,
    },
  },
  bare: {
    description: 'Every optional feature off: the home and the pages that are always built.',
    features: {
      blog: false,
      comments: false,
      contact: false,
      credentials: false,
      education: false,
      experiments: false,
      experimentNudge: false,
      changelog: false,
      me: false,
      readingMode: false,
      readingProgress: false,
      marks: false,
      backToTop: false,
      languageHint: false,
      themeToggle: false,
      backgroundPicker: false,
    },
  },
};

/** The profile named by `E2E_FEATURE_PROFILE`; an unset or empty name means "this site as it is". */
export function profileFeatures(name: string | undefined): E2eFeatureProfile['features'] {
  if (name === undefined || name === '') return {};
  const profile = E2E_PROFILES[name];
  if (!profile) {
    throw new Error(
      `e2e: unknown profile '${name}'; use one of ${Object.keys(E2E_PROFILES).join(', ')}`,
    );
  }
  return profile.features;
}

/** A site config with the named profile's features applied over it. */
export function withProfileFeatures<T extends { features: object }>(
  config: T,
  name: string | undefined,
): T {
  return { ...config, features: { ...config.features, ...profileFeatures(name) } };
}
