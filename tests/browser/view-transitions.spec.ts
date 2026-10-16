import { expect, type Page, test } from '@playwright/test';

import { has } from './helpers/features';

/**
 * Cross-page view transitions (DESIGN.md "Page transitions"): CSS-only `@view-transition`, gated on
 * `prefers-reduced-motion: no-preference`. The suite default is `reduce`, so every motion test opts in.
 */

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
});

declare global {
  interface Window {
    __vt?: boolean;
    __revealed?: string;
    __entrances?: number;
  }
}

/** Records, per document, whether `pagereveal` carried a view transition and how many entrances started. */
const instrument = (page: Page) =>
  page.addInitScript(() => {
    window.__entrances = 0;
    addEventListener('pagereveal', (event) => {
      window.__revealed = location.pathname;
      window.__vt = Boolean((event as Event & { viewTransition?: unknown }).viewTransition);
    });
    addEventListener('animationstart', (event) => {
      const name = (event as AnimationEvent).animationName;
      if (name === 'fade-in-up') {
        window.__entrances = (window.__entrances ?? 0) + 1;
      }
    });
  });

/**
 * Reads whether the new document's `pagereveal` carried a view transition. `toHaveURL` passes at
 * commit, before the new document has revealed (and the old document still holds its own value),
 * so wait until `pagereveal` ran for `path` before reading.
 */
const viewTransition = async (page: Page, path: string) => {
  await expect.poll(() => page.evaluate(() => window.__revealed)).toBe(path);
  return page.evaluate(() => window.__vt);
};

const motion = async (page: Page) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await instrument(page);
};

test('an internal link navigates through a view transition when motion is allowed', async ({
  page,
}) => {
  test.skip(!has({ routes: ['notes'] }), 'needs the notes routes');
  await motion(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Notas' }).first().click();
  await expect(page).toHaveURL(/\/notes\/$/);
  expect(await viewTransition(page, '/notes/')).toBe(true);
});

test('switching language navigates through a view transition and lands on the other locale', async ({
  page,
}) => {
  await motion(page);
  await page.goto('/');
  await page.locator('a[hreflang="en"]').first().click();
  await expect(page).toHaveURL(/\/en\/$/);
  expect(await viewTransition(page, '/en/')).toBe(true);
});

test('reduced motion navigates normally, with no view transition', async ({ page }) => {
  test.skip(!has({ routes: ['notes'] }), 'needs the notes routes');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await instrument(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Notas' }).first().click();
  await expect(page).toHaveURL(/\/notes\/$/);
  expect(await viewTransition(page, '/notes/')).toBe(false);
});

test('the opt-in rule only exists under no-preference and the pseudo-elements stop under reduce', async ({
  page,
}) => {
  await page.goto('/');
  const rules = await page.evaluate(() => {
    const out: { viewTransitionIn: string[]; reduceHasNone: boolean } = {
      viewTransitionIn: [],
      reduceHasNone: false,
    };
    const walk = (list: CSSRuleList, media: string) => {
      for (const rule of Array.from(list)) {
        if (rule.constructor.name === 'CSSViewTransitionRule') out.viewTransitionIn.push(media);
        if (rule instanceof CSSMediaRule) walk(rule.cssRules, rule.conditionText);
        if (
          media.includes('reduce') &&
          rule instanceof CSSStyleRule &&
          rule.selectorText.includes('::view-transition') &&
          rule.style.animationName === 'none'
        ) {
          out.reduceHasNone = true;
        }
      }
    };
    for (const sheet of Array.from(document.styleSheets)) walk(sheet.cssRules, '');
    return out;
  });
  expect(rules.viewTransitionIn.length).toBeGreaterThan(0);
  for (const media of rules.viewTransitionIn) expect(media).toContain('no-preference');
  expect(rules.reduceHasNone).toBe(true);
});

test('the navbar keeps its place across pages through a stable view-transition-name', async ({
  page,
}) => {
  await motion(page);
  await page.goto('/');
  const name = await page.evaluate(
    () => getComputedStyle(document.querySelector('[data-navbar]') as Element).viewTransitionName,
  );
  expect(name).toBe('site-nav');
});

test('the page keeps one entrance: same on a navigated load as on a cold load, none on the navbar', async ({
  page,
}) => {
  test.skip(!has({ routes: ['notes'] }), 'needs the notes routes');
  await motion(page);
  await page.goto('/notes/');
  await expect.poll(() => page.evaluate(() => window.__entrances)).toBeGreaterThan(0);
  await page.waitForTimeout(1000);
  const cold = await page.evaluate(() => window.__entrances);

  await page.goto('/');
  await page.getByRole('link', { name: 'Notas' }).first().click();
  await expect(page).toHaveURL(/\/notes\/$/);
  expect(await viewTransition(page, '/notes/')).toBe(true);
  await page.waitForTimeout(1000);
  // Not doubled: the transition adds no second entrance on top of the page's own.
  expect(await page.evaluate(() => window.__entrances)).toBe(cold);
  // The navbar persists through its own transition group instead of fading in on every page.
  const navAnimations = await page.evaluate(
    () => (document.querySelector('[data-navbar]') as Element).getAnimations().length,
  );
  expect(navAnimations).toBe(0);
});

test('back and forward restore the previous pages', async ({ page }) => {
  test.skip(!has({ routes: ['notes'] }), 'needs the notes routes');
  await motion(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Notas' }).first().click();
  await expect(page).toHaveURL(/\/notes\/$/);
  await page.goBack();
  await expect(page).toHaveURL(/127\.0\.0\.1:4322\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/notes\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('the theme toggle stays in place: no navigation and no view transition', async ({ page }) => {
  test.skip(!has({ flags: ['themeToggle'] }), 'needs features.themeToggle');
  await motion(page);
  await page.goto('/');
  const before = await page.evaluate(() => document.documentElement.dataset['theme']);
  await page.getByRole('button', { name: /cambiar tema|switch theme/i }).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset['theme']))
    .not.toBe(before);
  await expect(page).toHaveURL(/127\.0\.0\.1:4322\/$/);
});

test('no horizontal overflow at 360 px after a transitioned navigation', async ({ page }) => {
  test.skip(!has({ routes: ['notes'] }), 'needs the notes routes');
  await page.setViewportSize({ width: 360, height: 800 });
  await motion(page);
  await page.goto('/');
  await page.getByRole('button', { name: /menú|menu/i }).click();
  await page.getByRole('link', { name: 'Notas' }).last().click();
  await expect(page).toHaveURL(/\/notes\/$/);
  await page.waitForTimeout(600);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
