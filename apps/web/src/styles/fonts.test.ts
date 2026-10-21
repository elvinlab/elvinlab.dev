import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./fonts.css', import.meta.url), 'utf8');
const allRules = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((match) => match[1] ?? '');
const rules = allRules.filter((rule) => rule.includes('url('));
const fallbacks = allRules.filter((rule) => !rule.includes('url('));
const family = (rule: string) => /font-family:\s*["']([^"']+)["']/.exec(rule)?.[1];
const file = (rule: string) => /files\/([\w-]+)\.woff2/.exec(rule)?.[1] ?? '';

describe('fonts.css', () => {
  it('declares only the latin and latin-ext subsets of the three variable families', () => {
    const files = rules.map(file).sort();
    expect(files).toEqual([
      'ibm-plex-sans-latin-ext-wght-normal',
      'ibm-plex-sans-latin-wght-normal',
      'jetbrains-mono-latin-ext-wght-normal',
      'jetbrains-mono-latin-wght-normal',
      'pixelify-sans-latin-ext-wght-normal',
      'pixelify-sans-latin-wght-normal',
    ]);
  });

  it('keeps the family names, variable weights, swap and unicode ranges the site relies on', () => {
    expect(new Set(rules.map(family))).toEqual(
      new Set(['IBM Plex Sans Variable', 'JetBrains Mono Variable', 'Pixelify Sans Variable']),
    );
    for (const rule of rules) {
      expect(rule).toMatch(/font-display:\s*swap/);
      expect(rule).toMatch(/font-weight:\s*\d+ \d+/);
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

  it('declares metric-matched local fallbacks for Plex Sans and Press Start 2P, with no download', () => {
    expect(fallbacks.map(family)).toEqual(['IBM Plex Sans Fallback', 'Press Start 2P Fallback']);
    const [plex = '', retro = ''] = fallbacks;
    for (const rule of fallbacks) expect(rule).toMatch(/src:\s*local\(/);
    expect(plex).toMatch(/size-adjust:\s*102%/);
    expect(plex).toMatch(/ascent-override:\s*100\.49%/);
    expect(plex).toMatch(/descent-override:\s*26\.96%/);
    expect(retro).toMatch(/size-adjust:\s*166\.67%/);
    expect(retro).toMatch(/ascent-override:\s*60%/);
    expect(retro).toMatch(/descent-override:\s*0%/);
  });
});
