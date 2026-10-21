import { expect, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { has, profile, requires, seedTheme } from './helpers/features';
import { text, themes } from './helpers/site';
import { stubThirdParties } from './helpers/third-party';

requires({ routes: ['notes'] });

/**
 * The notes index as a reading path (DESIGN.md, "Notes index"): a row is title first, then one mono
 * line with the date and the reading time, the excerpt and at most three chips; "Start here" is a
 * compact strip of title links, so the list starts higher. Each test sets its own viewport.
 */
test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
  await stubThirdParties(page);
});

/**
 * Where the first row title started on the fixture build before the change (3 rows, start-here rows
 * without a reason, so much shorter than production, where it was 846 px at 1280 and 1154 px at 390).
 */
const BEFORE = { 1280: 738, 390: 738 } as const;
/** The first row title may start at most this far from the top of the page (measured 645 and 730, plus margin). */
const CEILING = { 1280: 660, 390: 735 } as const;

const firstRow = (page: Page) => page.locator('[data-note-row]').first();
const titleTop = (page: Page) =>
  page.evaluate(() => {
    const link = document.querySelector('[data-note-row] h3 a');
    return link ? Math.round(link.getBoundingClientRect().top + window.scrollY) : -1;
  });

test('every row has the category chip first and at most three chips', async ({ page }) => {
  await page.goto('/notes/');
  const rows = page.locator('[data-note-row]');
  expect(await rows.count()).toBeGreaterThan(0);
  for (const row of await rows.all()) {
    const chips = row.locator('a:not(h3 a)');
    const count = await chips.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(3);
    const category = ((await row.getAttribute('data-tags')) ?? '').split('|')[0];
    expect((await chips.first().innerText()).trim().toLowerCase()).toBe(category);
  }
});

test('the title comes first in the row and the chips follow in the tab order', async ({ page }) => {
  await page.goto('/notes/');
  const links = firstRow(page).locator('a');
  expect(await links.count()).toBeGreaterThan(1);
  expect(await links.first().evaluate((a) => a.closest('h3') !== null)).toBe(true);
  await links.first().focus();
  await page.keyboard.press('Tab');
  expect(await links.nth(1).evaluate((a) => a === document.activeElement)).toBe(true);
});

