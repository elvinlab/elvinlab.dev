import { expect, test } from '@playwright/test';

/**
 * Below `md` the hero figure (photo, name, role) is hidden, so a phone visitor would see the
 * headline with no name. The byline above the H1 carries the identity there and hides again from
 * `md`, where the figure takes over. The text comes from the site config, so it is never asserted
 * against a literal name.
 */
const MD_BREAKPOINT = 768;

test('the home hero names the author above the headline on narrow screens only', async ({
  page,
}) => {
  await page.goto('/');
  const byline = page.locator('[data-hero-byline]');
  const narrow = (page.viewportSize()?.width ?? 0) < MD_BREAKPOINT;

  if (!narrow) {
    await expect(byline).toBeHidden();
    return;
  }

  await expect(byline).toBeVisible();
  expect((await byline.innerText()).trim().length).toBeGreaterThan(0);
  const bylineBox = await byline.boundingBox();
  const headingBox = await page.locator('[data-home-hero] h1').boundingBox();
  if (!bylineBox || !headingBox) throw new Error('byline and headline must be laid out');
  expect(bylineBox.y + bylineBox.height).toBeLessThanOrEqual(headingBox.y + 1);
});

test('the home title carries the author name', async ({ page }) => {
  await page.goto('/');
  const title = await page.title();
  expect(title.split(' · ').length).toBeGreaterThan(1);
});
