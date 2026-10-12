import { describe, expect, it } from 'vitest';

import { buildDataRows, type DataRowsInput } from './data-rows.ts';

const input: DataRowsInput = {
  identity: {
    name: 'Ada Example',
    handle: 'ada',
    role: { es: 'Ingeniera de software', en: 'Software engineer' },
    location: 'Somewhere',
    startedYear: 2015,
  },
  headline: { es: 'Del dato a la pantalla', en: 'From data to screen' },
  stack: [{ items: ['SQL', 'Postgres'] }, { items: ['TypeScript'] }],
};

const byField = (rows: ReturnType<typeof buildDataRows>) =>
  Object.fromEntries(rows.map((row) => [row.field, row]));

describe('buildDataRows', () => {
  it('infers text, int and text[] types', () => {
    const rows = byField(buildDataRows(input, 'en'));
    expect(rows['name']).toEqual({ field: 'name', type: 'text', value: '"Ada Example"' });
    expect(rows['started_year']).toEqual({ field: 'started_year', type: 'int', value: '2015' });
    expect(rows['stack.1']).toEqual({
      field: 'stack.1',
      type: 'text[]',
      value: '["SQL", "Postgres"]',
    });
  });

  it('uses the active locale for localized fields', () => {
    expect(byField(buildDataRows(input, 'es'))['role']?.value).toBe('"Ingeniera de software"');
    expect(byField(buildDataRows(input, 'en'))['headline']?.value).toBe('"From data to screen"');
  });

  it('falls back to another locale when the requested one is missing', () => {
    const rows = byField(buildDataRows({ ...input, headline: { es: 'Solo ES' } }, 'en'));
    expect(rows['headline']?.value).toBe('"Solo ES"');
  });

  it('omits optional fields that are not configured', () => {
    const { location: _location, ...identity } = input.identity;
    const { headline: _headline, ...rest } = input;
    const rows = byField(buildDataRows({ ...rest, identity }, 'en'));
    expect(rows['location']).toBeUndefined();
    expect(rows['headline']).toBeUndefined();
  });

  it('numbers one text[] row per stack group, in order', () => {
    const fields = buildDataRows(input, 'en').map((row) => row.field);
    expect(fields.filter((f) => f.startsWith('stack.'))).toEqual(['stack.1', 'stack.2']);
  });

  it('never returns an empty field, type or value', () => {
    for (const row of buildDataRows(input, 'es')) {
      expect(row.field).not.toBe('');
      expect(row.type).not.toBe('');
      expect(row.value).not.toBe('');
    }
  });
});
