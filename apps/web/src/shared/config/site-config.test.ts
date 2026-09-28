import { describe, expect, it } from 'vitest';

import { siteConfig } from '@/site.config.ts';

import { parseSiteConfig } from './schema.ts';

describe('site.config.ts', () => {
  it('is valid', () => {
    expect(() => parseSiteConfig(siteConfig)).not.toThrow();
  });

  it('contains no email address', () => {
    expect(JSON.stringify(siteConfig)).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });
});
