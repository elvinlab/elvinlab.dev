import { describe, expect, it } from 'vitest';

import { localizableText, localizedText, pickLocale } from './localized.ts';

const LOCALES = ['es', 'en'];
const field = localizableText({ max: 10, defaultLocale: 'es', locales: LOCALES });

describe('pickLocale', () => {
  it('returns the text of the requested locale', () => {
    expect(pickLocale({ es: 'Hola', en: 'Hello' }, 'en', 'es')).toBe('Hello');
  });

  it('falls back to the default locale when the requested one is missing', () => {
    expect(pickLocale({ es: 'Hola' }, 'en', 'es')).toBe('Hola');
  });

  it('returns an empty string when neither the locale nor the default exists', () => {
    expect(pickLocale({ fr: 'Salut' }, 'en', 'es')).toBe('');
    expect(pickLocale(undefined, 'en', 'es')).toBe('');
  });

  it('shows a plain string for every locale', () => {
    expect(pickLocale('Buo', 'en', 'es')).toBe('Buo');
    expect(pickLocale('Buo', 'es', 'es')).toBe('Buo');
  });
});

describe('localizedText', () => {
  it('accepts a record of non-empty strings and trims them', () => {
    expect(localizedText.parse({ es: ' Hola ', en: 'Hello' })).toEqual({ es: 'Hola', en: 'Hello' });
  });

  it('rejects an empty or whitespace-only string', () => {
    expect(() => localizedText.parse({ es: '' })).toThrow();
    expect(() => localizedText.parse({ es: '   ' })).toThrow();
  });
});

describe('localizableText', () => {
  it('accepts a plain string and a per-locale object', () => {
    expect(field.parse('Buo')).toBe('Buo');
    expect(field.parse({ es: 'Hola', en: 'Hello' })).toEqual({ es: 'Hola', en: 'Hello' });
  });

  it('rejects an object without the default locale', () => {
    expect(() => field.parse({ en: 'Hello' })).toThrow(/default locale.*es/);
  });

  it('rejects a locale the site does not support', () => {
    expect(() => field.parse({ es: 'Hola', fr: 'Salut' })).toThrow(/unsupported locale.*fr/);
  });

  it('rejects an empty string, plain or per locale', () => {
    expect(() => field.parse('')).toThrow();
    expect(() => field.parse({ es: 'Hola', en: '' })).toThrow();
  });

  it('applies the maximum length to a plain string and to every locale', () => {
    expect(() => field.parse('x'.repeat(11))).toThrow(/at most 10/);
    expect(() => field.parse({ es: 'Hola', en: 'x'.repeat(11) })).toThrow(/at most 10/);
  });
});
