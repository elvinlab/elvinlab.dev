import { expect, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { stubThirdParties } from './helpers/third-party';

const PAGES = [
  '/',
  '/me/',
  '/en/me/',
  '/experiments/',
  '/en/experiments/',
  '/notes/',
  '/notes/smoke-es/',
  '/privacy/',
  '/en/privacy/',
  '/terms/',
  '/en/terms/',
  '/en/',
  '/contact/',
  '/en/contact/',
];
const THEMES = ['elvinlab-dark', 'elvinlab-light'];

test.beforeEach(async ({ page }) => {
  await stubThirdParties(page);
});

for (const path of PAGES) {
  for (const theme of THEMES) {
    test(`${path} has no axe violations (${theme})`, async ({ page }) => {
      // Seed the theme before navigation so the pre-paint boot script applies it (no race).
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const { violations } = await scan(page);
      expect(describeViolations(violations)).toEqual([]);
    });
  }
}

test('404 has no axe violations', async ({ page }) => {
  await page.goto('/no-such-page/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const { violations } = await scan(page);
  expect(violations.map((v) => v.id)).toEqual([]);
});

test('negative control: axe catches an injected image without alt text', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const img = document.createElement('img');
    img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    document.querySelector('main')?.appendChild(img);
  });
  const { violations } = await scan(page);
  expect(violations.some((v) => v.id === 'image-alt')).toBe(true);
});
