import { describe, expect, it } from 'vitest';

import { resolveIntegrations } from './integrations.ts';

const config = { cloudflareAnalyticsToken: 'from-config', turnstileSiteKey: '0xFROMCONFIG' };

describe('resolveIntegrations', () => {
  it('uses the values in the site config', () => {
    expect(resolveIntegrations(config, {})).toEqual({
      analyticsToken: 'from-config',
      turnstileSiteKey: '0xFROMCONFIG',
    });
  });

  it('lets an environment variable override the config, per value', () => {
    expect(
      resolveIntegrations(config, { PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' }),
    ).toEqual({
      analyticsToken: 'from-config',
      turnstileSiteKey: '1x00000000000000000000AA',
    });
  });

  it('ignores an empty or blank override and falls back to the config', () => {
    expect(
      resolveIntegrations(config, {
        PUBLIC_CF_ANALYTICS_TOKEN: '',
        PUBLIC_TURNSTILE_SITE_KEY: '  ',
      }),
    ).toEqual({ analyticsToken: 'from-config', turnstileSiteKey: '0xFROMCONFIG' });
  });

  it('leaves a value undefined when neither the config nor the environment has it', () => {
    expect(resolveIntegrations({}, {})).toEqual({
      analyticsToken: undefined,
      turnstileSiteKey: undefined,
    });
  });

  it('enables analytics from an environment variable alone', () => {
    expect(resolveIntegrations({}, { PUBLIC_CF_ANALYTICS_TOKEN: 'env-token' }).analyticsToken).toBe(
      'env-token',
    );
  });
});
