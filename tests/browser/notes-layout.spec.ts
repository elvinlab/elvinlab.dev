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

test('an image in the body of a note is framed like the site cards and never wider than the column', async ({
  page,
}) => {
  await page.goto('/notes/smoke-es/');
  // The fixture notes carry no image (it would change every note page), so one is added to the DOM:
  // a 1600 px wide SVG, as a screenshot would be. Authors write `![alt](./file.png)`; Astro
  // renders the same `<img>` inside `.prose`.
  const frame = await page.evaluate(() => {
    const prose = document.querySelector('.prose');
    if (!prose) return null;
    const img = document.createElement('img');
    img.alt = 'A wide screenshot';
    img.width = 1600;
    img.height = 900;
    img.src =
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"/>';
    prose.append(img);
    const style = getComputedStyle(img);
    return {
      radius: style.borderTopLeftRadius,
      outline: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      width: img.getBoundingClientRect().width,
      column: prose.getBoundingClientRect().width,
    };
  });
  expect(frame).not.toBeNull();
  expect(frame?.radius).not.toBe('0px');
  expect(frame?.outline).toBe('solid');
  expect(frame?.outlineWidth).toBe('1px');
  expect(frame?.width).toBeLessThanOrEqual((frame?.column ?? 0) + 0.5);
});
