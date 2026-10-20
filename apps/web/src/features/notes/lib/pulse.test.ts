import { describe, expect, it } from 'vitest';

import { PULSE_SIZE, rankPulse } from './pulse.ts';

const note = (slug: string, number: number, lang: 'es' | 'en' = 'es') => ({
  slug,
  data: {
    number,
    lang,
    title: slug,
    description: slug,
    pubDate: new Date('2026-01-01'),
    tags: [],
    category: 'x',
  },
});

describe('rankPulse', () => {
  it('orders by weighted interaction: a comment counts more than a mark', () => {
    const notes = [note('a', 1), note('b', 2)];
    const ranked = rankPulse(notes, { a: { marks: 5 }, b: { comments: 4 } }, 'es');
    expect(ranked.map((entry) => entry.note.slug)).toEqual(['b', 'a']);
  });

  it('keeps only notes of the page language that have some interaction', () => {
    const notes = [note('a', 1), note('b', 2), note('c', 3, 'en'), note('d', 4)];
    const ranked = rankPulse(notes, { a: { marks: 1 }, c: { marks: 9 }, d: { marks: 0 } }, 'es');
    expect(ranked.map((entry) => entry.note.slug)).toEqual(['a']);
  });

  it('breaks ties with the newer note first and stops at the limit', () => {
    const notes = [note('a', 1), note('b', 2), note('c', 3)];
    const signals = { a: { marks: 2 }, b: { marks: 2 }, c: { marks: 2 } };
    expect(rankPulse(notes, signals, 'es', 2).map((entry) => entry.note.slug)).toEqual(['c', 'b']);
    expect(PULSE_SIZE).toBe(5);
  });

  it('names the strongest signal of each note for display', () => {
    const [entry] = rankPulse([note('a', 1)], { a: { marks: 3, reads: 40 } }, 'es');
    expect(entry?.top).toEqual({ kind: 'reads', count: 40 });
  });

  it('returns nothing without signals, so the block stays out of the page', () => {
    expect(rankPulse([note('a', 1)], {}, 'es')).toEqual([]);
  });
});
