import { expect, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { has, liveByPath, seedTheme } from './helpers/features';
import { text, themes } from './helpers/site';
import { stubThirdParties } from './helpers/third-party';

const MIN_TARGET = 44;
const BAR_HEIGHT = 72;
/** Same row means the vertical centers of the bar's controls differ by no more than this. */
const ROW_TOLERANCE = 4;

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
  await stubThirdParties(page);
});

const SKIP_PAGES = liveByPath(['/', '/notes/', '/education/'], (path) => path);

test.describe('skip link', () => {
  for (const path of SKIP_PAGES) {
    test(`${path} skips the navbar: focus lands in the content and Tab leaves the navbar behind`, async ({
      page,
    }) => {
      await page.goto(path);
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: text('es', 'skip.content') })).toBeFocused();
      await page.keyboard.press('Enter');
      const inMain = () =>
        page.evaluate(() => {
          const active = document.activeElement;
          const main = document.querySelector('#main');
          return main?.contains(active) === true;
        });
      expect(await inMain()).toBe(true);
      await page.keyboard.press('Tab');
      expect(await inMain()).toBe(true);
      expect(
        await page.evaluate(() => document.activeElement?.closest('[data-navbar]')),
      ).toBeNull();
    });
  }

  test('the header and nav landmarks sit outside main', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main [data-navbar]')).toHaveCount(0);
    await expect(
      page.locator('main nav[aria-label]').filter({ has: page.locator('[data-nav-toggle]') }),
    ).toHaveCount(0);
    await expect(page.locator('body > div > header[data-navbar]')).toHaveCount(1);
  });
});

test.describe('one row on a phone', () => {
  // With motion and a fine pointer the background picker joins the bar (it is hidden otherwise).
  for (const withPicker of [false, true]) {
    for (const width of [320, 360, 390]) {
      for (const path of ['/', '/en/']) {
        test(`${path} keeps the bar at ${BAR_HEIGHT} px on one row at ${width} px${withPicker ? ' with the picker' : ''}`, async ({
          browser,
        }) => {
          test.skip(
            withPicker && !has({ flags: ['backgroundPicker'] }),
            'needs features.backgroundPicker',
          );
          // Five 44 px targets plus the brand need 360 px: a 320 px window with a fine pointer and motion is not a phone.
          test.skip(
            withPicker && width < 360,
            'the picker is hidden on touch screens, where 320 px lives',
          );
          const context = await browser.newContext({
            viewport: { width, height: 800 },
            reducedMotion: withPicker ? 'no-preference' : 'reduce',
          });
          const page = await context.newPage();
          await stubThirdParties(page);
          await page.goto(path);
          const nav = await page.locator('[data-navbar] nav').boundingBox();
          expect(nav?.height).toBe(BAR_HEIGHT);
          // Only the controls this profile has: an adopter who turns the theme button off still gets one row.
          const parts = [
            page.locator('[data-navbar] nav > a').first(),
            page.locator('[data-navbar] nav > a[hreflang]').first(),
            ...(has({ flags: ['themeToggle'] }) ? [page.locator('[data-theme-toggle]')] : []),
            page.locator('[data-nav-toggle]'),
            ...(withPicker ? [page.locator('[data-background-toggle]')] : []),
          ];
          if (!has({ flags: ['themeToggle'] })) {
            await expect(page.locator('[data-theme-toggle]')).toHaveCount(0);
          }
          const centers: number[] = [];
          for (const part of parts) {
            const box = await part.boundingBox();
            expect(box).not.toBeNull();
            expect(box?.height ?? 0).toBeGreaterThanOrEqual(MIN_TARGET);
            expect(box?.width ?? 0).toBeGreaterThanOrEqual(MIN_TARGET - 1);
            centers.push((box?.y ?? 0) + (box?.height ?? 0) / 2);
          }
          expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(ROW_TOLERANCE);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          ).toBe(true);
          await context.close();
        });
      }
    }
  }
});

test('the theme toggle keeps its name and announces the dark theme as pressed', async ({
  page,
}) => {
  test.skip(!has({ flags: ['themeToggle'] }), 'needs features.themeToggle');
  await seedTheme(page, themes.dark);
  await page.goto('/');
  const toggle = page.locator('[data-theme-toggle]');
  const name = text('es', 'theme.switch');
  await expect(toggle).toHaveAttribute('aria-label', name);
  const pressed = async () => (await toggle.getAttribute('aria-pressed')) === 'true';
  const isDark = async () =>
    (await page.locator('html').getAttribute('data-theme')) === themes.dark;
  await expect.poll(async () => (await toggle.getAttribute('aria-pressed')) !== null).toBe(true);
  expect(await pressed()).toBe(await isDark());
  await toggle.click();
  expect(await pressed()).toBe(await isDark());
  expect(await pressed()).toBe(false);
  await expect(toggle).toHaveAttribute('aria-label', name);
  await toggle.click();
  expect(await pressed()).toBe(true);
});

