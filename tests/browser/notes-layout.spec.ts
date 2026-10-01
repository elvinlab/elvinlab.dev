import { expect, type Page, test } from '@playwright/test';

/** Vertical gap between the bottom of the article card and the top of the previous/next block. */
const gapBelowArticle = (page: Page) =>
  page.evaluate(() => {
    const article = document.querySelector('[data-article]');
    const nav = document.querySelector('[data-prev-next]');
    if (!article || !nav) return null;
    return Math.round(nav.getBoundingClientRect().top - article.getBoundingClientRect().bottom);
  });

test('the previous/next block has room below the article', async ({ page }) => {
  await page.goto('/notes/smoke-es/');
  await expect(page.locator('[data-prev-next]')).toBeVisible();
  expect(await gapBelowArticle(page)).toBeGreaterThanOrEqual(24);
});

test('and more room in reading mode, where the article card is gone', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('reading-mode', '1'));
  await page.goto('/notes/smoke-es/');
  await expect(page.locator('[data-prev-next]')).toBeVisible();
  expect(await gapBelowArticle(page)).toBeGreaterThanOrEqual(40);
});

test('the previous/next block keeps a gap before the discussion too', async ({ page }) => {
  await page.goto('/notes/smoke-es/');
  const gap = await page.evaluate(() => {
    const nav = document.querySelector('[data-prev-next]');
    const comments = document.querySelector('[data-comments]');
    if (!nav || !comments) return null;
    return Math.round(comments.getBoundingClientRect().top - nav.getBoundingClientRect().bottom);
  });
  expect(gap).toBeGreaterThanOrEqual(24);
});
