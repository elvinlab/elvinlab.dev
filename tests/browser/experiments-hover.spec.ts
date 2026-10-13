import { expect, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { requires, seedTheme } from './helpers/features';
import { themes } from './helpers/site';

requires({ routes: ['experiments'] });

/**
 * Hover and focus feedback on `/experiments/` (task X16/X17): the rail thumbnails turn their edge
 * primary and lift 1 px in two steps, the active one stays put; the four brackets of the media
 * frame grow 4 px and turn primary. Nothing moves in the layout, all motion needs
 * `no-preference`, and with reduced motion the state is still visible through color alone.
 */
const PAGES = ['/experiments/', '/en/experiments/'] as const;
/** The stepped timing runs 150 ms; the wait covers it with room to spare. */
const SETTLE = 400;

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'the spec sets its own viewports');
});

const piece = (page: Page) => page.locator('.xp-piece').first();
const thumbs = (page: Page) => piece(page).locator('label.xp-thumb');
const shot = (page: Page) => piece(page).locator('.xp-shot').first();

/** The computed primary color, read through a probe so the spec never hard-codes a value. */
const primary = (page: Page) =>
  page.evaluate(() => {
    const probe = document.createElement('i');
    probe.style.color = 'var(--color-primary)';
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  });

/** Layout geometry that ignores transforms (offset sizes) plus the frame boxes. */
const layout = (page: Page) =>
  page.evaluate(() => {
    const first = document.querySelector('.xp-piece');
    // Page coordinates: hovering may scroll a thumbnail into view, which moves viewport rects.
    const round = (rect: DOMRect) =>
      [rect.x + scrollX, rect.y + scrollY, rect.width, rect.height].map(Math.round);
    return {
      thumbs: [...(first?.querySelectorAll('label.xp-thumb') ?? [])].map((node) => {
        const label = node as HTMLElement;
        return [label.offsetLeft, label.offsetTop, label.offsetWidth, label.offsetHeight];
      }),
      shot: round(first?.querySelector('.xp-shot')?.getBoundingClientRect() as DOMRect),
      clip: round(first?.querySelector('.xp-clip')?.getBoundingClientRect() as DOMRect),
      piece: round(first?.getBoundingClientRect() as DOMRect),
      scroll: document.documentElement.scrollWidth,
    };
  });

/** Waits for fonts and the first piece's images, so a late layout settle is not read as a hover shift. */
async function settled(page: Page): Promise<void> {
  await shot(page).scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await document.fonts.ready;
    const visible = [...document.querySelectorAll('.xp-piece img')].filter(
      (image) => (image as HTMLElement).offsetParent !== null,
    ) as HTMLImageElement[];
    const decoded = Promise.all(visible.map((image) => image.decode().catch(() => null)));
    await Promise.race([decoded, new Promise((resolve) => setTimeout(resolve, 2000))]);
  });
  await page.waitForTimeout(SETTLE);
}

const bracketSize = (page: Page) =>
  shot(page).evaluate((node) => getComputedStyle(node, '::after').backgroundSize);

/** Longest computed duration of a `transition-duration` list, in seconds. */
const longest = (list: string) =>
  Math.max(...list.split(',').map((item) => Number.parseFloat(item)));

