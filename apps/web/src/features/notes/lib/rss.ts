import type { Locale } from '@/shared/i18n/index.ts';

export type FeedNote = {
  slug: string;
  data: { title: string; description: string; pubDate: Date };
};

export type RssInput = {
  siteUrl: string;
  title: string;
  description: string;
  locale: Locale;
  notes: readonly FeedNote[];
};

/** Escapes the five XML entities so note titles and descriptions can't break the feed. */
export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/** Builds an RSS 2.0 feed for a locale's notes. Pure: URLs and dates come from the inputs. */
export function buildRssFeed(input: RssInput): string {
  const { siteUrl, title, description, locale, notes } = input;
  const prefix = locale === 'en' ? '/en' : '';
  const abs = (path: string): string => new URL(path, siteUrl).href;

  const items = notes
    .map(({ slug, data }) => {
      const url = abs(`${prefix}/notes/${slug}/`);
      return [
        '<item>',
        `<title>${escapeXml(data.title)}</title>`,
        `<link>${url}</link>`,
        `<guid isPermaLink="true">${url}</guid>`,
        `<description>${escapeXml(data.description)}</description>`,
        `<pubDate>${data.pubDate.toUTCString()}</pubDate>`,
        '</item>',
      ].join('');
    })
    .join('');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `<title>${escapeXml(`${title} — Lab Notes`)}</title>`,
    `<link>${abs(`${prefix}/notes/`)}</link>`,
    `<description>${escapeXml(description)}</description>`,
    `<language>${locale}</language>`,
    `<atom:link href="${abs(`${prefix}/rss.xml`)}" rel="self" type="application/rss+xml"/>`,
    items,
    '</channel>',
    '</rss>',
  ].join('');
}
