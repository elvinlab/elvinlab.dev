import { describe, expect, it } from 'vitest';

import { type ExperimentsCssParts, experimentsCss } from './experiment-styles.ts';

const NONE: ExperimentsCssParts = {
  pieces: false,
  media: false,
  gallery: false,
  more: false,
  years: false,
  footer: false,
  lab: false,
  empty: false,
};

describe('experimentsCss', () => {
  it('always carries the header and nothing of the parts that do not render', () => {
    const css = experimentsCss(NONE);
    expect(css).toContain('.xp-header');
    for (const absent of [
      '.xp-piece',
      '.xp-media',
      '.xp-gallery',
      '.xc-body',
      '.xp-year',
      '.xp-foot',
      '.xp-lab',
      '.xp-empty',
    ]) {
      expect(css).not.toContain(absent);
    }
  });

  it('adds the compact cards only with the "more" section', () => {
    expect(experimentsCss({ ...NONE, more: true })).toContain('.xc-body');
    expect(experimentsCss({ ...NONE, more: true })).not.toContain('.xp-foot');
  });

  it('adds the gallery only when asked, apart from the media frame', () => {
    const media = experimentsCss({ ...NONE, pieces: true, media: true });
    expect(media).toContain('.xp-clip');
    expect(media).not.toContain('.xp-thumbs');
    expect(experimentsCss({ ...NONE, pieces: true, media: true, gallery: true })).toContain(
      '.xp-thumbs',
    );
  });

  it('is plain global CSS: no scope attribute and no comments', () => {
    const css = experimentsCss({
      pieces: true,
      media: true,
      gallery: true,
      more: true,
      years: true,
      footer: true,
      lab: true,
      empty: true,
    });
    expect(css).not.toContain('data-astro-cid');
    expect(css).not.toContain('/*');
    expect(css).not.toContain('\n');
    expect(css).toContain('@keyframes xp-rise');
    expect(css).toContain('prefers-reduced-motion:no-preference');
  });
});
