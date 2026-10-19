import { expect, test } from '@playwright/test';

import { liveByPath, requires, routeNeeds } from './helpers/features';

/**
 * One meaningful stamp in the banner of the topic pages (DESIGN.md, "Notebook ink system", "Stamps").
 * The headers of Experiments, Education, Changelog and Contact carry none since 2026-10-19: the stamp
 * only repeated the title. Pages that do not opt in (subscribe, privacy, terms) carry none either.
 */
const PAGES = liveByPath([['/notes/tag/pruebas/', 'ÍNDICE']] as const, ([path]) => path);

const WIDTHS = [360, 390, 768, 1280] as const;

for (const [path, text] of PAGES) {
  test(`${path} shows a decorative stamp "${text}" within the stamp limits`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    const stamp = page.locator('[data-banner] [data-stamp]');
    await expect(stamp).toHaveCount(1);
    await expect(stamp).toBeVisible();
    await expect(stamp).toHaveAttribute('aria-hidden', 'true');
    await expect(stamp).toHaveText(text);
    expect(text.length).toBeLessThanOrEqual(12);
    expect(text.split(/\s+/).length).toBeLessThanOrEqual(2);
    const css = await stamp.evaluate((el) => {
      const s = getComputedStyle(el);
      return { family: s.fontFamily, weight: s.fontWeight, size: parseFloat(s.fontSize) };
    });
    expect(css.family).toMatch(/JetBrains Mono|monospace/i);
    expect(Number(css.weight)).toBe(600);
    expect(css.size).toBeGreaterThanOrEqual(13);
  });

  for (const width of WIDTHS) {
    test(`${path} at ${width}px: the stamp never touches the title or the description`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const boxes = await page.evaluate(() => {
        const rect = (el: Element | null) => {
          const r = el?.getBoundingClientRect();
          return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
        };
        const stamp = document.querySelector('[data-banner] [data-stamp]');
        const title = document.querySelector('[data-banner] h1');
        const description = document.querySelector('[data-banner] h1 ~ p, [data-banner] h1 + p');
        return {
          stamp: rect(stamp),
          title: rect(title),
          description: rect(description),
          // The text itself, not the block: the h1 box stretches to the container width.
          titleText: title
            ? (() => {
                const range = document.createRange();
                range.selectNodeContents(title);
                const r = range.getBoundingClientRect();
                return { x: r.x, y: r.y, w: r.width, h: r.height };
              })()
            : null,
          doc: document.documentElement.scrollWidth,
        };
      });
      const hit = (
        a: { x: number; y: number; w: number; h: number },
        b: { x: number; y: number; w: number; h: number },
      ) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      expect(boxes.stamp).not.toBeNull();
      expect(boxes.titleText).not.toBeNull();
      if (!boxes.stamp || !boxes.titleText) return;
      expect(hit(boxes.stamp, boxes.titleText)).toBe(false);
      if (boxes.description) expect(hit(boxes.stamp, boxes.description)).toBe(false);
      // From tablet up the stamp hangs at the top-right of the header, under the floating navbar:
      // it must leave air below the navbar, never touch it.
      if (width >= 768) {
        const gap = await page.evaluate(() => {
          const stamp = document.querySelector('[data-banner] [data-stamp]');
          const nav = document.querySelector('[data-navbar]');
          if (!stamp || !nav) return null;
          return stamp.getBoundingClientRect().top - nav.getBoundingClientRect().bottom;
        });
        expect(gap).not.toBeNull();
        expect(gap ?? 0).toBeGreaterThanOrEqual(14);
      }
      // On phones the stamp sits above the title: leave air between its rotated box and the text.
      if (width < 768) {
        expect(boxes.titleText.y - (boxes.stamp.y + boxes.stamp.h)).toBeGreaterThanOrEqual(14);
      }
      expect(boxes.stamp.x).toBeGreaterThanOrEqual(0);
      expect(boxes.stamp.x + boxes.stamp.w).toBeLessThanOrEqual(width);
      expect(boxes.doc).toBeLessThanOrEqual(width);
    });
  }
}

test('the stamp is rotated 5 to 8 degrees and framed', async ({ page }) => {
  requires(routeNeeds('/notes/tag/pruebas/'));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/notes/tag/pruebas/');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const info = await page.locator('[data-banner] [data-stamp]').evaluate((el) => {
    const s = getComputedStyle(el);
    const [a = 1, b = 0] = s.transform
      .replace(/matrix\(|\)/g, '')
      .split(',')
      .map(Number);
    return { border: s.borderTopWidth, deg: (Math.atan2(b, a) * 180) / Math.PI };
  });
  expect(parseFloat(info.border)).toBeGreaterThan(0);
  expect(Math.abs(info.deg)).toBeGreaterThanOrEqual(5);
  expect(Math.abs(info.deg)).toBeLessThanOrEqual(8);
});

for (const path of [
  '/subscribe/',
  '/privacy/',
  '/terms/',
  '/en/privacy/',
  '/en/terms/',
  '/experiments/',
  '/education/',
  '/changelog/',
  '/contact/',
]) {
  test(`${path} has no stamp`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('[data-stamp]')).toHaveCount(0);
  });
}
