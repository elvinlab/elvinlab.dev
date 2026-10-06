import { expect, type Page, test } from '@playwright/test';

import { describeViolations, scan } from './helpers/axe';
import { stubThirdParties } from './helpers/third-party';

const PAGES = ['/', '/notes/smoke-es/', '/me/', '/en/notes/smoke-en/'];
const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 1280, height: 720 },
];

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
  await stubThirdParties(page);
});

/** Waits until the document height stops changing (stubbed embeds and fonts settle late). */
const settle = async (page: Page): Promise<void> => {
  let previous = -1;
  for (let i = 0; i < 40; i += 1) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    if (height === previous) return;
    previous = height;
    await page.waitForTimeout(250);
  }
};

const button = (page: Page) => page.locator('[data-back-to-top]');

const scrollTo = async (page: Page, top: number): Promise<void> => {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
};

/** Scrolls deep, then up a little: the only gesture that reveals the button. */
const reveal = async (page: Page): Promise<void> => {
  await scrollTo(page, 1200);
  await scrollTo(page, 1100);
  await expect(button(page)).toHaveAttribute('data-shown', '');
};

/** Visible focusable elements (other than the button) whose box intersects the button's box. */
const overlaps = (page: Page) =>
  page.evaluate(() => {
    const own = document.querySelector('[data-back-to-top]');
    if (!own) return ['missing button'];
    const a = own.getBoundingClientRect();
    const focusable =
      'a[href], button, input, select, textarea, summary, iframe, [tabindex]:not([tabindex="-1"])';
    return [...document.querySelectorAll<HTMLElement>(focusable)]
      .filter((el) => el !== own && !own.contains(el))
      .filter((el) => {
        const style = getComputedStyle(el);
        const b = el.getBoundingClientRect();
        return (
          b.width > 0 &&
          b.height > 0 &&
          style.visibility !== 'hidden' &&
          !el.closest('[inert], [hidden]')
        );
      })
      .filter((el) => {
        const b = el.getBoundingClientRect();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      })
      .map((el) => `${el.tagName.toLowerCase()} ${el.textContent?.trim().slice(0, 30) ?? ''}`);
  });

