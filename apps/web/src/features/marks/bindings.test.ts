import { describe, expect, it } from 'vitest';

import { marksBindingsSchema } from './bindings.ts';

const db = { prepare: () => ({}) };
const limiter = { limit: async () => ({ success: true }) };

describe('marksBindingsSchema', () => {
  it('accepts a D1-like database and a rate limiter', () => {
    expect(
      marksBindingsSchema.safeParse({ MARKS_DB: db, MARKS_RATE_LIMITER: limiter }).success,
    ).toBe(true);
  });

  it.each([
    ['missing database', { MARKS_RATE_LIMITER: limiter }],
    ['missing limiter', { MARKS_DB: db }],
    ['database without prepare', { MARKS_DB: {}, MARKS_RATE_LIMITER: limiter }],
    ['limiter without limit', { MARKS_DB: db, MARKS_RATE_LIMITER: {} }],
    ['string database', { MARKS_DB: 'x', MARKS_RATE_LIMITER: limiter }],
  ])('rejects %s', (_name, env) => {
    expect(marksBindingsSchema.safeParse(env).success).toBe(false);
  });

  it('ignores unrelated bindings', () => {
    expect(
      marksBindingsSchema.safeParse({ MARKS_DB: db, MARKS_RATE_LIMITER: limiter, OTHER: 1 })
        .success,
    ).toBe(true);
  });
});
