import { expect, type Page, test } from '@playwright/test';

import { requires } from './helpers/features';

requires({ routes: ['notes'] });

/** Notebook ink components (`Fix`, `Ink`; DESIGN.md "Notebook ink system"), against the fixture notes that use them. */

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
});

const ES = '/notes/smoke-es/';
const EN = '/en/notes/smoke-en/';

const setTheme = (page: Page, theme: 'elvinlab-dark' | 'elvinlab-light') =>
  page.evaluate((value) => {
    document.documentElement.dataset['theme'] = value;
  }, theme);

test('Fix keeps del and ins semantics with a localized hidden label', async ({ page }) => {
  await page.goto(ES);
  const fix = page.locator('.fix').first();
  await expect(fix.locator('del')).toHaveText('pnpm run publish');
  await expect(fix.locator('ins')).toHaveText('pnpm publish-note');
  await expect(fix.locator('.sr-only')).toHaveText(/corregido a/);

  await page.goto(EN);
  await expect(page.locator('.fix').first().locator('.sr-only')).toHaveText(/corrected to/);
});

for (const [theme, color] of [
  ['elvinlab-dark', '%23ec4899'],
  ['elvinlab-light', '%23be185d'],
] as const) {
  test(`the strike and underline strokes use the ${theme} ink color`, async ({ page }) => {
    await page.goto(ES);
    await setTheme(page, theme);
    const image = (selector: string) =>
      page.evaluate(
        (sel) => getComputedStyle(document.querySelector(sel) as Element).backgroundImage,
        selector,
      );
    // Polled: the theme attribute flips synchronously, but the computed value settles a frame later.
    await expect.poll(() => image('.fix-wrong')).toContain(color);
    await expect.poll(() => image('.ink-underline')).toContain(color);
  });
}

test('a wrapped Fix draws a stroke on every line of the struck text', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(ES);
  const info = await page.evaluate(() => {
    const wrong = [...document.querySelectorAll('.fix-wrong')].at(-1) as HTMLElement;
    const style = getComputedStyle(wrong);
    return {
      lines: wrong.getClientRects().length,
      image: style.backgroundImage,
      clone: style.getPropertyValue('box-decoration-break'),
    };
  });
  expect(info.lines).toBeGreaterThan(1);
  expect(info.image).toContain('url(');
  expect(info.clone).toBe('clone');
});

test('the circle is decorative, single-line and clear of the line above', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(ES);
  const circle = page.locator('.ink-circle').first();
  await expect(circle.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  const info = await circle.evaluate((el) => {
    const svg = el.querySelector('svg') as SVGElement;
    return {
      white: getComputedStyle(el).whiteSpace,
      extra: (svg.getBoundingClientRect().height - el.getBoundingClientRect().height) / 2,
    };
  });
  expect(info.white).toBe('nowrap');
  // The SVG never extends past the line box vertically, so it cannot touch the line above.
  expect(info.extra).toBeLessThanOrEqual(1);
});

test('under reduced motion the strokes are fully drawn and nothing animates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(ES);
  const state = await page.evaluate(() => {
    const path = document.querySelector('.ink-circle path') as Element;
    const underline = document.querySelector('.ink-underline') as Element;
    return {
      offset: getComputedStyle(path).strokeDashoffset,
      pathAnimation: getComputedStyle(path).animationName,
      underlineAnimation: getComputedStyle(underline).animationName,
      underlineSize: getComputedStyle(underline).backgroundSize,
      running: document.documentElement
        .getAnimations({ subtree: true })
        .filter(
          (a) =>
            a.playState === 'running' &&
            (a.effect as KeyframeEffect | null)?.target?.closest('.ink, .fix'),
        ).length,
    };
  });
  expect(state.offset).toBe('0px');
  expect(state.pathAnimation).toBe('none');
  expect(state.underlineAnimation).toBe('none');
  expect(state.underlineSize).toMatch(/^100%/);
  expect(state.running).toBe(0);
});

test('with motion allowed the circle stroke draws itself', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(ES);
  const name = await page.evaluate(
    () => getComputedStyle(document.querySelector('.ink-circle path') as Element).animationName,
  );
  expect(name).toMatch(/ink-draw/);
});

test('a note with ink does not overflow horizontally at 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of [ES, EN]) {
    await page.goto(path);
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  }
});
