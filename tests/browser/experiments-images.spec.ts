import { expect, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { requires, seedTheme } from './helpers/features';
import { themes } from './helpers/site';

requires({ routes: ['experiments'] });

/**
 * The screenshot rail and the "Resultado" fact on `/experiments/`: every thumbnail has a visible
 * edge (3:1 against the card in both themes) instead of a fade, the active one is clearly
 * stronger, the targets stay 44 px tall, and the result is set off from the other facts. The
 * fixture build keeps both real pieces (each with images and a result); the solo variant is
 * made by removing the media of the first piece in the page, so the real CSS still applies.
 */
const PAGES = ['/experiments/', '/en/experiments/'] as const;

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'the spec sets its own viewports');
});

type Rgba = readonly [number, number, number, number];

/** Parses `rgb()`, `rgba()` and the `color(srgb ...)` form that color-mix computes to. */
function parseColor(value: string): Rgba {
  const numbers = (value.match(/-?[\d.]+(?:e-?\d+)?/g) ?? []).map(Number);
  if (value.startsWith('color(')) {
    const [r = 0, g = 0, b = 0, a = 1] = numbers;
    return [r * 255, g * 255, b * 255, a];
  }
  const [r = 0, g = 0, b = 0, a = 1] = numbers;
  return [r, g, b, a];
}

const over = (top: Rgba, bottom: Rgba): Rgba => {
  const alpha = top[3] + bottom[3] * (1 - top[3]);
  const mix = (index: 0 | 1 | 2) =>
    (top[index] * top[3] + bottom[index] * bottom[3] * (1 - top[3])) / (alpha || 1);
  return [mix(0), mix(1), mix(2), alpha];
};

const luminance = ([r, g, b]: Rgba): number => {
  const channel = (value: number) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (a: Rgba, b: Rgba): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
};

const thumbs = (page: Page) => page.locator('.xp-piece').first().locator('label.xp-thumb');

