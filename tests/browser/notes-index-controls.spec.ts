import { expect, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { has, requires, seedTheme } from './helpers/features';
import { text, themes, tokenRgb } from './helpers/site';
import { stubThirdParties } from './helpers/third-party';

requires({ routes: ['notes'] });

/**
 * Read marks and pixel controls of the notes index (DESIGN.md, "Notes index"): a read note shows a
 * pixel check and its label in the primary color, a note in progress a half-filled marker, with no
 * layout shift when the labels script fills in; chips and the search field have notched corners and
 * stepped motion; the search shows a live result count and an empty state with a clear button.
 * Each test sets its own viewport.
 */
test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
  await stubThirdParties(page);
});

const READ = 'smoke-es';
const PARTIAL = 'smoke-es-next';

const store = (page: Page, slug: string, p: number) =>
  page.addInitScript(
    ([key, value]) => localStorage.setItem(key as string, value as string),
    [`progress:${slug}`, JSON.stringify({ p, t: 1 })],
  );

const rowHeights = (page: Page) =>
  page
    .locator('[data-note-row]')
    .evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height));

const search = (page: Page) => page.locator('[data-notes-search]');
const count = (page: Page) => page.locator('[data-notes-count]');
const visibleRows = (page: Page) => page.locator('[data-note-row]:visible');
const countText = (n: number) =>
  text('es', n === 1 ? 'notes.results.one' : 'notes.results.other', { count: n });

/** Seconds of the longest transition on an element or one of its pseudo-elements. */
const longestTransition = (page: Page, selector: string, pseudo?: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((node, which) => {
      const raw = getComputedStyle(node, which ?? null).transitionDuration;
      return Math.max(...raw.split(',').map((part) => Number.parseFloat(part)));
    }, pseudo);

test.describe('read marks', () => {
  test.skip(!has({ flags: ['readingProgress'] }), 'needs features.readingProgress');

  for (const theme of [themes.dark, themes.light]) {
    test(`a read note shows the check and a primary label, an in-progress one the half marker (${theme})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await seedTheme(page, theme);
      await store(page, READ, 1);
      await store(page, PARTIAL, 0.4);
      await page.goto('/notes/', { waitUntil: 'load' });
      const primary = tokenRgb(theme, 'primary');

      const read = page.locator(`[data-slug="${READ}"]`);
      const readLabel = read.locator('[data-progress-label]');
      await expect(readLabel).toHaveText(text('es', 'reading.read'));
      expect(await readLabel.evaluate((n) => getComputedStyle(n).color)).toBe(primary);
      const check = await read.locator('.ni-num').evaluate((n) => {
        const style = getComputedStyle(n, '::after');
        return { clip: style.clipPath, content: style.content };
      });
      expect(check.content).not.toBe('none');
      expect(check.clip).toContain('polygon');

      const partial = page.locator(`[data-slug="${PARTIAL}"]`);
      const partialLabel = partial.locator('[data-progress-label]');
      await expect(partialLabel).toHaveText(text('es', 'reading.continue'));
      expect(await partialLabel.evaluate((n) => getComputedStyle(n).color)).toBe(primary);
      const half = await partial.locator('.ni-num').evaluate((n) => {
        const style = getComputedStyle(n, '::after');
        return { clip: style.clipPath, content: style.content };
      });
      expect(half.content).not.toBe('none');
      expect(half.clip).toContain('path(');
      expect(half.clip).not.toBe(check.clip);
    });
  }

  test('a note without stored progress shows no mark', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await store(page, READ, 1);
    await page.goto('/notes/', { waitUntil: 'load' });
    const other = page.locator('[data-note-row]:not([data-slug="smoke-es"])').first();
    const content = await other
      .locator('.ni-num')
      .evaluate((n) => getComputedStyle(n, '::after').content);
    expect(content).toBe('none');
    await expect(other.locator('[data-progress-label]')).toBeHidden();
  });

  for (const width of [1280, 390] as const) {
    test(`filling in the labels moves no row at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/notes/', { waitUntil: 'load' });
      const before = await rowHeights(page);
      await page.evaluate(
        ([a, b]) => {
          localStorage.setItem(`progress:${a}`, JSON.stringify({ p: 1, t: 1 }));
          localStorage.setItem(`progress:${b}`, JSON.stringify({ p: 0.4, t: 1 }));
        },
        [READ, PARTIAL],
      );
      await page.reload({ waitUntil: 'load' });
      await expect(page.locator('[data-progress-label]:visible')).toHaveCount(2);
      expect(await rowHeights(page)).toEqual(before);
    });
  }

  test('the whole row still opens the note when it shows a mark', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await store(page, PARTIAL, 0.4);
    await page.goto('/notes/', { waitUntil: 'load' });
    const label = page.locator(`[data-slug="${PARTIAL}"] [data-progress-label]`);
    await expect(label).toBeVisible();
    const box = await label.boundingBox();
    if (!box) throw new Error('label has no box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page).toHaveURL(new RegExp(`/notes/${PARTIAL}/$`));
  });
});

