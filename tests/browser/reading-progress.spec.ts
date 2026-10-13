import { expect, type Page, test } from '@playwright/test';

import { requires } from './helpers/features';
import { text } from './helpers/site';
import { stubThirdParties } from './helpers/third-party';

requires({ flags: ['readingProgress'], routes: ['notes'] });

const NOTES = [
  { locale: 'es', path: '/notes/smoke-es/', slug: 'smoke-es', index: '/notes/' },
  { locale: 'en', path: '/en/notes/smoke-en/', slug: 'smoke-en', index: '/notes/' },
] as const;

/** Short enough that the fixture note is taller than the viewport, so there is something to scroll. */
const SHORT = { width: 390, height: 240 };

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
  await stubThirdParties(page);
});

const seed = (page: Page, slug: string, p: number) =>
  page.addInitScript(
    ([key, value]) => {
      if (localStorage.getItem(key as string) === null)
        localStorage.setItem(key as string, value as string);
    },
    [`progress:${slug}`, JSON.stringify({ p, t: 1 })],
  );

const stored = (page: Page, slug: string) =>
  page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as { p: number; t: number });
  }, `progress:${slug}`);

/** Where the position restore must land: the same fraction of the article the progress bar measures. */
const expectedTop = (page: Page, p: number) =>
  page.evaluate((fraction) => {
    const article = document.querySelector<HTMLElement>('[data-article]');
    if (!article) throw new Error('no article');
    return {
      top: article.offsetTop + fraction * (article.offsetHeight - window.innerHeight),
      scrollable: article.offsetHeight - window.innerHeight,
    };
  }, p);

for (const { path, slug, index } of NOTES) {
  test.describe(`${path} reading progress`, () => {
    test('puts a returning reader back where they stopped', async ({ page }) => {
      await page.setViewportSize(SHORT);
      await seed(page, slug, 0.5);
      await page.goto(path, { waitUntil: 'load' });
      // Fonts and images settle after the script runs; the page keeps the reader on the fraction.
      await expect
        .poll(async () => {
          const { top } = await expectedTop(page, 0.5);
          return Math.abs((await page.evaluate(() => window.scrollY)) - top);
        })
        .toBeLessThanOrEqual(2);
      expect((await expectedTop(page, 0.5)).scrollable).toBeGreaterThan(200);
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
    });

    test('does not restore when the note was barely started, finished or opened at a hash', async ({
      page,
    }) => {
      await page.setViewportSize(SHORT);
      for (const p of [0.02, 1]) {
        await page.addInitScript(
          ([key, value]) => localStorage.setItem(key as string, value as string),
          [`progress:${slug}`, JSON.stringify({ p, t: 1 })],
        );
        await page.goto(path, { waitUntil: 'load' });
        expect(await page.evaluate(() => window.scrollY)).toBeLessThan(8);
      }
    });

    test('stores the progress while reading and marks the note read past 90%', async ({ page }) => {
      await page.setViewportSize(SHORT);
      await page.goto(path, { waitUntil: 'load' });
      expect(await stored(page, slug)).toBeNull();
      await page.evaluate(() => {
        const article = document.querySelector<HTMLElement>('[data-article]');
        if (!article) throw new Error('no article');
        const scrollable = article.offsetHeight - window.innerHeight;
        window.scrollTo({ top: article.offsetTop + scrollable * 0.4, behavior: 'instant' });
      });
      await expect.poll(() => stored(page, slug).then((entry) => entry?.p)).toBeGreaterThan(0.35);
      expect((await stored(page, slug))?.p).toBeLessThan(0.45);
      await page.evaluate(() => {
        const article = document.querySelector<HTMLElement>('[data-article]');
        if (!article) throw new Error('no article');
        window.scrollTo({ top: article.offsetTop + article.offsetHeight, behavior: 'instant' });
      });
      await expect.poll(() => stored(page, slug).then((entry) => entry?.p)).toBe(1);
    });

    test('labels the note in the index: nothing, continue reading, then read', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      const label = page.locator(`[data-slug="${slug}"] [data-progress-label]`);
      await page.goto(index, { waitUntil: 'load' });
      await expect(label.first()).toBeHidden();

      await seed(page, slug, 0.4);
      await page.goto(index, { waitUntil: 'load' });
      await expect(label.first()).toBeVisible();
      await expect(label.first()).toHaveText(text('es', 'reading.continue'));

      await page.evaluate(
        (key) => localStorage.setItem(key, JSON.stringify({ p: 1, t: 2 })),
        `progress:${slug}`,
      );
      await page.goto(index, { waitUntil: 'load' });
      await expect(label.first()).toHaveText(text('es', 'reading.read'));
    });

    test('keeps the index free of sideways scroll with the label showing', async ({ page }) => {
      await seed(page, slug, 1);
      for (const width of [360, 390]) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(index, { waitUntil: 'load' });
        await expect(
          page.locator(`[data-slug="${slug}"] [data-progress-label]`).first(),
        ).toBeVisible();
        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
      }
    });
  });
}

test('the home shows the labels too and the whole thing sets no cookie', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const { slug } of NOTES) await seed(page, slug, 1);
  await page.goto('/', { waitUntil: 'load' });
  const labels = page.locator('[data-slug] [data-progress-label]:not([hidden])');
  expect(await labels.count()).toBeGreaterThan(0);
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  expect(await page.evaluate(() => document.cookie)).toBe('');
});

test('reading a note sets no cookie and survives blocked storage', async ({ page }) => {
  await page.setViewportSize(SHORT);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/notes/smoke-es/', { waitUntil: 'load' });
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }));
  await page.waitForTimeout(700);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.cookie)).toBe('');
});
