import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const NOTES = [
  { path: '/notes/smoke-es/', toggle: 'Modo lectura', exit: 'Salir del modo lectura' },
  { path: '/en/notes/smoke-en/', toggle: 'Reading mode', exit: 'Exit reading mode' },
] as const;

const toggleOf = (page: Page) => page.locator('[data-reading-toggle]');
const isReading = (page: Page) =>
  page.evaluate(() => document.documentElement.hasAttribute('data-reading'));

for (const { path, toggle, exit } of NOTES) {
  test.describe(`${path} reading mode`, () => {
    test('is off by default and offers a labelled toggle', async ({ page }) => {
      await page.goto(path);
      await expect(toggleOf(page)).toBeVisible();
      await expect(toggleOf(page)).toHaveAccessibleName(toggle);
      await expect(toggleOf(page)).toHaveAttribute('aria-pressed', 'false');
      expect(await isReading(page)).toBe(false);
      await expect(page.locator('[data-site-notice]')).toBeVisible();
      await expect(page.locator('[data-banner] canvas')).toHaveCount(1);
    });

    test('removes the noise, keeps the content and survives a reload', async ({ page }) => {
      await page.goto(path);
      await toggleOf(page).click();
      expect(await isReading(page)).toBe(true);
      await expect(toggleOf(page)).toHaveAttribute('aria-pressed', 'true');

      await expect(page.locator('[data-site-notice]')).toBeHidden();
      await expect(page.locator('[data-banner] canvas')).toBeHidden();
      await expect(page.locator('[data-banner] .banner-grid')).toBeHidden();
      await expect(page.locator('main aside')).toBeHidden();
      await expect(page.locator('[data-article]')).toHaveCSS(
        'background-color',
        'rgba(0, 0, 0, 0)',
      );
      // What the reader came for stays: title, body, comments and prev/next.
      await expect(page.locator('[data-banner] h1')).toBeVisible();
      await expect(page.locator('.prose')).toBeVisible();
      await expect(page.locator('[data-comments]')).toHaveCount(1);

      await page.reload();
      expect(await isReading(page)).toBe(true);
      await expect(toggleOf(page)).toHaveAttribute('aria-pressed', 'true');
    });

    test('can be left from the toggle or the floating exit button', async ({ page }) => {
      await page.goto(path);
      const floatingExit = page.getByRole('button', { name: exit });
      await expect(floatingExit).toBeHidden();

      await toggleOf(page).click();
      await expect(floatingExit).toBeVisible();
      await floatingExit.click();
      expect(await isReading(page)).toBe(false);
      await expect(toggleOf(page)).toHaveAttribute('aria-pressed', 'false');
      await expect(page.locator('[data-site-notice]')).toBeVisible();

      await toggleOf(page).click();
      await toggleOf(page).click();
      expect(await isReading(page)).toBe(false);
      await page.reload();
      expect(await isReading(page)).toBe(false);
    });

    test('makes the text larger, in one calm column inside the screen', async ({ page }) => {
      await page.goto(path);
      const width = () =>
        page.locator('.prose').evaluate((node) => node.getBoundingClientRect().width);
      await toggleOf(page).click();
      // The site animates style changes, so wait for the new value instead of reading it at once.
      await expect(page.locator('.prose')).toHaveCSS('font-size', '19px');
      // One calm column: never wider than 760 px minus the gutters (narrower than the page measure
      // on desktop on purpose; phones get more room, covered by its own test).
      await expect.poll(width).toBeLessThanOrEqual(720);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow).toBe(false);
    });

    for (const theme of ['elvinlab-dark', 'elvinlab-light']) {
      test(`has no axe violations in reading mode (${theme})`, async ({ page }) => {
        await page.addInitScript((t) => {
          localStorage.setItem('theme', t);
          localStorage.setItem('reading-mode', '1');
        }, theme);
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('data-reading', '');
        const result = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();
        expect(result.violations.map((violation) => violation.id)).toEqual([]);
      });
    }
  });
}

test('gives a phone a single, wider text column in reading mode', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/notes/smoke-es/');
  const width = () => page.locator('.prose').evaluate((node) => node.getBoundingClientRect().width);
  const normal = await width();
  await toggleOf(page).click();
  await expect.poll(width).toBeGreaterThan(normal + 20);
});

test('only notes offer a reading mode', async ({ page }) => {
  for (const path of ['/', '/notes/', '/privacy/', '/contact/']) {
    await page.goto(path);
    await expect(toggleOf(page)).toHaveCount(0);
    expect(await isReading(page)).toBe(false);
  }
});

test('a stored reading mode does not leak to other pages', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('reading-mode', '1'));
  await page.goto('/');
  expect(await isReading(page)).toBe(false);
  await expect(page.locator('[data-site-notice]')).toBeVisible();
});

test('pauses the background effect while reading and restores it afterwards', async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const inlineDisplay = () =>
    page.locator('[data-background]').evaluate((node) => (node as HTMLElement).style.display);

  await page.goto('/notes/smoke-es/');
  await expect(page.locator('[data-background]')).toBeVisible();
  expect(await inlineDisplay()).toBe('');

  await toggleOf(page).click();
  // `style.display` is only ever set by the effect runner: the effect itself was stopped.
  expect(await inlineDisplay()).toBe('none');

  await page.getByRole('button', { name: 'Salir del modo lectura' }).click();
  expect(await inlineDisplay()).toBe('');
  await expect(page.locator('[data-background]')).toBeVisible();
  // Reading mode never overwrites the visitor's chosen background.
  expect(await page.evaluate(() => localStorage.getItem('background'))).toBeNull();
  await context.close();
});

test('does not start the background effect when the page opens in reading mode', async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('reading-mode', '1'));
  await page.goto('/notes/smoke-es/');
  const display = await page
    .locator('[data-background]')
    .evaluate((node) => (node as HTMLElement).style.display);
  expect(display).toBe('none');
  await context.close();
});
