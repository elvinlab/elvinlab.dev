import { expect, type Page, test } from '@playwright/test';

import { themes } from './helpers/site';

/**
 * The home headline marks its key phrase with one hand-drawn ink underline (`Ink`, DESIGN.md
 * "Notebook ink system"). The marker lives in the i18n string (`[[...]]`); the text itself never
 * changes, only the stroke draws. The H1 is the LCP element, so the text must not animate.
 */
const HOME = [
  ['/', 'lo que sale mal', 'Construyo con agentes de IA y escribo lo que sale mal.'],
  ['/en/', 'what goes wrong', 'I build with AI agents and write down what goes wrong.'],
] as const;

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
});

const setTheme = (page: Page, theme: string) =>
  page.evaluate((value) => {
    document.documentElement.dataset['theme'] = value;
  }, theme);

for (const [path, phrase, sentence] of HOME) {
  test(`${path} underlines only the marked phrase and keeps the sentence intact`, async ({
    page,
  }) => {
    await page.goto(path);
    const h1 = page.locator('[data-home-hero] h1');
    await expect(h1.locator('.ink-underline')).toHaveCount(1);
    await expect(h1.locator('.ink-underline')).toHaveText(phrase);
    const text = (await h1.evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ').trim();
    expect(text).toBe(sentence);
    expect(text).not.toContain('[[');
    expect(text).not.toContain(']]');
    await expect(h1.locator('.ink-underline svg')).toHaveCount(0);
  });
}

for (const [theme, color] of [
  [themes.dark, '%23ec4899'],
  [themes.light, '%23be185d'],
] as const) {
  test(`the headline stroke uses the ${theme} ink color`, async ({ page }) => {
    await page.goto('/');
    await setTheme(page, theme);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            getComputedStyle(
              document.querySelector('[data-home-hero] h1 .ink-underline') as Element,
            ).backgroundImage,
        ),
      )
      .toContain(color);
  });
}

test('with motion allowed only the stroke grows; the text never animates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const info = await page.evaluate(() => {
    const h1 = document.querySelector('[data-home-hero] h1') as Element;
    const ink = h1.querySelector('.ink-underline') as Element;
    return {
      ink: getComputedStyle(ink).animationName,
      h1: getComputedStyle(h1).animationName,
      props: h1.getAnimations({ subtree: true }).map((a) => (a as CSSAnimation).animationName),
    };
  });
  expect(info.ink).toMatch(/ink-grow/);
  expect(info.h1).toBe('none');
  expect(info.props.every((name) => name === 'ink-grow')).toBe(true);
});

test('under reduced motion the stroke is fully drawn and static', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const state = await page.evaluate(() => {
    const ink = document.querySelector('[data-home-hero] h1 .ink-underline') as Element;
    return {
      animation: getComputedStyle(ink).animationName,
      size: getComputedStyle(ink).backgroundSize,
      image: getComputedStyle(ink).backgroundImage,
    };
  });
  expect(state.animation).toBe('none');
  expect(state.size).toMatch(/^100%/);
  expect(state.image).toContain('url(');
});

test('at 360 px the phrase may wrap, nothing overflows and the byline still renders', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const [path] of HOME) {
    await page.goto(path);
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    await expect(page.locator('[data-hero-byline]')).toBeVisible();
  }
});
