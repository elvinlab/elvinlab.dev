import { expect, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { requires } from './helpers/features';

requires({ routes: ['notes'] });

/** The decision record as an index card with a pink ink stamp (DESIGN.md, "Decision record"). */

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
});

const ES = '/notes/smoke-es/';
const EN = '/en/notes/smoke-en/';
const THEMES = ['elvinlab-dark', 'elvinlab-light'] as const;

const BANNER = '[data-record-banner] [data-stamp]';
const INLINE = '[data-record-inline] [data-stamp]';

const setTheme = (page: Page, theme: (typeof THEMES)[number]) =>
  page.evaluate((value) => {
    document.documentElement.dataset['theme'] = value;
  }, theme);

for (const [path, text] of [
  [ES, 'DECISIÓN'],
  [EN, 'DECISION'],
] as const) {
  test(`${path} stamp is decorative, localized and within the stamp limits`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    const stamp = page.locator(BANNER);
    await expect(stamp).toBeVisible();
    await expect(stamp).toHaveAttribute('aria-hidden', 'true');
    await expect(stamp).toHaveText(text);
    expect(text.length).toBeLessThanOrEqual(12);
    expect(text.split(/\s+/).length).toBeLessThanOrEqual(2);
    // The stamp lives inside the record card, never loose on the page.
    await expect(page.locator('[data-record-banner] .record-card [data-stamp]')).toHaveCount(1);
    const css = await stamp.evaluate((el) => {
      const s = getComputedStyle(el);
      return { family: s.fontFamily, weight: s.fontWeight, size: parseFloat(s.fontSize) };
    });
    expect(css.family).toMatch(/JetBrains Mono|monospace/i);
    expect(Number(css.weight)).toBe(600);
    expect(css.size).toBeGreaterThanOrEqual(13);
  });
}

test('the phone card carries the same stamp', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(ES);
  const stamp = page.locator(INLINE);
  await expect(stamp).toBeVisible();
  await expect(stamp).toHaveAttribute('aria-hidden', 'true');
  await expect(stamp).toHaveText('DECISIÓN');
});

test('the stamp is framed and rotated 5 to 8 degrees', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(ES);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const info = await page.locator(BANNER).evaluate((el) => {
    const s = getComputedStyle(el);
    const [a = 1, b = 0] = s.transform
      .replace(/matrix\(|\)/g, '')
      .split(',')
      .map(Number);
    return { border: s.borderTopWidth, deg: (Math.atan2(b, a) * 180) / Math.PI };
  });
  expect(parseFloat(info.border)).toBeGreaterThan(0);
  expect(Math.abs(info.deg)).toBeGreaterThanOrEqual(5);
  expect(Math.abs(info.deg)).toBeLessThanOrEqual(8);
});

test('the stamp overlaps the top-right corner of the card', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(ES);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { stamp, card } = await page.evaluate(() => {
    const el = document.querySelector('[data-record-banner] [data-stamp]') as HTMLElement;
    const section = el.closest('.record-card') as HTMLElement;
    return {
      stamp: el.getBoundingClientRect().toJSON(),
      card: section.getBoundingClientRect().toJSON(),
    };
  });
  expect(stamp.top).toBeLessThan(card.top + 4);
  expect(stamp.bottom).toBeGreaterThan(card.top);
  expect(stamp.right).toBeGreaterThan(card.right - 80);
});

test('the banner card tilts slightly; the in-content card stays level', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(ES);
  const banner = await page.locator('[data-record-banner] .record-card').evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      rotate: s.rotate,
      ruled: getComputedStyle(el.querySelector('.record-head') as Element).borderBottomWidth,
    };
  });
  expect(parseFloat(banner.rotate)).toBeLessThan(0);
  expect(Math.abs(parseFloat(banner.rotate))).toBeLessThanOrEqual(1);
  expect(parseFloat(banner.ruled)).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  const inline = await page
    .locator('[data-record-inline] .record-card')
    .evaluate((el) => getComputedStyle(el).rotate);
  expect(inline).toBe('none');
});

for (const [path, width] of [
  [ES, 360],
  [EN, 360],
] as const) {
  test(`${path} does not overflow horizontally at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(path);
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });
}

test('under reduced motion the stamp shows its final state with no running animation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(ES);
  const state = await page.evaluate(() => ({
    name: getComputedStyle(document.querySelector('[data-stamp]') as Element).animationName,
    running: document
      .getAnimations()
      .filter(
        (a) =>
          a.playState === 'running' &&
          (a.effect as KeyframeEffect | null)?.target?.closest('[data-stamp]'),
      ).length,
  }));
  expect(state.name).toBe('none');
  expect(state.running).toBe(0);
});

test('with motion allowed the stamp lands once with transform only', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(ES);
  const info = await page.locator(BANNER).evaluate((el) => {
    const s = getComputedStyle(el);
    const frames = (
      document.getAnimations().find((a) => (a.effect as KeyframeEffect).target === el)?.effect as
        | KeyframeEffect
        | undefined
    )?.getKeyframes();
    return {
      name: s.animationName,
      count: s.animationIterationCount,
      keys: [...new Set((frames ?? []).flatMap((f) => Object.keys(f)))],
    };
  });
  expect(info.name).toMatch(/stamp-land/);
  expect(info.count).toBe('1');
  expect(info.keys).not.toContain('opacity');
});

for (const theme of THEMES) {
  for (const [label, size, path] of [
    ['banner card', { width: 1280, height: 900 }, ES],
    ['phone card', { width: 390, height: 844 }, ES],
    ['phone card EN', { width: 390, height: 844 }, EN],
  ] as const) {
    test(`${label} has no axe violations (${theme})`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto(path);
      await setTheme(page, theme);
      const result = await scan(page);
      expect(describeViolations(result.violations)).toEqual([]);
    });
  }
}