for (const path of PAGES) {
  for (const theme of [themes.light, themes.dark]) {
    test(`${path} thumbnail edge has 3:1 contrast against the page (the panel is boxless) in ${theme}`, async ({
      page,
    }) => {
      await seedTheme(page, theme);
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const idle = thumbs(page).nth(1);
      await idle.scrollIntoViewIfNeeded();
      const read = await idle.evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          edge: style.borderTopColor,
          width: Number.parseFloat(style.borderTopWidth),
          page: getComputedStyle(document.body).backgroundColor,
        };
      });
      expect(read.width).toBeGreaterThanOrEqual(1);
      const pageBg = over(parseColor(read.page), [255, 255, 255, 1]);
      const edge = over(parseColor(read.edge), pageBg);
      expect(contrast(edge, pageBg)).toBeGreaterThanOrEqual(3);
    });
  }

  test(`${path} inactive thumbnails are not faded and the active one is stronger`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    const all = thumbs(page);
    expect(await all.count()).toBeGreaterThanOrEqual(2);
    const style = (index: number) =>
      all.nth(index).evaluate((node) => {
        const computed = getComputedStyle(node);
        return {
          opacity: Number.parseFloat(computed.opacity),
          outline: Number.parseFloat(computed.outlineWidth),
          outlineStyle: computed.outlineStyle,
          outlineColor: computed.outlineColor,
          border: computed.borderTopColor,
          height: node.getBoundingClientRect().height,
          width: node.getBoundingClientRect().width,
        };
      });
    const active = await style(0);
    const idle = await style(1);
    expect(idle.opacity).toBeGreaterThanOrEqual(0.9);
    expect(active.opacity).toBeGreaterThanOrEqual(0.9);
    expect(active.outline).toBeGreaterThanOrEqual(2);
    expect(active.outlineStyle).toBe('solid');
    expect(idle.outlineStyle === 'none' || idle.outline === 0).toBe(true);
    expect(active.border).not.toBe(idle.border);
    await all.nth(1).click();
    expect((await style(1)).outline).toBeGreaterThanOrEqual(2);
    expect((await style(0)).outlineStyle === 'none' || (await style(0)).outline === 0).toBe(true);
  });

  test(`${path} thumbnail targets are at least 44px tall and never wrap`, async ({ page }) => {
    for (const width of [360, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const boxes = await thumbs(page).evaluateAll((labels) =>
        labels.map((label) => {
          const rect = label.getBoundingClientRect();
          return { top: Math.round(rect.top), height: rect.height };
        }),
      );
      expect(boxes.length).toBeGreaterThanOrEqual(2);
      expect(new Set(boxes.map((rect) => rect.top)).size).toBe(1);
      for (const rect of boxes) expect(rect.height).toBeGreaterThanOrEqual(44);
    }
  });

  test(`${path} keyboard focus on a thumbnail keeps a visible ring`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    const radio = page.locator('.xp-piece').first().locator('input.xp-radio').nth(1);
    await page.keyboard.press('Tab');
    await radio.focus();
    await expect(radio).toBeFocused();
    const ring = await thumbs(page)
      .nth(1)
      .evaluate((node) => {
        const style = getComputedStyle(node);
        return { shadow: style.boxShadow, outline: style.outlineStyle };
      });
    expect(ring.shadow).not.toBe('none');
  });

  test(`${path} Resultado is set off from Problema and Mi parte`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    const facts = page.locator('.xp-piece').first().locator('.xp-facts > div');
    expect(await facts.count()).toBe(3);
    const read = (index: number) =>
      facts.nth(index).evaluate((node) => {
        const dt = getComputedStyle(node.querySelector('dt') as Element);
        const dd = getComputedStyle(node.querySelector('dd') as Element);
        const box = getComputedStyle(node);
        return {
          rule: Number.parseFloat(box.borderTopWidth),
          ruleStyle: box.borderTopStyle,
          radius: box.borderTopLeftRadius,
          padding: Number.parseFloat(box.paddingTop),
          labelColor: dt.color,
          labelFont: dt.fontFamily,
          labelTransform: dt.textTransform,
          textColor: dd.color,
          textSize: Number.parseFloat(dd.fontSize),
        };
      });
    const problem = await read(0);
    const mine = await read(1);
    const result = await read(2);
    const primary = await page.evaluate(() => {
      const probe = document.createElement('i');
      probe.style.color = 'var(--color-primary)';
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });
    const text = await page.evaluate(() => {
      const probe = document.createElement('i');
      probe.style.color = 'var(--color-text)';
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });
    expect(result.rule).toBe(1);
    expect(result.ruleStyle).toBe('dashed');
    expect(result.radius).toBe('0px');
    expect(result.padding).toBeGreaterThanOrEqual(8);
    expect(result.labelColor).toBe(primary);
    expect(result.labelColor).not.toBe(problem.labelColor);
    expect(result.labelFont).toBe(problem.labelFont);
    expect(result.labelTransform).toBe('none');
    expect(result.textColor).toBe(text);
    expect(result.textSize).toBeGreaterThan(mine.textSize);
    expect(problem.rule).toBe(0);
    expect(mine.rule).toBe(0);
    expect(problem.textColor).not.toBe(text);
  });

  test(`${path} Resultado keeps its look in a piece without an image`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(path);
    await page.evaluate(() => {
      const piece = document.querySelector('.xp-piece');
      piece?.querySelector('.xp-media')?.remove();
      piece?.setAttribute('data-solo', '');
    });
    const result = page.locator('.xp-piece').first().locator('.xp-facts > div').nth(2);
    await expect(result).toHaveCSS('border-top-width', '1px');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });

  for (const width of [360, 390, 1280]) {
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

  for (const theme of [themes.light, themes.dark]) {
    test(`${path} has no axe violations with the rail and the result in ${theme}`, async ({
      page,
    }) => {
      await seedTheme(page, theme);
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const { violations } = await scan(page);
      expect(describeViolations(violations)).toEqual([]);
    });
  }
}
