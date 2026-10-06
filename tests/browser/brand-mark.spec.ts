import { expect, test } from '@playwright/test';

/** The brand icon sits next to the wordmark in the navbar and the footer: decorative, still at rest. */
for (const path of ['/', '/en/', '/notes/', '/contact/']) {
  test(`${path} shows the brand icon in the navbar and the footer, still and decorative`, async ({
    page,
  }) => {
    await page.goto(path);
    const marks = page.locator('[data-brand-mark]');
    await expect(marks).toHaveCount(2);
    for (const mark of await marks.all()) {
      await expect(mark).toHaveAttribute('aria-hidden', 'true');
      const box = await mark.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(14);
      expect(await mark.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    }
    const brand = page.locator('[data-navbar] a').first();
    expect((await brand.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => window.innerWidth),
    );
  });
}

test('the navbar icon tilts on hover and holds still under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const mark = page.locator('[data-navbar] [data-brand-mark]');
  const brand = page.locator('[data-navbar] a').first();
  const transform = () => mark.evaluate((el) => getComputedStyle(el).rotate);
  expect(await transform()).toBe('none');
  await brand.hover();
  await expect.poll(transform).not.toBe('none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(0, 400);
  await brand.hover();
  await page.waitForTimeout(100);
  expect(await transform()).toBe('none');
});
