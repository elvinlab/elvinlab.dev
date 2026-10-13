import { expect, type Page, test } from '@playwright/test';

import { liveByPath, requires } from './helpers/features';
import { stubThirdParties } from './helpers/third-party';

requires({ flags: ['backToTop'], routes: ['notes'] });

const PAGES = liveByPath(['/', '/notes/smoke-es/'], (path) => path);
const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  // A short small phone: the footer leaves little or no room below the navbar.
  { width: 320, height: 568 },
];

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
  await stubThirdParties(page);
});

const button = (page: Page) => page.locator('[data-back-to-top]');

const scrollTo = async (page: Page, top: number): Promise<void> => {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
};

const settle = async (page: Page): Promise<void> => {
  let previous = -1;
  for (let i = 0; i < 40; i += 1) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    if (height === previous) return;
    previous = height;
    await page.waitForTimeout(250);
  }
};

/** Everything the shown button must stay clear of: the navbar box and every visible focusable element. */
const collisions = (page: Page) =>
  page.evaluate(() => {
    const own = document.querySelector('[data-back-to-top]');
    if (!own) return ['missing button'];
    const a = own.getBoundingClientRect();
    const hit = (b: DOMRect): boolean =>
      a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const found: string[] = [];
    const bar = document.querySelector('[data-navbar]')?.getBoundingClientRect();
    if (bar && hit(bar)) found.push(`navbar box (bottom ${bar.bottom}, button top ${a.top})`);
    const focusable =
      'a[href], button, input, select, textarea, summary, iframe, [tabindex]:not([tabindex="-1"])';
    for (const el of document.querySelectorAll<HTMLElement>(focusable)) {
      if (el === own || own.contains(el)) continue;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      if (getComputedStyle(el).visibility === 'hidden' || el.closest('[inert], [hidden]')) continue;
      if (hit(b))
        found.push(`${el.tagName.toLowerCase()} ${el.textContent?.trim().slice(0, 30) ?? ''}`);
    }
    return found;
  });

for (const viewport of VIEWPORTS) {
  for (const path of PAGES) {
    test(`never overlaps the navbar or a control at the bottom of ${path} at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(path);
      await settle(page);
      await button(page).evaluate((el) => {
        (el as HTMLElement).dataset['idleMs'] = '600000';
      });
      const max = await page.evaluate(
        () => document.documentElement.scrollHeight - window.innerHeight,
      );
      for (const up of [8, 40, 150]) {
        // Deep, then a little up: the gesture that reveals the button and the navbar.
        await scrollTo(page, max);
        await scrollTo(page, max - up);
        const shown = await button(page).evaluate((el) => el.hasAttribute('data-shown'));
        if (shown) {
          await expect(button(page), `${up} px above the bottom`).toHaveJSProperty('inert', false);
          expect(await collisions(page), `${up} px above the bottom`).toEqual([]);
        } else {
          // No room to avoid both the bar and the footer: hidden, unreachable and not announced.
          await expect(button(page)).toHaveJSProperty('inert', true);
          await expect(button(page)).toHaveAttribute('aria-hidden', 'true');
        }
      }
    });
  }
}

test('is hidden, not overlapping, when the footer leaves no room below the navbar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/notes/smoke-es/');
  await settle(page);
  const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  await scrollTo(page, max);
  await scrollTo(page, max - 8);
  const footerHeight = await page.evaluate(
    () => document.querySelector('[data-site-footer]')?.getBoundingClientRect().height ?? 0,
  );
  // top of a footer-clearing button = viewport - 16 - lift - 44, lift = footer on screen (about 8 px less than its height).
  const topIfLifted = 568 - 16 - (footerHeight - 8) - 44;
  const barBottom = await page.evaluate(
    () => document.querySelector<HTMLElement>('[data-navbar]')?.offsetHeight ?? 0,
  );
  test.skip(topIfLifted >= barBottom + 8, 'the footer is short enough here: the button fits');
  await expect(button(page)).toHaveAttribute('aria-hidden', 'true');
  await expect(button(page)).toBeHidden();
});