test.describe('back to top', () => {
  test('is hidden and unavailable at the top and while reading downwards', async ({ page }) => {
    await page.goto('/notes/smoke-es/');
    await expect(button(page)).toBeHidden();
    await expect(button(page)).toHaveAttribute('aria-hidden', 'true');
    await expect(button(page)).toHaveJSProperty('inert', true);
    await scrollTo(page, 1200);
    await scrollTo(page, 1800);
    await expect(button(page)).toBeHidden();
    await expect(button(page)).not.toHaveAttribute('data-shown');
  });

  test('appears after a deep scroll and a small scroll up, announced and labelled', async ({
    page,
  }) => {
    await page.goto('/notes/smoke-es/');
    await reveal(page);
    await expect(button(page)).toBeVisible();
    await expect(button(page)).toHaveAttribute('aria-hidden', 'false');
    await expect(button(page)).toHaveJSProperty('inert', false);
    await expect(page.getByRole('button', { name: 'Volver arriba' })).toBeVisible();
    const box = await button(page).boundingBox();
    expect(box?.width).toBe(44);
    expect(box?.height).toBe(44);
  });

  test('does not appear when scrolling up from a shallow position', async ({ page }) => {
    await page.goto('/notes/smoke-es/');
    await scrollTo(page, 600);
    await scrollTo(page, 500);
    await expect(button(page)).toBeHidden();
  });

  test('hides again when scrolling down and at the top', async ({ page }) => {
    await page.goto('/notes/smoke-es/');
    await reveal(page);
    await scrollTo(page, 1500);
    await expect(button(page)).toBeHidden();
    await reveal(page);
    await scrollTo(page, 100);
    await expect(button(page)).toBeHidden();
  });

  test('click returns to the top, hides and moves focus to the navbar', async ({ page }) => {
    await page.goto('/notes/smoke-es/');
    await reveal(page);
    await button(page).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(button(page)).toBeHidden();
    await expect(button(page)).toHaveAttribute('aria-hidden', 'true');
    expect(
      await page.evaluate(() => document.activeElement?.closest('[data-navbar]') !== null),
    ).toBe(true);
  });

  test('asks for smooth scrolling unless reduced motion is on', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/notes/smoke-es/');
    await page.evaluate(() => {
      const w = window as unknown as { __behavior?: string | undefined };
      const original = window.scrollTo.bind(window);
      window.scrollTo = ((arg?: ScrollToOptions | number) => {
        if (typeof arg === 'object') w.__behavior = arg.behavior;
        return (original as (a?: ScrollToOptions | number) => void)(arg);
      }) as typeof window.scrollTo;
    });
    await reveal(page);
    await button(page).click();
    expect(
      await page.evaluate(() => (window as unknown as { __behavior?: string }).__behavior),
    ).toBe('smooth');
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBe(0);
    await expect(button(page)).toBeHidden();
  });

  test('keyboard reaches it only while shown', async ({ page }) => {
    await page.goto('/notes/smoke-es/');
    await scrollTo(page, 1200);
    const stops = async (): Promise<boolean> => {
      for (let i = 0; i < 80; i += 1) {
        await page.keyboard.press('Tab');
        if (await page.evaluate(() => document.activeElement?.hasAttribute('data-back-to-top')))
          return true;
      }
      return false;
    };
    expect(await stops()).toBe(false);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await scrollTo(page, 0);
    await reveal(page);
    await expect(button(page)).toHaveAttribute('data-shown', '');
    await button(page).focus();
    await expect(button(page)).toBeFocused();
    // Reading downwards while it has focus must not pull it from under the keyboard.
    await scrollTo(page, 1400);
    await expect(button(page)).toHaveAttribute('data-shown', '');
  });

  test('has an accessible name in both languages', async ({ page }) => {
    for (const [path, name] of [
      ['/', 'Volver arriba'],
      ['/en/', 'Back to top'],
    ] as const) {
      await page.goto(path);
      await expect(button(page)).toHaveAttribute('aria-label', name);
      await expect(button(page)).toHaveAttribute('title', name);
    }
  });

  test('is hidden in print', async ({ page }) => {
    await page.goto('/notes/smoke-es/');
    await reveal(page);
    await page.emulateMedia({ media: 'print' });
    await expect(button(page)).toBeHidden();
    const me = page.context().newPage();
    await (await me).goto('/me/');
    await (await me).emulateMedia({ media: 'print' });
    await expect((await me).locator('[data-back-to-top]')).toBeHidden();
  });

  for (const viewport of VIEWPORTS) {
    for (const path of PAGES) {
      test(`never covers a control at the bottom of ${path} at ${viewport.width} px`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.goto(path);
        await settle(page);
        const max = await page.evaluate(
          () => document.documentElement.scrollHeight - window.innerHeight,
        );
        if (max < 830) {
          // A page this short never offers the button: nothing to overlap.
          await scrollTo(page, max);
          await scrollTo(page, Math.max(0, max - 100));
          await expect(button(page)).toBeHidden();
          return;
        }
        // Mid-page the button floats over content like any fixed control; what matters is the bottom, where the controls are.
        for (const up of [8, 60, 150].filter((n) => max - n > 830)) {
          await page.evaluate(() => document.fonts.ready);
          const bottom = await page.evaluate(
            () => document.documentElement.scrollHeight - window.innerHeight,
          );
          await scrollTo(page, bottom);
          await scrollTo(page, bottom - up);
          await expect(button(page)).toHaveAttribute('data-shown', '');
          expect(await overlaps(page), `${up} px above the bottom`).toEqual([]);
        }
        const box = await button(page).boundingBox();
        expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
      });
    }
  }

  test('stays clear of the reading mode exit button', async ({ page }) => {
    await page.goto('/notes/smoke-es/');
    await page.locator('[data-reading-toggle]').click();
    await expect(page.locator('[data-reading-exit]')).toBeVisible();
    await reveal(page);
    expect(await overlaps(page)).toEqual([]);
    const max = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
    await scrollTo(page, max);
    await scrollTo(page, max - 8);
    await expect(button(page)).toHaveAttribute('data-shown', '');
    expect(await overlaps(page)).toEqual([]);
  });

  for (const theme of ['elvinlab-dark', 'elvinlab-light']) {
    test(`has no axe violations while shown (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
      await page.goto('/notes/smoke-es/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await reveal(page);
      const { violations } = await scan(page);
      expect(describeViolations(violations)).toEqual([]);
    });
  }
});
