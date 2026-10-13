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
  url?: string;
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

  test(`${path} gives every entry with an image exactly one viewer link, and none to the others`, async ({
    page,
  }) => {
    await page.goto(path);
    for (const entry of credentials) {
      const links = page.locator(`#${entry.id} [data-ed-open]`);
      await expect(links).toHaveCount(entry.image ? 1 : 0);
      if (entry.image) {
        await expect(links).toHaveAttribute('href', /\.webp$/);
        const box = await links.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test(`${path} opens the document in a dialog, closes it with Esc, the button and the backdrop`, async ({
    page,
  }) => {
    test.skip(!credentials.some((entry) => entry.image), 'no entry has an image');
    await page.goto(path);
    const trigger = page.locator('[data-ed-open]').first();
    const dialog = page.locator('dialog[data-ed-viewer]');
    await expect(dialog).not.toHaveAttribute('open', /.*/);
    const href = await trigger.getAttribute('href');
    const alt = await trigger.locator('img').getAttribute('alt');

    await trigger.click();
    await expect(dialog).toHaveAttribute('open', '');
    const full = dialog.locator('img');
    await expect(full).toHaveAttribute('src', /\.webp$/);
    expect(new URL((await full.getAttribute('src')) ?? '', page.url()).href).toBe(
      new URL(href ?? '', page.url()).href,
    );
    await expect(full).toHaveAttribute('alt', alt ?? '');
    await expect(dialog).toHaveAccessibleName(text(locale, 'education.viewer.label'));

    await page.keyboard.press('Escape');
    await expect(dialog).not.toHaveAttribute('open', /.*/);
    await expect(trigger).toBeFocused();

    await trigger.click();
    const close = dialog.getByRole('button', { name: text(locale, 'education.viewer.close') });
    const box = await close.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await close.click();
    await expect(dialog).not.toHaveAttribute('open', /.*/);
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(dialog).toHaveAttribute('open', '');
    await page.mouse.click(4, 4);
    await expect(dialog).not.toHaveAttribute('open', /.*/);
  });

  for (const theme of [themes.dark, themes.light]) {
    test(`${path} has no axe violations with the viewer open (${theme})`, async ({ page }) => {
      test.skip(!credentials.some((entry) => entry.image), 'no entry has an image');
      await seedTheme(page, theme);
      await page.goto(path);
      await page.locator('[data-ed-open]').first().click();
      await expect(page.locator('dialog[data-ed-viewer]')).toHaveAttribute('open', '');
      const { violations } = await scan(page);
      expect(describeViolations(violations)).toEqual([]);
    });
  }

  test(`${path} keeps the text block beside a 20rem document from 768px and the phone order below`, async ({
    page,
  }) => {
    const entry = credentials.find((candidate) => candidate.image) ?? credentials[0];
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    const item = page.locator(`#${entry?.id}`);
    const body = await item.locator('.ed-body').boundingBox();
    const doc = await item.locator('.ed-figure, .ed-cover').boundingBox();
    expect(doc?.width).toBeLessThanOrEqual(321);
    expect(body && doc && body.x + body.width <= doc.x + 1).toBe(true);
    await page.setViewportSize({ width: 390, height: 900 });
    const order = await item.evaluate((node) => {
      const top = (selector: string) =>
        node.querySelector(selector)?.getBoundingClientRect().top ?? -1;
      return [top('.ed-meta'), top('.ed-title'), top('.ed-issuer'), top('.ed-figure, .ed-cover')];
    });
    expect(order).toEqual([...order].sort((a, b) => a - b));
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

test('without JavaScript the document link opens the full image', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    ...(baseURL ? { baseURL } : {}),
  });
  const page = await context.newPage();
  await page.goto('/education/');
  const links = page.locator('[data-ed-open]');
  expect(await links.count()).toBe(credentials.filter((entry) => entry.image).length);
  for (const href of await links.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href')))) {
    expect(href).toMatch(/\.webp$/);
  }
  await context.close();
});

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

// Pixel details of the buttons (E6): glyphs, stepped corners and motion that exists only without
// `prefers-reduced-motion`.
const withImage = credentials.find((entry) => entry.image);
const withLearnings = credentials.find((entry) => entry.learnings?.length);
const withUrl = credentials.find((entry) => entry.url);

const box = async (locator: ReturnType<Page['locator']>) => {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error('element has no box');
  return rect;
};

const outlineStyle = (locator: ReturnType<Page['locator']>) =>
  locator.evaluate((node) => {
    const style = getComputedStyle(node);
    return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
  });

for (const { path, locale } of PAGES) {
  test(`${path} close button has a pixel glyph, a text label and a 44px target`, async ({
    page,
  }) => {
    test.skip(!withImage, 'no entry has an image');
    await page.goto(path);
    await page.locator('[data-ed-open]').first().click();
    const close = page.locator('dialog[data-ed-viewer]').getByRole('button', {
      name: text(locale, 'education.viewer.close'),
    });
    const glyph = close.locator('svg[aria-hidden="true"]');
    await expect(glyph).toHaveCount(1);
    await expect(glyph).toHaveAttribute('shape-rendering', 'crispEdges');
    await expect(close).toContainText(text(locale, 'education.viewer.close'));
    const rect = await box(close);
    expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(rect.height).toBeGreaterThanOrEqual(44);
    expect(await close.evaluate((node) => getComputedStyle(node).clipPath)).toContain('polygon');
  });

  test(`${path} hovering the buttons, thumbnail, verify link and disclosure shifts no layout`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    const targets: ReturnType<Page['locator']>[] = [
      page.locator('.lk-sort-option:not([aria-current="true"])').first(),
    ];
    if (withImage) targets.push(page.locator(`#${withImage.id} .ed-doc`));
    if (withUrl) targets.push(page.locator(`#${withUrl.id} .ed-verify`));
    if (withLearnings) targets.push(page.locator(`#${withLearnings.id} .ed-learned summary`));
    for (const target of targets) {
      await target.scrollIntoViewIfNeeded();
      const before = await box(target);
      const around = await page.evaluate(() => document.documentElement.scrollHeight);
      await target.hover();
      await page.waitForTimeout(400);
      const after = await box(target);
      expect(after.width).toBeCloseTo(before.width, 0);
      expect(after.height).toBeCloseTo(before.height, 0);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(around);
    }
    if (withImage) {
      await page.locator('[data-ed-open]').first().click();
      const close = page.locator('dialog[data-ed-viewer] button');
      const before = await box(close);
      await close.hover();
      await page.waitForTimeout(400);
      const after = await box(close);
      expect(after.width).toBeCloseTo(before.width, 0);
      expect(after.height).toBeCloseTo(before.height, 0);
    }
  });

  test(`${path} thumbnail shows pixel brackets on hover and a visible focus ring`, async ({
    page,
  }) => {
    test.skip(!withImage, 'no entry has an image');
    await page.goto(path);
    const doc = page.locator(`#${withImage?.id} .ed-doc`);
    const opacity = () =>
      doc.evaluate((node) => getComputedStyle(node, '::after').opacity as string);
    expect(await opacity()).toBe('0');
    await doc.hover();
    await expect.poll(opacity).toBe('1');
    await page.mouse.move(0, 0);
    await page.keyboard.press('Shift');
    await doc.focus();
    expect((await outlineStyle(doc)).style).not.toBe('none');
    await expect.poll(opacity).toBe('1');
  });

  test(`${path} verify link keeps its underline and shows one pixel arrow`, async ({ page }) => {
    test.skip(!withUrl, 'no entry has a verification link');
    await page.goto(path);
    const link = page.locator(`#${withUrl?.id} .ed-verify`);
    await expect(link.locator('svg[aria-hidden="true"]')).toHaveCount(1);
    expect(await link.evaluate((node) => getComputedStyle(node).textDecorationLine)).toContain(
      'underline',
    );
    const rect = await box(link);
    expect(rect.height).toBeGreaterThanOrEqual(44);
    await page.keyboard.press('Shift');
    await link.focus();
    expect((await outlineStyle(link)).style).not.toBe('none');
  });

  test(`${path} disclosure and sort options are 44px targets with a visible focus ring`, async ({
    page,
  }) => {
    await page.goto(path);
    await page.keyboard.press('Shift');
    const options = page.locator('.lk-sort-option');
    const count = await options.count();
    for (let index = 0; index < count; index += 1) {
      const option = options.nth(index);
      expect((await box(option)).height).toBeGreaterThanOrEqual(44);
      await option.focus();
      expect((await outlineStyle(option)).style).not.toBe('none');
    }
    if (count > 0) {
      expect(await options.first().evaluate((node) => getComputedStyle(node).clipPath)).toContain(
        'polygon',
      );
    }
    if (withLearnings) {
      const summary = page.locator(`#${withLearnings.id} .ed-learned summary`);
      expect((await box(summary)).height).toBeGreaterThanOrEqual(44);
      await summary.focus();
      expect((await outlineStyle(summary)).style).not.toBe('none');
    }
  });

  test(`${path} close button shows a visible focus ring`, async ({ page }) => {
    test.skip(!withImage, 'no entry has an image');
    await page.goto(path);
    await page.locator('[data-ed-open]').first().click();
    await page.keyboard.press('Shift');
    const close = page.locator('dialog[data-ed-viewer] button');
    await close.focus();
    const ring = await outlineStyle(close);
    expect(ring.style).not.toBe('none');
    expect(ring.width).toBeGreaterThanOrEqual(2);
  });

  test.describe(`${path} with reduced motion`, () => {
    test.use({ reducedMotion: 'reduce' });

    test('nothing in the buttons, the dialog or the sort switch animates', async ({ page }) => {
      await page.goto(path);
      const motion = (selector: string) =>
        page
          .locator(selector)
          .first()
          .evaluate((node) => {
            const style = getComputedStyle(node);
            // The site-wide reduced-motion reset may leave 1e-05s instead of 0s: both mean no motion.
            const seconds = Number.parseFloat(style.transitionDuration);
            return {
              duration: seconds <= 0.001 ? '0s' : style.transitionDuration,
              animation: style.animationName,
            };
          });
      const sort = await motion('.lk-sort-option');
      expect(sort).toEqual({ duration: '0s', animation: 'none' });
      if (!withImage) return;
      await page.locator('[data-ed-open]').first().click();
      for (const selector of [
        'dialog[data-ed-viewer]',
        'dialog[data-ed-viewer] button',
        'dialog[data-ed-viewer] button svg',
      ]) {
        expect(await motion(selector), selector).toEqual({ duration: '0s', animation: 'none' });
      }
      const backdrop = await page
        .locator('dialog[data-ed-viewer]')
        .evaluate((node) => getComputedStyle(node, '::backdrop').animationName);
      expect(backdrop).toBe('none');
    });
  });

  test.describe(`${path} with motion allowed`, () => {
    test.use({ reducedMotion: 'no-preference' });

    test('the dialog opens with a stepped dissolve', async ({ page }) => {
      test.skip(!withImage, 'no entry has an image');
      await page.goto(path);
      await page.locator('[data-ed-open]').first().click();
      const dialog = page.locator('dialog[data-ed-viewer]');
      expect(await dialog.evaluate((node) => getComputedStyle(node).animationName)).toBe('ed-pop');
      expect(
        await dialog.evaluate((node) => getComputedStyle(node).animationTimingFunction),
      ).toMatch(/^steps\(4/);
    });
  });
}
