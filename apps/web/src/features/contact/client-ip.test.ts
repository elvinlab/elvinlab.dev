import { describe, expect, it } from 'vitest';

import { resolveClientIp } from './client-ip.ts';

describe('resolveClientIp', () => {
  it('uses the Cloudflare header when present, in any mode', () => {
    expect(resolveClientIp('203.0.113.7', false)).toBe('203.0.113.7');
    expect(resolveClientIp('203.0.113.7', true)).toBe('203.0.113.7');
  });

  it('falls back to loopback only in development, where no proxy sets the header', () => {
    expect(resolveClientIp(null, true)).toBe('127.0.0.1');
  });

  it('never invents an identity in production', () => {
    expect(resolveClientIp(null, false)).toBeUndefined();
    expect(resolveClientIp('', false)).toBeUndefined();
  });
});
