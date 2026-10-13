import { readFileSync } from 'node:fs';

import { expect, type Locator, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { requires, seedTheme } from './helpers/features';
import { text, themes } from './helpers/site';

requires({ routes: ['experiments'] });

/**
 * The boxless text panel of `/experiments/` (task X14/X15): the text sits on the page background
 * (no fill, no radius), every piece carries a mono entry label "Experimento 001" / "Experiment 001"
 * with the number in the pink accent, the number is the stable position by publication date, and
 * every text role keeps 4.5:1 against the page in both themes.
 */
const PAGES = [
  { path: '/experiments/', locale: 'es' },
  { path: '/en/experiments/', locale: 'en' },
] as const;

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

type RawExperiment = { year: number; publishedAt?: string };
const raw = JSON.parse(
  readFileSync(new URL('../../apps/web/src/content/experiments.json', import.meta.url), 'utf8'),
) as Record<string, RawExperiment>;
const experiments = Object.keys(raw);

/** The number the build must print: position by date (`publishedAt`, else 1 January of the year), id breaks ties. */
const expectedNumbers = new Map(
  Object.entries(raw)
    .map(([id, entry]) => ({ id, date: entry.publishedAt ?? `${entry.year}-01-01` }))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.id < b.id ? -1 : 1))
    .map((entry, index) => [entry.id, String(index + 1).padStart(3, '0')] as const),
);

const pieces = (page: Page) => page.locator('.xp-piece');

for (const { path, locale } of PAGES) {
  test(`${path} every piece shows its stable entry number`, async ({ page }) => {
    await page.goto(path);
    const all = pieces(page);
    expect(await all.count()).toBe(experiments.length);
    for (let index = 0; index < experiments.length; index++) {
      const piece = all.nth(index);
      const id = await piece.getAttribute('id');
      const number = expectedNumbers.get(id ?? '');
      expect(number).toBeDefined();
      await expect(piece.locator('.xp-num')).toHaveText(
        text(locale, 'experiment.entry', { number: number as string }),
      );
      await expect(piece.locator('.xp-num b')).toHaveText(number as string);
    }
  });

  test(`${path} the entry label sits above the status pill`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    const piece = pieces(page).first();
    const num = await piece.locator('.xp-num').boundingBox();
    const status = await piece.locator('.xp-status').boundingBox();
    expect(num).not.toBeNull();
    expect(status).not.toBeNull();
    expect((num?.y ?? 0) + (num?.height ?? 0)).toBeLessThanOrEqual(status?.y ?? 0);
  });

  for (const theme of [themes.light, themes.dark]) {
    test(`${path} the panel is boxless and the label is mono with a pink number in ${theme}`, async ({
      page,
    }) => {
      await seedTheme(page, theme);
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const piece = pieces(page).first();
      const panel = await piece.locator('.xp-panel').evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          background: style.backgroundColor,
          image: style.backgroundImage,
          radius: style.borderTopLeftRadius,
          padding: style.padding,
        };
      });
      expect(parseColor(panel.background)[3]).toBe(0);
      expect(panel.image).toBe('none');
      expect(panel.radius).toBe('0px');
      expect(panel.padding).toBe('0px');

      const pink = await page.evaluate(() => {
        const probe = document.createElement('i');
        probe.style.color = 'var(--color-pink)';
        document.body.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      });
      const label = await piece.locator('.xp-num').evaluate((node) => {
        const style = getComputedStyle(node);
        const number = getComputedStyle(node.querySelector('b') as Element);
        return {
          family: style.fontFamily,
          transform: style.textTransform,
          numberColor: number.color,
          numberFamily: number.fontFamily,
          textColor: style.color,
        };
      });
      const factLabel = await piece
        .locator('.xp-facts dt')
        .first()
        .evaluate((node) => getComputedStyle(node).fontFamily);
      expect(label.family).toMatch(/mono/i);
      expect(label.family).toBe(factLabel);
      expect(label.numberFamily).toBe(label.family);
      expect(label.transform).toBe('none');
      expect(label.numberColor).toBe(pink);
      expect(label.textColor).not.toBe(pink);
    });

    test(`${path} every text role has 4.5:1 against the page in ${theme}`, async ({ page }) => {
      await seedTheme(page, theme);
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const pageBg = over(parseColor(bodyBg), [255, 255, 255, 1]);
      const roles = [
        '.xp-num',
        '.xp-num b',
        '.xp-status',
        '.xp-heading h2',
        '.xp-heading p',
        '.xp-facts dt',
        '.xp-facts dd',
        '.xp-facts [data-result] dt',
        '.xp-facts [data-result] dd',
        '.xp-tags li',
      ];
      for (let index = 0; index < experiments.length; index++) {
        const piece = pieces(page).nth(index);
        for (const role of roles) {
          const target: Locator = piece.locator(role).first();
          if ((await target.count()) === 0) continue;
          const read = await target.evaluate((node) => {
            const style = getComputedStyle(node);
            return { color: style.color, background: style.backgroundColor };
          });
          const surface = over(parseColor(read.background), pageBg);
          const text = over(parseColor(read.color), surface);
          const ratio = contrast(text, surface);
          expect(ratio, `${role} in piece ${index + 1}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    test(`${path} has no axe violations with the boxless panel in ${theme}`, async ({ page }) => {
      await seedTheme(page, theme);
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const { violations } = await scan(page);
      expect(describeViolations(violations)).toEqual([]);
    });
  }

  test(`${path} the solo variant keeps the boxless panel and its label`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    await page.evaluate(() => {
      const piece = document.querySelector('.xp-piece');
      piece?.querySelector('.xp-media')?.remove();
      piece?.setAttribute('data-solo', '');
    });
    const piece = pieces(page).first();
    await expect(piece.locator('.xp-num')).toBeVisible();
    await expect(piece.locator('.xp-panel')).toHaveCSS('border-top-left-radius', '0px');
    await expect(piece.locator('.xp-panel')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  });

  for (const width of [360, 390, 768]) {
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
