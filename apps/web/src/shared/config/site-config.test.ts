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

  it('contains no email address', () => {
    expect(JSON.stringify(siteConfig)).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });
});
