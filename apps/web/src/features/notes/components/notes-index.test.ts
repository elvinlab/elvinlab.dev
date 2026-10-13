import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/** The stylesheet source (vitest does not run the `?inline` css pipeline, which would hand back ''). */
const read = (name: string): string => readFileSync(new URL(name, import.meta.url), 'utf8');
const controlsCss = read('./notes-index.css');
const marksCss = read('./notes-index-marks.css');
const css = controlsCss + marksCss;

/** Splits a stylesheet into its top-level and nested blocks as `[prelude, body]` pairs, outermost first. */
function blocks(source: string): { prelude: string; body: string }[] {
  const out: { prelude: string; body: string }[] = [];
  const walk = (text: string): void => {
    let depth = 0;
    let start = 0;
    let prelude = '';
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (char === '{') {
        if (depth === 0) {
          prelude = text.slice(start, i).trim();
          start = i + 1;
        }
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          const body = text.slice(start, i);
          out.push({ prelude, body });
          if (prelude.startsWith('@')) walk(body);
          start = i + 1;
        }
      }
    }
  };
  walk(source.replace(/\/\*[\s\S]*?\*\//g, ''));
  return out;
}

/** The stylesheet without its comments and without the `@media (prefers-reduced-motion: no-preference)` blocks. */
function outsideMotion(source: string): string {
  let text = source.replace(/\/\*[\s\S]*?\*\//g, '');
  for (;;) {
    const at = text.search(/@media\s*\(prefers-reduced-motion:\s*no-preference\)/);
    if (at < 0) return text;
    let depth = 0;
    let end = text.indexOf('{', at);
    for (; end < text.length; end += 1) {
      if (text[end] === '{') depth += 1;
      if (text[end] === '}' && --depth === 0) break;
    }
    text = text.slice(0, at) + text.slice(end + 1);
  }
}

const NO_PREFERENCE = '@media (prefers-reduced-motion: no-preference)';
const norm = (value: string): string => value.replace(/\s+/g, ' ').replace(/:\s/g, ':');

describe('notes-index.css pixel controls', () => {
  const all = blocks(css);
  const plain = all.filter((block) => !block.prelude.startsWith('@'));
  const motionBlocks = all.filter(
    (block) => norm(block.prelude).replace(/\s/g, '') === norm(NO_PREFERENCE).replace(/\s/g, ''),
  );

  it('writes the notch once, on the index wrapper', () => {
    const definitions = plain.filter((block) => block.body.includes('--ni-notch:'));
    expect(definitions).toHaveLength(1);
    expect(definitions[0]?.prelude).toContain('.ni-page');
    expect(definitions[0]?.body).toContain('polygon(');
  });

  it('notches the chips, the search field and the buttons', () => {
    for (const selector of ['.ni-chip', '.ni-input', '.ni-btn']) {
      const rules = plain.filter((block) => block.prelude.includes(selector));
      expect(rules.length, selector).toBeGreaterThan(0);
      expect(
        rules.some((block) => block.body.includes('var(--ni-notch)')),
        selector,
      ).toBe(true);
    }
  });

  it('drops the notch while a clipped control has keyboard focus', () => {
    const focus = plain.filter((block) => block.prelude.includes(':focus-visible'));
    expect(focus.some((block) => block.body.replace(/\s/g, '').includes('clip-path:none'))).toBe(
      true,
    );
  });

  it('puts every transition and steps() timing inside a no-preference block', () => {
    expect(motionBlocks.length).toBeGreaterThan(0);
    const motion = motionBlocks.map((block) => block.body).join('');
    expect(motion).toContain('steps(2');
    expect(outsideMotion(css)).not.toMatch(/transition|animation|steps\(/);
  });

  it('uses tokens only: no hex, no gradient, no font variable, no hard offset shadow', () => {
    const source = css.replace(/%23[0-9a-f]{3,6}/gi, '');
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(source).not.toContain('gradient');
    expect(source).not.toContain('var(--font');
    expect(source).not.toMatch(/box-shadow/);
  });

  it('draws the read check and the in-progress marker without color alone', () => {
    expect(marksCss).toContain('[data-state="read"]');
    expect(marksCss).toContain('[data-state="continue"]');
    expect(marksCss).toContain('data-progress-label');
    expect(controlsCss).not.toContain('data-progress-label');
  });
  it('styles the more-tags disclosure: a 44 px summary with a pixel chevron that turns when open', () => {
    const summary = plain.filter((block) => block.prelude.includes('.ni-more summary'));
    const rule = summary.map((block) => block.body).join('');
    expect(rule.replace(/\s/g, '')).toContain('min-height:2.75rem');
    expect(rule).toContain('list-style: none');
    expect(rule).not.toContain('underline');
    const chevron = plain.find((block) => block.prelude === '.ni-more summary::before');
    expect(chevron?.body).toContain('clip-path: polygon(');
    const open = plain.find((block) => block.prelude.includes('.ni-more[open] summary::before'));
    expect(open?.body).toContain('rotate(90deg)');
  });

  it('animates the disclosure chevron only inside the no-preference block', () => {
    const motion = motionBlocks.map((block) => block.body).join('');
    expect(motion).toMatch(/\.ni-more summary::before[\s\S]*steps\(2/);
    expect(outsideMotion(css)).not.toContain('.ni-more summary::before {\n    transition');
  });
});
