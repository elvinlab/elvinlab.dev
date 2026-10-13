import { expect, test } from '@playwright/test';

import { liveByPath } from './helpers/features';
import { text } from './helpers/site';

/** One page of each type that wears the compact lab-paper header (`PageHeader`), in both locales. */
const PAGES = liveByPath(
  [
    { path: '/experiments/', title: text('es', 'experiments.title') },
    { path: '/en/experiments/', title: text('en', 'experiments.title') },
    { path: '/contact/', title: 'Contacto' },
    { path: '/en/contact/', title: 'Contact' },
    { path: '/changelog/', title: 'Changelog' },
    { path: '/en/changelog/', title: 'Changelog' },
    { path: '/privacy/', title: text('es', 'footer.privacy') },
    { path: '/en/privacy/', title: 'Privacy' },
    { path: '/terms/', title: 'Términos de uso' },
    { path: '/en/terms/', title: 'Terms of use' },
    { path: '/subscribe/', title: text('es', 'subscribe.page.title') },
    { path: '/en/subscribe/', title: text('en', 'subscribe.page.title') },
    { path: '/subscribe/confirm/', title: text('es', 'subscribe.confirm.button') },
    { path: '/en/subscribe/unsubscribe/', title: text('en', 'subscribe.unsubscribe.button') },
    { path: '/nope/', title: text('es', 'notFound.title') },
  ],
  ({ path }) => path,
);
const PRINTED = PAGES.filter(({ path }) => /\/(privacy|terms)\//.test(path));

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name === 'chromium-768', 'covered at 360 and 1280');
});

for (const { path, title } of PAGES) {
  test(`${path} has one banner holding its only visible h1`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('[data-banner]')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    const heading = page.locator('[data-banner] h1');
    await expect(heading).toHaveCount(1);
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(title);
    // The banner is the compact paper one: no canvas, no expand toggle.
    await expect(page.locator('[data-banner] canvas')).toHaveCount(0);
    await expect(page.locator('[data-banner-toggle]')).toHaveCount(0);
  });
}

// The legal pages are not `printable` (that mode also removes the subscribe form from their footer),
// so print keeps the page as it is: the banner must not collapse or hide the title.
for (const { path, title } of PRINTED) {
  test(`${path} still prints its title`, async ({ page }) => {
    await page.goto(path);
    await page.emulateMedia({ media: 'print' });
    const heading = page.locator('[data-banner] h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(title);
    const box = await heading.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(0);
    expect(await heading.evaluate((el) => getComputedStyle(el).visibility)).toBe('visible');
  });
}
