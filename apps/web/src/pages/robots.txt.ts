import type { APIRoute } from 'astro';

import { site } from '@/shared/config/index.ts';
import { isIndexable } from '@/shared/seo/isIndexable.ts';
import { buildRobotsTxt } from '@/shared/seo/robots.ts';

/** robots.txt built from config so the sitemap URL is always correct (a static file can't interpolate). */
export const GET: APIRoute = () => {
  const body = buildRobotsTxt({
    indexable: isIndexable({ SITE_INDEXABLE: import.meta.env.SITE_INDEXABLE }),
    sitemapUrl: new URL('/sitemap-index.xml', site.url).href,
  });
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
