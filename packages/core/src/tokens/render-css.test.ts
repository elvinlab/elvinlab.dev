import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderTokensCss } from './render-css.ts';
import { parseTokens, type Tokens } from './schema.ts';

const sample: Tokens = {
  defaultTheme: 'lab-dark',
  themes: {
    'lab-dark': { scheme: 'dark', colors: { page: '#000000', 'text-secondary': '#cccccc' } },
    'lab-light': { scheme: 'light', colors: { page: '#ffffff', 'text-secondary': '#333333' } },
  },
  radius: { card: '16px' },
  fonts: { display: "'Space Grotesk', sans-serif" },
};

describe('renderTokensCss', () => {
  it('renders the default theme on :root and on its own data-theme selector', () => {
    const css = renderTokensCss(sample);

    expect(css).toContain(':root,\n[data-theme="lab-dark"] {');
    expect(css).toContain('  color-scheme: dark;');
    expect(css).toContain('  --ui-page: #000000;');
  });

  it('renders every other theme on its own data-theme selector', () => {
    const css = renderTokensCss(sample);

    expect(css).toContain('[data-theme="lab-light"] {\n  color-scheme: light;');
    expect(css).toContain('  --ui-text-secondary: #333333;');
  });

  it('renders theme-independent tokens once on :root', () => {
    const css = renderTokensCss(sample);

    expect(css).toContain('  --ui-radius-card: 16px;');
    expect(css).toContain("  --ui-font-display: 'Space Grotesk', sans-serif;");
  });

  it('maps every token to a Tailwind theme variable that reads the runtime variable', () => {
    const css = renderTokensCss(sample);

    expect(css).toContain('@theme inline {');
    expect(css).toContain('  --color-page: var(--ui-page);');
    expect(css).toContain('  --color-text-secondary: var(--ui-text-secondary);');
    expect(css).toContain('  --radius-card: var(--ui-radius-card);');
    expect(css).toContain('  --font-display: var(--ui-font-display);');
  });
});

describe('parseTokens', () => {
  it('rejects a default theme that is not defined', () => {
    expect(() => parseTokens({ ...sample, defaultTheme: 'missing' })).toThrow(/defaultTheme/);
  });

  it('rejects themes that do not define the same colors', () => {
    const broken = {
      ...sample,
      themes: { ...sample.themes, 'lab-light': { scheme: 'light', colors: { page: '#ffffff' } } },
    };

    expect(() => parseTokens(broken)).toThrow(/text-secondary/);
  });

  it('rejects token names that are not kebab-case', () => {
    const broken = { ...sample, radius: { Card: '16px' } };

    expect(() => parseTokens(broken)).toThrow();
  });
});

describe('committed tokens.css', () => {
  it('matches the output generated from tokens.json', () => {
    const json: unknown = JSON.parse(
      readFileSync(new URL('./tokens.json', import.meta.url), 'utf8'),
    );
    const committed = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

    expect(committed).toBe(renderTokensCss(parseTokens(json)));
  });
});