test.describe('pixel controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test('row, sidebar and topic chips have a notched corner and keep their hit area', async ({
    page,
  }) => {
    await page.goto('/notes/');
    const chips = page.locator('a.ni-chip');
    expect(await chips.count()).toBeGreaterThan(0);
    for (const chip of await chips.all()) {
      const clip = await chip.evaluate((n) => getComputedStyle(n, '::before').clipPath);
      expect(clip).toContain('polygon');
      expect(await chip.evaluate((n) => getComputedStyle(n).borderRadius)).toBe('0px');
    }
    await expect(page.locator('aside a.ni-chip').first()).toBeVisible();
  });

  test('the search field is notched until it has focus, then it shows its ring', async ({
    page,
  }) => {
    await page.goto('/notes/');
    const input = search(page);
    expect(await input.evaluate((n) => getComputedStyle(n).clipPath)).toContain('polygon');
    await input.focus();
    const focused = await input.evaluate((n) => {
      const style = getComputedStyle(n);
      return { clip: style.clipPath, outline: style.outlineStyle, width: style.outlineWidth };
    });
    expect(focused.clip).toBe('none');
    expect(focused.outline).not.toBe('none');
    expect(Number.parseFloat(focused.width)).toBeGreaterThanOrEqual(2);
  });

  test('a sidebar chip keeps a visible focus ring', async ({ page }) => {
    await page.goto('/notes/');
    const chip = page.locator('aside a.ni-chip').first();
    await chip.focus();
    expect(await chip.evaluate((n) => n.matches(':focus-visible'))).toBe(true);
    const ring = await chip.evaluate((n) => {
      const style = getComputedStyle(n);
      return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
    });
    expect(ring.style).not.toBe('none');
    expect(ring.width).toBeGreaterThanOrEqual(2);
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('chips and the search field do not animate', async ({ page }) => {
      await page.goto('/notes/');
      expect(await longestTransition(page, 'a.ni-chip')).toBeLessThanOrEqual(0.001);
      expect(await longestTransition(page, 'a.ni-chip', '::before')).toBeLessThanOrEqual(0.001);
      expect(await longestTransition(page, '[data-notes-search]')).toBeLessThanOrEqual(0.001);
    });
  });

  test.describe('with no motion preference', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('chips and the search field move in two steps', async ({ page }) => {
      await page.goto('/notes/');
      for (const [selector, pseudo] of [
        ['a.ni-chip', '::before'],
        ['[data-notes-search]', undefined],
      ] as const) {
        const timing = await page
          .locator(selector)
          .first()
          .evaluate(
            (n, which) => getComputedStyle(n, which ?? null).transitionTimingFunction,
            pseudo,
          );
        expect(timing).toContain('steps(2');
      }
    });
  });
});

