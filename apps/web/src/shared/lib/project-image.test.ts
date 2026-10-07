import type { ImageMetadata } from 'astro';
import { describe, expect, it } from 'vitest';

import { pickProjectImage } from './project-image.ts';

const metadata = {
  src: '/_astro/shot.jpg',
  width: 800,
  height: 500,
  format: 'jpg',
} as ImageMetadata;
const available = { '/src/assets/projects/shot.jpg': { default: metadata } };

describe('pickProjectImage', () => {
  it('returns the metadata of a file inside src/assets/projects', () => {
    expect(pickProjectImage(available, 'shot.jpg')).toBe(metadata);
  });

  it('fails the build with the missing path when the configured file does not exist', () => {
    expect(() => pickProjectImage(available, 'gone.jpg')).toThrow(
      'src/assets/projects/gone.jpg, which does not exist',
    );
  });
});
