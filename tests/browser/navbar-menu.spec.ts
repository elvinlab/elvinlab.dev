import { expect, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { seedTheme } from './helpers/features';
import { themes } from './helpers/site';
import { stubThirdParties } from './helpers/third-party';

const BAR_HEIGHT = 72;
const MIN_TARGET = 44;
const ROW_TOLERANCE = 4;
/** Lowest width (px) where the wordmark fits next to the six links: measured, see odd/tasks/navbar-menu-and-tablet.md. */
const WORDMARK_FROM = 780;
const PHONE = { width: 390, height: 800 };

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
  await stubThirdParties(page);
});

type MenuOptions = { theme?: string; reducedMotion?: 'reduce' | 'no-preference'; path?: string };

/** A touch phone with the menu closed on `path`. */
async function phone(
  browser: import('@playwright/test').Browser,
  { theme = themes.dark, reducedMotion = 'no-preference', path = '/' }: MenuOptions = {},
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({
    viewport: PHONE,
    hasTouch: true,
    isMobile: true,
    reducedMotion,
    colorScheme: theme === themes.dark ? 'dark' : 'light',
  });
  const page = await context.newPage();
  await stubThirdParties(page);
  await seedTheme(page, theme);
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  return { page, close: () => context.close() };
}

test.describe('menu panel', () => {
  test('the panel has notched corners and a hairline edge, and nothing clips its links', async ({
    browser,
  }) => {
    const { page, close } = await phone(browser);
    await page.locator('[data-nav-toggle]').click();
    await expect(page.locator('#nav-menu')).toBeVisible();
    const look = await page.evaluate(() => {
      const menu = document.querySelector('#nav-menu') as HTMLElement;
      const edge = getComputedStyle(menu, '::before');
      const face = getComputedStyle(menu, '::after');
      return {
        menuClip: getComputedStyle(menu).clipPath,
        edgeClip: edge.clipPath,
        faceClip: face.clipPath,
        edgeOpacity: Number(edge.opacity),
        radius: getComputedStyle(menu).borderTopLeftRadius,
      };
    });
    expect(look.edgeClip).not.toBe('none');
    expect(look.faceClip).not.toBe('none');
    expect(look.edgeOpacity).toBeGreaterThan(0.1);
    expect(look.radius).toBe('0px');
    // Clipping also clips outlines: the panel itself is never clipped, so a focus ring is never cut.
    expect(look.menuClip).toBe('none');
    await close();
  });

  test('a keyboard-focused link keeps a visible outline', async ({ browser }) => {
    const { page, close } = await phone(browser);
    await page.locator('[data-nav-toggle]').focus();
    await page.keyboard.press('Enter');
    const first = page.locator('#nav-menu a').first();
    await expect(first).toBeFocused();
    await page.keyboard.press('Tab');
    const second = page.locator('#nav-menu a').nth(1);
    await expect(second).toBeFocused();
    const ring = await second.evaluate((el) => {
      const style = getComputedStyle(el);
      return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
    });
    expect(ring.style).not.toBe('none');
    expect(ring.width).toBeGreaterThanOrEqual(2);
    await close();
  });

  test('keeps focus on the first link, Escape returns to the toggle, and the page behind is inert', async ({
    browser,
  }) => {
    const { page, close } = await phone(browser);
    const toggle = page.locator('[data-nav-toggle]');
    await toggle.click();
    await expect(page.locator('#nav-menu a').first()).toBeFocused();
    await expect(page.locator('main')).toHaveJSProperty('inert', true);
    await expect(page.locator('[data-navbar]')).toHaveJSProperty('inert', false);
    await expect(toggle.locator('[data-icon="close"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#nav-menu')).toBeHidden();
    await expect(toggle).toBeFocused();
    await expect(page.locator('main')).toHaveJSProperty('inert', false);
    await close();
  });

  test('opening runs a stepped 3-frame dissolve when motion is allowed', async ({ browser }) => {
    const { page, close } = await phone(browser, { reducedMotion: 'no-preference' });
    await page.locator('[data-nav-toggle]').click();
    const motion = await page.locator('#nav-menu').evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        name: style.animationName,
        timing: style.animationTimingFunction,
        seconds: Number.parseFloat(style.animationDuration),
      };
    });
    expect(motion.name).not.toBe('none');
    expect(motion.timing).toMatch(/^steps\(3/);
    expect(motion.seconds).toBeGreaterThanOrEqual(0.12);
    expect(motion.seconds).toBeLessThanOrEqual(0.2);
    await close();
  });

  test('under reduced motion the menu and the scrim appear without motion', async ({ browser }) => {
    const { page, close } = await phone(browser, { reducedMotion: 'reduce' });
    await page.locator('[data-nav-toggle]').click();
    await expect(page.locator('#nav-menu')).toBeVisible();
    const seconds = await page.evaluate(() =>
      ['#nav-menu', '[data-nav-scrim]'].map((selector) => {
        const style = getComputedStyle(document.querySelector(selector) as Element);
        return [style.animationDuration, style.transitionDuration].map((value) =>
          Math.max(...value.split(',').map((part) => Number.parseFloat(part))),
        );
      }),
    );
    for (const pair of seconds) for (const value of pair) expect(value).toBeLessThanOrEqual(0.001);
    await close();
  });
});

