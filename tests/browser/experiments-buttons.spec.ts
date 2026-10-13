import { expect, type Locator, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { requires, seedTheme } from './helpers/features';
import { themes } from './helpers/site';

requires({ routes: ['experiments'] });

/**
 * The pixel look of the actions on `/experiments/` (primary button and secondary links): notched
 * corners, 44 px targets, a hover that moves nothing in the layout, a focus ring that survives the
 * clip, motion only with no-preference, and the phone row (full-width primary over two links).
 */
const PAGES = ['/experiments/', '/en/experiments/'] as const;

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'the spec sets its own viewports');
});

const box = async (locator: Locator) => {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error('element has no box');
  return rect;
};

/**
 * The fixture build drops the `note` of every experiment whose note is not a fixture note, so it
 * renders no case button. When none is there, the page's own markup for it is injected into the
 * first actions row, so the primary is still exercised with the real CSS.
 */
const ARROW =
  '<svg class="xp-arrow" viewBox="0 0 9 9" width="18" height="18" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true" focusable="false"><rect x="8" y="4" width="1" height="1"></rect><rect x="7" y="3" width="1" height="3"></rect><rect x="6" y="2" width="1" height="5"></rect><rect x="5" y="1" width="1" height="7"></rect><rect x="0" y="3" width="5" height="3"></rect></svg>';

/** The first actions row that holds the primary button and at least one secondary link. */
const actions = (page: Page) =>
  page
    .locator('.xp-actions')
    .filter({ has: page.locator('.xp-link') })
    .first();

/** Loads the page and makes sure the first actions row has its primary button. */
async function open(page: Page, path: string): Promise<Locator> {
  await page.goto(path);
  const row = actions(page);
  await expect(row.locator('.xp-link').first()).toBeVisible();
  await row.evaluate((node, arrow) => {
    if (node.querySelector('.xp-btn')) return;
    const link = document.createElement('a');
    link.className = 'xp-btn';
    link.href = '#';
    link.innerHTML = `Case${arrow}`;
    node.prepend(link);
  }, ARROW);
  return row;
}

