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
});
