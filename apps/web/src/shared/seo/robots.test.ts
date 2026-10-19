import { describe, expect, it } from 'vitest';

import { AI_SEARCH_CRAWLERS, AI_TRAINING_CRAWLERS, buildRobotsTxt } from './robots.ts';

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

  it('allows every AI crawler explicitly when the policy is allow', () => {
    const body = buildRobotsTxt({ indexable: true, sitemapUrl, aiCrawlers: 'allow' });
    for (const agent of [...AI_SEARCH_CRAWLERS, ...AI_TRAINING_CRAWLERS]) {
      expect(body).toContain(`User-agent: ${agent}\n`);
    }
    expect(body).not.toContain('Disallow');
    expect(body.endsWith(`Sitemap: ${sitemapUrl}\n`)).toBe(true);
  });

  it('blocks only the training crawlers when the policy is search-only', () => {
    const body = buildRobotsTxt({ indexable: true, sitemapUrl, aiCrawlers: 'search-only' });
    const blocked = body.split('\n\n').find((block) => block.includes('Disallow: /')) ?? '';
    for (const agent of AI_TRAINING_CRAWLERS) expect(blocked).toContain(`User-agent: ${agent}`);
    for (const agent of AI_SEARCH_CRAWLERS) expect(blocked).not.toContain(agent);
    expect(body).toContain('User-agent: *\nAllow: /');
  });

  it('adds no AI rules to a noindex build whatever the policy', () => {
    const body = buildRobotsTxt({ indexable: false, sitemapUrl, aiCrawlers: 'search-only' });
    expect(body).toBe('User-agent: *\nAllow: /\n');
  });
});
