import { describe, expect, it } from 'vitest';

import { buildPrivacyContent, type PrivacyContent } from './content.ts';

const input = {
  owner: 'Ada Lovelace',
  domain: 'example.org',
  contact: { es: '/contact/', en: '/en/contact/' },
} as const;

const content = buildPrivacyContent(input);
const flatten = (page: PrivacyContent): string =>
  [
    page.pageTitle,
    page.pageDescription,
    page.lastUpdatedLabel,
    ...page.sections.flatMap((section) => [section.title, section.body]),
  ].join('\n');
const everyText = (value: PrivacyContent | Record<'es' | 'en', PrivacyContent>): string =>
  'sections' in value ? flatten(value) : `${flatten(value.es)}\n${flatten(value.en)}`;

describe('buildPrivacyContent', () => {
  it('exposes the same section ids in both locales', () => {
    expect(content.en.sections.map((section) => section.id)).toEqual(
      content.es.sections.map((section) => section.id),
    );
  });

  it('uses the configured owner and domain and leaks no fixed identity', () => {
    const text = everyText(content);
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('example.org');
    expect(text).not.toMatch(/elvin|gonz[aá]lez/i);
  });

  it('links to the locale-specific contact page without nofollow', () => {
    expect(everyText(content.es)).toContain('href="/contact/"');
    expect(everyText(content.en)).toContain('href="/en/contact/"');
    expect(everyText(content)).not.toContain('nofollow');
  });

  it('never contains an email address', () => {
    expect(everyText(content)).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });

  it('makes no cookie or IP-handling claims that Cloudflare docs do not state', () => {
    const text = everyText(content);
    expect(text).not.toMatch(/cookie/i);
    expect(text).not.toMatch(/sin almacenar|without storing/i);
  });

  it('renders lists as HTML, not markdown', () => {
    for (const locale of ['es', 'en'] as const) {
      for (const section of content[locale].sections) {
        expect(section.body).not.toMatch(/^- /m);
      }
    }
  });

  it('localizes the last-updated label and dates the page', () => {
    expect(content.es.lastUpdatedLabel).not.toBe(content.en.lastUpdatedLabel);
    expect(content.es.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
