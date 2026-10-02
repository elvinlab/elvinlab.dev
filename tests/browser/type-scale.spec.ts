import { expect, type Locator, test } from '@playwright/test';

/**
 * The repo config uses `appearance: 'minimal'`, so the fixture build must compute the calm scale
 * (hero 32/44, section 20, note title 30/40, card title 20/22, body 17). The `full` scale is
 * proven at unit level (`src/styles/type-scale.test.ts`), since the fixture has one config.
 */
const SCALE: Record<string, { hero: number; noteTitle: number; cardTitle: number }> = {
  'chromium-360': { hero: 32, noteTitle: 30, cardTitle: 20 },
  'chromium-1280': { hero: 44, noteTitle: 40, cardTitle: 22 },
};
const SECTION_TITLE = 20;
const PROSE = 17;
const PROSE_LINE_HEIGHT = 1.75;

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(!(testInfo.project.name in SCALE), 'the md breakpoint is covered at 360 and 1280');
});

const fontSize = (locator: Locator) =>
  locator.first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));

test('the page root carries the resolved appearance', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'minimal');
  await page.goto('/notes/smoke-es/');
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'minimal');
});

test('the home computes the minimal scale', async ({ page }, testInfo) => {
  const expected = SCALE[testInfo.project.name];
  if (!expected) throw new Error('unreachable: skipped in beforeEach');
  await page.goto('/');
  expect(await fontSize(page.locator('[data-home-hero] h1'))).toBe(expected.hero);
  expect(await fontSize(page.locator('main h2:has(> span.bg-primary)'))).toBe(SECTION_TITLE);
  expect(await fontSize(page.locator('main h2:has(> a[href*="/notes/"])'))).toBe(
    expected.cardTitle,
  );
});

test('a note computes the minimal title and prose scale', async ({ page }, testInfo) => {
  const expected = SCALE[testInfo.project.name];
  if (!expected) throw new Error('unreachable: skipped in beforeEach');
  await page.goto('/notes/smoke-es/');
  expect(await fontSize(page.locator('main h1'))).toBe(expected.noteTitle);
  const paragraph = page.locator('article .prose p');
  expect(await fontSize(paragraph)).toBe(PROSE);
  expect(
    await paragraph.first().evaluate((element) => {
      const style = getComputedStyle(element);
      return Number.parseFloat(style.lineHeight) / Number.parseFloat(style.fontSize);
    }),
  ).toBeCloseTo(PROSE_LINE_HEIGHT, 2);
});
