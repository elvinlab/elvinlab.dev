import { expect, test } from '@playwright/test';

/** The two body fonts every page needs; Press Start 2P and the non-Latin subsets stay lazy. */
const BODY_FONTS = [
  /space-grotesk-latin-wght-normal.*\.woff2$/,
  /jetbrains-mono-latin-wght-normal.*\.woff2$/,
];
/** The home hero headline is above the fold in Pixelify Sans, so only the home pages add it. */
const PIXEL_FONT = /pixelify-sans-latin-wght-normal.*\.woff2$/;
const PAGES = [
  { path: '/', preloads: [...BODY_FONTS, PIXEL_FONT] },
  { path: '/en/', preloads: [...BODY_FONTS, PIXEL_FONT] },
  { path: '/notes/', preloads: BODY_FONTS },
];
/** The raw profile photo is a 59 KB PNG; the optimized variant must be far below that. */
const RAW_AVATAR_BYTES = 59_000;

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'asset loading does not depend on width');
});

for (const { path, preloads: expectedPreloads } of PAGES) {
  test(`${path} preloads exactly the Latin variable fonts it renders and uses them`, async ({
    page,
  }) => {
    const fontRequests: string[] = [];
    page.on('response', (response) => {
      if (response.request().resourceType() === 'font') fontRequests.push(response.url());
    });
    await page.goto(path, { waitUntil: 'networkidle' });

    const preloads = await page
      .locator('head link[rel="preload"][as="font"]')
      .evaluateAll((links) =>
        links.map((link) => ({
          href: (link as HTMLLinkElement).href,
          type: link.getAttribute('type'),
          crossorigin: link.hasAttribute('crossorigin'),
        })),
      );

    expect(preloads).toHaveLength(expectedPreloads.length);
    for (const [index, pattern] of expectedPreloads.entries()) {
      const preload = preloads[index];
      expect(preload?.href).toMatch(pattern);
      expect(preload?.type).toBe('font/woff2');
      expect(preload?.crossorigin).toBe(true);
      // A preload nobody uses wastes bandwidth: the page itself must request the same URL.
      expect(fontRequests).toContain(preload?.href);
      const response = await page.request.get(preload?.href ?? '');
      expect(response.status()).toBe(200);
    }
  });
}

test('the home profile photo is served as an optimized, dimensioned image', async ({ page }) => {
  await page.goto('/');
  const avatar = page.locator('img[alt="Elvin González"]');
  await avatar.scrollIntoViewIfNeeded();
  await expect(avatar).toBeVisible();

  const src = await avatar.getAttribute('src');
  expect(src).toMatch(/\.(webp|avif)(\?.*)?$/);
  expect(Number(await avatar.getAttribute('width'))).toBeGreaterThan(0);
  expect(Number(await avatar.getAttribute('height'))).toBeGreaterThan(0);
  await expect(avatar).toHaveAttribute('decoding', 'async');

  const response = await page.request.get(src ?? '');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/image\/(webp|avif)/);
  expect((await response.body()).byteLength).toBeLessThan(RAW_AVATAR_BYTES / 2);
});

test('the /me profile photo is optimized and sized', async ({ page }) => {
  await page.goto('/me/');
  const avatar = page.locator('img[alt="Elvin González"]');
  await expect(avatar).toBeVisible();
  await expect(avatar).toHaveAttribute('src', /\.(webp|avif)(\?.*)?$/);
  expect(Number(await avatar.getAttribute('width'))).toBeGreaterThan(0);
  expect(Number(await avatar.getAttribute('height'))).toBeGreaterThan(0);
});

/** The portrait is the LCP element of /me: the slot is 160 to 232 CSS px, so 2x of the widest slot is plenty. */
const ME_PORTRAIT_MAX_WIDTH = 480;
const ME_PORTRAIT_MAX_BYTES = 60_000;

test('the /me portrait is not larger than its slot needs and is prioritized', async ({ page }) => {
  await page.goto('/me/');
  const portrait = page.locator('img[alt="Elvin González"]');
  await expect(portrait).toBeVisible();

  expect(Number(await portrait.getAttribute('width'))).toBeLessThanOrEqual(ME_PORTRAIT_MAX_WIDTH);
  await expect(portrait).toHaveAttribute('fetchpriority', 'high');

  const src = await portrait.evaluate((img: HTMLImageElement) => img.currentSrc);
  const response = await page.request.get(src);
  expect(response.status()).toBe(200);
  expect((await response.body()).byteLength).toBeLessThan(ME_PORTRAIT_MAX_BYTES);
});

test.describe('prefetch', () => {
  const prefetchLinks = (page: import('@playwright/test').Page) =>
    page.locator('head link[rel="prefetch"]');

  test('no page is prefetched before the visitor shows intent', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(prefetchLinks(page)).toHaveCount(0);
  });

  test('hovering an internal link prefetches its page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('[data-navbar]').getByRole('link', { name: 'Notas' }).first().hover();
    await expect(page.locator('head link[rel="prefetch"][href$="/notes/"]')).toHaveCount(1);
  });

  test('keyboard focus on an internal link prefetches its page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('[data-navbar]').getByRole('link', { name: 'Contacto' }).first().focus();
    await expect(page.locator('head link[rel="prefetch"][href$="/contact/"]')).toHaveCount(1);
  });
});
