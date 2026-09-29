import type { APIRoute } from 'astro';

import { site } from '@/shared/config/index.ts';

/** robots.txt built from config so the sitemap URL is always correct (a static file can't interpolate). */
export const GET: APIRoute = () => {
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${new URL('/sitemap-index.xml', site.url).href}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
