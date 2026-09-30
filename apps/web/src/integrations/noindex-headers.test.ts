import { describe, expect, it } from 'vitest';

import { addNoindexRule } from './noindex-headers.ts';

const cacheRule = '/_astro/*\n  Cache-Control: public, max-age=31536000, immutable\n';

describe('addNoindexRule', () => {
  it('creates a catch-all noindex rule from an empty file', () => {
    expect(addNoindexRule('')).toBe('/*\n  X-Robots-Tag: noindex\n');
  });

  it('keeps existing rules, such as the immutable asset cache', () => {
    const result = addNoindexRule(cacheRule);
    expect(result).toContain('/*\n  X-Robots-Tag: noindex\n');
    expect(result).toContain(cacheRule);
  });

  it('is idempotent', () => {
    const once = addNoindexRule(cacheRule);
    expect(addNoindexRule(once)).toBe(once);
  });
});
