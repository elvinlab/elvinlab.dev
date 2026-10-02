import { describe, expect, it } from 'vitest';

import { sortExperiments, splitStatus, yearsSince } from './portfolio.ts';

describe('yearsSince', () => {
  it('counts full years from a start year to a reference year', () => {
    expect(yearsSince(2020, 2026)).toBe(6);
  });

  it('never returns a negative number', () => {
    expect(yearsSince(2030, 2026)).toBe(0);
  });
});

describe('sortExperiments', () => {
  const items = [
    { data: { title: 'a', year: 2024, featured: false } },
    { data: { title: 'b', year: 2026, featured: false } },
    { data: { title: 'c', year: 2022, featured: true } },
  ];

  it('puts featured first, then newest year', () => {
    expect(sortExperiments(items).map((e) => e.data.title)).toEqual(['c', 'b', 'a']);
  });

  it('does not mutate the input', () => {
    const copy = [...items];
    sortExperiments(items);
    expect(items).toEqual(copy);
  });
});

describe('splitStatus', () => {
  it('uses the first part as the headline and the rest as short tags', () => {
    expect(splitStatus('Working at Buo · open to chat')).toEqual({
      headline: 'Working at Buo',
      tags: ['open to chat'],
    });
  });

  it('keeps a single-part status as a headline with no tags', () => {
    expect(splitStatus('Open to work')).toEqual({ headline: 'Open to work', tags: [] });
  });

  it('trims the parts and drops empty ones', () => {
    expect(splitStatus('  A  ·  · B ·   · C ')).toEqual({ headline: 'A', tags: ['B', 'C'] });
  });
});
