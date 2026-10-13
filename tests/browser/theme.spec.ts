import { expect, test } from '@playwright/test';

import { has, seedTheme } from './helpers/features';

const html = (page: import('@playwright/test').Page) => page.locator('html');

test('the stored theme is applied on first paint (no flash)', async ({ page }) => {
  test.skip(
    !has({ flags: ['themeToggle'] }),
    'needs features.themeToggle: the stored choice is forgotten without it',
  );
  // A stored light preference must win before paint, even though the default theme is dark.
  await seedTheme(page, 'elvinlab-light');
  await page.goto('/', { waitUntil: 'commit' });
  // The inline pre-paint script runs synchronously in <head>, so the attribute is already correct.
  await expect(html(page)).toHaveAttribute('data-theme', 'elvinlab-light');
});

test('the theme toggle switches and persists across reloads', async ({ page }) => {
  test.skip(!has({ flags: ['themeToggle'] }), 'needs features.themeToggle');
  await page.goto('/');
  const before = await html(page).getAttribute('data-theme');
  await page.getByRole('button', { name: /cambiar tema|switch theme/i }).click();
  const after = await html(page).getAttribute('data-theme');
  expect(after).not.toBe(before);
  const stored = await page.evaluate(() => localStorage.getItem('theme'));
  expect(stored).toBe(after);

  await page.reload();
  await expect(html(page)).toHaveAttribute('data-theme', after ?? '');
});

test('negative control: an unstored preference does not force the light theme', async ({
  page,
}) => {
  // With no stored choice and the default (dark) scheme, the page must not paint light.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/', { waitUntil: 'commit' });
  await expect(html(page)).not.toHaveAttribute('data-theme', 'elvinlab-light');
});
