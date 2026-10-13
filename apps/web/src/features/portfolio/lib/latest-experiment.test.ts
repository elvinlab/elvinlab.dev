import { describe, expect, it } from 'vitest';

import { latestExperiment } from './latest-experiment.ts';

type Entry = Parameters<typeof latestExperiment>[0][number];

const entry = (id: string, extra: Partial<Entry> = {}): Entry => ({
  id,
  title: id,
  year: 2025,
  featured: false,
  status: 'shipped',
  ...extra,
});

describe('latestExperiment', () => {
  it('returns nothing for an empty list', () => {
    expect(latestExperiment([], 'es')).toBeUndefined();
  });

  it('returns the entry with the newest publication date', () => {
    const entries = [
      entry('old', { publishedAt: '2025-02-01' }),
      entry('new', { publishedAt: '2026-03-10' }),
      entry('mid', { publishedAt: '2025-11-20' }),
    ];
    expect(latestExperiment(entries, 'es')?.id).toBe('new');
  });

  it('dates an entry without publishedAt as 1 January of its year', () => {
    const entries = [
      entry('dated', { publishedAt: '2025-06-01' }),
      entry('by-year', { year: 2026 }),
    ];
    expect(latestExperiment(entries, 'es')?.id).toBe('by-year');
  });

  it('skips archived entries', () => {
    const entries = [
      entry('archived-new', { publishedAt: '2026-05-01', status: 'archived' }),
      entry('live', { publishedAt: '2025-01-01' }),
    ];
    expect(latestExperiment(entries, 'es')?.id).toBe('live');
  });

  it('returns nothing when every entry is archived', () => {
    expect(latestExperiment([entry('a', { status: 'archived' })], 'es')).toBeUndefined();
  });

  it('picks by date even when another entry is featured', () => {
    const entries = [
      entry('big', { featured: true, publishedAt: '2024-01-01' }),
      entry('fresh', { publishedAt: '2026-01-01' }),
    ];
    expect(latestExperiment(entries, 'es')?.id).toBe('fresh');
  });
});
