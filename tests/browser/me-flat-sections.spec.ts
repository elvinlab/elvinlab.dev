import { expect, test } from '@playwright/test';

/**
 * `/me` follows the home's "fewer boxes" pattern: the main column sits on the page background,
 * and "What I bring" is a plain list, never a grid of identical tiles.
 */
test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'checked once at desktop width');
});

for (const path of ['/me/', '/en/me/']) {
  test.describe(`${path} flat sections`, () => {
    test('main-column sections have a transparent background', async ({ page }) => {
      await page.goto(path);
      const sections = page
        .locator('main section')
        .filter({ has: page.locator('h2'), visible: true });
      const count = await sections.count();
      expect(count).toBeGreaterThanOrEqual(3);
      for (let i = 0; i < count; i++) {
        const section = sections.nth(i);
        // Sidebar cards (inside the aside) are boxes on purpose.
        if ((await section.locator('xpath=ancestor::aside').count()) > 0) continue;
        const background = await section.evaluate((el) => getComputedStyle(el).backgroundColor);
        expect(background).toBe('rgba(0, 0, 0, 0)');
      }
    });

    test('"What I bring" lists strengths stacked, not as a row of tiles', async ({ page }) => {
      await page.goto(path);
      const items = page
        .locator('main section', { hasText: /Qué aporto|What I bring/ })
        .locator('ul > li');
      const count = await items.count();
      expect(count).toBeGreaterThanOrEqual(2);
      const tops = await items.evaluateAll((els) =>
        els.map((el) => el.getBoundingClientRect().top),
      );
      expect(new Set(tops.map(Math.round)).size).toBe(count);
      await expect(items.first().locator('svg')).toHaveCount(0);
    });
  });
}
