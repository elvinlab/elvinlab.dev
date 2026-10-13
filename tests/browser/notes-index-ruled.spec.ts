import { expect, type Page, test } from '@playwright/test';

import { requires } from './helpers/features';

requires({ routes: ['notes'] });

/**
 * The notes index rows read like a lab log: a ruled-paper line between rows and a margin rule on wide
 * screens, drawn with CSS on the existing row element (DESIGN.md, "Notes index"). Height floor, numbered
 * labels and the pressed feedback stay.
 */
test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
});

const THEMES = ['elvinlab-dark', 'elvinlab-light'] as const;

const setTheme = (page: Page, theme: (typeof THEMES)[number]) =>
  page.evaluate((value) => {
    document.documentElement.dataset['theme'] = value;
  }, theme);

for (const width of [390, 1280]) {
  test(`rows keep a 44px floor and their number label at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/notes/');
    const rows = page.locator('[data-note-row]');
    expect(await rows.count()).toBeGreaterThan(0);
    for (const row of await rows.all()) {
      const box = await row.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await expect(rows.first().locator('span.font-mono').first()).toHaveText(/^\d{3}$/);
  });
}

for (const theme of THEMES) {
  test(`a ruled line separates the rows (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/notes/');
    await setTheme(page, theme);
    const row = page.locator('[data-note-row]').nth(1);
    await expect
      .poll(() =>
        row.evaluate((el) => {
          const s = getComputedStyle(el);
          return s.backgroundImage !== 'none' || parseFloat(s.borderTopWidth) > 0;
        }),
      )
      .toBe(true);
    // The line is the data-URI hand-drawn stroke of the theme, not the old flat dashed border.
    await expect
      .poll(() => row.evaluate((el) => getComputedStyle(el).backgroundImage))
      .toContain('url(');
  });
}

test('wide screens draw a margin rule beside the number column, phones do not', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/notes/');
  const wide = await page
    .locator('[data-note-row]')
    .first()
    .evaluate((el) => getComputedStyle(el, '::before').content);
  expect(wide).not.toBe('none');
  await page.setViewportSize({ width: 390, height: 900 });
  const narrow = await page
    .locator('[data-note-row]')
    .first()
    .evaluate((el) => getComputedStyle(el, '::before').content);
  expect(narrow).toBe('none');
});

test('the row keeps its pressed feedback, as a tint and not a transform', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/notes/');
  const row = page.locator('[data-note-row]').first();
  const box = await row.locator('h3 a').boundingBox();
  if (!box) throw new Error('title link has no box');
  const resting = await row.evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.mouse.move(box.x + 4, box.y + box.height / 2);
  await page.mouse.down();
  const pressed = await row.evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.mouse.up();
  expect(pressed).not.toBe(resting);
  expect(pressed).not.toBe('rgba(0, 0, 0, 0)');
});
