import { describe, expect, it } from 'vitest';

import { type EducationCssParts, educationCss } from './education-styles.ts';

const NONE: EducationCssParts = {
  timeline: false,
  image: false,
  details: false,
  head: false,
  footer: false,
  empty: false,
};

describe('educationCss', () => {
  it('carries only the page shell when nothing else renders', () => {
    const css = educationCss(NONE);
    expect(css).toContain('.ed-page');
    for (const absent of ['.ed-timeline', '.ed-figure', '.ed-learned', '.ed-head', '.ed-foot']) {
      expect(css).not.toContain(absent);
    }
  });

  it('adds exactly the part that renders', () => {
    expect(educationCss({ ...NONE, timeline: true })).toContain('.ed-timeline');
    expect(educationCss({ ...NONE, image: true })).toContain('.ed-figure');
    expect(educationCss({ ...NONE, details: true })).toContain('.ed-learned');
    expect(educationCss({ ...NONE, empty: true })).toContain('.ed-empty');
  });

  it('draws the vertical line and uses semantic tokens only', () => {
    const css = educationCss({ ...NONE, timeline: true, image: true, details: true });
    expect(css).toMatch(/\.ed-timeline\{[^}]*border-left:2px solid/);
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
