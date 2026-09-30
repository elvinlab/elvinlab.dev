export type RobotsInput = {
  indexable: boolean;
  sitemapUrl: string;
};

/**
 * Builds robots.txt. Noindex builds (staging, previews) must stay crawlable: a crawler that is blocked
 * can never read the noindex signal, so they get no Disallow and do not advertise the production sitemap.
 */
export function buildRobotsTxt({ indexable, sitemapUrl }: RobotsInput): string {
  const lines = ['User-agent: *', 'Allow: /', ''];
  if (indexable) lines.push(`Sitemap: ${sitemapUrl}`, '');
  return lines.join('\n');
}
