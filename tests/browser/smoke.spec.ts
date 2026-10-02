import { expect, test } from '@playwright/test';

for (const { locale, prefix, slug } of [
  { locale: 'es', prefix: '', slug: 'smoke-es' },
  { locale: 'en', prefix: '/en', slug: 'smoke-en' },
]) {
  const paths =
    locale === 'es'
      ? [`${prefix}/`, `${prefix}/notes/`, `${prefix}/notes/${slug}/`]
      : [`${prefix}/`, `${prefix}/notes/${slug}/`];

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
        await expect(page.locator('article pre').first()).toContainText(
          "const fixture = 'isolated'",
        );
        if (locale === 'en') {
          await expect(page.getByRole('link', { name: 'Lab Notes' })).toHaveAttribute(
            'href',
            '/notes/',
          );
        }
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

for (const { locale, path } of [
  { locale: 'es' as const, path: '/' },
  { locale: 'en' as const, path: '/en/' },
]) {
  test(`${path} keeps the refined home identity and recruiter card`, async ({ page }) => {
    await page.goto(path);

    const hero = page.locator('[data-home-hero]');
    await expect(hero).toBeVisible();
    await expect(hero.locator('h1 .animate-blink')).toHaveCount(0);
    const navbarBrand = page.locator('[data-navbar]').getByRole('link', { name: /elvinlab/ });
    await expect(navbarBrand).toHaveAttribute('href', locale === 'es' ? '/' : '/en/');
    await expect(navbarBrand).toContainText('elvinlab');
    await expect(navbarBrand).toHaveClass(/font-retro/);
    await expect(navbarBrand.locator('.animate-blink')).toHaveCount(0);
    await expect(page.locator('[data-banner-fade]')).toHaveCSS('height', '120px');

    await expect(page.locator('img[alt="Elvin González"][src$=".webp"]')).toBeVisible();

    const hiringCard = page.locator('section', {
      has: page.getByRole('heading', { name: locale === 'es' ? '¿Contratando?' : 'Hiring?' }),
    });
    const availability = hiringCard.locator('[data-recruiter-status]');
    await expect(availability).toBeVisible();
    // The owner is not open to work, so the status dot must not be the "available" green.
    await expect(availability.locator('[aria-hidden="true"]')).toHaveClass(/bg-danger/);
    await expect(availability.locator('[aria-hidden="true"]')).not.toHaveClass(/bg-ok/);
    await expect(
      hiringCard.getByText(locale === 'es' ? 'Actualmente en Buo' : 'Currently at Buo', {
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      hiringCard.getByRole('link', { name: locale === 'es' ? 'Ver mi perfil' : 'Open my profile' }),
    ).toHaveAttribute('href', locale === 'es' ? '/me/' : '/en/me/');
    await expect(
      hiringCard.getByRole('link', { name: locale === 'es' ? 'Descargar CV' : 'Download CV' }),
    ).toHaveCount(0);

    const bannerToggle = page.locator('[data-banner-toggle]');
    await expect(bannerToggle).toHaveAttribute('aria-pressed', 'true');
    await bannerToggle.click();
    await expect(bannerToggle).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('banner-expanded'))).toBe('0');
    await page.reload();
    await expect(page.locator('[data-banner-toggle]')).toHaveAttribute('aria-pressed', 'false');
  });
}

const CONTACT_PAGES = [
  { locale: 'es' as const, path: '/contact/' },
  { locale: 'en' as const, path: '/en/contact/' },
];

test('locale suggestion stays in document flow and only appears for a locale mismatch', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', { configurable: true, get: () => ['en'] });
  });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());

  const privacyResponse = await page.goto('/privacy/');
  expect(privacyResponse?.status()).toBe(200);
  await expect(page).toHaveURL(/\/privacy\/$/);
  const hint = page.locator('[data-language-hint="en"]');
  await expect(hint).toBeVisible();
  await expect(hint.locator('a')).toHaveAttribute('href', '/en/privacy/');
  await expect(hint.locator('a')).toHaveAttribute('hreflang', 'en');
  await expect(hint.locator('a')).toHaveCSS('min-height', '44px');

  const separateFromContent = await page.evaluate(() => {
    const hint = document.querySelector<HTMLElement>('[data-language-hint="en"]');
    const article = document.querySelector<HTMLElement>('main article');
    const footer = document.querySelector<HTMLElement>('body > div[data-site-chrome] footer');
    if (!hint || !article || !footer) return false;
    const hintRect = hint.getBoundingClientRect();
    return (
      hintRect.left >= 12 &&
      hintRect.right <= window.innerWidth - 12 &&
      (hintRect.top >= footer.getBoundingClientRect().bottom ||
        hintRect.bottom <= article.getBoundingClientRect().top)
    );
  });
  expect(separateFromContent).toBe(true);

  await hint.getByRole('button').click();
  await expect(hint).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('language-hint-dismissed')))
    .toBe('1');
  await page.reload();
  await expect(hint).toBeHidden();

  await page.evaluate(() => localStorage.removeItem('language-hint-dismissed'));
  const spanishNote = await page.goto('/notes/smoke-es/');
  expect(spanishNote?.status()).toBe(200);
  await expect(page).toHaveURL(/\/notes\/smoke-es\/$/);
  // smoke-es has an English translation (smoke-en), so the suggestion lands on it.
  await expect(page.locator('[data-language-hint="en"] a')).toHaveAttribute(
    'href',
    '/en/notes/smoke-en/',
  );
});

test('the locale suggestion is a quiet line of text, not a card', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', { configurable: true, get: () => ['en'] });
  });
  await page.goto('/privacy/');
  const hint = page.locator('[data-language-hint="en"]');
  await expect(hint).toBeVisible();
  await expect(hint).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(hint).toHaveCSS('font-size', '13px');
  await expect(hint.locator('a')).not.toHaveCSS('background-color', /rgb\(124, 58, 237\)/);
});

test('English pages never suggest switching to Spanish, whatever the browser prefers', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', {
      configurable: true,
      get: () => ['es-CR', 'es'],
    });
  });
  for (const path of ['/en/', '/en/privacy/', '/en/notes/smoke-en/']) {
    await page.goto(path);
    await expect(page.locator('[data-language-hint="es"]')).toBeHidden();
  }
});

test('locale suggestion remains hidden when the browser already matches the page', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', { configurable: true, get: () => ['en'] });
  });

  await page.goto('/en/privacy/');
  await expect(page.locator('[data-language-hint="es"]')).toBeHidden();
});

test('privacy prose follows the documented reading measure and secondary cursors are static', async ({
  page,
}) => {
  await page.goto('/privacy/');
  const measureFits = await page.locator('main article').evaluate((article) => {
    const font = getComputedStyle(article).font;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return false;
    context.font = font;
    return article.getBoundingClientRect().width <= context.measureText('0'.repeat(68)).width + 1;
  });
  expect(measureFits).toBe(true);
  await expect(page.locator('footer .animate-blink')).toHaveCount(0);

  await page.goto('/me/');
  await expect(page.locator('main h1 .animate-blink')).toHaveCount(0);

  await page.goto('/notes/');
  await expect(page.locator('main h1 .animate-blink')).toHaveCount(0);
});

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
