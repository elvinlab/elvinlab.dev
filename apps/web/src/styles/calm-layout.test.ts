import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parseRules } from './css-rules.ts';

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const calmCss = read('./calm-layout.css');
const globalCss = read('./global.css');
const bannerSource = read('../shared/layout/Banner.astro');
const homeSource = read('../features/portfolio/components/Home.astro');
const readingCss = read('../features/notes/components/reading-mode.css');
const recordSource = read('../features/notes/components/DecisionRecord.astro');

/** Splits the source into the rules outside any media query and those inside the `md` one. */
function split(css: string) {
  const media = /@media \(min-width: 48rem\) \{([\s\S]*?)\n\}\n/.exec(css);
  if (!media) throw new Error('calm-layout.css has no `md` media query');
  return { base: parseRules(css.replace(media[0], '')), md: parseRules(media[1] ?? '') };
}

const FULL = ':root, [data-appearance="full"]';
const MINIMAL = '[data-appearance="minimal"]';
const { base, md } = split(calmCss);

describe('calm layout: full is exactly the pre-preset look', () => {
  it('does not cap any banner height (the cap is larger than every banner)', () => {
    expect(base.get(FULL)).toMatchObject({
      '--banner-page-cap': '100rem',
      '--banner-expanded-cap': '100rem',
      '--banner-expanded-compact-cap': '100rem',
    });
  });

  it('keeps the banner padding the banner always had (pt-24, pb-8)', () => {
    expect(base.get(FULL)).toMatchObject({
      '--banner-pad-top': '6rem',
      '--banner-pad-bottom': '2rem',
    });
  });

  it('keeps the hero measure at 16ch on every width', () => {
    expect(base.get(FULL)).toMatchObject({ '--hero-measure': '16ch' });
    expect(md.get(FULL)).toMatchObject({ '--hero-measure': '16ch' });
  });

  it('keeps the decision record as it was (p-5, gap-5, 14 px text, 13 px labels)', () => {
    expect(base.get(FULL)).toMatchObject({
      '--record-pad': '1.25rem',
      '--record-gap': '1.25rem',
      '--record-title-gap': '1rem',
      '--record-col-pad': '1.25rem',
      '--record-title': '0.875rem',
      '--record-label': '0.8125rem',
      '--record-body': '0.875rem',
    });
  });

  it('leaves the home banner props at today values (the cap does not touch them)', () => {
    expect(homeSource).toContain('height="150px"');
    expect(homeSource).toContain('expandedHeight="clamp(520px, 66vh, 620px)"');
    expect(homeSource).toContain('compactExpandedHeight="28rem"');
  });
});

describe('calm layout: minimal is the calm preset', () => {
  it('lowers the page banners to 240 px and the expanded home to a calmer clamp', () => {
    expect(base.get(MINIMAL)).toMatchObject({
      '--banner-page-cap': '240px',
      '--banner-expanded-cap': 'clamp(360px, 48vh, 460px)',
      '--banner-expanded-compact-cap': '24rem',
    });
  });

  it('shrinks the space around the banner text', () => {
    expect(base.get(MINIMAL)).toMatchObject({
      '--banner-pad-top': '5.5rem',
      '--banner-pad-bottom': '1.5rem',
    });
  });

  it('widens the hero measure from md so the pixel hero wraps to two lines', () => {
    expect(base.get(MINIMAL)).toMatchObject({ '--hero-measure': '16ch' });
    expect(md.get(MINIMAL)).toMatchObject({ '--hero-measure': '22ch' });
  });

  it('compacts the decision record: tighter padding and gaps, 13 px labels, 14 px body', () => {
    expect(base.get(MINIMAL)).toMatchObject({
      '--record-pad': '1rem',
      '--record-gap': '0.875rem',
      '--record-title-gap': '0.75rem',
      '--record-col-pad': '1rem',
      '--record-title': '0.8125rem',
      '--record-label': '0.8125rem',
      '--record-body': '0.875rem',
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
});

describe('calm layout wiring', () => {
  it('is part of the global stylesheet and exposes the hero measure as a utility', () => {
    expect(globalCss).toContain('@import "./calm-layout.css";');
    expect(calmCss).toContain('--container-hero: var(--hero-measure);');
    expect(homeSource).toContain('max-w-hero');
    expect(homeSource).not.toContain('max-w-[16ch]');
  });

  it('caps the banner heights through variables, never through a preset check', () => {
    expect(bannerSource).toContain('--h-collapsed-base:');
    expect(bannerSource).toContain('min(var(--h-collapsed-base), var(--banner-page-cap))');
    expect(bannerSource).toContain('min(var(--h-expanded-base), var(--banner-expanded-cap))');
    expect(bannerSource).toContain(
      'min(var(--h-expanded-compact-base), var(--banner-expanded-compact-cap))',
    );
    expect(bannerSource).toContain('padding-top: var(--banner-pad-top)');
    expect(bannerSource).toContain('padding-bottom: var(--banner-pad-bottom)');
    expect(bannerSource).not.toMatch(/shared\/config|data-appearance/);
  });

  it('draws the bottom blend on every banner, not only on the home', () => {
    expect(bannerSource).not.toContain('homeFade');
    expect(bannerSource).toContain('data-banner-fade');
    expect(bannerSource).toContain('bg-gradient-to-b from-transparent to-page');
    // The text sits above the blend on every page.
    expect(bannerSource).toMatch(/data-banner-inner[^>]*z-10/);
    // The blend is plain server-rendered markup: no script may decide it.
    const scripts = bannerSource.slice(bannerSource.indexOf('<script>'));
    expect(scripts).not.toContain('fade');
  });

  it('hides the blend in reading mode with the other banner effects', () => {
    expect(readingCss).toContain('html[data-reading] [data-banner] [data-banner-fade]');
  });

  it('styles the decision record only through the variables', () => {
    for (const variable of [
      '--record-pad',
      '--record-gap',
      '--record-title-gap',
      '--record-col-pad',
      '--record-title',
      '--record-label',
      '--record-body',
    ]) {
      expect(recordSource).toContain(variable);
    }
    expect(recordSource).not.toMatch(/shared\/config|data-appearance/);
  });
});
