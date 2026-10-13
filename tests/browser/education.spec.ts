import { readFileSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { requires, seedTheme } from './helpers/features';
import { text, themes } from './helpers/site';

requires({ flags: ['education'] });

/**
 * The education timeline. The fixture build copies the real `credentials.json`, so the expected
 * order is derived from it: ascending by year, then the `order` field, then the id inside a year.
 */
type Credential = { title: string; issuer: string; kind: string; year: number; order?: number };
const credentials = Object.entries(
  JSON.parse(
    readFileSync(new URL('../../apps/web/src/content/credentials.json', import.meta.url), 'utf8'),
  ) as Record<string, Credential>,
).map(([id, entry]) => ({ id, ...entry }));
const ascending = [...credentials].sort(
  (a, b) =>
    a.year - b.year ||
    (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
    a.id.localeCompare(b.id),
);

const PAGES = [
  { path: '/education/', locale: 'es' },
  { path: '/en/education/', locale: 'en' },
] as const;

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
});

const overflow = (page: Page) =>
  page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));

for (const { path, locale } of PAGES) {
  test(`${path} renders the title, intro, stamp and one item per credential`, async ({ page }) => {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { level: 1, name: text(locale, 'education.title') }),
    ).toBeVisible();
    await expect(page.getByText(text(locale, 'education.intro'))).toBeVisible();
    await expect(page).toHaveTitle(new RegExp(`^${text(locale, 'education.title')} · `));
    await expect(page.locator('[data-education-item]')).toHaveCount(credentials.length);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`${path}$`),
    );
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });

  test(`${path} lists the credentials ascending by year with type badge and issuer`, async ({
    page,
  }) => {
    await page.goto(path);
    const items = page.locator('[data-education-item]');
    await expect(items).toHaveCount(ascending.length);
    for (const [index, credential] of ascending.entries()) {
      const item = items.nth(index);
      await expect(item).toHaveAttribute('id', credential.id);
      await expect(item.getByRole('heading', { level: 3, name: credential.title })).toBeVisible();
      await expect(item.getByText(credential.issuer, { exact: true })).toBeVisible();
      await expect(item.locator('.ed-badge')).toHaveText(
        text(locale, `education.kind.${credential.kind as 'degree' | 'certificate'}`),
      );
    }
    const years = await page.locator('.ed-year-label').allTextContents();
    expect(years.map(Number)).toEqual([...new Set(ascending.map(({ year }) => year))]);
  });

  test(`${path} anchors every item by its id`, async ({ page }) => {
    for (const { id } of credentials) {
      await page.goto(`${path}#${id}`);
      await expect(page.locator(`#${id}`)).toBeVisible();
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });

  test(`${path} draws a visible vertical line and needs no details without learnings`, async ({
    page,
  }) => {
    await page.goto(path);
    const line = await page
      .locator('.ed-timeline')
      .evaluate((node) => getComputedStyle(node).borderLeftWidth);
    expect(Number.parseFloat(line)).toBeGreaterThanOrEqual(2);
    // Nothing in the current data has learnings, so no entry may render an empty details block.
    await expect(page.locator('.ed-learned')).toHaveCount(0);
  });

  for (const width of [360, 390]) {
    test(`${path} does not overflow horizontally at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path, { waitUntil: 'load' });
      const { scrollWidth, innerWidth } = await overflow(page);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    });
  }

  for (const theme of [themes.dark, themes.light]) {
    test(`${path} has no axe violations (${theme})`, async ({ page }) => {
      await seedTheme(page, theme);
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const { violations } = await scan(page);
      expect(describeViolations(violations)).toEqual([]);
    });
  }
}

test('the Spanish and English pages are alternates of each other', async ({ page }) => {
  await page.goto('/education/');
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
    'href',
    /\/en\/education\/$/,
  );
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await page.goto('/en/education/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('the alternate order and later pages do not exist below the thresholds', async ({ page }) => {
  for (const path of ['/education/newest/', '/en/education/newest/', '/education/page/2/']) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});
