import { describe, expect, it } from 'vitest';

import { minifyCss } from './minify-css.ts';

describe('minifyCss', () => {
  it('drops comments, indentation and the last semicolon of a block', () => {
    const source = `
      /* a comment */
      .a {
        color: red;
        margin: 0 auto;
      }
    `;
    expect(minifyCss(source)).toBe('.a{color:red;margin:0 auto}');
  });

  it('keeps the spaces that CSS needs', () => {
    const source = `
      @media (min-width: 640px) and (hover: hover) {
        .a > .b { width: calc(100% - 0.5rem); font: 400 0.8rem / 1.2 var(--font-mono); }
      }
    `;
    expect(minifyCss(source)).toBe(
      '@media (min-width:640px) and (hover:hover){.a > .b{width:calc(100% - 0.5rem);font:400 0.8rem / 1.2 var(--font-mono)}}',
    );
  });

  it('tightens selector lists and gradients', () => {
    expect(minifyCss('.a,\n.b { background: linear-gradient(red, blue); }')).toBe(
      '.a,.b{background:linear-gradient(red,blue)}',
    );
  });
});
