import { expect, test } from '@playwright/test';

import { has, seedTheme } from './helpers/features';
import { themes } from './helpers/site';

/** Native feel layer (DESIGN.md): safe-area viewport, overscroll, tap feedback, theme-color follows the toggle. */

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium-1280',
    'computed-style checks do not vary by viewport',
  );
});

const themeColors = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('meta[name="theme-color"]')].map((meta) =>
      meta.getAttribute('content'),
    ),
  );

test('the viewport meta opts into the full screen so safe-area insets apply', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    'content',
    /viewport-fit=cover/,
  );
});

test('the page does not chain scroll or flash a tap highlight', async ({ page }) => {
  await page.goto('/');
  const style = await page.evaluate(() => {
    const computed = getComputedStyle(document.documentElement);
    return {
      overscroll: computed.overscrollBehaviorY,
      highlight: computed.getPropertyValue('-webkit-tap-highlight-color'),
    };
  });
  expect(style.overscroll).not.toBe('auto');
  expect(style.highlight).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
});

test('with no inset the layout does not overflow horizontally', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test('theme-color follows the in-page toggle in both directions', async ({ page }) => {
  test.skip(!has({ flags: ['themeToggle'] }), 'needs features.themeToggle');
  await page.goto('/');
  const toggle = page.getByRole('button', { name: /cambiar tema|switch theme/i });
  const pageColor = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-page').trim(),
    );
  for (let flip = 0; flip < 2; flip++) {
    await toggle.click();
    const expected = await pageColor();
    const colors = await themeColors(page);
    expect(colors.length).toBeGreaterThan(0);
    for (const color of colors) expect(color?.toLowerCase()).toBe(expected.toLowerCase());
  }
});

test('theme-color matches a stored theme on first load', async ({ page }) => {
  // The toggle script is what writes the page color into the theme-color metas.
  test.skip(!has({ flags: ['themeToggle'] }), 'needs features.themeToggle');
  await page.emulateMedia({ colorScheme: 'dark' });
  await seedTheme(page, themes.light);
  await page.goto('/');
  const expected = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-page').trim(),
  );
  for (const color of await themeColors(page))
    expect(color?.toLowerCase()).toBe(expected.toLowerCase());
});

test('tappable controls show pressed feedback', async ({ page }) => {
  await page.goto('/');
  const targets = [
    ...(has({ flags: ['themeToggle'] })
      ? [page.getByRole('button', { name: /cambiar tema|switch theme/i })]
      : []),
    page.locator('[data-navbar] a[href]').first(),
    page.locator('[data-site-footer] a[href$="/privacy/"]'),
  ];
  for (const target of targets) {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error('target has no box');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    // Footer links and chips scale; the navbar controls nudge 1 px down instead (a transform, stepped).
    const feedback = () =>
      target.evaluate((element) => {
        const style = getComputedStyle(element);
        return style.scale !== 'none' || style.transform !== 'none';
      });
    await expect.poll(feedback).toBe(true);
    await page.mouse.up();
  }
});

test('a stretched-link note row presses with a tint and never changes geometry', async ({
  page,
}) => {
  test.skip(!has({ routes: ['notes'] }), 'needs the notes routes');
  await page.goto('/notes/');
  const row = page.locator('[data-note-row]').first();
  const link = row.locator('h3 a');
  await row.scrollIntoViewIfNeeded();
  const before = await row.boundingBox();
  const box = await link.boundingBox();
  if (!before || !box) throw new Error('row or link has no box');
  await page.mouse.move(box.x + 4, box.y + box.height / 2);
  await page.mouse.down();
  const pressed = await row.evaluate((element) => {
    const style = getComputedStyle(element);
    return { scale: style.scale, transform: style.transform, tint: style.backgroundColor };
  });
  const during = await row.boundingBox();
  await page.mouse.up();
  // A transform would pull the card edge away from the pointer and lose clicks there.
  expect(pressed.scale).toBe('none');
  expect(pressed.transform).toBe('none');
  expect(during).toEqual(before);
  expect(pressed.tint).not.toBe('rgba(0, 0, 0, 0)');
});
