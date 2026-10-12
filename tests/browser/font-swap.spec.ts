import { expect, type Page, type Route, test } from '@playwright/test';

/**
 * The two big faces are not preloaded (`performance.spec.ts`), so a first visit paints in the
 * fallback and swaps once the woff2 arrives. `fonts.css` declares metric-matched fallbacks
 * (`IBM Plex Sans Fallback`, `JetBrains Mono Fallback`), so the swap must not move the layout.
 *
 * The woff2 requests of the two faces are held until the test releases them, the layout is measured
 * in the fallback, then again once `document.fonts.ready` resolves. Set `FONT_SWAP_BASELINE=1` to
 * drop the fallback faces from the stacks and see how much the swap moves without them.
 *
 * Nothing but the fonts may change the layout between the two measurements. The footprint widget
 * (`marks`) renders a reserved row while its read is in flight and then reveals its button or, when
 * the read fails, removes itself. The fixture preview has no database, so that read answers 503 at a
 * moment that depends on machine load, and under load it landed between the two measurements (a
 * 60 px drop above the paragraph). The read is therefore answered with a fixed payload and the
 * widget is waited on until it settled, before the first measurement.
 *
 * The same goes for the pixel faces (the header wordmark is Press Start 2P, the page titles
 * Pixelify Sans): they are lazy and not part of this contract, but their swap (a 38 px wider
 * wordmark) used to land between the measurements under load. They are loaded up front so that only
 * the two held faces swap.
 */
const HELD_FONTS = '**/*{ibm-plex-sans,jetbrains-mono}-latin-wght-normal*.woff2';
const BASELINE = process.env['FONT_SWAP_BASELINE'] === '1';
const PAGES = ['/notes/smoke-es/', '/'];
/** Desktop, plus a phone and the tight Spanish nav width, where a wider fallback would wrap lines. */
const WIDTHS = [1280, 820, 390];

type Layout = { documentHeight: number; paragraphY: number; navLinks: number; h1Text: number };

test.beforeEach(({ browserName: _browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-1280', 'each test sets its own viewport');
});

const measure = (page: Page): Promise<Layout> =>
  page.evaluate(() => {
    const paragraph = document.querySelector('main p');
    const h1 = document.querySelector('h1');
    if (!paragraph || !h1) throw new Error('missing main paragraph or h1');
    // The h1 box can be capped by a `max-w-[..ch]`, and `ch` follows the font's "0" width, so the
    // text itself is measured, not the box.
    const range = document.createRange();
    range.selectNodeContents(h1);
    const links = [...document.querySelectorAll('header nav a')].map(
      (link) => link.getBoundingClientRect().width,
    );
    return {
      documentHeight: document.documentElement.scrollHeight,
      paragraphY: paragraph.getBoundingClientRect().y + window.scrollY,
      navLinks: links.reduce((sum, width) => sum + width, 0),
      h1Text: range.getBoundingClientRect().width,
    };
  });

for (const [path, width] of PAGES.flatMap((p) => WIDTHS.map((w) => [p, w] as const))) {
  test(`${path} at ${width} px does not move when Plex Sans and JetBrains Mono replace the fallback`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    if (BASELINE) {
      await page.addInitScript(() => {
        document.addEventListener('DOMContentLoaded', () => {
          const style = document.createElement('style');
          style.textContent =
            ":root:root{--ui-font-display:'IBM Plex Sans Variable',system-ui,sans-serif;--ui-font-body:'IBM Plex Sans Variable',system-ui,sans-serif;--ui-font-mono:'JetBrains Mono Variable',ui-monospace,monospace}";
          document.head.append(style);
        });
      });
    }

    const held: Route[] = [];
    let released = false;
    let plexRequested!: () => void;
    const plexSeen = new Promise<void>((resolve) => {
      plexRequested = resolve;
    });
    await page.route(
      (url) => url.pathname.includes('/_actions/marks.get/'),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json+devalue',
          body: JSON.stringify([{ total: 1 }, 12]),
        }),
    );
    await page.route(HELD_FONTS, async (route) => {
      if (released) return route.continue();
      held.push(route);
      if (route.request().url().includes('ibm-plex-sans')) plexRequested();
    });

    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await plexSeen;
    await page.evaluate(() =>
      Promise.all([
        document.fonts.load('16px "Press Start 2P"'),
        document.fonts.load('16px "Pixelify Sans Variable"'),
      ]),
    );
    // Every footprint instance is revealed once its read answered: its final layout.
    await page.waitForFunction(() => {
      const marks = [...document.querySelectorAll('[data-marks]')];
      return marks.length > 0 && marks.every((mark) => mark.hasAttribute('data-r'));
    });
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    const before = await measure(page);

    released = true;
    await Promise.all(held.map((route) => route.continue()));
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() => document.fonts.check('16px "IBM Plex Sans Variable"'));
    expect(loaded).toBe(true);
    const after = await measure(page);

    const delta = {
      documentHeight: after.documentHeight - before.documentHeight,
      paragraphY: after.paragraphY - before.paragraphY,
      navWidth: (after.navLinks - before.navLinks) / (before.navLinks || 1),
      h1Width: (after.h1Text - before.h1Text) / before.h1Text,
    };
    test.info().annotations.push({ type: 'swap-delta', description: JSON.stringify(delta) });
    console.log(
      `${BASELINE ? 'baseline' : 'fallback'} ${path} ${width}`,
      JSON.stringify({ before, after, delta }),
    );

    if (BASELINE) return;
    // On a phone one line of the footer call to action can still wrap differently (a line is 20 px,
    // far below the fold); the content above it must not move.
    expect(Math.abs(delta.documentHeight)).toBeLessThanOrEqual(width < 500 ? 24 : 2);
    expect(Math.abs(delta.paragraphY)).toBeLessThanOrEqual(2);
    expect(Math.abs(delta.navWidth)).toBeLessThanOrEqual(0.03);
    expect(Math.abs(delta.h1Width)).toBeLessThanOrEqual(0.03);
  });
}
