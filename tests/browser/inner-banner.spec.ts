import { expect, test } from '@playwright/test';

import { liveByPath } from './helpers/features';

/** One page of each type that wears the compact lab-paper header (`PageHeader`), in both locales. */
const PAGES = liveByPath(
  [
    { path: '/experiments/', title: 'Experimentos' },
    { path: '/en/experiments/', title: 'Experiments' },
    { path: '/contact/', title: 'Contacto' },
    { path: '/en/contact/', title: 'Contact' },
    { path: '/changelog/', title: 'Changelog' },
    { path: '/en/changelog/', title: 'Changelog' },
    { path: '/privacy/', title: 'Privacidad' },
    { path: '/en/privacy/', title: 'Privacy' },
    { path: '/terms/', title: 'Términos de uso' },
    { path: '/en/terms/', title: 'Terms of use' },
    { path: '/subscribe/', title: 'Lo que construyo, en tu correo.' },
    { path: '/en/subscribe/', title: 'What I build, in your inbox.' },
    { path: '/subscribe/confirm/', title: 'Confirmar suscripción' },
    { path: '/en/subscribe/unsubscribe/', title: 'Unsubscribe' },
    { path: '/nope/', title: 'Página no encontrada' },
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
