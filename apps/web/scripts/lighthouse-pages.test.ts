import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { siteConfig } from '@/site.config.ts';

import { resolveE2eProfile } from './e2e-features.ts';
import { withProfileFeatures } from './e2e-profiles.ts';
import { LIGHTHOUSE_NEEDS, liveLighthouseUrls } from './lighthouse-pages.ts';

const committed = (
  JSON.parse(readFileSync(resolve(import.meta.dirname, '../../../lighthouserc.json'), 'utf8')) as {
    ci: { collect: { url: string[] } };
  }
).ci.collect.url;

const profileOf = (name: string | undefined) =>
  resolveE2eProfile(withProfileFeatures(siteConfig, name));
const paths = (urls: string[]) => urls.map((url) => new URL(url).pathname);

describe('LIGHTHOUSE_NEEDS', () => {
  it('has a decision for every URL of lighthouserc.json, so a new URL cannot skip it', () => {
    for (const path of paths(committed)) expect(Object.keys(LIGHTHOUSE_NEEDS)).toContain(path);
  });
});

describe('liveLighthouseUrls', () => {
  it('keeps every URL for this site as it is', () => {
    expect(liveLighthouseUrls(committed, profileOf(undefined))).toEqual(committed);
  });

  it('drops the contact pages when contact is off', () => {
    const live = paths(liveLighthouseUrls(committed, profileOf('quiet')));
    expect(live).not.toContain('/contact/');
    expect(live).not.toContain('/en/contact/');
    expect(live).toContain('/notes/');
  });

  it('keeps no notes page without the blog', () => {
    const live = paths(liveLighthouseUrls(committed, profileOf('me-only')));
    expect(live.filter((path) => path.startsWith('/notes/'))).toEqual([]);
    expect(live).not.toContain('/subscribe/');
    expect(live).toContain('/me/');
  });

  it('does not audit /me/ when its feature is off: it is noindex on purpose', () => {
    expect(paths(liveLighthouseUrls(committed, profileOf('blog-only')))).not.toContain('/me/');
  });

  it('keeps only the home pages when everything optional is off, because /me/ is noindex without its flag', () => {
    expect(paths(liveLighthouseUrls(committed, profileOf('bare')))).toEqual(['/', '/en/']);
  });

  it('fails loudly on a URL nobody decided about', () => {
    expect(() => liveLighthouseUrls(['http://127.0.0.1:4323/new/'], profileOf(undefined))).toThrow(
      /\/new\//,
    );
  });
});
