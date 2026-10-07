import { describe, expect, it } from 'vitest';

import { formatNowDate, sortExperiments, splitStatus, yearsSince } from './portfolio.ts';

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

  it('orders featured entries by `order` ascending, then newest year, then id', () => {
    const entry = (id: string, year: number, order?: number) => ({
      id,
      data: { year, featured: true, ...(order === undefined ? {} : { order }) },
    });
    const sorted = sortExperiments([
      entry('zeta', 2026),
      entry('beta', 2026),
      entry('flagship', 2024, 1),
      entry('second', 2020, 2),
      entry('alpha', 2026),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(['flagship', 'second', 'alpha', 'beta', 'zeta']);
  });

  it('keeps `featured` above `order`', () => {
    const sorted = sortExperiments([
      { id: 'plain', data: { year: 2026, featured: false, order: 1 } },
      { id: 'big', data: { year: 2020, featured: true, order: 50 } },
    ]);
    expect(sorted.map((e) => e.id)).toEqual(['big', 'plain']);
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

describe('formatNowDate', () => {
  it('formats a calendar date as a long date in each locale', () => {
    expect(formatNowDate('2026-10-02', 'es')).toBe('2 de octubre de 2026');
    expect(formatNowDate('2026-10-02', 'en')).toBe('October 2, 2026');
  });

  it('reads the date as UTC so a month boundary never shifts with the viewer timezone', () => {
    expect(formatNowDate('2026-03-01', 'es')).toBe('1 de marzo de 2026');
    expect(formatNowDate('2026-12-31', 'en')).toBe('December 31, 2026');
    expect(formatNowDate('2026-01-01', 'en')).toBe('January 1, 2026');
  });
});
