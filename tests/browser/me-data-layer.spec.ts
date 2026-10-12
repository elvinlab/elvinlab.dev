import { expect, test } from '@playwright/test';

/**
 * The /me raw-data layer: a native `<details>`, collapsed by default, operable by keyboard, with a 44 px
 * summary and `field / type / value` rows built from config (expectations come from the page, not literals).
 */
const PAGES = ['/me/', '/en/me/'] as const;

for (const path of PAGES) {
  test(`${path} raw-data layer is collapsed and opens by keyboard`, async ({ page }) => {
    await page.goto(path);
    const details = page.locator('aside details', { has: page.locator('dl') }).last();
    await expect(details).toHaveCount(1);
    await expect(details).not.toHaveAttribute('open', '');

    const summary = details.locator('summary');
    const box = await summary.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(details).toHaveAttribute('open', '');

    const rows = details.locator('dl > div');
    expect(await rows.count()).toBeGreaterThan(0);
    for (const row of await rows.all()) {
      await expect(row.locator('dt')).not.toHaveText('');
      await expect(row.locator('dd')).not.toHaveText('');
    }
    await expect(details.locator('dl [aria-hidden]')).toHaveCount(0);

    await page.keyboard.press('Enter');
    await expect(details).not.toHaveAttribute('open', '');
  });

  test(`${path} raw-data layer starts with the site name`, async ({ page }) => {
    await page.goto(path);
    const name = (await page.locator('main h1').first().textContent())?.trim() ?? '';
    const details = page.locator('aside details', { has: page.locator('dl') }).last();
    await details.locator('summary').click();
    await expect(details.locator('dl > div').first().locator('dd')).toContainText(name);
  });
}
