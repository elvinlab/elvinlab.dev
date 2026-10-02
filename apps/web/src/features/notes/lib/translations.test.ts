import { describe, expect, it } from 'vitest';

import { translationAlternates, translationsOf } from './translations.ts';

const note = (slug: string, lang: string, translationOf?: string) => ({
  slug,
  data: { lang, ...(translationOf ? { translationOf } : {}) },
});

describe('translationsOf', () => {
  it('returns only the note itself when it has no translation', () => {
    expect(translationsOf([note('solo', 'es')], 'solo')).toEqual({ es: 'solo' });
  });

  it('links a pair when only one side declares it (from either side)', () => {
    const notes = [note('hola', 'es'), note('hello', 'en', 'hola')];
    expect(translationsOf(notes, 'hola')).toEqual({ es: 'hola', en: 'hello' });
    expect(translationsOf(notes, 'hello')).toEqual({ es: 'hola', en: 'hello' });
  });

  it('accepts both sides declaring each other', () => {
    const notes = [note('hola', 'es', 'hello'), note('hello', 'en', 'hola')];
    expect(translationsOf(notes, 'hola')).toEqual({ es: 'hola', en: 'hello' });
  });

  it('groups three languages through any of the links', () => {
    const notes = [note('hola', 'es'), note('hello', 'en', 'hola'), note('ola', 'pt', 'hola')];
    expect(translationsOf(notes, 'hello')).toEqual({ es: 'hola', en: 'hello', pt: 'ola' });
  });

  it('does not mix unrelated notes', () => {
    const notes = [note('a', 'es'), note('b', 'en', 'a'), note('c', 'es'), note('d', 'en', 'c')];
    expect(translationsOf(notes, 'c')).toEqual({ es: 'c', en: 'd' });
  });

  it('fails when the translation does not exist, and says which note and why it may be missing', () => {
    const notes = [note('hola', 'es', 'hello')];
    expect(() => translationsOf(notes, 'hola')).toThrow(/"hola".*"hello".*does not exist.*draft/s);
  });

  it('fails when a note claims to translate itself', () => {
    expect(() => translationsOf([note('a', 'es', 'a')], 'a')).toThrow(/"a".*itself/s);
  });

  it('fails when a translation is in the same language', () => {
    const notes = [note('a', 'es'), note('b', 'es', 'a')];
    expect(() => translationsOf(notes, 'a')).toThrow(/"b".*"a".*same language.*es/s);
  });

  it('fails when two notes of one language end up in the same group', () => {
    const notes = [note('a', 'es'), note('b', 'en', 'a'), note('c', 'en', 'a')];
    expect(() => translationsOf(notes, 'a')).toThrow(/"b".*"c".*en/s);
  });

  it('only reports problems of the group being asked for', () => {
    const notes = [note('ok', 'es'), note('broken', 'es', 'missing')];
    expect(translationsOf(notes, 'ok')).toEqual({ es: 'ok' });
  });

  it('fails for a slug that is not in the collection', () => {
    expect(() => translationsOf([], 'ghost')).toThrow(/ghost/);
  });
});

describe('translationAlternates', () => {
  const pathFor = (lang: string, slug: string): string =>
    lang === 'es' ? `/notes/${slug}/` : `/${lang}/notes/${slug}/`;

  it('has no alternates for a note without translations', () => {
    expect(translationAlternates({ es: 'solo' }, 'es', pathFor)).toEqual([]);
  });

  it('lists every language plus x-default pointing at the default language', () => {
    expect(translationAlternates({ en: 'hello', es: 'hola' }, 'es', pathFor)).toEqual([
      { hreflang: 'es', path: '/notes/hola/' },
      { hreflang: 'en', path: '/en/notes/hello/' },
      { hreflang: 'x-default', path: '/notes/hola/' },
    ]);
  });

  it('omits x-default when there is no note in the default language', () => {
    expect(translationAlternates({ en: 'hello', pt: 'ola' }, 'es', pathFor)).toEqual([
      { hreflang: 'en', path: '/en/notes/hello/' },
      { hreflang: 'pt', path: '/pt/notes/ola/' },
    ]);
  });
});
