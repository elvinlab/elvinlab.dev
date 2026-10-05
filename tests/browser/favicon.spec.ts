import { expect, test } from '@playwright/test';

/**
 * Browsers, crawlers and link unfurlers ask for `/favicon.ico` by default even when the page
 * declares an SVG icon, so it must answer with a real icon instead of a 404 (seen in production).
 */
const ICO_MAX_BYTES = 15_000;

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'the favicon does not depend on width');
});

test('/favicon.ico answers with a small, real .ico file', async ({ request }) => {
  const response = await request.get('/favicon.ico');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/image\//);

  const body = await response.body();
  expect(body.byteLength).toBeLessThan(ICO_MAX_BYTES);
  // ICO header: reserved 0, type 1 (icon), then the image count.
  expect([...body.subarray(0, 4)]).toEqual([0, 0, 1, 0]);
  expect(body.readUInt16LE(4)).toBeGreaterThanOrEqual(1);
});

for (const path of ['/', '/en/', '/me/', '/notes/']) {
  test(`${path} declares both the .ico and the SVG icon`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('head link[rel="icon"][href="/favicon.ico"]')).toHaveCount(1);
    await expect(
      page.locator('head link[rel="icon"][href="/favicon.svg"][type="image/svg+xml"]'),
    ).toHaveCount(1);
  });
}
