import { describe, expect, it } from 'vitest';
import { suggestLocale } from './suggest-locale.ts';

const locales = ['es', 'en'];

describe('suggestLocale', () => {
  it('suggests the preferred browser language when the page is in another locale', () => {
    expect(suggestLocale({ preferred: ['en-US', 'es'], current: 'es', locales })).toBe('en');
  });

  it('suggests nothing when the page already matches the first supported preference', () => {
    expect(suggestLocale({ preferred: ['es-CR', 'en'], current: 'es', locales })).toBeNull();
  });

  it('skips unsupported languages until it finds a supported one', () => {
    expect(suggestLocale({ preferred: ['fr-FR', 'en'], current: 'es', locales })).toBe('en');
  });

  it('suggests nothing when no preferred language is supported', () => {
    expect(suggestLocale({ preferred: ['fr', 'de'], current: 'es', locales })).toBeNull();
  });
});
