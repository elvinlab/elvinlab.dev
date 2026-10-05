import { describe, expect, it } from 'vitest';

import { MARKS_CSS } from './mark-styles.ts';

describe('mark button stylesheet', () => {
  it.each(['stamp', 'burst', 'pulse'])('defines a keyframes block for the %s animation', (name) => {
    expect(MARKS_CSS).toMatch(new RegExp(`@keyframes marks-${name}\\s*\\{`));
    expect(MARKS_CSS).toMatch(new RegExp(`\\[data-a=${name}\\]`));
  });

  it('turns every animation off under prefers-reduced-motion', () => {
    const block = MARKS_CSS.slice(MARKS_CSS.indexOf('@media(prefers-reduced-motion:reduce)'));
    expect(block).toMatch(/animation:none/);
    for (const selector of ['.mi.go', '.mr', '.mp', ':after']) expect(block).toContain(selector);
  });

  it('uses design tokens only, never a raw color', () => {
    expect(MARKS_CSS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('stays small and has no comments or line breaks', () => {
    expect(MARKS_CSS).not.toMatch(/\/\*|\n/);
    // 2,270 bytes before the privacy tooltip (about 680 more, asked by the owner on 2026-10-05). The note
    // page is guarded by a Lighthouse LCP gate that is sensitive to a few hundred bytes.
    expect(MARKS_CSS.length).toBeLessThan(3000);
  });
});
