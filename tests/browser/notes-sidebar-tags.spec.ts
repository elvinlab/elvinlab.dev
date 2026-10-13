import { expect, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { requires, seedTheme } from './helpers/features';
import { text, themes } from './helpers/site';
import { stubThirdParties } from './helpers/third-party';

requires({ routes: ['notes'] });

/**
 * The tags block of the `/notes/` index sidebar shows the 12 most used tags and puts the rest in a
 * native `<details>` (`.ni-more`). The e2e fixture holds fewer than 13 tags, so it covers the "no
 * disclosure" side; the disclosure tests run only on a build whose content has 13 or more tags
 * (the real production content, checked by hand in the task's visual review) and are skipped here,
 * with the reason, when the fixture renders no `<details>`.
 */
const LIMIT = 12;

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
  await stubThirdParties(page);
});

const chips = (page: Page) => page.locator('aside a.ni-chip');
const more = (page: Page) => page.locator('aside details.ni-more');
const summary = (page: Page) => page.locator('aside details.ni-more > summary');

test('the sidebar shows at most 12 tag chips outside the disclosure', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/notes/');
  const visible = page.locator('aside a.ni-chip:not(details *)');
  expect(await visible.count()).toBeGreaterThan(0);
  expect(await visible.count()).toBeLessThanOrEqual(LIMIT);
});

test('with 12 tags or fewer no disclosure is rendered', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/notes/');
  test.skip((await more(page).count()) > 0, 'this content has more than 12 tags');
  expect(await chips(page).count()).toBeLessThanOrEqual(LIMIT);
  await expect(more(page)).toHaveCount(0);
});

test.describe('disclosure (content with more than 12 tags)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/notes/');
    test.skip((await more(page).count()) === 0, 'the fixture has 12 tags or fewer');
  });

  test('the summary carries the hidden count, is 44 px high and keeps the hidden chips closed', async ({
    page,
  }) => {
    const hidden = await more(page).locator('a.ni-chip').count();
    expect(hidden).toBeGreaterThan(0);
    await expect(summary(page)).toHaveText(
      text('es', 'notes.sidebar.tags.more', { count: hidden }),
    );
    expect((await summary(page).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(await more(page).getAttribute('open')).toBeNull();
    expect(await more(page).locator('a.ni-chip').first().isVisible()).toBe(false);
    for (const href of await more(page)
      .locator('a.ni-chip')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''))) {
      expect(href).toMatch(/^\/notes\/(\?tag=|topic)/);
    }
  });

  test('Enter and Space toggle it from the keyboard', async ({ page }) => {
    await summary(page).focus();
    await page.keyboard.press('Enter');
    await expect(more(page)).toHaveAttribute('open', '');
    await page.keyboard.press('Space');
    expect(await more(page).getAttribute('open')).toBeNull();
  });

  test('an active tag outside the top 12 opens it', async ({ page }) => {
    const href = await more(page)
      .locator('a.ni-chip[href*="?tag="]')
      .first()
      .evaluate((el) => el.getAttribute('href') ?? '');
    test.skip(href === '', 'every hidden tag links to a topic page');
    await page.goto(href);
    await expect(more(page)).toHaveAttribute('open', '');
  });

  for (const theme of [themes.dark, themes.light]) {
    test(`axe is clean in ${theme} with it closed and open`, async ({ page }) => {
      await seedTheme(page, theme);
      await page.goto('/notes/');
      expect(describeViolations((await scan(page)).violations)).toEqual([]);
      await summary(page).click();
      expect(describeViolations((await scan(page)).violations)).toEqual([]);
    });
  }
});

for (const width of [360, 390]) {
  test(`the tags block does not overflow at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/notes/');
    if ((await more(page).count()) > 0) await summary(page).click();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
