import { describe, expect, it } from 'vitest';

import { type LocaleConfig, localeFromPath, localizePath, switchLocale } from './paths.ts';
import { createTranslator } from './translate.ts';

const config: LocaleConfig = { locales: ['en', 'es'], defaultLocale: 'en' };

describe('createTranslator', () => {
  const dictionaries = {
    en: { 'nav.notes': 'Notes', greeting: 'Hello, {name}', 'nav.about': 'About' },
    es: { 'nav.notes': 'Notas', greeting: 'Hola, {name}' },
  } as const;
  const t = createTranslator({ defaultLocale: 'en', dictionaries });

  it('returns the string of the requested locale', () => {
    expect(t('es', 'nav.notes')).toBe('Notas');
  });

  it('falls back to the default locale when a key is missing', () => {
    expect(t('es', 'nav.about')).toBe('About');
  });

  it('interpolates named parameters', () => {
    expect(t('es', 'greeting', { name: 'Ada' })).toBe('Hola, Ada');
  });

  it('leaves unknown placeholders visible so missing params are easy to spot', () => {
    expect(t('en', 'greeting')).toBe('Hello, {name}');
  });
});

describe('localizePath', () => {
  it('keeps the default locale at the root', () => {
    expect(localizePath('/notes/why', 'en', config)).toBe('/notes/why');
  });

  it('prefixes other locales', () => {
    expect(localizePath('/notes/why', 'es', config)).toBe('/es/notes/why');
    expect(localizePath('/', 'es', config)).toBe('/es/');
  });

  it('normalizes a path with no leading slash for default locale', () => {
    expect(localizePath('notes/why', 'en', config)).toBe('/notes/why');
  });

  it('normalizes a path with no leading slash for non-default locale', () => {
    expect(localizePath('notes/why', 'es', config)).toBe('/es/notes/why');
  });
});

describe('localeFromPath', () => {
  it('reads the locale prefix', () => {
    expect(localeFromPath('/es/notes', config)).toBe('es');
  });

  it('treats unprefixed paths as the default locale', () => {
    expect(localeFromPath('/notes', config)).toBe('en');
    expect(localeFromPath('/', config)).toBe('en');
  });

  it('does not mistake a segment that only starts like a locale', () => {
    expect(localeFromPath('/essays', config)).toBe('en');
  });
});

describe('switchLocale', () => {
  it('moves the same page to another locale', () => {
    expect(switchLocale('/es/notes/why', 'en', config)).toBe('/notes/why');
    expect(switchLocale('/notes/why', 'es', config)).toBe('/es/notes/why');
    expect(switchLocale('/es', 'en', config)).toBe('/');
  });

  it('switching to the same locale is a no-op that still normalizes', () => {
    expect(switchLocale('/es/notes', 'es', config)).toBe('/es/notes');
    expect(switchLocale('/notes', 'en', config)).toBe('/notes');
  });

  it('default->default keeps root', () => {
    expect(switchLocale('/notes', 'en', config)).toBe('/notes');
    expect(switchLocale('/', 'en', config)).toBe('/');
  });

  it('bare "/" to a non-default locale', () => {
    expect(switchLocale('/', 'es', config)).toBe('/es/');
  });
});
