import type { ImageMetadata } from 'astro';
import { describe, expect, it } from 'vitest';

import { pickExperimentImage } from './experiment-image.ts';

const metadata = {
  src: '/_astro/cover.jpg',
  width: 800,
  height: 500,
  format: 'jpg',
} as ImageMetadata;
const available = { '/src/assets/experiments/demo/cover.jpg': { default: metadata } };

describe('pickExperimentImage', () => {
  it('returns the metadata of a file inside the entry folder src/assets/experiments/<id>/', () => {
    expect(pickExperimentImage(available, 'demo', 'cover.jpg')).toBe(metadata);
  });

  it('does not find the file in another entry folder', () => {
    expect(() => pickExperimentImage(available, 'other', 'cover.jpg')).toThrow(
      'src/assets/experiments/other/cover.jpg, which does not exist',
    );
  });

  it('fails the build with the missing path when the configured file does not exist', () => {
    expect(() => pickExperimentImage(available, 'demo', 'gone.jpg')).toThrow(
      'src/assets/experiments/demo/gone.jpg, which does not exist',
    );
  });
});
