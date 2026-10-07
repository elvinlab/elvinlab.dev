import { describe, expect, it } from 'vitest';

import { localToday, parseArgs, serialize, stampEntries } from './changelog-stamp.ts';

const entry = (date: string) => ({ date, category: 'added', title: 't' });

describe('stampEntries', () => {
  const current = {
    old: entry('2026-10-01'),
    fresh: entry('2026-10-06'),
    same: entry('2026-10-07'),
  };
  const released = { old: {} };

  it('dates only the entries that are not released yet', () => {
    const { next, changed } = stampEntries(current, released, '2026-10-07');
    expect(changed).toEqual(['fresh']);
    expect(next['fresh']?.date).toBe('2026-10-07');
    expect(next['old']?.date).toBe('2026-10-01');
  });

  it('keeps the key order and the other fields', () => {
    const { next } = stampEntries(current, released, '2026-10-07');
    expect(Object.keys(next)).toEqual(['old', 'fresh', 'same']);
    expect(next['fresh']).toEqual({ date: '2026-10-07', category: 'added', title: 't' });
  });
});

describe('parseArgs', () => {
  it('reads the date and the dry run flag', () => {
    expect(parseArgs(['--date', '2026-10-07', '--dry-run'])).toEqual({
      date: '2026-10-07',
      dryRun: true,
    });
    expect(parseArgs([])).toEqual({ date: undefined, dryRun: false });
  });
  it('rejects a malformed date', () => {
    expect(() => parseArgs(['--date', '7-10-2026'])).toThrow();
    expect(() => parseArgs(['--date'])).toThrow();
  });
});

describe('localToday and serialize', () => {
  it('formats the local calendar day', () => {
    expect(localToday(new Date(2026, 9, 7, 23, 59))).toBe('2026-10-07');
  });
  it('writes two spaces and a trailing newline', () => {
    expect(serialize({ a: entry('2026-10-07') })).toBe(
      '{\n  "a": {\n    "date": "2026-10-07",\n    "category": "added",\n    "title": "t"\n  }\n}\n',
    );
  });
});
