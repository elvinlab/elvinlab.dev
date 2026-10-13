import { describe, expect, it } from 'vitest';

import { siteConfig } from '@/site.config.ts';

import {
  missingNeeds,
  parseE2eProfile,
  resolveE2eProfile,
  serializeE2eProfile,
} from './e2e-features.ts';

const withFeatures = (patch: Record<string, boolean>) => ({
  ...siteConfig,
  features: { ...siteConfig.features, ...patch },
});

describe('resolveE2eProfile', () => {
  it('describes this site: every optional route exists and the card is on', () => {
    const profile = resolveE2eProfile(siteConfig);
    expect(profile.routes).toEqual({
      notes: true,
      contact: true,
      changelog: true,
      experiments: true,
      subscribe: true,
      me: true,
    });
    expect(profile.features.experimentNudge).toBe(true);
  });

  it('drops the notes routes with blog, and the subscribe routes with them', () => {
    const { routes } = resolveE2eProfile(withFeatures({ blog: false }));
    expect(routes.notes).toBe(false);
    expect(routes.subscribe).toBe(false);
  });

  it('mirrors the fixture, which forces subscribe on: the routes then follow blog alone', () => {
    const profile = resolveE2eProfile(withFeatures({ subscribe: false }));
    expect(profile.features.subscribe).toBe(true);
    expect(profile.routes.subscribe).toBe(true);
  });

  it('removes contact, changelog and experiments routes with their flags', () => {
    const { routes } = resolveE2eProfile(
      withFeatures({ contact: false, changelog: false, experiments: false }),
    );
    expect(routes).toMatchObject({ contact: false, changelog: false, experiments: false });
  });

  it('keeps /me built when the flag is off: the page only turns noindex', () => {
    expect(resolveE2eProfile(withFeatures({ me: false })).routes.me).toBe(true);
  });

  it('resolves the home sections with the preset, the overrides and the feature flags', () => {
    const profile = resolveE2eProfile(withFeatures({ experiments: false, marks: false }));
    expect(profile.home.experiments).toBe(false);
    expect(profile.home.marks).toBe(false);
  });

  it('applies the appearance override the fixture applies', () => {
    const profile = resolveE2eProfile(siteConfig, { appearance: 'minimal' });
    expect(profile.appearance).toBe('minimal');
    expect(profile.home.heroPills).toBe(false);
  });

  it('keeps the config appearance when no override is given', () => {
    expect(resolveE2eProfile(siteConfig, { appearance: '' }).appearance).toBe(
      resolveE2eProfile(siteConfig).appearance,
    );
  });

  it('rejects an appearance that is not a preset, like the fixture does', () => {
    expect(() => resolveE2eProfile(siteConfig, { appearance: 'loud' })).toThrow(/minimal/);
  });

  it('fills the defaults of flags the config leaves out', () => {
    const { experimentNudge: _omitted, ...features } = siteConfig.features;
    const profile = resolveE2eProfile({ ...siteConfig, features });
    expect(profile.features.experimentNudge).toBe(false);
  });
});

describe('the profile as an environment variable', () => {
  it('round-trips through the string the Playwright config exports', () => {
    const profile = resolveE2eProfile(withFeatures({ contact: false }));
    expect(parseE2eProfile(serializeE2eProfile(profile))).toEqual(profile);
  });

  it('fails loudly when a spec runs outside the Playwright config', () => {
    expect(() => parseE2eProfile(undefined)).toThrow(/E2E_PROFILE/);
    expect(() => parseE2eProfile('not json')).toThrow(/E2E_PROFILE/);
  });
});

describe('missingNeeds', () => {
  const profile = resolveE2eProfile(
    withFeatures({ readingMode: false, contact: false, blog: false }),
    { appearance: 'minimal' },
  );

  it('reports nothing when everything a spec needs is on', () => {
    expect(
      missingNeeds(profile, { flags: ['changelog'], routes: ['experiments'], home: ['now'] }),
    ).toEqual([]);
    expect(missingNeeds(profile, {})).toEqual([]);
  });

  it('names each switch that is off', () => {
    expect(missingNeeds(profile, { flags: ['readingMode', 'changelog', 'contact'] })).toEqual([
      'features.readingMode',
      'features.contact',
    ]);
  });

  it('names each route and home section that is missing', () => {
    expect(missingNeeds(profile, { routes: ['notes', 'me', 'subscribe'] })).toEqual([
      'route notes',
      'route subscribe',
    ]);
    expect(missingNeeds(profile, { home: ['pillars', 'now'] })).toEqual(['home.pillars']);
  });
});
