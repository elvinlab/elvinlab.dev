import { expect, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { liveByPath, seedTheme } from './helpers/features';
import { themes } from './helpers/site';
import { stubThirdParties } from './helpers/third-party';

const BAR_HEIGHT = 72;
const PAGES = liveByPath(['/', '/notes/', '/experiments/', '/education/'], (path) => path);
const DESKTOP_LINKS = '[data-navbar] ul:not(#nav-menu) a[href]';

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
  await stubThirdParties(page);
});

/** The alpha channel of a computed CSS color (`rgba(...)`, `color(srgb r g b / a)`, `oklab(... / a)`). */
const alphaOf = (color: string): number => {
  const slash = /\/\s*([\d.]+)(%?)\s*\)/.exec(color);
  if (slash) return Number(slash[1]) / (slash[2] === '%' ? 100 : 1);
  const rgba = /^rgba\(([^)]+)\)$/.exec(color);
  if (rgba) return Number(rgba[1]?.split(',')[3] ?? 1);
  return 1;
};

type Marker = { content: string; height: number; width: number; color: string; animation: string };
const markerOf = (selector: string, page: Page, index: number): Promise<Marker> =>
  page.evaluate(
    ({ selector, index }) => {
      const link = document.querySelectorAll(selector)[index] as Element;
      const style = getComputedStyle(link, '::after');
      return {
        content: style.content,
        height: Number.parseFloat(style.height) || 0,
        width: Number.parseFloat(style.width) || 0,
        color: style.backgroundColor,
        animation: style.animationName,
      };
    },
    { selector, index },
  );

const hasMarker = (marker: Marker): boolean => marker.content !== 'none' && marker.height > 0;

for (const theme of [themes.dark, themes.light]) {
  test.describe(`bar surface (${theme})`, () => {
    for (const width of [1280, 390]) {
      test(`the bar is opaque with a visible edge and keeps its box at ${width} px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 800 });
        await seedTheme(page, theme);
        await page.goto('/');
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        const surface = await page.evaluate(() => {
          const nav = document.querySelector('[data-navbar] nav') as HTMLElement;
          const edge = getComputedStyle(nav, '::before');
          const box = nav.getBoundingClientRect();
          const header = (
            document.querySelector('[data-navbar]') as HTMLElement
          ).getBoundingClientRect();
          return {
            background: getComputedStyle(nav).backgroundColor,
            blur: getComputedStyle(nav).backdropFilter,
            edgeBottom: edge.borderBottomWidth,
            edgeOpacity: edge.opacity,
            edgeBottomColor: edge.borderBottomColor,
            edgeSide: edge.borderLeftWidth,
            edgeSideColor: edge.borderLeftColor,
            box: { x: box.x, width: box.width, height: box.height },
            header: { x: header.x, width: header.width },
          };
        });
        expect(alphaOf(surface.background)).toBeGreaterThanOrEqual(0.9);
        expect(surface.edgeBottom).toBe('1px');
        expect(surface.edgeSide).toBe('1px');
        expect(alphaOf(surface.edgeBottomColor) * Number(surface.edgeOpacity)).toBeGreaterThan(0.1);
        expect(alphaOf(surface.edgeSideColor) * Number(surface.edgeOpacity)).toBeGreaterThan(0.1);
        expect(surface.box.height).toBe(BAR_HEIGHT);
        expect(surface.box.x).toBe(surface.header.x);
        expect(surface.box.width).toBe(surface.header.width);
      });
    }
  });

  test.describe(`active marker (${theme})`, () => {
    for (const path of PAGES) {
      test(`${path} marks exactly one desktop link and keeps every link box`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await seedTheme(page, theme);
        await page.goto(path);
        const links = page.locator(DESKTOP_LINKS);
        const count = await links.count();
        const current = await links.evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute('aria-current') === 'page'),
        );
        expect(current.filter(Boolean)).toHaveLength(1);
        const markers = await Promise.all(
          Array.from({ length: count }, (_, index) => markerOf(DESKTOP_LINKS, page, index)),
        );
        expect(markers.map(hasMarker)).toEqual(current);
        const at = current.indexOf(true);
        const marker = markers[at] as Marker;
        expect(marker.height).toBe(2);
        expect(marker.animation).toBe('none');
        const linkColor = await links.nth(at).evaluate((node) => getComputedStyle(node).color);
        expect(marker.color).toBe(linkColor);
        // The marker lives inside the link and never changes its 44 px box.
        const heights = await links.evaluateAll((nodes) =>
          nodes.map((n) => n.getBoundingClientRect().height),
        );
        expect(new Set(heights).size).toBe(1);
        expect(heights[0]).toBe(44);
      });
    }

    test('the mobile menu marks its current link when open', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        colorScheme: theme === themes.dark ? 'dark' : 'light',
      });
      const page = await context.newPage();
      await stubThirdParties(page);
      await seedTheme(page, theme);
      await page.goto('/');
      await page.locator('[data-nav-toggle]').click();
      await expect(page.locator('#nav-menu')).toBeVisible();
      const links = page.locator('#nav-menu a');
      const count = await links.count();
      const current = await links.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('aria-current') === 'page'),
      );
      expect(current.filter(Boolean)).toHaveLength(1);
      const markers = await Promise.all(
        Array.from({ length: count }, (_, index) => markerOf('#nav-menu a', page, index)),
      );
      expect(markers.map(hasMarker)).toEqual(current);
      const marker = markers[current.indexOf(true)] as Marker;
      expect(marker.width).toBe(3);
      const heights = await links.evaluateAll((nodes) =>
        nodes.map((n) => n.getBoundingClientRect().height),
      );
      expect(new Set(heights).size).toBe(1);
      await context.close();
    });
  });
}

for (const width of [320, 360, 390]) {
  test(`no horizontal overflow at ${width} px with the menu open on a current page`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/notes/');
    await page.locator('[data-nav-toggle]').click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}

for (const theme of [themes.dark, themes.light]) {
  test(`axe is clean on a marked page with the menu closed and open (${theme})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedTheme(page, theme);
    await page.goto('/notes/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.evaluate(() => document.fonts.ready);
    expect(describeViolations((await scan(page)).violations), 'closed').toEqual([]);
    await page.locator('[data-nav-toggle]').click();
    await expect(page.locator('#nav-menu')).toBeVisible();
    expect(describeViolations((await scan(page)).violations), 'open').toEqual([]);
  });
}
