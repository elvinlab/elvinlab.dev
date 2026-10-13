import { expect, type Page, test } from '@playwright/test';

import { has } from './helpers/features';

test('the background picker cycles galaxy -> cursor-waves -> off at runtime, no reload, from the paper default', async ({
  browser,
}) => {
  test.skip(!has({ flags: ['backgroundPicker'] }), 'needs features.backgroundPicker');
  // Effects are intentionally inert under prefers-reduced-motion (the project default); override
  // it here, like the fine-pointer test below, to exercise the actual runtime swap.
  const context = await browser.newContext({ reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto('/');
  const picker = page.getByRole('button', { name: /cambiar fondo|change background/i });
  const stored = () => page.evaluate(() => localStorage.getItem('background'));

  // The owner default is the static paper ('off'): nothing stored and no effect running yet.
  expect(await stored()).toBeNull();
  await expect(page.locator('[data-background]')).not.toBeVisible();

  await picker.click();
  expect(await stored()).toBe('galaxy');
  await expect(page.locator('[data-background]')).toBeVisible();

  await picker.click();
  expect(await stored()).toBe('cursor-waves');
  await expect(page.locator('[data-background]')).toBeVisible();

  await picker.click();
  expect(await stored()).toBe('off');
  await expect(page.locator('[data-background]')).not.toBeVisible();
  await context.close();
});

test('the background choice persists across reloads', async ({ browser }) => {
  test.skip(!has({ flags: ['backgroundPicker'] }), 'needs features.backgroundPicker');
  const context = await browser.newContext({ reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto('/');
  const picker = page.getByRole('button', { name: /cambiar fondo|change background/i });
  await picker.click();
  await picker.click();
  expect(await page.evaluate(() => localStorage.getItem('background'))).toBe('cursor-waves');

  await page.reload();
  await expect(page.locator('[data-background]')).toBeVisible();

  await picker.click();
  expect(await page.evaluate(() => localStorage.getItem('background'))).toBe('off');
  await page.reload();
  await expect(page.locator('[data-background]')).not.toBeVisible();
  await context.close();
});

test('regression: cycling many times never loses the WebGL context (one context per canvas, reused across effects)', async ({
  browser,
}) => {
  test.skip(!has({ flags: ['backgroundPicker'] }), 'needs features.backgroundPicker');
  // A prior implementation opened a fresh WebGL2 context per effect switch; Firefox in particular
  // enforces a low concurrent-context limit and would lose the context after a handful of cycles,
  // leaving the banner blank. Regression for that: cycle well past where it used to break.
  const context = await browser.newContext({ reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const messages: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') messages.push(msg.text());
  });
  page.on('pageerror', (error) => messages.push(error.message));

  // The home footprint card reads its counter; the test fixture has no database, so answer it here
  // and keep this test about the background only.
  await page.route(
    (url) => url.pathname.includes('/_actions/marks.'),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json+devalue',
        body: JSON.stringify([{ total: 1 }, 0]),
      }),
  );
  await page.goto('/');
  const picker = page.getByRole('button', { name: /cambiar fondo|change background/i });
  for (let i = 0; i < 20; i++) {
    await picker.click();
  }
  await page.waitForTimeout(200);

  expect(messages).toEqual([]);
  // Settled on a known state (20 clicks of the 3-state cycle starting from the 'off' default end on cursor-waves).
  expect(await page.evaluate(() => localStorage.getItem('background'))).toBe('cursor-waves');
  await context.close();
});

/** Computed state of the paper layer and its two pseudo-elements (ruler, crosses). */
const paperState = (page: Page) =>
  page.evaluate(() => {
    const paper = document.querySelector('.banner-grid') as Element;
    const style = getComputedStyle(paper);
    return {
      paperDisplay: style.display,
      paperBackground: style.backgroundImage,
      paperAnimation: style.animationName,
      rulerAnimation: getComputedStyle(paper, '::before').animationName,
      crossesAnimation: getComputedStyle(paper, '::after').animationName,
      legacyLayers: document.querySelectorAll('.banner-stars, .banner-glow').length,
    };
  });

type BackgroundProbe = { webgl2Attempts: number; animationFrames: number };

const instrumentBackground = (): void => {
  const host = window as unknown as Window & { __backgroundProbe: BackgroundProbe };
  host.__backgroundProbe = { webgl2Attempts: 0, animationFrames: 0 };

  const canvas = HTMLCanvasElement.prototype as unknown as {
    getContext: (this: HTMLCanvasElement, ...args: unknown[]) => unknown;
  };
  const getContext = canvas.getContext;
  canvas.getContext = function (this: HTMLCanvasElement, ...args: unknown[]): unknown {
    if (args[0] === 'webgl2') host.__backgroundProbe.webgl2Attempts += 1;
    return getContext.apply(this, args);
  };

  const requestAnimationFrame = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    host.__backgroundProbe.animationFrames += 1;
    return requestAnimationFrame(callback);
  };
};

test('coarse-pointer touch devices keep the static background without starting WebGL animation', async ({
  browser,
}) => {
  const context = await browser.newContext({
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'no-preference',
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.addInitScript(instrumentBackground);
  await page.goto('/');

  const state = await page.evaluate(() => {
    const canvas = document.querySelector('[data-background]');
    const paper = document.querySelector('.banner-grid');
    if (!canvas || !paper) throw new Error('Expected background canvas and the paper layer');
    return {
      coarsePointer: matchMedia('(pointer: coarse)').matches,
      canvasDisplay: getComputedStyle(canvas).display,
      probe: (window as unknown as Window & { __backgroundProbe: BackgroundProbe })
        .__backgroundProbe,
    };
  });
  const paper = await paperState(page);

  expect(state.coarsePointer).toBe(true);
  expect(state.canvasDisplay).toBe('none');
  expect(paper.paperDisplay).not.toBe('none');
  expect(paper.paperBackground).toContain('linear-gradient');
  expect(paper.paperAnimation).toBe('none');
  expect(paper.legacyLayers).toBe(0);
  expect(state.probe).toEqual({ webgl2Attempts: 0, animationFrames: 0 });
  await context.close();
});

test('the default background is the static paper: no WebGL, no animation, no stars or glows', async ({
  browser,
}) => {
  const context = await browser.newContext({
    isMobile: false,
    hasTouch: false,
    reducedMotion: 'no-preference',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await page.addInitScript(instrumentBackground);
  await page.goto('/');
  await page.waitForTimeout(300);

  const state = await page.evaluate(() => ({
    finePointer: matchMedia('(pointer: fine)').matches,
    canvasDisplay: getComputedStyle(document.querySelector('[data-background]') as Element).display,
    probe: (window as unknown as Window & { __backgroundProbe: BackgroundProbe }).__backgroundProbe,
  }));

  const paper = await paperState(page);

  expect(state.finePointer).toBe(true);
  expect(state.canvasDisplay).toBe('none');
  expect(paper.paperDisplay).not.toBe('none');
  expect(paper.paperAnimation).toBe('none');
  expect(paper.rulerAnimation).toBe('none');
  expect(paper.crossesAnimation).toBe('none');
  expect(paper.legacyLayers).toBe(0);
  expect(state.probe.webgl2Attempts).toBe(0);
  await context.close();
});

test('fine-pointer desktop runs the animated WebGL background once the visitor picks galaxy', async ({
  browser,
}) => {
  test.skip(!has({ flags: ['backgroundPicker'] }), 'needs features.backgroundPicker');
  const context = await browser.newContext({
    isMobile: false,
    hasTouch: false,
    reducedMotion: 'no-preference',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await page.addInitScript(instrumentBackground);
  await page.addInitScript(() => localStorage.setItem('background', 'galaxy'));
  await page.goto('/');
  await page.waitForFunction(
    () =>
      (window as unknown as Window & { __backgroundProbe: BackgroundProbe }).__backgroundProbe
        .animationFrames > 1,
  );

  const state = await page.evaluate(() => {
    const canvas = document.querySelector('[data-background]');
    if (!canvas) throw new Error('Expected background canvas');
    return {
      finePointer: matchMedia('(pointer: fine)').matches,
      canvasDisplay: getComputedStyle(canvas).display,
      probe: (window as unknown as Window & { __backgroundProbe: BackgroundProbe })
        .__backgroundProbe,
    };
  });

  expect(state.finePointer).toBe(true);
  expect(state.canvasDisplay).not.toBe('none');
  expect(state.probe.webgl2Attempts).toBeGreaterThan(0);
  expect(state.probe.animationFrames).toBeGreaterThan(1);
  await context.close();
});

const PICKER = '[data-background-toggle]';
/** `gap-1` between navbar controls (Tailwind spacing 1 = 4 px). */
const NAVBAR_GAP_PX = 4;
/** Below 390 px `global.css` drops the gap so the bar stays on one row (navbar-a11y.spec.ts). */
const NARROW_NAVBAR_GAP_PX = 0;
const NARROW_MAX_WIDTH_PX = 389;
const expectedGap = (width: number): number =>
  width <= NARROW_MAX_WIDTH_PX ? NARROW_NAVBAR_GAP_PX : NAVBAR_GAP_PX;

/** Horizontal gap between the theme toggle and the control that follows it in the navbar. */
const gapAfterThemeToggle = async (page: Page, next: string): Promise<number> => {
  const theme = await page.locator('[data-theme-toggle]').boundingBox();
  const following = await page.locator(next).boundingBox();
  if (!theme || !following) throw new Error('navbar control has no layout box');
  return following.x - (theme.x + theme.width);
};

test.describe('background picker visibility', () => {
  test('desktop with a fine pointer and motion allowed shows the picker', async ({ browser }) => {
    test.skip(!has({ flags: ['backgroundPicker'] }), 'needs features.backgroundPicker');
    const context = await browser.newContext({
      isMobile: false,
      hasTouch: false,
      reducedMotion: 'no-preference',
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator(PICKER)).toBeVisible();
    await context.close();
  });

  test('a narrow desktop window keeps the picker: width never hides it', async ({ browser }) => {
    test.skip(!has({ flags: ['backgroundPicker'] }), 'needs features.backgroundPicker');
    const context = await browser.newContext({
      isMobile: false,
      hasTouch: false,
      reducedMotion: 'no-preference',
      viewport: { width: 360, height: 800 },
    });
    const page = await context.newPage();
    await page.goto('/');
    expect(await page.evaluate(() => matchMedia('(pointer: fine)').matches)).toBe(true);
    await expect(page.locator(PICKER)).toBeVisible();
    await context.close();
  });

  for (const width of [360, 390]) {
    test(`a ${width}px touch device hides the picker and leaves no gap in the navbar`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        isMobile: true,
        hasTouch: true,
        reducedMotion: 'no-preference',
        viewport: { width, height: 844 },
      });
      const page = await context.newPage();
      await page.goto('/');
      // The picker only runs a fine-pointer effect, so the premise is a coarse primary pointer.
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
      await expect(page.locator(PICKER)).toBeHidden();
      if (has({ flags: ['themeToggle'] })) {
        expect(await gapAfterThemeToggle(page, '[data-nav-toggle]')).toBe(expectedGap(width));
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await context.close();
    });
  }

  test('prefers-reduced-motion hides the picker on desktop', async ({ browser }) => {
    const context = await browser.newContext({
      isMobile: false,
      hasTouch: false,
      reducedMotion: 'reduce',
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator(PICKER)).toBeHidden();
    await context.close();
  });

  test('prefers-reduced-motion at 360px leaves no gap in the navbar', async ({ browser }) => {
    const context = await browser.newContext({
      isMobile: false,
      hasTouch: false,
      reducedMotion: 'reduce',
      viewport: { width: 360, height: 800 },
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator(PICKER)).toBeHidden();
    if (has({ flags: ['themeToggle'] })) {
      expect(await gapAfterThemeToggle(page, '[data-nav-toggle]')).toBe(expectedGap(360));
    }
    await context.close();
  });
});
