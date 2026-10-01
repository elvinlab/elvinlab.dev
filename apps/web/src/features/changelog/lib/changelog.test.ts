import { describe, expect, it } from 'vitest';

import { formatChangelogDate, sortChangelog } from './changelog.ts';

const mockEntries = [
  { data: { date: new Date('2026-10-01') } },
  { data: { date: new Date('2026-09-30') } },
  { data: { date: new Date('2026-10-02') } },
];

describe('sortChangelog', () => {
  it('sorts entries by date, newest first', () => {
    const sorted = sortChangelog(mockEntries);
    expect(sorted.map((entry) => entry.data.date.toISOString())).toEqual([
      new Date('2026-10-02').toISOString(),
      new Date('2026-10-01').toISOString(),
      new Date('2026-09-30').toISOString(),
    ]);
  });
});

describe('formatChangelogDate', () => {
  const date = new Date('2026-10-01');

  it('formats in Spanish', () => {
    expect(formatChangelogDate(date, 'es')).toBe('1 de octubre de 2026');
  });

  it('formats in English', () => {
    expect(formatChangelogDate(date, 'en')).toBe('October 1, 2026');
  });
});
