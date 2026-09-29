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
});
