import { describe, expect, it } from 'vitest';

import { noteSchema } from '@/features/notes/schema.ts';

import {
  continueReading,
  START_HERE_SIZE,
  type StartHereNote,
  selectStartHere,
  startHereProblems,
} from './start-here.ts';

const note = (slug: string, over: Partial<StartHereNote['data']> = {}): StartHereNote => ({
  slug,
  data: {
    number: 1,
    title: slug,
    description: 'Desc',
    pubDate: new Date('2026-01-01'),
    lang: 'es',
    category: 'decisiones',
    tags: [],
    ...over,
  },
});

const flagged = (slug: string, startHere: 1 | 2 | 3, over: Partial<StartHereNote['data']> = {}) =>
  note(slug, { startHere, startHereNote: `Reason ${slug}`, ...over });

describe('startHereProblems', () => {
  it('accepts an unflagged collection and a valid trio', () => {
    expect(startHereProblems([note('a'), note('b')]).filter((p) => p.level === 'error')).toEqual(
      [],
    );
    expect(
      startHereProblems([flagged('a', 1), flagged('b', 2), flagged('c', 3)]).filter(
        (p) => p.level === 'error',
      ),
    ).toEqual([]);
  });

  it('errors on a duplicate value in the same language but allows it across languages', () => {
    const dup = startHereProblems([flagged('a', 1), flagged('b', 1)]);
    expect(
      dup.some(
        (p) => p.level === 'error' && p.message.includes('"a"') && p.message.includes('"b"'),
      ),
    ).toBe(true);
    const across = startHereProblems([flagged('a', 1), flagged('b', 1, { lang: 'en' })]);
    expect(across.filter((p) => p.level === 'error')).toEqual([]);
  });

  it('errors when startHere has no reason, an empty reason or a reason over 120 characters', () => {
    const missing = note('a', { startHere: 1 });
    const blank = note('b', { startHere: 2, startHereNote: '   ' });
    const long = note('c', { startHere: 3, startHereNote: 'x'.repeat(121) });
    for (const bad of [missing, blank, long]) {
      expect(
        startHereProblems([bad]).some(
          (p) => p.level === 'error' && p.message.includes(`"${bad.slug}"`),
        ),
      ).toBe(true);
    }
  });

  it('errors on a value outside 1 to 3', () => {
    const out = note('a', { startHere: 4 as unknown as 1, startHereNote: 'r' });
    expect(
      startHereProblems([out]).some((p) => p.level === 'error' && p.message.includes('1 to 3')),
    ).toBe(true);
  });

  it('warns, without failing, when fewer than three notes of a language are flagged', () => {
    const problems = startHereProblems([flagged('a', 1), note('b', { lang: 'en' })]);
    expect(problems.filter((p) => p.level === 'error')).toEqual([]);
    expect(problems.some((p) => p.level === 'warning' && p.message.includes('es'))).toBe(true);
  });
});

describe('selectStartHere', () => {
  it('returns the flagged notes in startHere order, at most three', () => {
    const notes = [flagged('c', 3), flagged('a', 1), flagged('b', 2), note('d')];
    expect(selectStartHere(notes, 'es').map((n) => n.slug)).toEqual(['a', 'b', 'c']);
  });

  it('fills with the most recent unflagged notes when fewer than three are flagged', () => {
    const notes = [
      flagged('b', 2, { pubDate: new Date('2026-01-01') }),
      note('old', { pubDate: new Date('2026-02-01') }),
      note('new', { pubDate: new Date('2026-03-01') }),
      note('newer', { pubDate: new Date('2026-04-01') }),
    ];
    expect(selectStartHere(notes, 'es').map((n) => n.slug)).toEqual(['b', 'newer', 'new']);
  });

  it('is never empty while the language has notes, and never repeats a note', () => {
    const notes = [note('a'), note('b', { pubDate: new Date('2026-02-01') })];
    const picked = selectStartHere(notes, 'es').map((n) => n.slug);
    expect(picked).toEqual(['b', 'a']);
    expect(new Set(picked).size).toBe(picked.length);
    expect(selectStartHere([], 'es')).toEqual([]);
  });

  it('ignores notes of other languages', () => {
    const notes = [flagged('en-one', 1, { lang: 'en' }), flagged('es-one', 1)];
    expect(selectStartHere(notes, 'es').map((n) => n.slug)).toEqual(['es-one']);
  });

  it('never links a note that is not in the collection (unpublished or removed)', () => {
    const published = [flagged('a', 1), flagged('c', 3)];
    // "b" was flagged 2 but is unpublished, so it simply is not in the list.
    expect(selectStartHere(published, 'es').map((n) => n.slug)).toEqual(['a', 'c']);
  });

  it('uses START_HERE_SIZE as the limit', () => {
    const many = Array.from({ length: 6 }, (_, i) => note(`n${i}`, { number: i }));
    expect(selectStartHere(many, 'es')).toHaveLength(START_HERE_SIZE);
  });
});

describe('continueReading', () => {
  const current = note('current', { tags: ['x'] });

  it('puts the flagged notes first, then related ones, without repeating any', () => {
    const notes = [
      current,
      flagged('a', 1),
      flagged('b', 2),
      note('rel', { tags: ['x'] }),
      note('other', { tags: ['y'], category: 'otra' }),
    ];
    expect(continueReading(notes, current, 3, []).map((n) => n.slug)).toEqual(['a', 'b', 'rel']);
  });

  it('excludes the current note and the slugs already shown (previous and next)', () => {
    const self = flagged('current', 1);
    const notes = [
      self,
      flagged('a', 2),
      flagged('b', 3),
      note('rel', { tags: ['x'], category: 'otra' }),
    ];
    expect(continueReading(notes, self, 3, ['a']).map((n) => n.slug)).toEqual(['b']);
  });

  it('is empty when nothing qualifies', () => {
    expect(continueReading([current], current, 3, [])).toEqual([]);
  });

  it('stays in the language of the current note', () => {
    const notes = [current, flagged('en-one', 1, { lang: 'en' })];
    expect(continueReading(notes, current, 3, [])).toEqual([]);
  });
});

describe('noteSchema startHere fields', () => {
  const base = {
    number: 1,
    title: 'T',
    description: 'D',
    pubDate: '2026-01-01',
    lang: 'es',
    category: 'decisiones',
    decision: { context: 'c', decision: 'd', outcome: 'o' },
  };
  const parse = (extra: object) => noteSchema().safeParse({ ...base, ...extra });

  it('keeps existing notes valid and accepts a flagged note with a reason', () => {
    expect(parse({}).success).toBe(true);
    expect(parse({ startHere: 2, startHereNote: 'Por qué empezar aquí' }).success).toBe(true);
  });

  it('rejects startHere without a reason, out of range, or a reason over 120 characters', () => {
    expect(parse({ startHere: 1 }).success).toBe(false);
    expect(parse({ startHere: 4, startHereNote: 'x' }).success).toBe(false);
    expect(parse({ startHere: 0, startHereNote: 'x' }).success).toBe(false);
    expect(parse({ startHere: 1, startHereNote: 'x'.repeat(121) }).success).toBe(false);
  });
});