test('the background picker names its current mode and announces the change', async ({
  browser,
}) => {
  test.skip(!has({ flags: ['backgroundPicker'] }), 'needs features.backgroundPicker');
  // Hidden under reduced motion and coarse pointers: run with motion and a fine pointer.
  const context = await browser.newContext({ reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await stubThirdParties(page);
  await page.goto('/');
  const picker = page.locator('[data-background-toggle]');
  const live = page.locator('[data-background-status]');
  const base = text('es', 'background.switch');
  const modes = [
    text('es', 'background.galaxy'),
    text('es', 'background.waves'),
    text('es', 'background.off'),
  ];
  const nameOf = async () => (await picker.getAttribute('aria-label')) ?? '';
  const seen = new Set<string>();
  for (let step = 0; step < modes.length; step += 1) {
    const before = await nameOf();
    expect(before.startsWith(base)).toBe(true);
    expect(modes.filter((mode) => before.includes(mode))).toHaveLength(1);
    seen.add(before);
    await picker.click();
    const after = await nameOf();
    expect(after).not.toBe(before);
    await expect(live).toHaveText(after);
  }
  expect(seen.size).toBe(modes.length);
  await context.close();
});

test.describe('mobile menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
  });

  test('opening moves focus to the first link, hides the content behind and shows a close glyph', async ({
    page,
  }) => {
    const toggle = page.locator('[data-nav-toggle]');
    const name = await toggle.getAttribute('aria-label');
    await expect(page.locator('[data-nav-toggle] [data-icon="close"]')).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#nav-menu a').first()).toBeFocused();
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    await expect(page.locator('[data-navbar]')).not.toHaveAttribute('inert', /.*/);
    await expect(page.locator('[data-nav-toggle] [data-icon="close"]')).toBeVisible();
    await expect(page.locator('[data-nav-toggle] [data-icon="menu"]')).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-label', name ?? '');
  });

  test('Escape closes it, lifts the inert content and returns focus to the toggle', async ({
    page,
  }) => {
    const toggle = page.locator('[data-nav-toggle]');
    await toggle.click();
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#nav-menu')).toBeHidden();
    await expect(toggle).toBeFocused();
    await expect(page.locator('main')).not.toHaveAttribute('inert', /.*/);
    await expect(page.locator('[data-nav-toggle] [data-icon="menu"]')).toBeVisible();
  });

  test('a click outside the menu closes it', async ({ page }) => {
    const toggle = page.locator('[data-nav-toggle]');
    await toggle.click();
    await page.mouse.click(195, 700);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('main')).not.toHaveAttribute('inert', /.*/);
  });
});

async function expectClean(page: Page, label: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  const { violations } = await scan(page);
  expect(describeViolations(violations), label).toEqual([]);
}

for (const theme of [themes.dark, themes.light]) {
  test(`axe is clean with the menu closed and open (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedTheme(page, theme);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expectClean(page, 'closed');
    await page.locator('[data-nav-toggle]').click();
    await expect(page.locator('#nav-menu')).toBeVisible();
    await expectClean(page, 'open');
  });
}

test.describe('200% zoom reflow', () => {
  test('the nav links fold into the menu, the bar keeps one row and nothing scrolls sideways', async ({
    browser,
  }) => {
    // 200% of a 1280 px desktop: the CSS viewport is 640 px, so the responsive menu replaces the nav links.
    const context = await browser.newContext({ viewport: { width: 640, height: 900 } });
    const page = await context.newPage();
    await stubThirdParties(page);
    await page.goto('/');
    const nav = await page.locator('[data-navbar] nav').boundingBox();
    expect(nav?.height).toBe(BAR_HEIGHT);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    // The nav links live in the menu (the home link is always there), which opens with the keyboard and never overflows the page.
    await page.locator('[data-nav-toggle]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#nav-menu')).toBeVisible();
    await expect(page.locator('#nav-menu a').first()).toBeFocused();
    expect(await page.locator('#nav-menu a').count()).toBeGreaterThanOrEqual(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await context.close();
  });
});
