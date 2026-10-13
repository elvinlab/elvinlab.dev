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
});
