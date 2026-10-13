import { describe, expect, it } from 'vitest';

import { type EducationCssParts, educationCss } from './education-styles.ts';

const NONE: EducationCssParts = {
  timeline: false,
  image: false,
  cover: false,
  details: false,
  head: false,
  footer: false,
  empty: false,
};

describe('educationCss', () => {
  it('carries only the page shell when nothing else renders', () => {
    const css = educationCss(NONE);
    expect(css).toContain('.ed-page');
    for (const absent of [
      '.ed-timeline',
      '.ed-figure',
      '.ed-cover',
      '.ed-learned',
      '.ed-head',
      '.ed-foot',
    ]) {
      expect(css).not.toContain(absent);
    }
  });

  it('adds exactly the part that renders', () => {
    expect(educationCss({ ...NONE, timeline: true })).toContain('.ed-timeline');
    expect(educationCss({ ...NONE, image: true })).toContain('.ed-figure');
    expect(educationCss({ ...NONE, cover: true })).toContain('.ed-cover');
    expect(educationCss({ ...NONE, details: true })).toContain('.ed-learned');
    expect(educationCss({ ...NONE, empty: true })).toContain('.ed-empty');
  });

  it('ships the viewer dialog CSS only with an image', () => {
    expect(educationCss({ ...NONE, timeline: true })).not.toContain('.ed-viewer');
    const css = educationCss({ ...NONE, image: true });
    expect(css).toContain('.ed-viewer');
    expect(css).toContain('::backdrop');
    expect(css).toContain('.ed-doc');
  });

  it('lays out the body beside a 20rem document and keeps the phone order', () => {
    const css = educationCss({ ...NONE, timeline: true });
    expect(css).toMatch(/\.ed-body\{[^}]*display:contents/);
    expect(css).toMatch(/grid-template-columns:minmax\(0,1fr\) 20rem/);
    expect(css).toMatch(/align-items:center/);
    expect(css).not.toContain('.ed-item>*');
  });

  it('gives the learnings summary a visible marker and no native one', () => {
    const css = educationCss({ ...NONE, details: true });
    expect(css).toContain('list-style:none');
    expect(css).toMatch(/\.ed-learned summary::before/);
    expect(css).toMatch(/\.ed-learned\[open\] summary::before/);
  });

  it('draws the vertical line and uses semantic tokens only', () => {
    const css = educationCss({ ...NONE, timeline: true, image: true, cover: true, details: true });
    expect(css).toMatch(/\.ed-timeline\{[^}]*border-left:2px solid/);
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  describe('pixel details', () => {
    const ALL: EducationCssParts = {
      timeline: true,
      image: true,
      cover: true,
      details: true,
      head: true,
      footer: true,
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

    it('defines the stepped corner notch once', () => {
      expect(educationCss(ALL)).toMatch(/\.ed-page\{--ed-notch:polygon\(/);
    });

    it('gives the viewer close button a stepped corner notch and an up-nudge', () => {
      const css = educationCss(ALL);
      expect(css).toMatch(/\.ed-viewer-close\{[^}]*clip-path:var\(--ed-notch\)/);
      expect(css).toMatch(
        /\.ed-viewer-close:focus-visible\{[^}]*outline:[^;}]*;[^}]*clip-path:none/,
      );
      expect(css).toMatch(/\.ed-viewer-close svg\{[^}]*display:block/);
      expect(css).toMatch(/\.ed-viewer-close:hover svg\{[^}]*rotate\(90deg\)/);
    });

    it('dissolves the dialog and its backdrop in steps', () => {
      const css = educationCss(ALL);
      expect(css).toMatch(/\.ed-viewer\[open\]\{[^}]*animation:ed-pop 240ms steps\(4,\s*end\)/);
      expect(css).toMatch(
        /\.ed-viewer\[open\]::backdrop\{[^}]*animation:ed-fade 240ms steps\(4,\s*end\)/,
      );
      expect(css).toContain('@keyframes ed-pop');
    });

    it('draws square corner brackets and an expand glyph on the thumbnail link', () => {
      const css = educationCss(ALL);
      expect(css).toMatch(/\.ed-doc::after\{[^}]*12px 3px no-repeat/);
      expect(css).toMatch(/\.ed-doc::before,\.ed-doc::after\{[^}]*pointer-events:none/);
      expect(css).toMatch(/\.ed-doc:focus-visible\{[^}]*outline:/);
    });

    it('gives the verify link a pixel arrow and the disclosure a pixel chevron', () => {
      const css = educationCss(ALL);
      expect(css).toMatch(/\.ed-verify svg\{/);
      expect(css).toMatch(/\.ed-learned summary::before\{[^}]*clip-path:polygon\(/);
      expect(css).not.toMatch(/\.ed-learned summary::before\{[^}]*border-right/);
      expect(css).toMatch(/\.ed-learned summary:hover\{[^}]*color-mix/);
    });

    it('restyles only the sort switch of this page', () => {
      const css = educationCss(ALL);
      expect(css).toMatch(/\.ed-page \.lk-sort-option\{[^}]*clip-path:var\(--ed-notch\)/);
      expect(css).toMatch(/\.ed-page \.lk-sort-option\[aria-current='true'\]\{/);
      expect(css).not.toMatch(/(^|\})\.lk-sort/);
      expect(educationCss({ ...ALL, head: false })).not.toContain('.lk-sort');
    });

    it('keeps every animation, transition and steps() inside a no-preference block', () => {
      const css = educationCss(ALL);
      expect(css).toMatch(NO_PREF);
      const rest = outsideMotion(css);
      expect(rest).not.toContain('steps(');
      expect(rest).not.toContain('@keyframes');
      expect(rest).not.toMatch(/(animation|transition)[a-z-]*:(?!none)/);
      // The same declarations do exist inside the block.
      expect(css).toContain('steps(');
    });

    it('switches off the shared sort transition with reduced motion', () => {
      const css = educationCss(ALL);
      expect(outsideMotion(css)).toMatch(/\.ed-page \.lk-sort-option\{[^}]*transition:none/);
    });

    it('uses no hard offset shadow and no hex color', () => {
      const css = educationCss(ALL);
      for (const [, x, y, blur] of css.matchAll(
        /box-shadow:\s*(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+([\d.]+)?/g,
      )) {
        expect(Number(x) === 0 && Number(y) === 0 ? true : Number(blur ?? 0) > 0).toBe(true);
      }
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(css).not.toContain(['--font', 'pixel'].join('-'));
    });
  });
});
