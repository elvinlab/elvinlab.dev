import { describe, expect, it } from 'vitest';

import { isSubscribeActive, isSubscribeFormShown } from './availability.ts';

describe('subscribe availability', () => {
  it('is active only with the blog and the flag on', () => {
    expect(isSubscribeActive({ blog: true, subscribe: true })).toBe(true);
    expect(isSubscribeActive({ blog: true, subscribe: false })).toBe(false);
    expect(isSubscribeActive({ blog: false, subscribe: true })).toBe(false);
  });

  it('shows the form only when active and a Turnstile site key exists', () => {
    const on = { blog: true, subscribe: true };
    expect(isSubscribeFormShown(on, '0x4AAAA')).toBe(true);
    expect(isSubscribeFormShown(on, undefined)).toBe(false);
    expect(isSubscribeFormShown(on, '  ')).toBe(false);
    expect(isSubscribeFormShown({ ...on, subscribe: false }, '0x4AAAA')).toBe(false);
  });
});
