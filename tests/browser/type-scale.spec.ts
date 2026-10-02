import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, type Locator, type Page, test } from '@playwright/test';

/**
 * The fixture build copies the real `site.config.ts`; `FIXTURE_APPEARANCE` overrides the preset of
 * the copy. The expected sizes follow the preset the page root carries (`html[data-appearance]`),
 * from `src/styles/type-scale.css` (rem at 16 px; `md` is 48 rem, so 360 is the phone column and
 * 1280 the desktop one):
 *   minimal: hero 32/44, section 20, note title 30/40, card title 20/22, prose 17
 *   full:    hero 36/60, section 24, note title 36/48, card title 30/36, prose 18
 */
type Preset = 'minimal' | 'full';
type Scale = { hero: number; noteTitle: number; cardTitle: number; section: number; prose: number };

const SCALES: Record<Preset, Record<string, Scale>> = {
  minimal: {
    'chromium-360': { hero: 32, noteTitle: 30, cardTitle: 20, section: 20, prose: 17 },
    'chromium-1280': { hero: 44, noteTitle: 40, cardTitle: 22, section: 20, prose: 17 },
  },
  full: {
    'chromium-360': { hero: 36, noteTitle: 36, cardTitle: 30, section: 24, prose: 18 },
    'chromium-1280': { hero: 60, noteTitle: 48, cardTitle: 36, section: 24, prose: 18 },
  },
};
const PROSE_LINE_HEIGHT = 1.75;

/** The preset the build is expected to carry: the override when set, else the real site config. */
const expectedPreset = (): Preset => {
  const override = process.env['FIXTURE_APPEARANCE'];
  if (override === 'minimal' || override === 'full') return override;
  const config = readFileSync(join(process.cwd(), 'apps/web/src/site.config.ts'), 'utf8');
  const match = /appearance: '(minimal|full)'/.exec(config);
  if (!match) throw new Error('site.config.ts has no appearance line');
  return match[1] as Preset;
};

const presetOf = async (page: Page): Promise<Preset> => {
  const value = await page.evaluate(() => document.documentElement.dataset['appearance']);
  if (value !== 'minimal' && value !== 'full') throw new Error(`unknown appearance: ${value}`);
  return value;
};

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(
    !(testInfo.project.name in SCALES.minimal),
    'the md breakpoint is covered at 360 and 1280',
  );
});

const fontSize = (locator: Locator) =>
  locator.first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));

test('the page root carries the resolved appearance', async ({ page }) => {
  const preset = expectedPreset();
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-appearance', preset);
  await page.goto('/notes/smoke-es/');
  await expect(page.locator('html')).toHaveAttribute('data-appearance', preset);
});

test('the home computes the scale of its preset', async ({ page }, testInfo) => {
  await page.goto('/');
  const expected = SCALES[await presetOf(page)][testInfo.project.name];
  if (!expected) throw new Error('unreachable: skipped in beforeEach');
  expect(await fontSize(page.locator('[data-home-hero] h1'))).toBe(expected.hero);
  expect(await fontSize(page.locator('main h2:has(> span.bg-primary)'))).toBe(expected.section);
  expect(await fontSize(page.locator('main h2:has(> a[href*="/notes/"])'))).toBe(
    expected.cardTitle,
  );
});

test('a note computes the title and prose scale of its preset', async ({ page }, testInfo) => {
  await page.goto('/notes/smoke-es/');
  const expected = SCALES[await presetOf(page)][testInfo.project.name];
  if (!expected) throw new Error('unreachable: skipped in beforeEach');
  expect(await fontSize(page.locator('main h1'))).toBe(expected.noteTitle);
  const paragraph = page.locator('article .prose p');
  expect(await fontSize(paragraph)).toBe(expected.prose);
  expect(
    await paragraph.first().evaluate((element) => {
      const style = getComputedStyle(element);
      return Number.parseFloat(style.lineHeight) / Number.parseFloat(style.fontSize);
    }),
  ).toBeCloseTo(PROSE_LINE_HEIGHT, 2);
});
