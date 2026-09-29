import { describe, expect, it } from 'vitest';

import { buildRssFeed, type FeedNote } from './rss.ts';

const notes: FeedNote[] = [
  {
    slug: 'why-i-rebuilt',
    data: {
      title: 'Why I <rebuilt> & shipped',
      description: 'A "decision".',
      pubDate: new Date('2026-09-20T00:00:00Z'),
    },
  },
];
const base = { siteUrl: 'https://example.dev', title: 'example.dev', description: 'Notes' };

describe('buildRssFeed', () => {
  it('escapes XML special characters in titles and descriptions', () => {
    const xml = buildRssFeed({ ...base, locale: 'es', notes });
    expect(xml).toContain('Why I &lt;rebuilt&gt; &amp; shipped');
    expect(xml).not.toContain('<rebuilt>');
  });

  it('builds locale-correct item and self links', () => {
    const es = buildRssFeed({ ...base, locale: 'es', notes });
    expect(es).toContain('<link>https://example.dev/notes/why-i-rebuilt/</link>');
    expect(es).toContain('href="https://example.dev/rss.xml"');

    const en = buildRssFeed({ ...base, locale: 'en', notes });
    expect(en).toContain('<link>https://example.dev/en/notes/why-i-rebuilt/</link>');
    expect(en).toContain('href="https://example.dev/en/rss.xml"');
  });

  it('emits an RFC-822 pubDate and a valid RSS envelope', () => {
    const xml = buildRssFeed({ ...base, locale: 'es', notes });
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<pubDate>Sun, 20 Sep 2026 00:00:00 GMT</pubDate>');
  });
});
