import { describe, expect, it } from 'vitest';

import { credentialSchema } from './schema.ts';

const schema = credentialSchema();
const valid = {
  title: 'BSc Computer Science',
  issuer: 'Some University',
  kind: 'degree',
  year: 2020,
  month: 11,
  url: 'https://example.edu/verify/abc',
};

describe('credentialSchema', () => {
  it('accepts a complete credential', () => {
    expect(schema.parse(valid).kind).toBe('degree');
  });

  it('only allows degree or certificate', () => {
    expect(() => schema.parse({ ...valid, kind: 'diploma' })).toThrow();
  });

  it('makes url optional but rejects non-https', () => {
    const { url: _, ...rest } = valid;
    expect(() => schema.parse(rest)).not.toThrow();
    expect(() => schema.parse({ ...valid, url: 'http://x.edu' })).toThrow();
  });

  it('bounds the month to 1-12', () => {
    expect(() => schema.parse({ ...valid, month: 13 })).toThrow();
  });

  it('keeps the current entries valid: every new field is optional', () => {
    const parsed = schema.parse({
      title: 'Course',
      issuer: 'Academy',
      kind: 'certificate',
      year: 2026,
    });
    expect(parsed.image).toBeUndefined();
    expect(parsed.learnings).toBeUndefined();
    expect(parsed.appliedIn).toBeUndefined();
    expect(parsed.expires).toBeUndefined();
  });

  it('accepts an optional non-negative integer order', () => {
    expect(schema.parse({ ...valid, order: 0 }).order).toBe(0);
    expect(() => schema.parse({ ...valid, order: -1 })).toThrow();
    expect(() => schema.parse({ ...valid, order: 1.5 })).toThrow();
  });

  it('accepts the professional kind', () => {
    expect(schema.parse({ ...valid, kind: 'professional' }).kind).toBe('professional');
  });

  it('accepts plain or per-locale learnings and applied-in text', () => {
    const parsed = schema.parse({
      ...valid,
      learnings: ['Plain point', { es: 'Punto', en: 'Point' }],
      appliedIn: { es: 'En este sitio', en: 'On this site' },
    });
    expect(parsed.learnings).toHaveLength(2);
    expect(parsed.appliedIn).toEqual({ es: 'En este sitio', en: 'On this site' });
  });

  it('rejects empty learnings, per-locale text without the default locale and long text', () => {
    expect(() => schema.parse({ ...valid, learnings: [] })).toThrow();
    expect(() => schema.parse({ ...valid, learnings: [{ en: 'Point' }] })).toThrow();
    expect(() => schema.parse({ ...valid, learnings: ['x'.repeat(241)] })).toThrow();
    expect(() => schema.parse({ ...valid, appliedIn: 'x'.repeat(161) })).toThrow();
  });

  it('accepts an image file name inside the education assets with alt text', () => {
    const image = { file: 'universidad-nacional.webp', alt: { es: 'Diploma', en: 'Diploma' } };
    expect(schema.parse({ ...valid, image }).image?.file).toBe('universidad-nacional.webp');
    expect(() => schema.parse({ ...valid, image: { ...image, file: '../secret.png' } })).toThrow();
    expect(() => schema.parse({ ...valid, image: { file: 'a.webp' } })).toThrow();
  });

  it('accepts an expiry as YYYY-MM and rejects other shapes', () => {
    expect(schema.parse({ ...valid, expires: '2028-03' }).expires).toBe('2028-03');
    for (const bad of ['2028', '2028-13', '03/2028', '2028-3']) {
      expect(() => schema.parse({ ...valid, expires: bad }), bad).toThrow();
    }
  });
});
