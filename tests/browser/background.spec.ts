import { expect, test } from '@playwright/test';

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
    const stars = document.querySelector('.banner-stars');
    if (!canvas || !stars) throw new Error('Expected background canvas and static stars');
    return {
      coarsePointer: matchMedia('(pointer: coarse)').matches,
      canvasDisplay: getComputedStyle(canvas).display,
      starsDisplay: getComputedStyle(stars).display,
      starsBackground: getComputedStyle(stars).backgroundImage,
      starsAnimation: getComputedStyle(stars).animationName,
      probe: (window as unknown as Window & { __backgroundProbe: BackgroundProbe })
        .__backgroundProbe,
    };
  });

  expect(state.coarsePointer).toBe(true);
  expect(state.canvasDisplay).toBe('none');
  expect(state.starsDisplay).not.toBe('none');
  expect(state.starsBackground).toContain('radial-gradient');
  expect(state.starsAnimation).toBe('none');
  expect(state.probe).toEqual({ webgl2Attempts: 0, animationFrames: 0 });
  await context.close();
});

test('fine-pointer desktop keeps the animated WebGL background', async ({ browser }) => {
  const context = await browser.newContext({
    isMobile: false,
    hasTouch: false,
    reducedMotion: 'no-preference',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await page.addInitScript(instrumentBackground);
  await page.goto('/');
  await page.waitForFunction(
    () =>
      (window as unknown as Window & { __backgroundProbe: BackgroundProbe }).__backgroundProbe
        .animationFrames > 1,
  );

  const state = await page.evaluate(() => {
    const canvas = document.querySelector('[data-background]');
    const stars = document.querySelector('.banner-stars');
    if (!canvas || !stars) throw new Error('Expected background canvas and static stars');
    return {
      finePointer: matchMedia('(pointer: fine)').matches,
      canvasDisplay: getComputedStyle(canvas).display,
      starsAnimation: getComputedStyle(stars).animationName,
      probe: (window as unknown as Window & { __backgroundProbe: BackgroundProbe })
        .__backgroundProbe,
    };
  });

  expect(state.finePointer).toBe(true);
  expect(state.canvasDisplay).not.toBe('none');
  expect(state.starsAnimation).toBe('banner-twinkle');
  expect(state.probe.webgl2Attempts).toBeGreaterThan(0);
  expect(state.probe.animationFrames).toBeGreaterThan(1);
  await context.close();
});
