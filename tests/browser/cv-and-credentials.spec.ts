import { expect, test } from '@playwright/test';

/**
 * The CV button serves one PDF per language, and the credentials list never shows placeholder
 * text. The fixture build copies the real `site.config.ts` and `content/credentials.json`.
 */
const DRIVE_PDF = /^https:\/\/drive\.google\.com\/file\/d\/[\w-]+\/view$/;

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'content does not depend on the width');
});

test('every CV button points at the PDF of its own language', async ({ page }) => {
  const hrefOf = async (path: string) => {
    await page.goto(path);
    const link = page.getByRole('link', { name: /^(Ver|View) CV/ }).first();
    await expect(link).toBeVisible();
    return link.getAttribute('href');
  };

  const [esHome, esMe, enHome, enMe] = [
    await hrefOf('/'),
    await hrefOf('/me/'),
    await hrefOf('/en/'),
    await hrefOf('/en/me/'),
  ];

  for (const href of [esHome, esMe, enHome, enMe]) expect(href).toMatch(DRIVE_PDF);
  expect(esMe).toBe(esHome);
  expect(enMe).toBe(enHome);
  expect(enHome).not.toBe(esHome);
});

for (const path of ['/me/', '/en/me/']) {
  test(`${path} lists real platforms and no placeholder issuer`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByText(/sin confirmar|unconfirmed/i)).toHaveCount(0);
    await expect(page.getByText('DevTalles')).toBeVisible();
    await expect(page.getByText('Udemy')).toBeVisible();
    await expect(page.getByText('Universidad Nacional de Costa Rica')).toBeVisible();
  });
}
