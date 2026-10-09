import { describe, expect, it } from 'vitest';

import { otherNoteLanguages } from './notebook-language.ts';

describe('otherNoteLanguages', () => {
  it('returns nothing when every note is in the page language', () => {
    expect(otherNoteLanguages('es', ['es', 'es'])).toEqual([]);
  });

  it('returns the note languages that differ from the page language', () => {
    expect(otherNoteLanguages('en', ['es', 'en'])).toEqual(['es']);
  });

  it('keeps each language once, in first-seen order', () => {
    expect(otherNoteLanguages('en', ['fr', 'es', 'fr', 'es'])).toEqual(['fr', 'es']);
  });

  it('returns nothing for an empty list', () => {
    expect(otherNoteLanguages('es', [])).toEqual([]);
  });
});
