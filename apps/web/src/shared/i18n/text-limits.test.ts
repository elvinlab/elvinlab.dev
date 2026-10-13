import { describe, expect, it } from 'vitest';

import { DICTIONARIES } from './index.ts';
import { limitFor, TEXT_LIMITS } from './text-limits.ts';

const locales = ['es', 'en'] as const;
const keys = Object.keys(DICTIONARIES.es);

describe('UI text limits', () => {
  it('has a limit for every group of keys, so a new group cannot skip it', () => {
    const unlimited = keys.filter((key) => limitFor(key) === undefined);
    expect(unlimited, `add a group to TEXT_LIMITS for: ${unlimited.join(', ')}`).toEqual([]);
  });

  for (const locale of locales) {
    it(`keeps every ${locale} text within the limit of its group`, () => {
      const dictionary: Readonly<Record<string, string>> = DICTIONARIES[locale];
      const tooLong = keys.flatMap((key) => {
        const text = dictionary[key];
        const limit = limitFor(key);
        return text !== undefined && limit !== undefined && text.length > limit
          ? [`${locale} ${key}: ${text.length} characters, limit ${limit}`]
          : [];
      });
      expect(tooLong).toEqual([]);
    });
  }

  it('keeps the stamps to two words and twelve characters, the notebook rule of DESIGN.md', () => {
    for (const locale of locales) {
      const dictionary: Readonly<Record<string, string>> = DICTIONARIES[locale];
      for (const key of keys.filter((name) => name.startsWith('stamp.'))) {
        const text = dictionary[key] ?? '';
        expect(text.split(/\s+/).length, `${locale} ${key}`).toBeLessThanOrEqual(2);
        expect(text.length, `${locale} ${key}`).toBeLessThanOrEqual(12);
      }
    }
  });

  it('gives every key a text in both languages (a missing one silently shows the Spanish)', () => {
    // Needed only on a Spanish page that links to an English note ("Leer el caso (en inglés)"):
    // the English page never links to an English note with a language suffix.
    const spanishOnly = ['experiment.case.en'];
    const missing = keys.filter((key) => !(key in DICTIONARIES.en) && !spanishOnly.includes(key));
    expect(missing).toEqual([]);
  });

  it('matches the longest prefix, so a stricter rule for one key wins over its group', () => {
    expect(limitFor('stamp.decision')).toBe(TEXT_LIMITS['stamp']);
    expect(limitFor('nav.notes')).toBe(TEXT_LIMITS['nav']);
    expect(limitFor('does.not.exist')).toBeUndefined();
  });
});
