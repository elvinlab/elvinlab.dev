import { describe, expect, it } from 'vitest';

import { externalLinkAttrs, isExternalHref } from './external-link.ts';

const SITE = 'https://elvinlab.dev';

describe('isExternalHref', () => {
  it('treats relative paths, anchors and query-only links as internal', () => {
    for (const href of [
      '/notes/',
      '/en/me/',
      'notes/x/',
      './x',
      '../x',
      '#top',
      '?page=2',
      '/rss.xml',
      '',
    ]) {
      expect(isExternalHref(href, SITE), href).toBe(false);
    }
  });

  it('treats a protocol-relative link by its host', () => {
    expect(isExternalHref('//github.com/elvinlab', SITE)).toBe(true);
    expect(isExternalHref('//elvinlab.dev/notes/', SITE)).toBe(false);
  });

  it('treats non-web schemes as internal (they do not open a page)', () => {
    for (const href of [
      'mailto:someone@example.com',
      'tel:+34123456789',
      'javascript:void(0)',
      'data:text/plain,hi',
    ]) {
      expect(isExternalHref(href, SITE), href).toBe(false);
    }
  });

  it('treats absolute links to another domain as external', () => {
    for (const href of [
      'https://github.com/elvinlab',
      'https://www.linkedin.com/in/elvinlab',
      'http://example.com/',
      'https://drive.google.com/file/d/abc/view',
      'HTTPS://GITHUB.COM/x',
    ]) {
      expect(isExternalHref(href, SITE), href).toBe(true);
    }
  });

  it('treats the apex, www and any subdomain of the site domain as internal', () => {
    for (const href of [
      'https://elvinlab.dev',
      'https://elvinlab.dev/notes/x/',
      'https://www.elvinlab.dev/notes/x/',
      'https://staging.elvinlab.dev/',
      'https://a.b.elvinlab.dev/x',
      'http://elvinlab.dev/x',
      'https://ELVINLAB.dev/x',
      'https://elvinlab.dev:8443/x',
    ]) {
      expect(isExternalHref(href, SITE), href).toBe(false);
    }
  });

  it('does not confuse lookalike domains with the site domain', () => {
    for (const href of [
      'https://notelvinlab.dev/',
      'https://elvinlab.dev.evil.com/',
      'https://elvinlab.com/',
      'https://evil.com/?u=https://elvinlab.dev/',
      'https://elvinlab.dev@evil.com/',
    ]) {
      expect(isExternalHref(href, SITE), href).toBe(true);
    }
  });

  it('derives the own domain from a site URL with www, a path or another scheme', () => {
    expect(isExternalHref('https://elvinlab.dev/x', 'https://www.elvinlab.dev')).toBe(false);
    expect(isExternalHref('https://www.elvinlab.dev/x', 'https://www.elvinlab.dev/')).toBe(false);
    expect(isExternalHref('https://blog.elvinlab.dev/x', 'http://elvinlab.dev/base/')).toBe(false);
    expect(isExternalHref('https://github.com/x', 'https://www.elvinlab.dev')).toBe(true);
  });

  it('does not throw on malformed URLs and leaves them in the same tab', () => {
    for (const href of ['http://', 'https://[::1', 'https://exa mple.com']) {
      expect(() => isExternalHref(href, SITE), href).not.toThrow();
      expect(isExternalHref(href, SITE), href).toBe(false);
    }
  });

  it('treats everything as internal when the site URL itself is malformed', () => {
    expect(isExternalHref('https://github.com/x', 'not a url')).toBe(false);
  });
});

describe('externalLinkAttrs', () => {
  it('opens an external link in a new tab without leaking the opener or the referrer', () => {
    expect(externalLinkAttrs('https://github.com/elvinlab', SITE)).toEqual({
      target: '_blank',
      rel: 'noopener noreferrer',
    });
  });

  it('keeps an existing rel token in front of the safety tokens', () => {
    expect(externalLinkAttrs('https://github.com/elvinlab', SITE, 'me')).toEqual({
      target: '_blank',
      rel: 'me noopener noreferrer',
    });
  });

  it('returns nothing for an internal link', () => {
    expect(externalLinkAttrs('/notes/', SITE)).toEqual({});
    expect(externalLinkAttrs('https://www.elvinlab.dev/notes/', SITE)).toEqual({});
  });

  it('still returns the existing rel token for an internal link, and no target', () => {
    expect(externalLinkAttrs('https://www.elvinlab.dev/', SITE, 'me')).toEqual({ rel: 'me' });
  });
});
