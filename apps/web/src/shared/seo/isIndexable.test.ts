import { describe, expect, it } from 'vitest';

import { isIndexable } from './isIndexable.ts';

describe('isIndexable', () => {
  it('returns true only when env.SITE_INDEXABLE is exactly "true"', () => {
    expect(isIndexable({ SITE_INDEXABLE: 'true' })).toBe(true);
  });

  it('returns false when SITE_INDEXABLE is unset', () => {
    expect(isIndexable({})).toBe(false);
  });

  it('returns false when SITE_INDEXABLE is "false"', () => {
    expect(isIndexable({ SITE_INDEXABLE: 'false' })).toBe(false);
  });

  it('returns false when SITE_INDEXABLE is any other string', () => {
    expect(isIndexable({ SITE_INDEXABLE: 'yes' })).toBe(false);
    expect(isIndexable({ SITE_INDEXABLE: '1' })).toBe(false);
    expect(isIndexable({ SITE_INDEXABLE: 'TRUE' })).toBe(false);
  });
});
