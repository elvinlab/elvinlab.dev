import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../styles/global.css', import.meta.url), 'utf8');
const rule = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('}', start));
};

describe('navbar bar surface and active marker (global.css)', () => {
  it('keeps the bar near-opaque through the card token utility', () => {
    const navbar = readFileSync(new URL('./Navbar.astro', import.meta.url), 'utf8');
    expect(navbar).toContain('bg-card/92');
    expect(navbar).not.toContain('bg-card/70');
  });

  it('draws the hairline edge on a pseudo-element from the text token', () => {
    const edge = rule('[data-navbar] > nav::before');
    expect(edge).toContain('border: 1px solid var(--color-text)');
    expect(edge).toContain('opacity: 0.24');
    expect(edge).toContain('pointer-events: none');
  });

  it('draws the marker on a pseudo-element in the primary token without moving the link', () => {
    expect(rule('[data-navbar] a[aria-current="page"]')).toContain('position: relative');
    const marker = rule('[data-navbar] a[aria-current="page"]::after');
    expect(marker).toContain('height: 2px');
    expect(marker).toContain('var(--color-primary)');
    expect(marker).toContain('clip-path: polygon(');
    expect(marker).not.toMatch(/animation|transition|border-radius/);
  });

  it('uses no raw hex and no hard offset shadow in the navbar rules', () => {
    const start = css.indexOf('[data-navbar] > nav::before {');
    const end = css.indexOf('[data-site-footer] {');
    const block = css.slice(start, end);
    expect(block).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(block).not.toMatch(/box-shadow/);
  });
});
