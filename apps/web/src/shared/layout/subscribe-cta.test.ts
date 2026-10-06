import { describe, expect, it } from 'vitest';

import { showSubscribeCta } from './subscribe-cta.ts';

const on = { blog: true, subscribe: true };
const base = { features: on, turnstileSiteKey: 'key', path: '/', printable: false };

describe('showSubscribeCta', () => {
  it('shows on ordinary pages when the subscription is reachable', () => {
    for (const path of ['/', '/contact/', '/privacy/', '/notes/', '/notes/smoke-es/']) {
      expect(showSubscribeCta({ ...base, path })).toBe(true);
    }
  });

  it('hides on the subscription pages and the printable CV', () => {
    expect(showSubscribeCta({ ...base, path: '/subscribe/confirm/' })).toBe(false);
    expect(showSubscribeCta({ ...base, path: '/me/', printable: true })).toBe(false);
  });

  it('hides when the flag, the blog or the Turnstile key is missing', () => {
    expect(showSubscribeCta({ ...base, features: { blog: true, subscribe: false } })).toBe(false);
    expect(showSubscribeCta({ ...base, features: { blog: false, subscribe: true } })).toBe(false);
    expect(showSubscribeCta({ ...base, turnstileSiteKey: undefined })).toBe(false);
    expect(showSubscribeCta({ ...base, turnstileSiteKey: '  ' })).toBe(false);
  });
});
