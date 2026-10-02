import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { experienceSchema } from './schema.ts';

const schema = experienceSchema();
const valid = {
  role: 'Full-stack Engineer',
  company: 'BUO',
  start: 2022,
  summary: 'Full-stack engineering across frontend, backend and cloud.',
  tags: ['typescript', 'astro'],
};

describe('experienceSchema', () => {
  it('accepts an ongoing role (no end)', () => {
    expect(schema.parse(valid).end).toBeUndefined();
  });

  it('accepts a past role and rejects end before start', () => {
    expect(schema.parse({ ...valid, end: 2024 }).end).toBe(2024);
    expect(() => schema.parse({ ...valid, start: 2022, end: 2020 })).toThrow(/end/);
  });

  it('caps tags at 5', () => {
    expect(() => schema.parse({ ...valid, tags: ['a', 'b', 'c', 'd', 'e', 'f'] })).toThrow();
  });

  describe('per-locale text', () => {
    const perLocale = { es: 'Ingeniero de software', en: 'Software Engineer' };

    it('accepts a plain string and a per-locale object for role, summary and location', () => {
      const plain = schema.parse({ ...valid, location: 'Remote' });
      expect(plain.role).toBe(valid.role);
      expect(plain.location).toBe('Remote');

      const entry = schema.parse({
        ...valid,
        role: perLocale,
        summary: { es: 'Resumen', en: 'Summary' },
        location: { es: 'Remoto', en: 'Remote' },
      });
      expect(entry.role).toEqual(perLocale);
      expect(entry.summary).toEqual({ es: 'Resumen', en: 'Summary' });
      expect(entry.location).toEqual({ es: 'Remoto', en: 'Remote' });
    });

    it('rejects a per-locale object without the default locale', () => {
      expect(() => schema.parse({ ...valid, role: { en: 'Software Engineer' } })).toThrow(/es/);
      expect(() => schema.parse({ ...valid, summary: { en: 'Summary' } })).toThrow(/es/);
      expect(() => schema.parse({ ...valid, location: { en: 'Remote' } })).toThrow(/es/);
    });

    it('rejects an empty string, plain or per locale', () => {
      expect(() => schema.parse({ ...valid, role: '' })).toThrow();
      expect(() => schema.parse({ ...valid, role: { es: 'Rol', en: '' } })).toThrow();
    });

    it('keeps the length limits for every locale', () => {
      expect(() => schema.parse({ ...valid, role: { es: 'Rol', en: 'x'.repeat(81) } })).toThrow();
      expect(() =>
        schema.parse({ ...valid, summary: { es: 'Resumen', en: 'x'.repeat(281) } }),
      ).toThrow();
    });
  });

  describe('the real experience.json', () => {
    const raw = JSON.parse(
      readFileSync(new URL('../../content/experience.json', import.meta.url), 'utf8'),
    ) as Record<string, unknown>;

    it('parses and carries both locales for role and summary of every entry', () => {
      const entries = Object.entries(raw);
      expect(entries.length).toBeGreaterThan(0);
      for (const [id, value] of entries) {
        const entry = schema.parse(value);
        for (const field of [entry.role, entry.summary]) {
          expect(typeof field, `${id} is per locale`).toBe('object');
          expect(Object.keys(field).sort(), id).toEqual(['en', 'es']);
        }
      }
    });
  });
});
