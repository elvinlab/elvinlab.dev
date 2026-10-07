import { describe, expect, it } from 'vitest';

import type { ChangelogEntry } from '@/features/changelog/schema.ts';

import { formatReleaseDate, groupReleases, KIND_ORDER } from './releases.ts';

const entry = (
  id: string,
  date: string,
  category: ChangelogEntry['category'],
  title: string,
  description?: string,
) => ({
  id,
  data: { date: new Date(date), category, title, ...(description && { description }) },
});

describe('groupReleases', () => {
  const entries = [
    entry('a', '2026-10-06', 'fixed', 'Zed fix'),
    entry('b', '2026-10-07', 'added', 'New thing', 'With detail'),
    entry('c', '2026-10-06', 'added', 'Beta'),
    entry('d', '2026-10-06', 'added', 'Alpha'),
    entry('e', '2026-10-06', 'security', 'Harden'),
    entry('f', '2026-10-06', 'fixed', 'Alpha fix'),
  ];

  it('makes one release per production day, newest first, counting entries', () => {
    const releases = groupReleases(entries, {});
    expect(releases.map((release) => [release.date, release.total])).toEqual([
      ['2026-10-07', 1],
      ['2026-10-06', 5],
    ]);
  });

  it('groups by kind in the fixed order and omits empty kinds', () => {
    const [, day] = groupReleases(entries, {});
    expect(day?.groups.map((group) => group.kind)).toEqual(['added', 'fixed', 'security']);
    expect(KIND_ORDER).toEqual(['added', 'changed', 'fixed', 'removed', 'security', 'deprecated']);
  });

  it('sorts entries of a kind by title, whatever the source order', () => {
    const [, day] = groupReleases(entries, {});
    expect(day?.groups[0]?.entries.map((item) => item.title)).toEqual(['Alpha', 'Beta']);
    expect(day?.groups[1]?.entries.map((item) => item.title)).toEqual(['Alpha fix', 'Zed fix']);
  });

  it('keeps the description and id of each entry', () => {
    const [today] = groupReleases(entries, {});
    expect(today?.groups[0]?.entries[0]).toEqual({
      id: 'b',
      title: 'New thing',
      description: 'With detail',
    });
  });

  it('attaches the optional day title from releases.json only to that day', () => {
    const releases = groupReleases(entries, { '2026-10-07': { title: 'Big day' } });
    expect(releases[0]?.title).toBe('Big day');
    expect(releases[1]).not.toHaveProperty('title');
  });

  it('returns no releases for no entries', () => {
    expect(groupReleases([], {})).toEqual([]);
  });
});

describe('formatReleaseDate', () => {
  const date = new Date('2026-10-07');
  it('uses the long Spanish form', () => {
    expect(formatReleaseDate(date, 'es')).toBe('7 de octubre de 2026');
  });
  it('uses a short month in English', () => {
    expect(formatReleaseDate(date, 'en')).toBe('Oct 7, 2026');
  });
});
