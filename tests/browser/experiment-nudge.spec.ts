import { expect, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { stubThirdParties } from './helpers/third-party';

const NOTES = [
  { path: '/notes/smoke-es/', label: /Último experimento/, experiments: '/experiments/' },
  { path: '/en/notes/smoke-en/', label: /Latest experiment/, experiments: '/en/experiments/' },
] as const;

const STATIC_CARD = '[data-experiment-card]:not([data-nudge-floating])';
const FLOATING = '[data-nudge-floating]';
const OPEN = '[data-nudge-floating][data-open]';

test.beforeEach(async ({ page }) => {
  await stubThirdParties(page);
});

/** A short viewport, so the fixture notes are long enough to scroll through at every width. */
async function shortViewport(page: Page): Promise<void> {
  const size = page.viewportSize();
  await page.setViewportSize({ width: size?.width ?? 1280, height: 420 });
}

/** Scrolls so the bottom of the viewport sits at `share` of the element's height. */
const readTo = (page: Page, selector: string, share: number) =>
  page.evaluate(
    ([sel, f]) => {
      const el = document.querySelector(sel as string) as HTMLElement;
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + el.offsetHeight * (f as number) - window.innerHeight);
    },
    [selector, share] as const,
  );

for (const { path, label, experiments } of NOTES) {
  test.describe(`${path} experiment card`, () => {
    test('shows the static card at the end of the note, with a labelled link', async ({ page }) => {
      await page.goto(path);
      const card = page.locator(STATIC_CARD);
      await expect(card).toHaveCount(1);
      await card.scrollIntoViewIfNeeded();
      await expect(card).toBeVisible();
      const link = card.getByRole('link');
      await expect(link).toHaveAccessibleName(label);
      await expect(link).toHaveAttribute('href', new RegExp(`^(${experiments}|/(en/)?notes/)`));
      await expect(card.locator('.xn-title')).not.toBeEmpty();
      await expect(card.locator('.xn-tag').first()).toBeVisible();
    });

    test('floats at the bottom centre once the note is mostly read', async ({ page }) => {
      await shortViewport(page);
      await page.goto(path);
      await expect(page.locator(FLOATING)).toHaveCount(1);
      await expect(page.locator(OPEN)).toHaveCount(0);
      await readTo(page, 'article', 0.4);
      await expect(page.locator(OPEN)).toHaveCount(0);

      await readTo(page, 'article', 0.8);
      const card = page.locator(OPEN);
      await expect(card).toBeVisible();
      const box = await card.boundingBox();
      const width = page.viewportSize()?.width ?? 0;
      expect(Math.abs((box?.x ?? 0) + (box?.width ?? 0) / 2 - width / 2)).toBeLessThan(2);
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeGreaterThan(420 - 40);
    });

    test('never opens on load, only after the visitor scrolls', async ({ page }) => {
      await page.setViewportSize({ width: page.viewportSize()?.width ?? 1280, height: 1600 });
      await page.goto(path);
      await page.waitForTimeout(500);
      await expect(page.locator(OPEN)).toHaveCount(0);
    });

    test('hides at the page bottom, so it never covers the footer links', async ({ page }) => {
      await shortViewport(page);
      await page.goto(path);
      await readTo(page, 'article', 0.8);
      await expect(page.locator(OPEN)).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect(page.locator(OPEN)).toHaveCount(0);
    });

    test('steps aside once keyboard focus moves outside it', async ({ page }) => {
      await shortViewport(page);
      await page.goto(path);
      await readTo(page, 'article', 0.8);
      await expect(page.locator(OPEN)).toBeVisible();
      await page.locator('main a, main button').first().focus();
      await expect(page.locator(OPEN)).toHaveCount(0);
      await readTo(page, 'article', 0.85);
      await expect(page.locator(OPEN)).toHaveCount(0);
    });

    test('closes with the button and stays away for good', async ({ page }) => {
      await shortViewport(page);
      await page.goto(path);
      await readTo(page, 'article', 0.8);
      await expect(page.locator(OPEN)).toBeVisible();
      await page.locator('.nudge-close').click();
      await expect(page.locator(FLOATING)).toBeHidden();
      expect(await page.evaluate(() => localStorage.getItem('experiment-nudge'))).toMatch(
        /^\d{13}$/,
      );
      await page.reload();
      await expect(page.locator(FLOATING)).toHaveCount(0);
    });

    test('shows once per session even when it was not closed', async ({ page }) => {
      await shortViewport(page);
      await page.goto(path);
      await readTo(page, 'article', 0.8);
      await expect(page.locator(OPEN)).toBeVisible();
      await page.reload();
      await expect(page.locator(FLOATING)).toHaveCount(0);
    });

    test('hides while the static card is on screen and returns after', async ({ page }) => {
      await shortViewport(page);
      await page.goto(path);
      await readTo(page, 'article', 0.8);
      await expect(page.locator(OPEN)).toBeVisible();
      await page.locator(STATIC_CARD).scrollIntoViewIfNeeded();
      await expect(page.locator(OPEN)).toHaveCount(0);
      await readTo(page, 'article', 0.8);
      await expect(page.locator(OPEN)).toBeVisible();
    });

    test('keeps clear of the cards around it and never overflows the page', async ({ page }) => {
      await page.goto(path);
      const gaps = await page.evaluate((selector) => {
        const skip = (el: Element | null, dir: 'previousElementSibling' | 'nextElementSibling') => {
          let node = el;
          while (node && ['STYLE', 'SCRIPT', 'TEMPLATE'].includes(node.tagName)) node = node[dir];
          return node;
        };
        const card = document.querySelector(selector) as HTMLElement;
        const rect = card.getBoundingClientRect();
        const prev = skip(card.previousElementSibling, 'previousElementSibling');
        const next = skip(card.nextElementSibling, 'nextElementSibling');
        // The pixel frame reaches 4 px beyond the box.
        return {
          above: prev ? rect.top - 4 - prev.getBoundingClientRect().bottom : Number.NaN,
          below: next ? next.getBoundingClientRect().top - (rect.bottom + 4) : Number.NaN,
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      }, STATIC_CARD);
      expect(gaps.above).toBeGreaterThanOrEqual(16);
      expect(gaps.below).toBeGreaterThanOrEqual(16);
      expect(gaps.overflow).toBe(false);
    });

    for (const theme of ['elvinlab-dark', 'elvinlab-light']) {
      test(`has no axe violations with the card open (${theme})`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
        await shortViewport(page);
        await page.goto(path);
        await readTo(page, 'article', 0.8);
        await expect(page.locator(OPEN)).toBeVisible();
        const { violations } = await scan(page);
        expect(describeViolations(violations)).toEqual([]);
      });
    }
  });
}

