import { expect, test } from '@playwright/test';

for (const { locale, prefix, slug } of [
  { locale: 'es', prefix: '', slug: 'smoke-es' },
  { locale: 'en', prefix: '/en', slug: 'smoke-en' },
]) {
  const paths =
    locale === 'es'
      ? [`${prefix}/`, `${prefix}/notes/`, `${prefix}/notes/${slug}/`]
      : [`${prefix}/`];

  for (const path of paths) {
    test(`${path} renders production content`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      if (path.endsWith(`/${slug}/`)) {
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(
          `Synthetic smoke note ${locale.toUpperCase()}`,
        );
        await expect(page.locator('article pre')).toContainText("const fixture = 'isolated'");
      } else {
        await expect(page.locator(`a[href="${prefix}/notes/${slug}/"]`).first()).toBeVisible();
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      expect(errors).toEqual([]);
    });
  }
}

const CONTACT_PAGES = [
  { locale: 'es' as const, path: '/contact/' },
  { locale: 'en' as const, path: '/en/contact/' },
];

const CONTACT_LABELS = {
  es: { name: 'Nombre', email: 'Correo electrónico', message: 'Mensaje' },
  en: { name: 'Name', email: 'Email', message: 'Message' },
} as const;

for (const { locale, path } of CONTACT_PAGES) {
  test(`${path} renders contact form`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    const turnstileRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('challenges.cloudflare.com')) {
        turnstileRequests.push(request.url());
      }
    });

    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const labels = CONTACT_LABELS[locale];
    await expect(page.getByLabel(labels.name)).toBeVisible();
    await expect(page.getByLabel(labels.email)).toBeVisible();
    await expect(page.getByLabel(labels.message)).toBeVisible();

    await expect(page.getByLabel(labels.name)).toBeEnabled();
    await expect(page.getByLabel(labels.email)).toBeEnabled();
    await expect(page.getByLabel(labels.message)).toBeEnabled();

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(errors).toEqual([]);
    expect(turnstileRequests).toEqual([]);
  });
}

const CHANGELOG_PAGES = [
  { locale: 'es' as const, path: '/changelog/' },
  { locale: 'en' as const, path: '/en/changelog/' },
];

for (const { locale, path } of CHANGELOG_PAGES) {
  test(`${path} renders the changelog and is linked from the footer`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('footer a', { hasText: 'Changelog' })).toBeVisible();

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('unknown routes render the bilingual 404, not a successful page', async ({ page }) => {
  const response = await page.goto('/smoke-missing-page/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('main [lang="en"] h2')).toBeVisible();
});

test('negative control: the heading check rejects a broken document', async ({ page }) => {
  await page.goto('/notes/smoke-es/');
  await page.getByRole('heading', { level: 1 }).evaluate((heading) => heading.remove());
  await expect(
    expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 250 }),
  ).rejects.toThrow();
});
