import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../../styles/global.css');
const sources = {
  navbar: read('./Navbar.astro'),
  theme: read('../ui/ThemeToggle.astro'),
  picker: read('../ui/BackgroundPicker.astro'),
};
const rule = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('}', start));
};
const CONTROL = '[data-navbar] nav :is(a, button)';

describe('navbar pixel controls (global.css)', () => {
  it('draws the hover and focus fill on a notched pseudo-element and never clips the control', () => {
    const layer = rule(`${CONTROL}::before`);
    expect(layer).toContain('clip-path: var(--nav-notch)');
    expect(layer).toContain('background-color: var(--color-card-hover)');
    expect(layer).toContain('z-index: -1');
    expect(rule(CONTROL)).not.toContain('clip-path');
    expect(rule(CONTROL)).not.toContain('border-radius');
    expect(css).toContain(`${CONTROL}:focus-visible::before`);
    expect(css).toContain(`${CONTROL}:hover::before`);
  });

  it('presses with a 1 px nudge and never scales', () => {
    const pressed = rule(`${CONTROL}:active`);
    expect(pressed).toContain('translateY(1px)');
    expect(pressed).not.toContain('scale');
  });

  it('moves only in steps and only when motion is allowed', () => {
    const start = css.indexOf(
      '@media (prefers-reduced-motion: no-preference) {\n  [data-navbar] nav :is(a, button),',
    );
    expect(start).toBeGreaterThanOrEqual(0);
    const block = css.slice(start, css.indexOf('\n}\n', start));
    expect(block.match(/steps\(2, end\)/g)).toHaveLength(1);
    expect(block).toContain('150ms');
    expect(css.slice(0, start)).not.toMatch(
      /\[data-navbar\] nav :is\(a, button\)[^{]*\{[^}]*transition/,
    );
  });

  it('keeps the old soft utilities off every control', () => {
    for (const [name, source] of Object.entries(sources)) {
      expect(source, name).not.toContain('active:scale-96');
      expect(source, name).not.toContain('hover:bg-card-hover');
      expect(source, name).not.toContain('rounded-control');
    }
  });

  it('adds no raw hex and no hard offset shadow', () => {
    const start = css.indexOf(`${CONTROL} {`);
    const block = css.slice(start, css.indexOf('[data-site-footer] {'));
    expect(block).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(block).not.toMatch(/box-shadow/);
  });
});

describe('navbar pixel glyph icons', () => {
  const icons = (source: string): string[] => source.match(/<svg[^>]*>/g) ?? [];

  it('draws every icon as filled squares: no stroke, crisp edges, decorative, 10-unit grid at 20 px', () => {
    for (const [name, source] of Object.entries(sources)) {
      const tags = icons(source);
      expect(tags.length, name).toBeGreaterThan(0);
      for (const tag of tags) {
        expect(tag, `${name} ${tag}`).toContain('viewBox="0 0 10 10"');
        expect(tag).toContain('width="20" height="20"');
        expect(tag).toContain('fill="currentColor"');
        expect(tag).toContain('shape-rendering="crispEdges"');
        expect(tag).toContain('aria-hidden="true"');
        expect(tag).not.toMatch(/stroke/);
      }
      expect(source, name).not.toMatch(/<(circle|rect|line|polyline|polygon)\b/);
    }
  });

  it('keeps the data-icon names the scripts swap', () => {
    for (const name of ['dark', 'light']) expect(sources.theme).toContain(`data-icon="${name}"`);
    for (const name of ['galaxy', 'cursor-waves', 'off']) {
      expect(sources.picker).toContain(`data-icon="${name}"`);
    }
    for (const name of ['menu', 'close']) expect(sources.navbar).toContain(`data-icon="${name}"`);
  });
});
