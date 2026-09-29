import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

import { buildRssFeed, sortNotes } from '@/features/notes/index.ts';
import { site } from '@/shared/config/index.ts';

/** Spanish notes feed at /rss.xml. */
export const GET: APIRoute = async () => {
  const entries = await getCollection('notes', (note) => note.data.lang === 'es');
  const notes = sortNotes(entries.map((entry) => ({ slug: entry.id, data: entry.data })));
  const xml = buildRssFeed({
    siteUrl: site.url,
    title: site.title,
    description: site.description['es'] ?? site.title,
    locale: 'es',
    notes,
  });
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
};
