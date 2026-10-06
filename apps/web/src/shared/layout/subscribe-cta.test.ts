import { describe, expect, it } from 'vitest';

import { showSubscribeCta, showSubscribeLink } from './subscribe-cta.ts';

const on = { blog: true, subscribe: true };
const base = { features: on, turnstileSiteKey: 'key', path: '/', printable: false };

describe('showSubscribeCta', () => {
  it('shows on ordinary pages when the subscription is reachable', () => {
    for (const path of ['/', '/contact/', '/privacy/', '/notes/', '/notes/smoke-es/']) {
      expect(showSubscribeCta({ ...base, path })).toBe(true);
    }
  });

  it('hides on the subscription pages and the printable CV', () => {
    for (const path of ['/subscribe/', '/subscribe/confirm/', '/subscribe/unsubscribe/']) {
      expect(showSubscribeCta({ ...base, path })).toBe(false);
    }
    expect(showSubscribeCta({ ...base, path: '/me/', printable: true })).toBe(false);
  });

  it('hides when the flag, the blog or the Turnstile key is missing', () => {
    expect(showSubscribeCta({ ...base, features: { blog: true, subscribe: false } })).toBe(false);
    expect(showSubscribeCta({ ...base, features: { blog: false, subscribe: true } })).toBe(false);
    expect(showSubscribeCta({ ...base, turnstileSiteKey: undefined })).toBe(false);
    expect(showSubscribeCta({ ...base, turnstileSiteKey: '  ' })).toBe(false);
  });
});

describe('showSubscribeLink', () => {
  it('shows the footer link wherever the subscription is reachable, even on its own pages', () => {
    for (const path of ['/', '/notes/', '/subscribe/', '/subscribe/confirm/']) {
      expect(showSubscribeLink({ ...base, path })).toBe(true);
    }
  });

  it('is hidden on the printable CV and when the flag, the blog or the Turnstile key is missing', () => {
    expect(showSubscribeLink({ ...base, path: '/me/', printable: true })).toBe(false);
    expect(showSubscribeLink({ ...base, features: { blog: true, subscribe: false } })).toBe(false);
    expect(showSubscribeLink({ ...base, features: { blog: false, subscribe: true } })).toBe(false);
    expect(showSubscribeLink({ ...base, turnstileSiteKey: undefined })).toBe(false);
  });
});
