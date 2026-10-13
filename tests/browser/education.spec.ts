import { readFileSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { requires, seedTheme } from './helpers/features';
import { text, themes } from './helpers/site';

requires({ flags: ['education'] });

/**
 * The education timeline. The fixture build copies the real `credentials.json`, so the expected
 * order is derived from it: newest first by year, then the `order` field, then the month, then the id inside a year.
 */
type Credential = {
  title: string;
  issuer: string;
  kind: string;
  year: number;
  order?: number;
  month?: number;
  learnings?: unknown[];
  image?: unknown;
};
const credentials = Object.entries(
  JSON.parse(
    readFileSync(new URL('../../apps/web/src/content/credentials.json', import.meta.url), 'utf8'),
  ) as Record<string, Credential>,
).map(([id, entry]) => ({ id, ...entry }));
// The default order: newest first (year, then `order`, then the month descending, then the id).
const newest = [...credentials].sort(
  (a, b) =>
    b.year - a.year ||
    (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
    (b.month ?? 0) - (a.month ?? 0) ||
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

  test(`${path} lists the credentials newest first with type badge and issuer`, async ({
    page,
  }) => {
    await page.goto(path);
    const items = page.locator('[data-education-item]');
    await expect(items).toHaveCount(newest.length);
    for (const [index, credential] of newest.entries()) {
      const item = items.nth(index);
      await expect(item).toHaveAttribute('id', credential.id);
      await expect(item.getByRole('heading', { level: 3, name: credential.title })).toBeVisible();
      await expect(item.locator('.ed-issuer')).toHaveText(credential.issuer);
      await expect(item.locator('.ed-badge')).toHaveText(
        text(locale, `education.kind.${credential.kind as 'degree' | 'certificate'}`),
      );
    }
    const years = await page.locator('.ed-year-label').allTextContents();
    expect(years.map(Number)).toEqual([...new Set(newest.map(({ year }) => year))]);
  });

  test(`${path} anchors every item by its id`, async ({ page }) => {
    for (const { id } of credentials) {
      await page.goto(`${path}#${id}`);
      await expect(page.locator(`#${id}`)).toBeVisible();
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });

  test(`${path} draws a visible vertical line and a details block only where learnings exist`, async ({
    page,
  }) => {
    await page.goto(path);
    const line = await page
      .locator('.ed-timeline')
      .evaluate((node) => getComputedStyle(node).borderLeftWidth);
    expect(Number.parseFloat(line)).toBeGreaterThanOrEqual(2);
    // One details block per entry that has learnings, never an empty one for the rest.
    await expect(page.locator('.ed-learned')).toHaveCount(
      credentials.filter((entry) => entry.learnings?.length).length,
    );
  });

  test(`${path} shows a decorative cover only for entries without a document image`, async ({
    page,
  }) => {
    await page.goto(path);
    for (const entry of credentials) {
      const item = page.locator(`#${entry.id}`);
      await expect(item.locator('[data-education-cover]')).toHaveCount(entry.image ? 0 : 1);
      await expect(item.locator('.ed-figure')).toHaveCount(entry.image ? 1 : 0);
    }
    const cover = page.locator('[data-education-cover]').first();
    if (await cover.count()) await expect(cover).toHaveAttribute('aria-hidden', 'true');
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

// Mirrors `education.sortFrom` and `education.perPage` in site.config.ts: the alternate order and the
// second page exist only once the list is long enough, so the expectation follows the data.
const SORT_FROM = 4;
const PER_PAGE = 12;

test('the alternate order and later pages exist only above the thresholds', async ({ page }) => {
  const cases: [string, boolean][] = [
    ['/education/oldest/', credentials.length >= SORT_FROM],
    ['/en/education/oldest/', credentials.length >= SORT_FROM],
    ['/education/page/2/', credentials.length > PER_PAGE],
  ];
  for (const [path, exists] of cases) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(exists ? 200 : 404);
  }
});

const MEROWS = 3;

for (const { path, locale } of PAGES) {
  const me = path.replace('education', 'me');

  test(`${me} shows the newest education rows instead of the long certificates list`, async ({
    page,
  }) => {
    await page.goto(me);
    const block = page.locator('[data-me-education]');
    await expect(block).toBeVisible();
    await expect(block.getByRole('heading', { name: text(locale, 'me.education') })).toBeVisible();
    await expect(page.getByText(text(locale, 'me.certificates'), { exact: true })).toHaveCount(0);
    const rows = block.locator('[data-me-education-row]');
    const expected = newest.slice(0, MEROWS);
    await expect(rows).toHaveCount(expected.length);
    for (const [index, credential] of expected.entries()) {
      const row = rows.nth(index);
      await expect(row).toContainText(credential.title);
      await expect(row).toContainText(credential.issuer);
      await expect(row).toContainText(String(credential.year));
      await expect(row).toContainText(
        text(locale, `me.kind.${credential.kind as 'degree' | 'certificate'}`),
      );
      await expect(row).toHaveAttribute(
        'href',
        new RegExp(`^${path}(?:page/\\d+/)?#${credential.id}$`),
      );
    }
    await expect(
      block.getByRole('link', { name: text(locale, 'me.education.more') }),
    ).toHaveAttribute('href', path);
  });

  test(`${me} row links land on the entry of ${path}`, async ({ page }) => {
    await page.goto(me);
    const first = page.locator('[data-me-education-row]').first();
    await first.click();
    await expect(page).toHaveURL(new RegExp(`${path}(?:page/\\d+/)?#`));
    await expect(page.locator(':target')).toHaveCount(1);
  });

  test(`${me} does not overflow at 360px with the education block`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 });
    await page.goto(me, { waitUntil: 'load' });
    const { scrollWidth, innerWidth } = await overflow(page);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });

  test(`${path} has the localized title, description and Open Graph tags`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      text(locale, 'education.description'),
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      new RegExp(`^${text(locale, 'education.title')}`),
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveCount(1);
  });

  test(`the navbar links to ${path} and marks it as the current page`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(me);
    const nav = page.getByRole('navigation', { name: text(locale, 'nav.label') });
    await nav
      .getByRole('link', { name: text(locale, 'nav.education') })
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(
      nav.getByRole('link', { name: text(locale, 'nav.education') }).first(),
    ).toHaveAttribute('aria-current', 'page');
  });

  test(`the mobile menu lists the education link at 390px on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await page.getByRole('button', { name: text(locale, 'nav.menu') }).click();
    await expect(
      page.locator('#nav-menu').getByRole('link', { name: text(locale, 'nav.education') }),
    ).toBeVisible();
  });
}