test.describe('the notes index', () => {
  test('floats the card at the lower threshold and holds none in the page', async ({ page }) => {
    await shortViewport(page);
    await page.goto('/notes/');
    await expect(page.locator(STATIC_CARD)).toHaveCount(0);
    await expect(page.locator('template[data-experiment-template]')).toHaveCount(1);
    await expect(page.locator(OPEN)).toHaveCount(0);
    await readTo(page, 'main', 0.75);
    await expect(page.locator(OPEN)).toBeVisible();
  });

  test('shares the close with the notes', async ({ page }) => {
    await shortViewport(page);
    await page.goto('/notes/');
    await readTo(page, 'main', 0.75);
    await page.locator('.nudge-close').click();
    await page.goto(NOTES[0].path);
    await expect(page.locator(FLOATING)).toHaveCount(0);
  });
});

test.describe('where the card must not appear', () => {
  for (const path of ['/me/', '/en/me/', '/contact/', '/experiments/', '/en/experiments/']) {
    test(`${path} has no card and no floating copy`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('[data-experiment-card]')).toHaveCount(0);
      await expect(page.locator(FLOATING)).toHaveCount(0);
    });
  }

  for (const path of ['/', '/en/']) {
    test(`${path} shows the static card and never floats it`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator(STATIC_CARD)).toHaveCount(1);
      await expect(page.locator(FLOATING)).toHaveCount(0);
    });
  }
});

test('reduced motion: the card appears without a visible transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await shortViewport(page);
  await page.goto(NOTES[0].path);
  await readTo(page, 'article', 0.8);
  await expect(page.locator(OPEN)).toBeVisible();
  const duration = await page
    .locator(FLOATING)
    .evaluate((el) => Number.parseFloat(getComputedStyle(el).transitionDuration));
  expect(duration).toBeLessThan(0.01);
});
