import { describe, expect, it } from 'vitest';

import { LOCALES, t } from '@/shared/i18n/index.ts';

import { splitMarked, stripMarks } from './inline-mark.ts';

describe('splitMarked', () => {
  it('returns one plain segment when there is no marker', () => {
    expect(splitMarked('Sin marcas.')).toEqual([{ text: 'Sin marcas.', marked: false }]);
  });

  it('splits plain text around one marked phrase', () => {
    expect(splitMarked('A [[b c]] d.')).toEqual([
      { text: 'A ', marked: false },
      { text: 'b c', marked: true },
      { text: ' d.', marked: false },
    ]);
  });

  it('handles several markers and a marker at either edge', () => {
    expect(splitMarked('[[a]] y [[b]]')).toEqual([
      { text: 'a', marked: true },
      { text: ' y ', marked: false },
      { text: 'b', marked: true },
    ]);
  });

  it('keeps unbalanced or empty markers as plain text so nothing is lost', () => {
    expect(splitMarked('a [[b')).toEqual([{ text: 'a [[b', marked: false }]);
    expect(splitMarked('a [[]] b')).toEqual([{ text: 'a [[]] b', marked: false }]);
  });

  it('returns no segments for an empty string', () => {
    expect(splitMarked('')).toEqual([]);
  });
});

describe('stripMarks', () => {
  it('removes the markers and keeps the words', () => {
    expect(stripMarks('A [[b c]] d.')).toBe('A b c d.');
    expect(stripMarks('Sin marcas.')).toBe('Sin marcas.');
  });
});

describe('home headline', () => {
  it('marks the key phrase in every locale and reads as one clean sentence', () => {
    const expected = {
      es: ['lo que sale mal', 'Construyo con agentes de IA y escribo lo que sale mal.'],
      en: ['what goes wrong', 'I build with AI agents and write down what goes wrong.'],
    } as const;
    for (const locale of LOCALES.locales) {
      const [phrase, sentence] = expected[locale];
      const raw = t(locale, 'home.headline');
      expect(
        splitMarked(raw)
          .filter((s) => s.marked)
          .map((s) => s.text),
      ).toEqual([phrase]);
      expect(stripMarks(raw)).toBe(sentence);
    }
  });

  it('keeps the marker syntax out of every other string', () => {
    for (const locale of LOCALES.locales) {
      for (const key of ['home.intro', 'home.pill.1', 'home.pill.2', 'home.pill.3'] as const) {
        expect(t(locale, key)).not.toContain('[[');
      }
    }
  });
});
