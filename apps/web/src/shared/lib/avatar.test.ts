import type { ImageMetadata } from 'astro';
import { describe, expect, it } from 'vitest';

import { pickAvatar } from './avatar.ts';

const metadata = {
  src: '/_astro/avatar.hash.png',
  width: 288,
  height: 288,
  format: 'png',
} satisfies ImageMetadata;
const modules = { '/src/assets/avatar.png': { default: metadata } };

describe('pickAvatar', () => {
  it('returns undefined when no avatar is configured (initials fallback)', () => {
    expect(pickAvatar(modules, undefined)).toBeUndefined();
  });

  it('resolves a configured file name to the image metadata', () => {
    expect(pickAvatar(modules, 'avatar.png')).toBe(metadata);
  });

  it('fails loudly, naming the folder, when the configured file is missing', () => {
    expect(() => pickAvatar(modules, 'missing.png')).toThrow(/src\/assets\/missing\.png/);
  });
});
