export type AiCrawlerPolicy = 'allow' | 'search-only';

export type RobotsInput = {
  indexable: boolean;
  sitemapUrl: string;
  /** Policy for AI crawlers; without it the file carries no AI-specific rules. */
  aiCrawlers?: AiCrawlerPolicy | undefined;
};

/** Crawlers that read the site to answer a question or cite it in an AI search result. */
export const AI_SEARCH_CRAWLERS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
] as const;

/** Crawlers that collect pages to train models. */
export const AI_TRAINING_CRAWLERS = [
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Meta-ExternalAgent',
  'Bytespider',
] as const;

const group = (agents: readonly string[], rule: string): string[] => [
  ...agents.map((agent) => `User-agent: ${agent}`),
  rule,
  '',
];

/**
 * Builds robots.txt. Noindex builds (staging, previews) must stay crawlable: a crawler that is blocked
 * can never read the noindex signal, so they get no Disallow, no AI rules and do not advertise the
 * production sitemap. On a production build `allow` names every AI crawler with an explicit Allow, and
 * `search-only` blocks the training ones while keeping the AI search crawlers.
 */
export function buildRobotsTxt({ indexable, sitemapUrl, aiCrawlers }: RobotsInput): string {
  const lines = ['User-agent: *', 'Allow: /', ''];
  if (indexable && aiCrawlers === 'allow') {
    lines.push(...group([...AI_SEARCH_CRAWLERS, ...AI_TRAINING_CRAWLERS], 'Allow: /'));
  }
  if (indexable && aiCrawlers === 'search-only') {
    lines.push(
      ...group(AI_SEARCH_CRAWLERS, 'Allow: /'),
      ...group(AI_TRAINING_CRAWLERS, 'Disallow: /'),
    );
  }
  if (indexable) lines.push(`Sitemap: ${sitemapUrl}`, '');
  return lines.join('\n');
}
