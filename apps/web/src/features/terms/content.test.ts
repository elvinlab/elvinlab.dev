import { describe, expect, it } from 'vitest';

import { buildTermsContent, type TermsContent } from './content.ts';

const input = {
  owner: 'Ada Lovelace',
  domain: 'example.org',
  contact: { es: '/contact/', en: '/en/contact/' },
  updated: '2027-01-15',
  privacy: { es: '/privacy/', en: '/en/privacy/' },
} as const;

const content = buildTermsContent(input);
const flatten = (page: TermsContent): string =>
  [
    page.pageTitle,
    page.pageDescription,
    page.lastUpdatedLabel,
    ...page.sections.flatMap((section) => [section.title, section.body]),
  ].join('\n');
const everyText = (value: Record<'es' | 'en', TermsContent>): string =>
  `${flatten(value.es)}\n${flatten(value.en)}`;
const ids = (page: TermsContent): string[] => page.sections.map((section) => section.id);
const body = (page: TermsContent, id: string): string =>
  page.sections.find((section) => section.id === id)?.body ?? '';

describe('buildTermsContent', () => {
  it('exposes the same section ids in both locales', () => {
    expect(ids(content.en)).toEqual(ids(content.es));
  });

  it('uses the configured owner and domain and leaks no fixed identity', () => {
    const text = everyText(content);
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('example.org');
    expect(text).not.toMatch(/elvin/i);
  });

  it('links to the localized contact and privacy pages without nofollow', () => {
    expect(body(content.es, 'owner')).toContain('href="/contact/"');
    expect(body(content.en, 'owner')).toContain('href="/en/contact/"');
    expect(body(content.es, 'privacy')).toContain('href="/privacy/"');
    expect(body(content.en, 'privacy')).toContain('href="/en/privacy/"');
    expect(everyText(content)).not.toContain('nofollow');
  });

  it('states the notes license with a link to the official text', () => {
    for (const locale of ['es', 'en'] as const) {
      const text = body(content[locale], 'content');
      expect(text).toContain('CC BY-NC-SA 4.0');
      expect(text).toContain('creativecommons.org/licenses/by-nc-sa/4.0');
    }
  });

  it('omits the comments and professional-information sections unless those features are on', () => {
    expect(ids(content.es)).not.toContain('comments');
    expect(ids(content.es)).not.toContain('professional');
    expect(everyText(content)).not.toMatch(/giscus/i);
    const full = buildTermsContent({ ...input, comments: true, me: true });
    for (const locale of ['es', 'en'] as const) {
      expect(ids(full[locale])).toContain('comments');
      expect(ids(full[locale])).toContain('professional');
    }
    expect(body(full.es, 'comments')).toContain('giscus.app');
    expect(body(full.es, 'comments')).toContain('GitHub');
  });

  it('never contains an email address', () => {
    const full = buildTermsContent({ ...input, comments: true, me: true });
    expect(everyText(full)).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });

  it('claims no legal compliance or advice and makes no cookie promises', () => {
    const full = buildTermsContent({ ...input, comments: true, me: true });
    const text = everyText(full);
    expect(text).not.toMatch(/gdpr|rgpd|cumple con|compliant|compliance/i);
    expect(text).not.toMatch(/cookie/i);
  });

  it('dates the page with the date it is given, in both locales', () => {
    expect(content.es.lastUpdated).toBe('2027-01-15');
    expect(content.en.lastUpdated).toBe('2027-01-15');
  });

  it('localizes the last-updated label and dates the page', () => {
    expect(content.es.lastUpdatedLabel).not.toBe(content.en.lastUpdatedLabel);
    expect(content.es.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('renders as HTML paragraphs', () => {
    expect(body(content.es, 'use')).toMatch(/^<p>/);
  });

  it('opens every link to another site in a new tab and announces it in the page language', () => {
    const full = buildTermsContent({ ...input, comments: true, me: true });
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

describe('buildTermsContent without a contact page', () => {
  const { contact: _contact, ...rest } = input;
  const without = buildTermsContent(rest);

  it('links to no contact page and keeps both locales in step', () => {
    expect(everyText(without)).not.toContain('/contact/');
    expect(ids(without.en)).toEqual(ids(without.es));
    expect(body(without.es, 'owner').length).toBeGreaterThan(0);
  });
});
