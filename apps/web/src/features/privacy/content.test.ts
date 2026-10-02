import { describe, expect, it } from 'vitest';

import { buildPrivacyContent, type PrivacyContent } from './content.ts';

const input = {
  owner: 'Ada Lovelace',
  domain: 'example.org',
  contact: { es: '/contact/', en: '/en/contact/' },
  updated: '2027-01-15',
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

  it('makes no cookie or IP-handling claims that the providers do not state', () => {
    const text = everyText(content);
    // Only the site's own behavior is claimed; no provider is said to be cookie-free.
    expect(text).not.toMatch(
      /sin cookies|no (usa|utiliza)n? cookies|cookie-?free|cookieless|no cookies/i,
    );
    expect(text).not.toMatch(/sin almacenar|without storing/i);
  });

  it('says the site code sets no cookies of its own and points to the providers for the rest', () => {
    for (const locale of ['es', 'en'] as const) {
      const section = content[locale].sections.find((item) => item.id === 'cookies');
      expect(section?.body).toMatch(/cookies/i);
      expect(section?.body).toMatch(locale === 'es' ? /propias/ : /\bown\b/);
    }
    expect(content.es.sections.map((s) => s.id)).toContain('cookies');
  });

  it('cites what Cloudflare states: Web Analytics does not track individual users across sites', () => {
    const analytics = (page: PrivacyContent): string =>
      page.sections.find((section) => section.id === 'analytics')?.body ?? '';
    for (const locale of ['es', 'en'] as const) {
      expect(analytics(content[locale])).toContain(
        'developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection',
      );
    }
  });

  it('renders lists as HTML, not markdown', () => {
    for (const locale of ['es', 'en'] as const) {
      for (const section of content[locale].sections) {
        expect(section.body).not.toMatch(/^- /m);
      }
    }
  });

  it('dates the page with the date it is given, in both locales', () => {
    expect(content.es.lastUpdated).toBe('2027-01-15');
    expect(content.en.lastUpdated).toBe('2027-01-15');
  });

  it('localizes the last-updated label and dates the page', () => {
    expect(content.es.lastUpdatedLabel).not.toBe(content.en.lastUpdatedLabel);
    expect(content.es.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('buildPrivacyContent with comments', () => {
  const withComments = buildPrivacyContent({ ...input, comments: { repo: 'ada/example.org' } });
  const ids = (page: PrivacyContent): string[] => page.sections.map((section) => section.id);

  it('has no comments section unless comments are configured', () => {
    expect(ids(content.es)).not.toContain('comments');
    expect(ids(content.en)).not.toContain('comments');
    expect(everyText(content)).not.toMatch(/giscus/i);
  });

  it('adds the same comments section id to both locales, after the contact form', () => {
    for (const locale of ['es', 'en'] as const) {
      const sectionIds = ids(withComments[locale]);
      expect(sectionIds).toContain('comments');
      expect(sectionIds.indexOf('comments')).toBe(sectionIds.indexOf('contact-form') + 1);
    }
  });

  it('discloses giscus, GitHub storage and sign-in, and the browser token, citing sources', () => {
    for (const locale of ['es', 'en'] as const) {
      const body = withComments[locale].sections.find((s) => s.id === 'comments')?.body ?? '';
      expect(body).toContain('giscus.app');
      expect(body).toContain('github.com/ada/example.org/discussions');
      expect(body).toMatch(/OAuth/);
      expect(body).toMatch(/localStorage/);
      expect(body).toContain('github.com/giscus/giscus/blob/main/PRIVACY-POLICY.md');
      expect(body).toContain('docs.github.com/en/site-policy/privacy-policies');
    }
  });

  it('keeps the page free of email addresses and owner leaks', () => {
    expect(everyText(withComments)).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });

  it('opens every link to another site in a new tab and announces it in the page language', () => {
    const full = buildPrivacyContent({ ...input, comments: { repo: 'ada/site' } });
    const hints = { es: 'se abre en una pestaña nueva', en: 'opens in a new tab' } as const;
    for (const locale of ['es', 'en'] as const) {
      const html = flatten(full[locale]);
      const anchors = html.match(/<a href="https?:[^>]*>.*?<\/a>/g) ?? [];
      expect(anchors.length).toBeGreaterThan(0);
      for (const anchor of anchors) {
        expect(anchor).toContain('target="_blank"');
        expect(anchor).toContain('rel="noopener noreferrer"');
        expect(anchor).toContain(`<span class="sr-only"> (${hints[locale]})</span>`);
      }
      // Links inside the site keep the default behavior.
      for (const anchor of html.match(/<a href="\/[^>]*>/g) ?? [])
        expect(anchor).not.toContain('target=');
    }
  });
});
