import { expect, type Page, test } from '@playwright/test';

/** WCAG 1.4.10 reflow: no page scrolls sideways at the narrowest supported widths. */
const PATHS = ['/', '/me/', '/en/me/', '/experiments/', '/notes/', '/contact/', '/changelog/'];
const WIDTHS = [320, 390, 768, 1024];
const LARGE_FONT_PATHS = ['/', '/notes/', '/contact/', '/me/'];

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
});

const overflow = (page: Page) =>
  page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));

for (const width of WIDTHS) {
  for (const path of PATHS) {
    test(`${path} does not overflow horizontally at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path, { waitUntil: 'load' });
      const { scrollWidth, innerWidth } = await overflow(page);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    });
  }
}

// A 200% root font on a phone is harsher than real browser zoom (zoom also narrows the viewport and
// reflows). What must hold is that the header keeps every control reachable: it wraps instead of
// pushing the menu button off screen.
for (const path of LARGE_FONT_PATHS) {
  test(`${path} keeps the header controls on screen with a 200% root font`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(path, { waitUntil: 'load' });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '32px';
    });
    const menuButton = page.locator('button[aria-controls="nav-menu"]');
    // Transitions on font-size can leave a few frames of intermediate layout: assert the settled one.
    await expect
      .poll(async () => {
        const box = await menuButton.boundingBox();
        return box ? box.x + box.width - 390 : Number.POSITIVE_INFINITY;
      })
      .toBeLessThanOrEqual(0);
  });
}
