import { describe, expect, it } from 'vitest';

import { siteConfig } from '@/site.config.ts';

import { resolveE2eProfile } from './e2e-features.ts';
import { E2E_PROFILES, withProfileFeatures } from './e2e-profiles.ts';

describe('E2E_PROFILES', () => {
  it('names the adopter scenarios the CI must survive', () => {
    expect(Object.keys(E2E_PROFILES)).toEqual(['quiet', 'blog-only', 'me-only', 'bare']);
  });

  for (const [name, profile] of Object.entries(E2E_PROFILES)) {
    it(`${name}: only switches real features and still parses as a site config`, () => {
      const known = Object.keys(siteConfig.features);
      for (const flag of Object.keys(profile.features)) expect(known).toContain(flag);
      expect(() => resolveE2eProfile(withProfileFeatures(siteConfig, name))).not.toThrow();
    });
  }

  it('quiet turns the six optional features of the experiment off', () => {
    const { features } = resolveE2eProfile(withProfileFeatures(siteConfig, 'quiet'));
    for (const flag of [
      'readingMode',
      'marks',
      'contact',
      'changelog',
      'experimentNudge',
      'themeToggle',
    ] as const) {
      expect(features[flag]).toBe(false);
    }
    expect(features.blog).toBe(true);
  });

  it('blog-only keeps the notes and drops the portfolio', () => {
    const { routes, features } = resolveE2eProfile(withProfileFeatures(siteConfig, 'blog-only'));
    expect(routes.notes).toBe(true);
    expect(routes.experiments).toBe(false);
    expect(features.education).toBe(false);
    expect(features.me).toBe(false);
  });

  it('me-only drops the notes, and with them the subscribe routes', () => {
    const { routes, features } = resolveE2eProfile(withProfileFeatures(siteConfig, 'me-only'));
    expect(routes.notes).toBe(false);
    expect(routes.subscribe).toBe(false);
    expect(features.me).toBe(true);
  });

  it('bare turns the education timeline off with the rest of the portfolio', () => {
    const { features } = resolveE2eProfile(withProfileFeatures(siteConfig, 'bare'));
    expect(features.education).toBe(false);
  });

  it('bare turns every optional route off', () => {
    const { routes } = resolveE2eProfile(withProfileFeatures(siteConfig, 'bare'));
    expect(routes).toEqual({
      notes: false,
      contact: false,
      changelog: false,
      experiments: false,
      subscribe: false,
      me: true,
    });
  });
});

describe('withProfileFeatures', () => {
  it('leaves the config as it is when no profile is named', () => {
    expect(withProfileFeatures(siteConfig, undefined)).toEqual(siteConfig);
    expect(withProfileFeatures(siteConfig, '')).toEqual(siteConfig);
  });

  it('fails with the list of profiles when the name is unknown', () => {
    expect(() => withProfileFeatures(siteConfig, 'wild')).toThrow(
      /quiet.*blog-only.*me-only.*bare/,
    );
  });
});
