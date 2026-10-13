import { expect, test } from '@playwright/test';

import { liveByPath } from './helpers/features';

// With reduced motion every animation stops, and that includes the wait before it: a running entrance
// with `animation-delay` would otherwise sit offset and transparent for 100 to 250 ms and then jump,
// which is still motion, and it makes a measurement taken in that window disagree with one taken
// after. Only animations that actually run count: a declared delay on `animation: none` does nothing.
const PAGES = liveByPath(['/', '/me/', '/privacy/', '/notes/', '/contact/'], (path) => path);

for (const path of PAGES) {
  test(`${path}: nothing waits for an entrance delay when motion is reduced`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    const delayed = await page.evaluate(() =>
      [...document.querySelectorAll('*')]
        .filter((element) => {
          const style = getComputedStyle(element);
          return (
            style.animationName !== 'none' &&
            style.animationDelay.split(',').some((delay) => Number.parseFloat(delay) > 0)
          );
        })
        .map(
          (element) =>
            `${element.tagName.toLowerCase()}.${String(element.className).split(/\s+/)[0]}`,
        ),
    );
    expect(delayed).toEqual([]);
  });

  test(`${path}: elements that fade in are in place at once when motion is reduced`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const waiting = await page.evaluate(() =>
      [...document.querySelectorAll('.animate-fade-in-up, [class*="animate-fade-in-up"]')]
        .filter((element) => {
          const style = getComputedStyle(element);
          return Number.parseFloat(style.opacity) < 1 || style.transform !== 'none';
        })
        .map(
          (element) =>
            `${element.tagName.toLowerCase()}.${String(element.className).split(/\s+/)[0]}`,
        ),
    );
    expect(waiting).toEqual([]);
  });
}