for (const width of [1280, 390] as const) {
  test(`the date and the reading time share one mono line under the title at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/notes/');
    const row = firstRow(page);
    const time = row.locator('time');
    const meta = time.locator('..');
    const reading = meta.locator('span').filter({ hasText: /\d/ }).first();
    const [title, dateBox, readingBox] = await Promise.all([
      row.locator('h3 a').boundingBox(),
      time.boundingBox(),
      reading.boundingBox(),
    ]);
    if (!title || !dateBox || !readingBox) throw new Error('missing box');
    expect(Math.abs(dateBox.y - readingBox.y)).toBeLessThanOrEqual(2);
    expect(readingBox.x).toBeGreaterThan(dateBox.x + dateBox.width);
    // Directly under the title: below it, within one line of space.
    expect(dateBox.y).toBeGreaterThanOrEqual(title.y + title.height - 1);
    expect(dateBox.y - (title.y + title.height)).toBeLessThanOrEqual(24);
    expect(dateBox.x).toBeLessThanOrEqual(title.x + 1);
    expect(await meta.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/mono/i);
    // Separate spans with a gap, never one joined string.
    expect(await meta.innerText()).not.toMatch(/[·—–]/);
  });
}

test('there is no right-hand meta column: two grid tracks and the whole row opens the note', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/notes/');
  const row = firstRow(page);
  expect(
    await row.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
  ).toBe(2);
  const href = await row.locator('h3 a').getAttribute('href');
  const box = await row.boundingBox();
  if (!box || !href) throw new Error('row has no box or link');
  // The empty area at the right of the row, far from the title and the chips.
  await page.mouse.click(box.x + box.width - 12, box.y + 10);
  await expect(page).toHaveURL(new RegExp(`${href}$`));
});

test('search and tag filtering keep working on the lean rows', async ({ page }) => {
  await page.goto('/notes/');
  const total = await page.locator('[data-note-row]').count();
  await page.locator('[data-notes-search]').fill('es next');
  await expect(page.locator('[data-note-row]:visible')).toHaveCount(1);
  await page.locator('[data-notes-search]').fill('');
  await expect(page.locator('[data-note-row]:visible')).toHaveCount(total);
  for (const tags of await page
    .locator('[data-note-row]')
    .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset['tags'] ?? ''))) {
    expect(tags.split('|').length).toBeGreaterThan(0);
  }
});

test('the continue label sits in the number column of a row with stored progress', async ({
  page,
}) => {
  test.skip(!has({ flags: ['readingProgress'] }), 'needs features.readingProgress');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() =>
    localStorage.setItem('progress:smoke-es', JSON.stringify({ p: 0.4, t: 1 })),
  );
  await page.goto('/notes/', { waitUntil: 'load' });
  const label = page.locator('[data-slug="smoke-es"] [data-progress-label]');
  await expect(label).toBeVisible();
  await expect(label).toHaveText(text('es', 'reading.continue'));
  // The label stays in the meta line of the markup but is lifted under the number (notes-index.css),
  // so it never moves the meta line: it ends before the title column and starts below the number.
  const title = await page.locator('[data-slug="smoke-es"] h3 a').boundingBox();
  const number = await page.locator('[data-slug="smoke-es"] .ni-num').boundingBox();
  const labelBox = await label.boundingBox();
  expect((labelBox?.x ?? 0) + (labelBox?.width ?? 0)).toBeLessThanOrEqual(title?.x ?? 0);
  expect(labelBox?.y ?? 0).toBeGreaterThanOrEqual((number?.y ?? 0) + (number?.height ?? 0));
});

test('the start-here strip keeps its heading and shows only numbers and titles', async ({
  page,
}) => {
  await page.goto('/notes/');
  const heading = page.getByRole('heading', { level: 2, name: text('es', 'notes.startHere') });
  await expect(heading).toBeVisible();
  const strip = page.locator('section', { has: heading });
  const links = strip.getByRole('link');
  const count = await links.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(3);
  const titles = await page.locator('[data-note-row] h3 a').allInnerTexts();
  const names: string[] = [];
  for (const link of await links.all()) {
    const label = (await link.innerText()).replace(/\s+/g, ' ').trim();
    const match = /^(\d{3}) (.+)$/.exec(label);
    expect(match).not.toBeNull();
    expect(titles).toContain(match?.[2] ?? '');
    names.push(label);
  }
  expect(new Set(names).size).toBe(names.length);
  // No excerpt, reading time or reason: the strip holds nothing but the heading and the links.
  const body = (await strip.innerText()).replace(/\s+/g, ' ').trim();
  const expected = [text('es', 'notes.startHere'), ...names].join(' ');
  expect(body).toBe(expected);
  await expect(strip.locator('p')).toHaveCount(0);
});

for (const width of [1280, 390] as const) {
  test(`the first row title starts high on the page at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/notes/');
    const top = await titleTop(page);
    expect(top).toBeGreaterThan(0);
    expect(top).toBeLessThanOrEqual(CEILING[width]);
    expect(BEFORE[width] - top).toBeGreaterThan(0);
  });
}

for (const width of [360, 390]) {
  test(`the index has no sideways scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/notes/', { waitUntil: 'load' });
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });
}

for (const theme of [themes.dark, themes.light]) {
  test(`/notes/ has no axe violations (${theme})`, async ({ page }) => {
    await seedTheme(page, theme);
    await page.goto('/notes/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(firstRow(page)).toBeVisible();
    const { violations } = await scan(page);
    expect(describeViolations(violations)).toEqual([]);
  });
}

// The badge slot follows the appearance preset; the meta line works with either.
test('the language badge keeps its slot', async ({ page }) => {
  await page.goto('/notes/');
  const badge = firstRow(page).locator('span.uppercase');
  await expect(badge).toHaveCount(1);
  if (profile.appearance === 'minimal') {
    const inMeta = await badge.evaluate((el) => el.parentElement?.querySelector('time') !== null);
    expect(inMeta).toBe(false);
  }
});
