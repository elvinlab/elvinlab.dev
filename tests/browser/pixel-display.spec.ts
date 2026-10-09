import { expect, type Page, test } from '@playwright/test';

/** Widths where the pixel headline must neither overflow nor clip. */
const WIDTHS = [360, 390, 768, 1280];
const HOME_PATHS = ['/', '/en/'];
const PIXEL_FAMILY = /^"?Pixelify Sans/;

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
});

const familyOf = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element) => getComputedStyle(element).fontFamily);

const noHorizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

for (const path of HOME_PATHS) {
  test.describe(`pixel display face on ${path}`, () => {
    test('the hero headline computes Pixelify Sans', async ({ page }) => {
      await page.goto(path);
      expect(await familyOf(page, '[data-home-hero] h1')).toMatch(PIXEL_FAMILY);
    });

    test('every section title with the accent bar computes Pixelify Sans', async ({ page }) => {
      await page.goto(path);
      const families = await page
        .locator('main h2:has(> span.bg-primary)')
        .evaluateAll((titles) => titles.map((title) => getComputedStyle(title).fontFamily));
      // The notebook index renders on the home page of both locales in the fixture workspace.
      expect(families.length).toBeGreaterThan(0);
      for (const family of families) expect(family).toMatch(PIXEL_FAMILY);
    });

    test('the Pixelify face is loaded, and the wordmark stays Press Start 2P', async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      const loaded = await page.evaluate(async () => {
        await document.fonts.ready;
        return [...document.fonts]
          .filter((face) => face.family.includes('Pixelify Sans'))
          .map((face) => face.status);
      });
      expect(loaded).toContain('loaded');
      expect(await familyOf(page, '[data-navbar] nav > a')).toMatch(/^"?Press Start 2P/);
    });

    test('the Latin Pixelify file is preloaded, requested by the page, and served', async ({
      page,
    }) => {
      const fontRequests: string[] = [];
      page.on('response', (response) => {
        if (response.request().resourceType() === 'font') fontRequests.push(response.url());
      });
      await page.goto(path, { waitUntil: 'networkidle' });
      const href = await page
        .locator('head link[rel="preload"][as="font"][href*="pixelify-sans-latin-wght-normal"]')
        .getAttribute('href');
      expect(href).toMatch(/pixelify-sans-latin-wght-normal.*\.woff2$/);
      expect(fontRequests.some((url) => url.endsWith(href ?? ''))).toBe(true);
      expect((await page.request.get(href ?? '')).status()).toBe(200);
    });

    test('prose and body copy never use the pixel face', async ({ page }) => {
      await page.goto(path);
      expect(await familyOf(page, '[data-home-hero] p:not(.font-mono)')).not.toMatch(PIXEL_FAMILY);
      expect(await familyOf(page, 'body')).not.toMatch(PIXEL_FAMILY);
    });
  });
}

for (const width of WIDTHS) {
  for (const path of HOME_PATHS) {
    test(`the pixel hero fits at ${width}px on ${path}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      expect(await noHorizontalOverflow(page)).toBe(true);
      // No word is clipped: the headline never scrolls inside its own box.
      const h1 = page.locator('[data-home-hero] h1');
      expect(await h1.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      const hero = await page.locator('[data-home-hero]').boundingBox();
      const banner = await page.locator('[data-banner]').boundingBox();
      if (!hero || !banner) throw new Error('hero or banner has no layout box');
      expect(hero.y + hero.height).toBeLessThanOrEqual(banner.y + banner.height);
    });
  }
}

test('note page titles and prose stay Space Grotesk', async ({ page }) => {
  await page.goto('/notes/smoke-es/');
  expect(await familyOf(page, 'main h1')).not.toMatch(PIXEL_FAMILY);
  expect(await familyOf(page, 'article .prose p')).not.toMatch(PIXEL_FAMILY);
});

const PIXEL_TITLE_PATHS = [
  '/notes/',
  '/experiments/',
  '/en/experiments/',
  '/contact/',
  '/en/contact/',
  '/changelog/',
  '/en/changelog/',
];

for (const path of PIXEL_TITLE_PATHS) {
  test(`the page title of ${path} is pixel, preloaded and unclipped`, async ({ page }) => {
    await page.goto(path);
    expect(await familyOf(page, 'main h1')).toMatch(PIXEL_FAMILY);
    await expect(
      page.locator('head link[rel="preload"][as="font"][href*="pixelify-sans-latin-wght-normal"]'),
    ).toHaveCount(1);
    // The description under the title stays in the body face.
    expect(await familyOf(page, 'main h1 + p')).not.toMatch(PIXEL_FAMILY);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      expect(await noHorizontalOverflow(page), `${path} at ${width}px`).toBe(true);
      expect(
        await page.locator('main h1').evaluate((el) => el.scrollWidth <= el.clientWidth),
        `${path} at ${width}px`,
      ).toBe(true);
    }
  });
}

test('the page title leaves air under the navbar and the description stays readable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/contact/');
  const gap = await page.evaluate(() => {
    const nav = document.querySelector('[data-site-chrome]')?.getBoundingClientRect();
    const h1 = document.querySelector('main h1')?.getBoundingClientRect();
    return nav && h1 ? h1.top - nav.bottom : 0;
  });
  expect(gap).toBeGreaterThanOrEqual(32);
});

test('the contact form and its side panel start at the same top', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/contact/');
  const tops = await page.evaluate(() => {
    const form = document.querySelector('article form')?.getBoundingClientRect().top ?? -1;
    const aside = document.querySelector('main aside')?.getBoundingClientRect().top ?? -2;
    return { form, aside };
  });
  expect(Math.abs(tops.form - tops.aside)).toBeLessThanOrEqual(2);
});

test('pages whose title is not pixel do not preload the pixel face', async ({ page }) => {
  await page.goto('/notes/smoke-es/');
  await expect(page.locator('head link[rel="preload"][href*="pixelify-sans"]')).toHaveCount(0);
});
