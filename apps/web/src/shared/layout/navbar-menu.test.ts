import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../styles/global.css', import.meta.url), 'utf8');
const navbar = readFileSync(new URL('./Navbar.astro', import.meta.url), 'utf8');
const rule = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('}', start));
};

describe('navbar menu panel, scrim and tablet bar (global.css, Navbar.astro)', () => {
  it('writes the notch once, as a custom property of the navbar, and uses it on both panel layers', () => {
    expect(css.match(/--nav-notch:/g)).toHaveLength(1);
    expect(css).toContain('[data-navbar] {\n  --nav-notch: polygon(');
    expect(rule('#nav-menu::before,\n#nav-menu::after')).toContain('clip-path: var(--nav-notch)');
  });

  it('never clips the panel itself, so a focus ring is never cut', () => {
    expect(rule('#nav-menu')).not.toContain('clip-path');
  });

  it('opens with a stepped dissolve only when motion is allowed', () => {
    const start = css.indexOf(
      '@media (prefers-reduced-motion: no-preference) {\n  #nav-menu:not([hidden])',
    );
    expect(start).toBeGreaterThanOrEqual(0);
    expect(css.slice(start, start + 140)).toContain('160ms steps(3, end)');
    expect(css.match(/animation: nav-menu-in/g)).toHaveLength(1);
  });

  it('draws the scrim from the page token, without blur or animation, and hides it from md', () => {
    const scrim = rule('[data-nav-scrim]');
    expect(scrim).toContain('var(--color-page)');
    expect(scrim).toContain('opacity: 0.6');
    expect(scrim).not.toMatch(/blur|animation|transition/);
    expect(navbar).toContain('<div data-nav-scrim hidden></div>');
  });

  it('shows the wordmark from 780 px through a media query, not a Tailwind utility', () => {
    expect(navbar).not.toContain('lg:not-sr-only');
    expect(navbar).not.toContain('md:sr-only');
    expect(css).toContain('@media (min-width: 768px) and (max-width: 779px)');
    expect(css).toContain('@media (min-width: 780px) and (max-width: 863px)');
    expect(rule('  [data-navbar] nav > a:first-child')).toContain('min-width: 2.75rem');
  });

  it('uses no raw hex and no hard offset shadow', () => {
    const block = css.slice(css.indexOf('--nav-notch'), css.indexOf('[data-site-footer] {'));
    expect(block).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(block).not.toMatch(/box-shadow/);
  });
});
