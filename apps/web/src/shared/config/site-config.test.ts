import { describe, expect, it } from 'vitest';

import { siteConfig } from '@/site.config.ts';

import { parseSiteConfig } from './schema.ts';

describe('site.config.ts', () => {
  it('is valid', () => {
    expect(() => parseSiteConfig(siteConfig)).not.toThrow();
  });

  it('configures giscus for this repository whenever comments are enabled', () => {
    const config = parseSiteConfig(siteConfig);
    expect(config.features.comments).toBe(true);
    expect(config.giscus).toEqual({
      repo: 'elvinlab/elvinlab.dev',
      repoId: 'R_kgDOUvCLAA',
      category: 'Announcements',
      categoryId: 'DIC_kwDOUvCLAM4DG1yT',
    });
  });

  it('uses the full appearance for this site', () => {
    expect(parseSiteConfig(siteConfig).appearance).toBe('full');
  });

  it('shows no "under construction" notice now that the site is live', () => {
    expect(siteConfig).not.toHaveProperty('notice');
  });

  it('keeps the public integration ids and the legal dates in the config', () => {
    const config = parseSiteConfig(siteConfig);
    expect(config.integrations.cloudflareAnalyticsToken).toMatch(/^[0-9a-f]{32}$/);
    expect(config.integrations.turnstileSiteKey).toMatch(/^0x[\w-]+$/);
    expect(config.legal.privacyUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(config.legal.termsUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('contains no email address', () => {
    expect(JSON.stringify(siteConfig)).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });
});
