import { describe, expect, it } from 'vitest';

import { buildRobotsTxt } from './robots.ts';

const sitemapUrl = 'https://example.dev/sitemap-index.xml';

describe('buildRobotsTxt', () => {
  it('keeps the production output: allow all plus the sitemap', () => {
    expect(buildRobotsTxt({ indexable: true, sitemapUrl })).toBe(
      `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`,
    );
  });

  it('never blocks crawling on noindex builds, so crawlers can read the noindex signal', () => {
    const body = buildRobotsTxt({ indexable: false, sitemapUrl });
    expect(body).toContain('Allow: /');
    expect(body).not.toContain('Disallow');
  });

  it('does not advertise the production sitemap from a noindex build', () => {
    expect(buildRobotsTxt({ indexable: false, sitemapUrl })).not.toContain('Sitemap');
  });
});
