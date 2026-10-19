import { describe, expect, it } from 'vitest';

import { SEO_PAGES } from '@/shared/config/schema.ts';

import { caseTitle, pageCopy } from './page-copy.ts';

const base = { defaultLocale: 'es', name: 'Ada Lovelace', domain: 'ada.dev', overrides: {} };

describe('pageCopy', () => {
  it('names the owner and the domain from the config in every built-in text', () => {
    const copy = pageCopy({ ...base, page: 'contact', locale: 'es' });
    expect(copy.title).toBe('Contacto con Ada Lovelace');
    expect(copy.description).toContain('Ada Lovelace, ada.dev');
    expect(`${copy.title}${copy.description}`).not.toMatch(/\{\w+\}/);
  });

  it('answers in the visitor locale and falls back to the default locale', () => {
    expect(pageCopy({ ...base, page: 'education', locale: 'en' }).title).toBe(
      'Ada Lovelace: education and certificates',
    );
    expect(pageCopy({ ...base, page: 'education', locale: 'fr' }).title).toBe(
      'Formación y certificados de Ada Lovelace',
    );
  });

  it('lets the config override the title, the description or both', () => {
    const overrides = { notes: { title: { es: 'Mis notas' } } };
    const copy = pageCopy({ ...base, page: 'notes', locale: 'es', overrides });
    expect(copy.title).toBe('Mis notas');
    expect(copy.description).toContain('Lab Notes de Ada Lovelace');
  });

  it('uses the description a page brings when the copy has none', () => {
    const copy = pageCopy({
      ...base,
      page: 'privacy',
      locale: 'es',
      fallbackDescription: 'Su texto.',
    });
    expect(copy.description).toBe('Su texto.');
    expect(pageCopy({ ...base, page: 'privacy', locale: 'es' }).description).toBeUndefined();
  });

  it('keeps every built-in title within 48 characters and every description within 160, in both locales', () => {
    for (const locale of ['es', 'en']) {
      for (const page of SEO_PAGES) {
        const { title, description } = pageCopy({
          ...base,
          name: 'Elvin González',
          domain: 'elvinlab.dev',
          page,
          locale,
        });
        expect(title.length, `${locale} ${page} title`).toBeLessThanOrEqual(48);
        if (description) {
          expect(description.length, `${locale} ${page} description`).toBeGreaterThanOrEqual(100);
          expect(description.length, `${locale} ${page} description`).toBeLessThanOrEqual(160);
        }
      }
    }
  });

  it('titles an experiment case page in the visitor locale', () => {
    expect(caseTitle('agentic-dev-setup', 'es', 'es')).toBe('agentic-dev-setup: caso de estudio');
    expect(caseTitle('agentic-dev-setup', 'en', 'es')).toBe('agentic-dev-setup: case study');
    expect(caseTitle('x', 'fr', 'es')).toBe('x: caso de estudio');
  });
});