for (const path of PAGES) {
  test(`${path} primary and secondary links are 44px tall with notched corners`, async ({
    page,
  }) => {
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const row = await open(page, path);
      const primary = row.locator('.xp-btn');
      const links = row.locator('.xp-link');
      expect((await box(primary)).height).toBeGreaterThanOrEqual(44);
      for (const link of await links.all()) {
        expect((await box(link)).height).toBeGreaterThanOrEqual(44);
        expect(await link.evaluate((node) => getComputedStyle(node).clipPath)).toContain('polygon');
      }
      expect(await primary.evaluate((node) => getComputedStyle(node).clipPath)).toContain(
        'polygon',
      );
      await expect(primary.locator('svg[aria-hidden="true"]')).toHaveCount(1);
    }
  });

  test(`${path} on a phone the primary spans the container and the links share one row below it`, async ({
    page,
  }) => {
    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const row = await open(page, path);
      const rowBox = await box(row);
      const primary = await box(row.locator('.xp-btn'));
      expect(primary.width).toBeGreaterThanOrEqual(rowBox.width - 1);
      const links = await row.locator('.xp-link').all();
      expect(links.length).toBeGreaterThanOrEqual(1);
      const boxes = await Promise.all(links.map(box));
      for (const rect of boxes) {
        expect(rect.y).toBeGreaterThanOrEqual(primary.y + primary.height - 1);
        expect(rect.y).toBeCloseTo(boxes[0]?.y ?? 0, 0);
        expect(rect.x + rect.width).toBeLessThanOrEqual(rowBox.x + rowBox.width + 1);
      }
      if (boxes.length > 1) {
        const total = boxes.reduce((sum, rect) => sum + rect.width, 0);
        expect(total).toBeGreaterThanOrEqual(rowBox.width * 0.9);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
    }
  });

  test(`${path} hovering the primary and a link keeps their size and the page height`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const row = await open(page, path);
    for (const target of [row.locator('.xp-btn'), row.locator('.xp-link').first()]) {
      await target.scrollIntoViewIfNeeded();
      const before = await box(target);
      const offsetTop = await target.evaluate((node) => (node as HTMLElement).offsetTop);
      const around = await page.evaluate(() => document.documentElement.scrollHeight);
      await target.hover();
      await page.waitForTimeout(400);
      const after = await box(target);
      expect(after.width).toBeCloseTo(before.width, 0);
      expect(after.height).toBeCloseTo(before.height, 0);
      expect(await target.evaluate((node) => (node as HTMLElement).offsetTop)).toBe(offsetTop);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(around);
    }
  });

  test(`${path} hovering the primary nudges it up and darkens it, the arrow steps two pixels`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const primary = (await open(page, path)).locator('.xp-btn');
    const arrow = primary.locator('.xp-arrow');
    const idle = await primary.evaluate((node) => getComputedStyle(node).backgroundColor);
    await primary.hover();
    await page.waitForTimeout(400);
    expect(await primary.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(idle);
    expect(await primary.evaluate((node) => getComputedStyle(node).opacity)).toBe('1');
    expect(await primary.evaluate((node) => getComputedStyle(node).transform)).toBe(
      'matrix(1, 0, 0, 1, 0, -1)',
    );
    expect(await arrow.evaluate((node) => getComputedStyle(node).transform)).toBe(
      'matrix(1, 0, 0, 1, 2, 2)',
    );
    expect(await arrow.evaluate((node) => getComputedStyle(node).transitionTimingFunction)).toMatch(
      /^steps\(2/,
    );
  });

  test(`${path} with reduced motion the buttons keep their states and nothing animates`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const row = await open(page, path);
    for (const target of [
      row.locator('.xp-btn'),
      row.locator('.xp-btn .xp-arrow'),
      row.locator('.xp-link').first(),
    ]) {
      const style = await target.evaluate((node) => {
        const computed = getComputedStyle(node);
        return {
          durations: computed.transitionDuration
            .split(',')
            .map((value) => Number.parseFloat(value)),
          animation: computed.animationName,
        };
      });
      for (const seconds of style.durations) expect(seconds).toBeLessThanOrEqual(0.001);
      expect(style.animation).toBe('none');
    }
    const primary = row.locator('.xp-btn');
    const idle = await primary.evaluate((node) => getComputedStyle(node).backgroundColor);
    await primary.hover();
    await page.waitForTimeout(100);
    expect(await primary.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(idle);
    expect(await primary.evaluate((node) => getComputedStyle(node).transform)).toBe('none');
  });

  test(`${path} keyboard focus shows a visible ring and drops the clip`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const row = await open(page, path);
    for (const target of [row.locator('.xp-btn'), row.locator('.xp-link').first()]) {
      // A key press first, so the browser is in keyboard modality and script focus matches :focus-visible.
      await page.keyboard.press('Tab');
      await target.focus();
      await expect(target).toBeFocused();
      await expect(target).toHaveCSS('clip-path', 'none');
      // Polled: under load the first style read can still be a frame behind the focus change.
      await expect
        .poll(
          () =>
            target.evaluate((node) => {
              const style = getComputedStyle(node);
              return {
                style: style.outlineStyle,
                width: Number.parseFloat(style.outlineWidth),
                offset: Number.parseFloat(style.outlineOffset),
                clip: style.clipPath,
              };
            }),
          { timeout: 3000 },
        )
        .toEqual({ style: 'solid', width: 2, offset: 3, clip: 'none' });
    }
  });

  for (const theme of [themes.light, themes.dark]) {
    test(`${path} has no axe violations with the buttons in ${theme}`, async ({ page }) => {
      await seedTheme(page, theme);
      const row = await open(page, path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await row.locator('.xp-btn').hover();
      const { violations } = await scan(page);
      expect(describeViolations(violations)).toEqual([]);
    });
  }

  for (const width of [360, 390]) {
    test(`${path} does not overflow horizontally at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const geometry = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      }));
      expect(geometry.scroll).toBeLessThanOrEqual(geometry.viewport);
    });
  }
}
