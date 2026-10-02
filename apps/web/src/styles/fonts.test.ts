import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./fonts.css', import.meta.url), 'utf8');
const rules = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((match) => match[1] ?? '');
const family = (rule: string) => /font-family:\s*["']([^"']+)["']/.exec(rule)?.[1];
const file = (rule: string) => /files\/([\w-]+)\.woff2/.exec(rule)?.[1] ?? '';

describe('fonts.css', () => {
  it('declares only the latin and latin-ext subsets of the three variable families', () => {
    const files = rules.map(file).sort();
    expect(files).toEqual([
      'jetbrains-mono-latin-ext-wght-normal',
      'jetbrains-mono-latin-wght-normal',
      'pixelify-sans-latin-ext-wght-normal',
      'pixelify-sans-latin-wght-normal',
      'space-grotesk-latin-ext-wght-normal',
      'space-grotesk-latin-wght-normal',
    ]);
  });

  it('keeps the family names, variable weights, swap and unicode ranges the site relies on', () => {
    expect(new Set(rules.map(family))).toEqual(
      new Set(['JetBrains Mono Variable', 'Pixelify Sans Variable', 'Space Grotesk Variable']),
    );
    for (const rule of rules) {
      expect(rule).toMatch(/font-display:\s*swap/);
      expect(rule).toMatch(/font-weight:\s*\d+ \d+/);
      expect(rule).toMatch(/format\(["']woff2-variations["']\)/);
      expect(rule).toMatch(/unicode-range:\s*U\+/);
    }
  });

  it('ships no Cyrillic, Greek or Vietnamese rule that the Spanish and English site never uses', () => {
    expect(css).not.toMatch(/cyrillic|greek|vietnamese/);
  });

  it('points every file at an installed package, so a rename fails the build', () => {
    for (const rule of rules) {
      expect(rule).toMatch(/url\(\.\.\/\.\.\/node_modules\/@fontsource-variable\/[\w-]+\/files\//);
    }
  });
});