for (const path of PAGES) {
  test.describe(`${path} with motion allowed`, () => {
    test.use({ reducedMotion: 'no-preference' });

    test(`${path} an idle thumbnail turns primary and lifts 1px on hover, the active one stays put`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(path);
      const all = thumbs(page);
      await all.nth(1).scrollIntoViewIfNeeded();
      const accent = await primary(page);
      const before = await all
        .nth(1)
        .evaluate((node) => ({ edge: getComputedStyle(node).borderTopColor }));
      expect(before.edge).not.toBe(accent);
      await all.nth(1).hover();
      await page.waitForTimeout(SETTLE);
      const idle = await all.nth(1).evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          edge: style.borderTopColor,
          transform: style.transform,
          timing: style.transitionTimingFunction,
        };
      });
      expect(idle.edge).toBe(accent);
      expect(idle.transform).toBe('matrix(1, 0, 0, 1, 0, -1)');
      expect(idle.timing).toContain('steps(2');
      await all.nth(0).hover();
      await page.waitForTimeout(SETTLE);
      const active = await all.nth(0).evaluate((node) => {
        const style = getComputedStyle(node);
        return { transform: style.transform, outline: Number.parseFloat(style.outlineWidth) };
      });
      expect(active.transform).toBe('none');
      expect(active.outline).toBeGreaterThanOrEqual(2);
      // The thumbnail left behind drops back to rest.
      expect(await all.nth(1).evaluate((node) => getComputedStyle(node).transform)).toBe('none');
    });

    test(`${path} hovering a thumbnail or the frame changes no layout box`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(path);
      await settled(page);
      const rest = await layout(page);
      await thumbs(page).nth(2).hover();
      await page.waitForTimeout(SETTLE);
      expect(await layout(page)).toEqual(rest);
      await shot(page).hover();
      await page.waitForTimeout(SETTLE);
      expect(await layout(page)).toEqual(rest);
    });

    test(`${path} the frame brackets grow and turn primary on hover`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(path);
      await shot(page).scrollIntoViewIfNeeded();
      const accent = await primary(page);
      const rest = await bracketSize(page);
      expect(rest).toContain('14px 3px');
      expect(rest).not.toContain('18px');
      await shot(page).hover();
      await page.waitForTimeout(SETTLE);
      const grown = await bracketSize(page);
      expect(grown).toContain('18px 3px');
      expect(grown).toContain('3px 18px');
      expect(grown).not.toContain('14px');
      expect(await shot(page).evaluate((node) => getComputedStyle(node).color)).toBe(accent);
      const timing = await shot(page).evaluate(
        (node) => getComputedStyle(node, '::after').transitionTimingFunction,
      );
      expect(timing).toContain('steps(2');
    });

    test(`${path} keyboard focus gives the frame its grown brackets and a thumbnail its edge`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(path);
      const accent = await primary(page);
      const radio = piece(page).locator('input.xp-radio').nth(1);
      await page.keyboard.press('Tab');
      await radio.focus();
      await expect(radio).toBeFocused();
      await page.waitForTimeout(SETTLE);
      expect(await bracketSize(page)).toContain('18px 3px');
      const edge = await thumbs(page)
        .nth(1)
        .evaluate((node) => {
          const style = getComputedStyle(node);
          return { edge: style.borderTopColor, ring: style.boxShadow, transform: style.transform };
        });
      expect(edge.edge).toBe(accent);
      expect(edge.ring).not.toBe('none');
      expect(edge.transform).toBe('matrix(1, 0, 0, 1, 0, -1)');
    });

    for (const width of [360, 390]) {
      test(`${path} hover states cause no horizontal overflow at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await settled(page);
        const rest = await layout(page);
        await shot(page).hover();
        await thumbs(page).nth(1).hover();
        await page.waitForTimeout(SETTLE);
        const hovered = await layout(page);
        expect(hovered.scroll).toBeLessThanOrEqual(width);
        expect(hovered.shot).toEqual(rest.shot);
        expect(hovered.thumbs).toEqual(rest.thumbs);
      });
    }
  });

  test.describe(`${path} with reduced motion`, () => {
    test.use({ reducedMotion: 'reduce' });

    test(`${path} the hover states stay visible by color and nothing is animated`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(path);
      await shot(page).scrollIntoViewIfNeeded();
      const accent = await primary(page);
      const rest = await bracketSize(page);
      await thumbs(page).nth(1).hover();
      const thumb = await thumbs(page)
        .nth(1)
        .evaluate((node) => {
          const style = getComputedStyle(node);
          return {
            edge: style.borderTopColor,
            transform: style.transform,
            duration: style.transitionDuration,
          };
        });
      expect(thumb.edge).toBe(accent);
      expect(thumb.transform).toBe('none');
      expect(longest(thumb.duration)).toBeLessThanOrEqual(0.001);
      await shot(page).hover();
      const frame = await shot(page).evaluate((node) => ({
        color: getComputedStyle(node).color,
        duration: getComputedStyle(node).transitionDuration,
        armDuration: getComputedStyle(node, '::after').transitionDuration,
      }));
      expect(frame.color).toBe(accent);
      expect(longest(frame.duration)).toBeLessThanOrEqual(0.001);
      expect(longest(frame.armDuration)).toBeLessThanOrEqual(0.001);
      expect(await bracketSize(page)).toBe(rest);
    });
  });

  for (const theme of [themes.light, themes.dark]) {
    test(`${path} has no axe violations while the frame and a thumbnail are hovered in ${theme}`, async ({
      page,
    }) => {
      await seedTheme(page, theme);
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await shot(page).hover();
      await thumbs(page).nth(1).hover();
      const { violations } = await scan(page);
      expect(describeViolations(violations)).toEqual([]);
    });
  }
}