test.describe('result count and empty state', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/notes/');
  });

  test('the count sits in a polite live region and follows the visible rows', async ({ page }) => {
    const live = count(page);
    await expect(live).toHaveAttribute('aria-live', 'polite');
    const total = await visibleRows(page).count();
    await expect(live).toHaveText(countText(total));
    await search(page).fill('es next');
    const shown = await visibleRows(page).count();
    expect(shown).toBe(1);
    await expect(live).toHaveText(countText(1));
    await search(page).fill('synthetic');
    const many = await visibleRows(page).count();
    await expect(live).toHaveText(countText(many));
    await search(page).fill('zzzzqq');
    await expect(live).toHaveText(countText(0));
    await search(page).fill('');
    await expect(live).toHaveText(countText(total));
  });

  test('an empty search shows the query, a suggestion and a button that restores the list', async ({
    page,
  }) => {
    const total = await visibleRows(page).count();
    await search(page).fill('zzzzqq');
    const empty = page.locator('[data-notes-empty]');
    await expect(empty).toBeVisible();
    await expect(empty).toContainText('zzzzqq');
    await expect(empty).toContainText(text('es', 'notes.empty.hint'));
    const clear = empty.getByRole('button', { name: text('es', 'notes.filter.clear') });
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(empty).toBeHidden();
    await expect(search(page)).toHaveValue('');
    await expect(search(page)).toBeFocused();
    await expect(visibleRows(page)).toHaveCount(total);
  });

  test('the clear button also drops an unknown tag filter from the URL', async ({ page }) => {
    await page.goto('/notes/?tag=nope');
    const empty = page.locator('[data-notes-empty]');
    await expect(empty).toBeVisible();
    await empty.getByRole('button', { name: text('es', 'notes.filter.clear') }).click();
    await expect(page).toHaveURL(/\/notes\/$/);
    await expect(page.locator('[data-notes-tag-notice]')).toBeHidden();
    await expect(search(page)).toBeFocused();
    expect(await visibleRows(page).count()).toBeGreaterThan(0);
  });

  test('the empty button is a notched pixel control', async ({ page }) => {
    await search(page).fill('zzzzqq');
    const clear = page.locator('[data-notes-empty] button');
    expect(await clear.evaluate((n) => getComputedStyle(n).clipPath)).toContain('polygon');
    const box = await clear.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});

for (const width of [360, 390]) {
  test(`the index has no sideways scroll at ${width}px, with marks and an empty search`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await store(page, READ, 1);
    await store(page, PARTIAL, 0.4);
    await page.goto('/notes/', { waitUntil: 'load' });
    const flat = () =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(await flat()).toBe(true);
    await search(page).fill('zzzzqq');
    await expect(page.locator('[data-notes-empty]')).toBeVisible();
    expect(await flat()).toBe(true);
  });
}

for (const theme of [themes.dark, themes.light]) {
  test(`/notes/ has no axe violations with marks, a result and an empty search (${theme})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await seedTheme(page, theme);
    await store(page, READ, 1);
    await store(page, PARTIAL, 0.4);
    await page.goto('/notes/', { waitUntil: 'load' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    expect(describeViolations((await scan(page)).violations)).toEqual([]);
    await search(page).fill('es next');
    expect(describeViolations((await scan(page)).violations)).toEqual([]);
    await search(page).fill('zzzzqq');
    await expect(page.locator('[data-notes-empty]')).toBeVisible();
    expect(describeViolations((await scan(page)).violations)).toEqual([]);
  });
}

test('the new look stays on the notes index', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const path of ['/', '/notes/smoke-es/']) {
    await page.goto(path);
    expect(await page.locator('.ni-page, .ni-chip, .ni-num').count(), path).toBe(0);
    expect(
      await page.evaluate(() => document.documentElement.innerHTML.includes('--ni-notch')),
      path,
    ).toBe(false);
  }
});
