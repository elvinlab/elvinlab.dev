import { describe, expect, it } from 'vitest';

import { isSubscribeActive } from './availability.ts';

describe('isSubscribeActive', () => {
  it('needs the blog and the subscribe flag', () => {
    expect(isSubscribeActive({ blog: true, subscribe: true })).toBe(true);
    expect(isSubscribeActive({ blog: true, subscribe: false })).toBe(false);
    expect(isSubscribeActive({ blog: false, subscribe: true })).toBe(false);
  });
});
