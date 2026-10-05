import { describe, expect, it } from 'vitest';

import { marksBindingsSchema } from './bindings.ts';

const db = { prepare: () => ({}) };
const limiter = { limit: async () => ({ success: true }) };

describe('marksBindingsSchema', () => {
  it('accepts a D1-like database and a rate limiter', () => {
    expect(
      marksBindingsSchema.safeParse({ SITE_DB: db, MARKS_RATE_LIMITER: limiter }).success,
    ).toBe(true);
  });

  it.each([
    ['missing database', { MARKS_RATE_LIMITER: limiter }],
    ['missing limiter', { SITE_DB: db }],
    ['database without prepare', { SITE_DB: {}, MARKS_RATE_LIMITER: limiter }],
    ['limiter without limit', { SITE_DB: db, MARKS_RATE_LIMITER: {} }],
    ['string database', { SITE_DB: 'x', MARKS_RATE_LIMITER: limiter }],
  ])('rejects %s', (_name, env) => {
    expect(marksBindingsSchema.safeParse(env).success).toBe(false);
  });

  it('ignores unrelated bindings', () => {
    expect(
      marksBindingsSchema.safeParse({ SITE_DB: db, MARKS_RATE_LIMITER: limiter, OTHER: 1 }).success,
    ).toBe(true);
  });
});
