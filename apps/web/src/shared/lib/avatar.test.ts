import type { ImageMetadata } from 'astro';
import { describe, expect, it } from 'vitest';

import { pickAvatar, resolvePhoto } from './avatar.ts';

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

  it('names identity.avatar in the missing-file error by default', () => {
    expect(() => pickAvatar(modules, 'missing.png')).toThrow(/identity\.avatar/);
  });

  it('names the field that pointed to the missing file', () => {
    expect(() => pickAvatar(modules, 'missing.jpg', 'identity.photo')).toThrow(
      /identity\.photo points to src\/assets\/missing\.jpg/,
    );
  });

  it('resolves a file through the field-aware lookup too', () => {
    expect(pickAvatar(modules, 'avatar.png', 'identity.photo')).toBe(metadata);
  });
});

describe('resolvePhoto', () => {
  it('prefers identity.photo over the avatar', () => {
    const photo = resolvePhoto({ photo: 'photo.jpg', avatar: 'avatar.png' });
    expect(photo).toBeDefined();
    expect(photo).not.toBe(resolvePhoto({ avatar: 'avatar.png' }));
  });

  it('falls back to the avatar when no photo is configured', () => {
    expect(resolvePhoto({ avatar: 'avatar.png' })).toBeDefined();
  });

  it('returns undefined with neither image (initials fallback)', () => {
    expect(resolvePhoto({})).toBeUndefined();
  });

  it('names identity.photo when the configured portrait file is missing', () => {
    expect(() => resolvePhoto({ photo: 'missing.jpg', avatar: 'avatar.png' })).toThrow(
      /identity\.photo/,
    );
  });
});
