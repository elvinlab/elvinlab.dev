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
    expect(css).toContain('.xp-page');
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

  it('leaves the page title to the shared PageHeader', () => {
    const css = experimentsCss(NONE);
    expect(css).not.toContain('.xp-header-text');
    expect(css).toContain('.xp-flask');
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

  it('keeps idle gallery thumbnails readable on touch and larger on phones', () => {
    const css = experimentsCss({ ...NONE, pieces: true, media: true, gallery: true });
    expect(css).not.toContain('opacity:0.6;');
    expect(css).toMatch(/@media \(max-width:639px\)\{\.xp-thumb\{[^}]*aspect-ratio:4 \/ 3/);
  });
  describe('pixel buttons', () => {
    const ALL: ExperimentsCssParts = {
      pieces: true,
      media: true,
      gallery: true,
      more: true,
      years: true,
      footer: true,
      lab: true,
      empty: false,
    };
    const NO_PREF = /@media \(prefers-reduced-motion:\s*no-preference\)\{/g;

    /** The CSS with every `prefers-reduced-motion: no-preference` block (nested braces) removed. */
    const outsideMotion = (css: string): string => {
      let out = css;
      for (;;) {
        NO_PREF.lastIndex = 0;
        const match = NO_PREF.exec(out);
        if (!match) return out;
        let depth = 1;
        let end = match.index + match[0].length;
        while (depth > 0 && end < out.length) {
          if (out[end] === '{') depth += 1;
          if (out[end] === '}') depth -= 1;
          end += 1;
        }
        out = out.slice(0, match.index) + out.slice(end);
      }
    };

    it('defines the stepped corner notch once on the page wrapper', () => {
      const css = experimentsCss(ALL);
      expect(css).toMatch(/\.xp-page\{[^}]*--xp-notch:polygon\(/);
      expect(css.match(/--xp-notch:polygon\(/g)).toHaveLength(1);
    });

    it('notches the primary button and the secondary links, and drops the notch on focus', () => {
      const css = experimentsCss(ALL);
      expect(css).toMatch(/\.xp-btn\{[^}]*clip-path:var\(--xp-notch\)/);
      expect(css).toMatch(/\.xp-link\{[^}]*clip-path:var\(--xp-notch\)/);
      expect(css).toMatch(/\.xp-btn:focus-visible,\.xp-link:focus-visible\{[^}]*clip-path:none/);
      expect(css).toMatch(
        /\.xp-btn:focus-visible,\.xp-link:focus-visible\{[^}]*outline:[^;}]*solid/,
      );
      expect(css).toMatch(/\.xp-btn:focus-visible,\.xp-link:focus-visible\{[^}]*outline-offset:/);
    });

    it('darkens the primary on hover with color-mix instead of dimming it', () => {
      const css = experimentsCss(ALL);
      expect(css).toMatch(/\.xp-btn:hover\{[^}]*color-mix\(in srgb,\s*var\(--color-button\)/);
      expect(css).not.toMatch(/\.xp-btn:hover\{[^}]*opacity/);
      expect(css).not.toContain('scale(0.96)');
    });

    it('nudges the arrow two pixels in steps and keeps the secondary glyph a pixel shape', () => {
      const css = experimentsCss(ALL);
      expect(css).toMatch(/\.xp-arrow\{[^}]*steps\(2,\s*end\)/);
      expect(css).toMatch(/\.xp-btn:hover \.xp-arrow[^{]*\{[^}]*translate\(2px,\s*2px\)/);
      expect(css).toMatch(/\.xp-link::after\{[^}]*clip-path:polygon\(/);
      expect(css).toMatch(/\.xp-link:hover::after[^{]*\{[^}]*translate\(2px,\s*2px\)/);
    });

    it('lays the actions on a phone as a full-width primary over two links side by side', () => {
      const css = experimentsCss(ALL);
      expect(css).toMatch(/@media \(max-width:640px\)\{[^@]*\.xp-btn\{[^}]*width:100%/);
      expect(css).toMatch(/@media \(max-width:640px\)\{[^@]*\.xp-link\{[^}]*flex:1 1 0/);
    });

    it('keeps every animation, transition and steps() of the buttons inside a no-preference block', () => {
      const css = experimentsCss(ALL);
      const rest = outsideMotion(css);
      expect(rest).not.toContain('steps(');
      expect(rest).not.toMatch(/(^|[;{])(animation|transition)[a-z-]*:(?!none)/);
      expect(css).toMatch(
        /prefers-reduced-motion:no-preference\)\{[^@]*\.xp-btn\{[^}]*transition:/,
      );
    });

    it('uses no hard offset shadow and no hex color', () => {
      const css = experimentsCss(ALL);
      for (const [, x, y, blur] of css.matchAll(
        /box-shadow:\s*(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+([\d.]+)?/g,
      )) {
        expect(Number(x) === 0 && Number(y) === 0 ? true : Number(blur ?? 0) > 0).toBe(true);
      }
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    });
  });

  describe('rail thumbnails and the result fact', () => {
    const ALL: ExperimentsCssParts = {
      pieces: true,
      media: true,
      gallery: true,
      more: false,
      years: false,
      footer: false,
      lab: false,
      empty: false,
    };

    it('gives every thumbnail a visible edge from the text color and no fade', () => {
      const css = experimentsCss(ALL);
      expect(css).toMatch(
        /\.xp-thumb\{[^}]*border:1px solid color-mix\(in srgb,\s*var\(--color-text\)\s*55%,\s*transparent\)/,
      );
      for (const [, value] of css.matchAll(/\.xp-thumb[^{]*\{[^}]*?opacity:([\d.]+)/g)) {
        expect(Number(value)).toBeGreaterThanOrEqual(0.9);
      }
      expect(css).not.toMatch(/\.xp-thumb[^{]*\{[^}]*transition:opacity/);
    });

    it('marks the checked thumbnail with a 2 px primary outline and a primary edge', () => {
      const css = experimentsCss(ALL);
      expect(css).toMatch(
        /:checked ~ \.xp-thumbs > \.xp-thumb:nth-child\(1\)[^{]*\{[^}]*outline:2px solid var\(--color-primary\)/,
      );
      expect(css).toMatch(
        /:checked ~ \.xp-thumbs > \.xp-thumb:nth-child\(4\)[^{]*\{[^}]*border-color:var\(--color-primary\)/,
      );
    });

    it('keeps the keyboard focus ring on the thumbnails', () => {
      expect(experimentsCss(ALL)).toMatch(
        /:focus-visible ~ \.xp-thumbs > \.xp-thumb:nth-child\(1\)[^{]*\{[^}]*box-shadow:/,
      );
    });

    it('sets the result off with a square 3 px primary rule, a primary label and larger full-color text', () => {
      const css = experimentsCss(ALL);
      expect(css).toMatch(
        /\.xp-facts \[data-result\]\{[^}]*border-left:3px solid var\(--color-primary\)/,
      );
      expect(css).toMatch(/\.xp-facts \[data-result\]\{[^}]*padding-left:/);
      expect(css).not.toMatch(/\.xp-facts \[data-result\]\{[^}]*border-radius/);
      expect(css).toMatch(/\.xp-facts \[data-result\] dt\{[^}]*color:var\(--color-primary\)/);
      expect(css).toMatch(/\.xp-facts \[data-result\] dd\{[^}]*color:var\(--color-text\)/);
      expect(css).toMatch(/\.xp-facts \[data-result\] dd\{[^}]*font-size:1\.0625rem/);
      expect(css).not.toMatch(/\.xp-facts[^{]*\{[^}]*text-transform/);
    });

    it('does not depend on the image: the result rule is part of the pieces CSS', () => {
      const solo = experimentsCss({ ...ALL, media: false, gallery: false });
      expect(solo).toContain('.xp-facts [data-result]');
    });
  });
});
