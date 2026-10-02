import { expect, type Locator, type Page, test } from '@playwright/test';

/** Phone viewports: 360 is the narrowest supported width, 390 the design reference. */
const PHONES = [
  { width: 360, height: 780 },
  { width: 390, height: 844 },
];
const MIN_TARGET = 44;
const MIN_META_FONT_PX = 13;
/** Latest note card must start within 70% of the phone viewport height (it was 73-75% with the tall banner). */
const FOLD_RATIO = 0.7;
/** Half of the minimum target, minus one pixel so device-pixel snapping cannot flake the probe. */
const PROBE = MIN_TARGET / 2 - 1;

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each suite sets its own viewport');
});

/** True when every point of a 44 x 44 box centered on the element resolves back to the element. */
const hasTapArea = async (locator: Locator): Promise<boolean> => {
  return locator.evaluate((element, probe) => {
    element.scrollIntoView({ block: 'center' });
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return [-probe, 0, probe].every((dx) =>
      [-probe, 0, probe].every((dy) => {
        const hit = document.elementFromPoint(cx + dx, cy + dy);
        return hit !== null && element.contains(hit);
      }),
    );
  }, PROBE);
};

/** Bounding box of a rendered element; fails loudly instead of returning null. */
const boxOf = async (locator: Locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no layout box');
  return box;
};

const noHorizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

for (const phone of PHONES) {
  test.describe(`phone ${phone.width}px (coarse pointer)`, () => {
    test.use({ viewport: phone, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

    test('home banner is short enough for the latest note to start near the fold', async ({
      page,
    }) => {
      await page.addInitScript(() => {
        (window as unknown as { __cls: number }).__cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as {
            value: number;
            hadRecentInput: boolean;
          }[]) {
            if (!entry.hadRecentInput)
              (window as unknown as { __cls: number }).__cls += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.goto('/');
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);

      const card = page.locator('section', { has: page.locator('h2 a[href^="/notes/smoke-"]') });
      const cardTop = (await card.first().boundingBox())?.y ?? Number.POSITIVE_INFINITY;
      expect(cardTop).toBeLessThan(phone.height * FOLD_RATIO);

      // The hero text stays fully inside the banner and below the 72 px navbar.
      const banner = await boxOf(page.locator('[data-banner]'));
      const hero = await boxOf(page.locator('[data-home-hero]'));
      expect(hero.y).toBeGreaterThanOrEqual(72);
      expect(hero.y + hero.height).toBeLessThanOrEqual(banner.y + banner.height);
      expect(await noHorizontalOverflow(page)).toBe(true);

      expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBe(0);
    });

    test('the expanded banner can still collapse and expand', async ({ page }) => {
      await page.goto('/');
      const banner = page.locator('[data-banner]');
      const expanded = (await boxOf(banner)).height;
      await page.locator('[data-banner-toggle]').click();
      await expect(page.locator('[data-banner-toggle]')).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(async () => (await boxOf(banner)).height).toBeLessThan(expanded);
      await page.locator('[data-banner-toggle]').click();
      await expect.poll(async () => (await boxOf(banner)).height).toBe(expanded);
    });

    test('navbar controls are at least 44 x 44 and nothing overflows', async ({ page }) => {
      await page.goto('/');
      for (const selector of ['[data-theme-toggle]', '[data-nav-toggle]']) {
        const box = await boxOf(page.locator(selector));
        expect(box.width, `${selector} width`).toBeGreaterThanOrEqual(MIN_TARGET);
        expect(box.height, `${selector} height`).toBeGreaterThanOrEqual(MIN_TARGET);
      }
      // The effect never runs under a coarse pointer, so its picker is not rendered there
      // (its 44 px target is checked under "desktop pointer" below).
      await expect(page.locator('[data-background-toggle]')).toBeHidden();
      const brand = page.locator('[data-navbar] nav > a').first();
      const lang = page.locator('[data-navbar] a[hreflang="en"]').first();
      const brandBox = await boxOf(brand);
      expect(brandBox.x + brandBox.width).toBeLessThanOrEqual((await boxOf(lang)).x);
      expect(await brand.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await noHorizontalOverflow(page)).toBe(true);
    });

    test('footer links, "all notes" and the banner toggle have a 44 px hit area', async ({
      page,
    }) => {
      await page.goto('/');
      expect(await hasTapArea(page.locator('[data-banner-toggle]'))).toBe(true);
      expect(await hasTapArea(page.locator('a[href="/notes/"]:not([data-navbar] a)').first())).toBe(
        true,
      );
      const links = page.locator('footer a');
      expect(await links.count()).toBeGreaterThanOrEqual(3);
      for (let index = 0; index < (await links.count()); index += 1) {
        const link = links.nth(index);
        expect(await hasTapArea(link), `footer link ${await link.textContent()}`).toBe(true);
      }
    });
  });
}

test.describe('desktop pointer', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('the background picker is at least 44 x 44', async ({ browser }) => {
    // The picker is hidden under prefers-reduced-motion (the project default), so opt out here.
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    await page.goto('/');
    // Motion is on, so the navbar's entry animation (fade-in-up) shifts it by sub-pixels until done.
    await page
      .locator('[data-navbar]')
      .evaluate((navbar) =>
        Promise.all(navbar.getAnimations().map((animation) => animation.finished)),
      );
    const box = await boxOf(page.locator('[data-background-toggle]'));
    expect(box.width).toBeGreaterThanOrEqual(MIN_TARGET);
    expect(box.height).toBeGreaterThanOrEqual(MIN_TARGET);
    await context.close();
  });

  test('the expanded home banner keeps its desktop geometry', async ({ page }) => {
    await page.goto('/');
    const preset = await page.evaluate(() => document.documentElement.dataset['appearance']);
    // `minimal` caps it at clamp(360px, 48vh, 460px): 432 px at 900 px of viewport height.
    // `full` keeps clamp(520px, 66vh, 620px): 594 px (`src/styles/calm-layout.css`, DESIGN.md).
    const expected = { minimal: 432, full: 594 }[preset ?? ''];
    if (expected === undefined) throw new Error(`unknown appearance: ${preset}`);
    expect((await boxOf(page.locator('[data-banner]'))).height).toBe(expected);
  });
});

test.describe('background picker icon', () => {
  // Motion allowed: the picker is hidden under prefers-reduced-motion, the project default.
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });

  test('never looks like the theme toggle (no sun-like circle with rays)', async ({ page }) => {
    await page.goto('/');
    const picker = page.locator('[data-background-toggle]');
    for (let step = 0; step < 3; step += 1) {
      const visible = picker.locator('svg:not(.hidden)');
      await expect(visible).toHaveCount(1);
      // The light-theme icon is a circle surrounded by rays; the picker must not reuse that shape.
      expect(await visible.locator('circle').count(), `state ${step}`).toBe(
        (await visible.getAttribute('data-icon')) === 'off' ? 1 : 0,
      );
      await picker.click();
    }
  });
});

