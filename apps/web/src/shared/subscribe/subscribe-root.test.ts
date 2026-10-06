import { describe, expect, it } from 'vitest';

import { subscribeRootAttributes } from './subscribe-root.ts';

describe('subscribeRootAttributes', () => {
  it('points the failure messages to the Contact page while the contact feature is on', () => {
    for (const locale of ['es', 'en'] as const) {
      const attrs = subscribeRootAttributes(locale, true);
      expect(attrs['data-error']).toMatch(/Contact/);
      expect(attrs['data-timeout']).toMatch(/Contact/);
    }
  });

  it('never mentions a Contact page that does not exist when the contact feature is off', () => {
    for (const locale of ['es', 'en'] as const) {
      const attrs = subscribeRootAttributes(locale, false);
      expect(attrs['data-error']).not.toMatch(/Contact/);
      expect(attrs['data-timeout']).not.toMatch(/Contact/);
      expect(attrs['data-error']).not.toBe('');
      expect(attrs['data-timeout']).not.toBe('');
    }
  });
});
