import { expect, type Page, test } from '@playwright/test';

const alternates = (page: Page) =>
  page
    .locator('link[rel="alternate"][hreflang]')
    .evaluateAll((links) =>
      links.map((link) => `${link.getAttribute('hreflang')} ${link.getAttribute('href')}`).sort(),
    );

const PAIR = [
  'en https://elvinlab.dev/en/notes/smoke-en/',
  'es https://elvinlab.dev/notes/smoke-es/',
  'x-default https://elvinlab.dev/notes/smoke-es/',
];

test.describe('a note and its translation', () => {
  test('point at each other with hreflang and x-default, from either side', async ({ page }) => {
    for (const path of ['/notes/smoke-es/', '/en/notes/smoke-en/']) {
      await page.goto(path);
      expect(await alternates(page), path).toEqual(PAIR);
    }
  });

  test('keep their own canonical URL', async ({ page }) => {
    await page.goto('/en/notes/smoke-en/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://elvinlab.dev/en/notes/smoke-en/',
    );
  });

  test('are reached from the navbar language switch, not the other home', async ({ page }) => {
    await page.goto('/notes/smoke-es/');
    await expect(page.locator('header a[lang="en"]')).toHaveAttribute(
      'href',
      '/en/notes/smoke-en/',
    );
    await page.goto('/en/notes/smoke-en/');
    await expect(page.locator('header a[lang="es"]')).toHaveAttribute('href', '/notes/smoke-es/');
  });

  test('keep the normal switch label, without announcing a home page', async ({ page }) => {
    await page.goto('/notes/smoke-es/');
    await expect(page.locator('header a[lang="en"]')).toHaveAttribute(
      'aria-label',
      'Read in English',
    );
  });

  test('are also what the language suggestion links to', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'languages', { configurable: true, get: () => ['en'] });
    });
    await page.goto('/notes/smoke-es/');
    await expect(page.locator('[data-language-hint="en"] a')).toHaveAttribute(
      'href',
      '/en/notes/smoke-en/',
    );
  });
});

test.describe('a note without a translation', () => {
  test('has no hreflang alternates and its switch goes to the other home', async ({ page }) => {
    await page.goto('/notes/smoke-es-next/');
    expect(await alternates(page)).toEqual([]);
    const link = page.locator('header a[lang="en"]');
    await expect(link).toHaveAttribute('href', '/en/');
    await expect(link).toHaveAttribute('aria-label', 'Go to the English home page');
  });
});
