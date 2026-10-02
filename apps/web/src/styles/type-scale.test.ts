import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { type Declarations, parseRules } from './css-rules.ts';

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const scaleCss = read('./type-scale.css');
const globalCss = read('./global.css');
const readingCss = read('../features/notes/components/reading-mode.css');

/** Splits the source into the rules outside any media query and those inside the `md` one. */
function split(css: string): { base: Map<string, Declarations>; md: Map<string, Declarations> } {
  const media = /@media \(min-width: 48rem\) \{([\s\S]*?)\n\}\n/.exec(css);
  if (!media) throw new Error('type-scale.css has no `md` media query');
  const body = media[1] ?? '';
  return { base: parseRules(css.replace(media[0], '')), md: parseRules(body) };
}

const FULL = ':root, [data-appearance="full"]';
const MINIMAL = '[data-appearance="minimal"]';
const { base, md } = split(scaleCss);

describe('type scale: full is exactly the pre-preset look', () => {
  it('phone values equal the Tailwind sizes the components used before', () => {
    expect(base.get(FULL)).toMatchObject({
      '--type-hero': '2.25rem', // text-4xl
      '--type-section': '1.5rem', // text-2xl
      '--type-section-leading': '2rem',
      '--type-note-title': '2.25rem', // text-4xl
      '--type-card-title': '1.875rem', // text-3xl
      '--type-intro': '1.125rem', // text-lg
      '--type-prose': '1.125rem', // 18 px body
      '--type-prose-h2': '1.75rem',
      '--type-prose-h3': '1.35rem',
      '--type-prose-quote': '1.2rem',
    });
  });

  it('values from md up equal the md: Tailwind sizes used before', () => {
    expect(md.get(FULL)).toEqual({
      '--type-hero': '3.75rem', // md:text-6xl
      '--type-note-title': '3rem', // md:text-5xl
      '--type-card-title': '2.25rem', // md:text-4xl
      '--type-intro': '1.25rem', // md:text-xl
    });
  });
});

describe('type scale: minimal is the calm scale', () => {
  it('phone values: hero 32, section 20, note 30, card 20, intro 17, body 17', () => {
    expect(base.get(MINIMAL)).toMatchObject({
      '--type-hero': '2rem',
      '--type-section': '1.25rem',
      '--type-section-leading': '1.75rem',
      '--type-note-title': '1.875rem',
      '--type-card-title': '1.25rem',
      '--type-intro': '1.0625rem',
      '--type-prose': '1.0625rem',
      '--type-prose-h2': '1.5rem',
      '--type-prose-h3': '1.2rem',
      '--type-prose-quote': '1.1rem',
    });
  });

  it('values from md up: hero 44, note 40, card 22, intro 19', () => {
    expect(md.get(MINIMAL)).toEqual({
      '--type-hero': '2.75rem',
      '--type-note-title': '2.5rem',
      '--type-card-title': '1.375rem',
      '--type-intro': '1.1875rem',
    });
  });

  it('defines exactly the variables full defines, so the two presets never drift apart', () => {
    expect(Object.keys(base.get(MINIMAL) ?? {}).sort()).toEqual(
      Object.keys(base.get(FULL) ?? {}).sort(),
    );
    expect(Object.keys(md.get(MINIMAL) ?? {}).sort()).toEqual(
      Object.keys(md.get(FULL) ?? {}).sort(),
    );
  });

  it('keeps sizes in rem so the visitor font-size setting still scales them', () => {
    for (const rules of [base, md]) {
      for (const selector of [FULL, MINIMAL]) {
        for (const value of Object.values(rules.get(selector) ?? {})) {
          expect(value).toMatch(/^[\d.]+rem$/);
        }
      }
    }
  });
});

describe('type scale wiring', () => {
  it('exposes every size as a Tailwind text utility that reads the runtime variable', () => {
    for (const [utility, variable] of [
      ['hero', 'hero'],
      ['section', 'section'],
      ['note-title', 'note-title'],
      ['card-title', 'card-title'],
      ['intro', 'intro'],
    ] as const) {
      expect(scaleCss).toContain(`--text-${utility}: var(--type-${variable});`);
    }
    expect(scaleCss).toContain('--text-section--line-height: var(--type-section-leading);');
    expect(scaleCss).toMatch(/@theme inline \{/);
  });

  it('is part of the global stylesheet and drives the prose through the variables', () => {
    expect(globalCss).toContain('@import "./type-scale.css";');
    expect(globalCss).toContain('font-size: var(--type-prose);');
    expect(globalCss).toContain('font-size: var(--type-prose-h2);');
    expect(globalCss).toContain('font-size: var(--type-prose-h3);');
    expect(globalCss).toContain('font-size: var(--type-prose-quote);');
  });

  it('keeps reading mode on its own explicit scale in both presets', () => {
    const reading = parseRules(readingCss).get('html[data-reading] .prose');
    expect(reading).toMatchObject({
      'font-size': '1.1875rem',
      '--type-prose-h2': '1.75rem',
      '--type-prose-h3': '1.35rem',
      '--type-prose-quote': '1.2rem',
    });
  });
});