/** Pages that must show at least one reading-time segment (so the nowrap check cannot pass empty). */
const WITH_READING_TIME = new Set(['/', '/notes/', '/notes/smoke-es/', '/en/']);

for (const path of ['/', '/notes/', '/notes/smoke-es/', '/en/', '/me/']) {
  test.describe(`meta text on ${path}`, () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test(`mono meta and chips are at least ${MIN_META_FONT_PX}px`, async ({ page }) => {
      await page.goto(path);
      const small = await page.evaluate((min) => {
        const found: string[] = [];
        const nodes = document.querySelectorAll<HTMLElement>('main *, aside *, footer *');
        for (const node of nodes) {
          const own = [...node.childNodes].some(
            (child) => child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim() !== '',
          );
          const isMeta = node.matches('.font-mono, .bg-chip') || node.closest('.bg-chip') !== null;
          if (!own || !isMeta || node.closest('.font-retro, pre, code, .prose')) continue;
          const size = Number.parseFloat(getComputedStyle(node).fontSize);
          if (size < min) found.push(`${size}px: ${(node.textContent ?? '').trim().slice(0, 40)}`);
        }
        return found;
      }, MIN_META_FONT_PX);
      expect(small).toEqual([]);
    });

    test('reading-time segments never break across lines', async ({ page }) => {
      await page.goto(path);
      const { segments, breakable } = await page.evaluate(() => {
        const found: string[] = [];
        let count = 0;
        for (const node of document.querySelectorAll<HTMLElement>('main *')) {
          if (node.children.length > 0) continue;
          if (!/^\d+ min$/.test((node.textContent ?? '').trim())) continue;
          count += 1;
          if (getComputedStyle(node).whiteSpace !== 'nowrap') found.push(node.outerHTML);
        }
        return { segments: count, breakable: found };
      });
      if (WITH_READING_TIME.has(path)) expect(segments).toBeGreaterThan(0);
      expect(breakable).toEqual([]);
    });
  });
}