test.describe('scrim', () => {
  test('exists only while the menu is open, covers the viewport and sits below the navbar', async ({
    browser,
  }) => {
    const { page, close } = await phone(browser, { path: '/notes/' });
    const scrim = page.locator('[data-nav-scrim]');
    await expect(scrim).toBeHidden();
    await page.locator('[data-nav-toggle]').click();
    await expect(scrim).toBeVisible();
    const box = await scrim.boundingBox();
    expect(box).toEqual({ x: 0, y: 0, width: PHONE.width, height: PHONE.height });
    const style = await scrim.evaluate((el) => {
      const css = getComputedStyle(el);
      return {
        opacity: Number(css.opacity),
        blur: css.backdropFilter,
        animation: css.animationName,
      };
    });
    expect(style.opacity).toBeGreaterThan(0.4);
    expect(style.opacity).toBeLessThan(0.8);
    expect(style.blur).toBe('none');
    expect(style.animation).toBe('none');
    const hits = await page.evaluate(({ width, height }) => {
      const top = (x: number, y: number) => document.elementFromPoint(x, y);
      const nav = (
        document.querySelector('[data-navbar] nav') as HTMLElement
      ).getBoundingClientRect();
      const bar = top(width / 2, nav.y + nav.height / 2);
      const below = top(width / 2, height - 40);
      return {
        barInNavbar: bar?.closest('[data-navbar]') != null,
        belowIsScrim: below?.hasAttribute('data-nav-scrim') === true,
      };
    }, PHONE);
    expect(hits).toEqual({ barInNavbar: true, belowIsScrim: true });
    await close();
  });

  test('a click on the scrim closes the menu and lifts the inert state', async ({ browser }) => {
    const { page, close } = await phone(browser);
    const toggle = page.locator('[data-nav-toggle]');
    await toggle.click();
    await expect(page.locator('#nav-menu')).toBeVisible();
    await page.mouse.click(PHONE.width / 2, PHONE.height - 40);
    await expect(page.locator('#nav-menu')).toBeHidden();
    await expect(page.locator('[data-nav-scrim]')).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('main')).toHaveJSProperty('inert', false);
    await close();
  });

  test('a wide window never shows the scrim', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page.locator('[data-nav-scrim]')).toBeHidden();
  });
});

for (const theme of [themes.dark, themes.light]) {
  test(`axe is clean with the notched menu and the scrim open (${theme})`, async ({ browser }) => {
    const { page, close } = await phone(browser, { theme, path: '/notes/' });
    await page.evaluate(() => document.fonts.ready);
    expect(describeViolations((await scan(page)).violations), 'closed').toEqual([]);
    await page.locator('[data-nav-toggle]').click();
    await expect(page.locator('#nav-menu')).toBeVisible();
    expect(describeViolations((await scan(page)).violations), 'open').toEqual([]);
    await close();
  });
}

test.describe('tablet bar', () => {
  // With motion allowed and a fine pointer the background picker joins the bar; reduced motion hides it.
  for (const withPicker of [true, false]) {
    for (const path of ['/', '/en/']) {
      for (const width of [768, 779, 780, 820, 863, 864, 900, 1023]) {
        test(`${path} keeps one ${BAR_HEIGHT} px row at ${width} px${withPicker ? ' with the picker' : ''}`, async ({
          browser,
        }) => {
          const context = await browser.newContext({
            viewport: { width, height: 900 },
            reducedMotion: withPicker ? 'no-preference' : 'reduce',
          });
          const page = await context.newPage();
          await stubThirdParties(page);
          await page.goto(path);
          await page.evaluate(() => document.fonts.ready);
          if (withPicker) await expect(page.locator('[data-background-toggle]')).toBeVisible();
          const nav = await page.locator('[data-navbar] nav').boundingBox();
          expect(nav?.height).toBe(BAR_HEIGHT);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          ).toBe(true);
          const rowParts = [
            page.locator('[data-navbar] nav > a').first(),
            page.locator('[data-navbar] ul:not(#nav-menu) a').first(),
            page.locator('[data-navbar] ul:not(#nav-menu) a').last(),
            page.locator('[data-navbar] nav > a[hreflang]').first(),
            page.locator('[data-theme-toggle]'),
            ...(withPicker ? [page.locator('[data-background-toggle]')] : []),
          ];
          const centers: number[] = [];
          for (const part of rowParts) {
            const box = await part.boundingBox();
            expect(box).not.toBeNull();
            expect(box?.height ?? 0).toBeGreaterThanOrEqual(MIN_TARGET);
            centers.push((box?.y ?? 0) + (box?.height ?? 0) / 2);
          }
          expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(ROW_TOLERANCE);

          const brand = page.locator('[data-navbar] nav > a').first();
          const word = await brand.locator('span').boundingBox();
          const logo = await brand.boundingBox();
          if (width >= WORDMARK_FROM) {
            expect(word?.width ?? 0, 'wordmark visible').toBeGreaterThan(20);
          } else {
            expect(word?.width ?? 0, 'wordmark hidden').toBeLessThanOrEqual(1);
            expect(logo?.width ?? 0).toBeGreaterThanOrEqual(MIN_TARGET);
            expect(logo?.height ?? 0).toBeGreaterThanOrEqual(MIN_TARGET);
          }
          // The home link keeps its accessible name whether the wordmark is seen or not.
          expect((await brand.innerText()).trim().length).toBeGreaterThan(0);
          await context.close();
        });
      }
    }
  }

  for (const theme of [themes.dark, themes.light]) {
    test(`axe is clean on the tablet bar at 820 px (${theme})`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 820, height: 900 },
        colorScheme: theme === themes.dark ? 'dark' : 'light',
      });
      const page = await context.newPage();
      await stubThirdParties(page);
      await seedTheme(page, theme);
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(describeViolations((await scan(page)).violations)).toEqual([]);
      await context.close();
    });
  }
});
