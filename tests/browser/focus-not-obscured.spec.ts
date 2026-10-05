import { expect, type Page, test } from '@playwright/test';

/**
 * WCAG 2.2 "Focus Not Obscured": the header is sticky, so moving focus up the page (Shift+Tab) must
 * not leave the focused element under it. Measured on production before the fix: the browser scrolled
 * a focused element to the viewport edge, under the 72 px header, on almost every page.
 */
const PAGES = ['/', '/contact/', '/privacy/', '/notes/'];
const STOPS = 80;

/** What covers the focused element at its top edge, or '' when nothing does. */
const coveredBy = (page: Page): Promise<string> =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return '';
    const chrome = document.querySelector('[data-site-chrome]');
    if (chrome?.contains(el)) return '';
    const rect = el.getBoundingClientRect();
    if (rect.height === 0 || rect.bottom <= 0 || rect.top >= innerHeight) return '';
    const x = Math.min(Math.max(rect.left + rect.width / 2, 1), innerWidth - 1);
    const y = Math.min(Math.max(rect.top + Math.min(rect.height / 2, 10), 1), innerHeight - 1);
    const top = document.elementFromPoint(x, y);
    if (!top || top === el || el.contains(top) || top.contains(el)) return '';
    const name = el.getAttribute('href') ?? el.getAttribute('name') ?? el.tagName.toLowerCase();
    return `${name} (top ${Math.round(rect.top)}px) is covered by ${top.tagName.toLowerCase()}`;
  });

for (const path of PAGES) {
  test(`${path}: Shift+Tab never leaves the focused element under the sticky header`, async ({
    page,
  }) => {
    await page.goto(path);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.evaluate(() => document.body.focus());

    const hidden: string[] = [];
    for (let stop = 0; stop < STOPS; stop++) {
      await page.keyboard.press('Shift+Tab');
      const covered = await coveredBy(page);
      if (covered) hidden.push(covered);
    }
    expect(hidden).toEqual([]);
  });
}
