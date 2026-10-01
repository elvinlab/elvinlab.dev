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

  it('lists every preference the site keeps in localStorage', () => {
    const body = (page: PrivacyContent): string =>
      page.sections.find((section) => section.id === 'local-storage')?.body ?? '';
    for (const word of [/tema/i, /fondo/i, /banner/i, /aviso de idioma/i]) {
      expect(body(content.es)).toMatch(word);
    }
    for (const word of [/theme/i, /background/i, /banner/i, /language hint/i]) {
      expect(body(content.en)).toMatch(word);
    }
  });

  it('mentions the reading mode preference only when that feature is on', () => {
    const body = (page: PrivacyContent): string =>
      page.sections.find((section) => section.id === 'local-storage')?.body ?? '';
    expect(body(content.es)).not.toMatch(/modo lectura/i);
    expect(body(content.en)).not.toMatch(/reading mode/i);
    const on = buildPrivacyContent({ ...input, readingMode: true });
    expect(body(on.es)).toMatch(/modo lectura/i);
    expect(body(on.es)).toMatch(/cinco preferencias/i);
    expect(body(on.en)).toMatch(/reading mode/i);
    expect(body(on.en)).toMatch(/five interface preferences/i);
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
});
