import { expect, test } from '@playwright/test';

/**
 * The /me hero shows the localized headline, and the quick-facts rows explain themselves on focus
 * and can be dismissed with Escape. Content does not depend on the width, so one project runs it.
 */
test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'content does not depend on the width');
});

const PAGES = [
  { path: '/me/', headline: /Del dato a la pantalla/, tip: /zona horaria/ },
  { path: '/en/me/', headline: /From data to screen/, tip: /time zone/ },
] as const;

for (const { path, headline, tip } of PAGES) {
  test(`${path} hero headline is localized`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('main h1 ~ p').first()).toHaveText(headline);
  });

  test(`${path} quick-fact tooltip opens on focus and closes with Escape`, async ({ page }) => {
    await page.goto(path);
    const trigger = page.locator('aside .info-tip-trigger').first();
    const bubble = page.locator(`#${await trigger.getAttribute('aria-describedby')}`);
    await expect(bubble).toBeHidden();
    await trigger.focus();
    await expect(bubble).toBeVisible();
    await expect(bubble).toHaveText(tip);
    await page.keyboard.press('Escape');
    await expect(bubble).toBeHidden();
  });
}
