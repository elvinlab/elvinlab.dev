import { expect, type Page, type Route, test } from '@playwright/test';

import { has } from './helpers/features';

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

type Layout = {
  documentHeight: number;
  paragraphY: number;
  navLinks: number;
  h1Text: number;
  /** Height of every element in document order, to name what changed when the page height does. */
  heights: [string, number, number][];
};

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
    const heights: [string, number, number][] = [];
    const walk = (element: Element, path: string) => {
      const label =
        typeof element.className === 'string' ? element.className.trim().split(/\s+/)[0] : '';
      const id = `${path}/${element.tagName.toLowerCase()}${label ? `.${label}` : ''}`;
      const box = element.getBoundingClientRect();
      heights.push([
        id,
        Math.round(box.height * 100) / 100,
        Math.round((box.top + window.scrollY) * 100) / 100,
      ]);
      if (heights.length < 3000) for (const child of element.children) walk(child, id);
    };
    walk(document.body, '');
    return {
      heights,
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
    if (has({ flags: ['marks'] })) {
      await page.waitForFunction(() => {
        const marks = [...document.querySelectorAll('[data-marks]')];
        return marks.length > 0 && marks.every((mark) => mark.hasAttribute('data-r'));
      });
    }
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
    // What moved, for a failure message that names it: the elements whose height or position changed
    // (small changes count: eight of them can add up to the 8 px that moved the page), and the element
    // that ends the document before and after.
    const pairs = before.heights.map(([id, height, top], index) => {
      const next = after.heights[index];
      return {
        id,
        dHeight: (next?.[1] ?? height) - height,
        dTop: (next?.[2] ?? top) - top,
        bottomBefore: top + height,
        bottomAfter: (next?.[2] ?? top) + (next?.[1] ?? height),
      };
    });
    const describe = (id: string) => id.slice(-90);
    const heightChanges = pairs.filter((pair) => Math.abs(pair.dHeight) >= 0.1);
    const shifts = pairs.filter(
      (pair) => Math.abs(pair.dTop) >= 0.5 && Math.abs(pair.dHeight) < 0.1,
    );
    const lowest = (key: 'bottomBefore' | 'bottomAfter') =>
      pairs.reduce(
        (best, pair) => (pair[key] > best[key] ? pair : best),
        pairs[0] ?? { id: '', dHeight: 0, dTop: 0, bottomBefore: 0, bottomAfter: 0 },
      );
    const moved = [
      `${heightChanges.length} elements changed height (sum ${heightChanges.reduce((sum, pair) => sum + pair.dHeight, 0).toFixed(1)} px): ${heightChanges
        .sort((x, y) => Math.abs(y.dHeight) - Math.abs(x.dHeight))
        .slice(0, 5)
        .map((pair) => `${pair.dHeight.toFixed(2)} ${describe(pair.id)}`)
        .join(' ; ')}`,
      `${shifts.length} elements only shifted; the first in document order: ${shifts
        .slice(0, 3)
        .map((pair) => `${pair.dTop.toFixed(1)} ${describe(pair.id)}`)
        .join(' ; ')}; the element before it: ${(() => {
        const first = shifts[0];
        const at = first ? pairs.indexOf(first) : -1;
        const previous = at > 0 ? pairs[at - 1] : undefined;
        return previous
          ? `${describe(previous.id)} (height ${previous.dHeight.toFixed(2)}, top ${previous.dTop.toFixed(2)})`
          : 'none';
      })()}`,
      `last element before: ${describe(lowest('bottomBefore').id)} (${lowest('bottomBefore').bottomBefore.toFixed(1)}), after: ${describe(lowest('bottomAfter').id)} (${lowest('bottomAfter').bottomAfter.toFixed(1)})`,
    ];
    test.info().annotations.push({ type: 'swap-delta', description: JSON.stringify(delta) });
    test.info().annotations.push({ type: 'swap-moved', description: moved.join(' | ') });
    console.log(
      `${BASELINE ? 'baseline' : 'fallback'} ${path} ${width}`,
      JSON.stringify({ delta, moved }),
    );

    if (BASELINE) return;
    // On a phone one line of the footer call to action can still wrap differently (a line is 20 px,
    // far below the fold); the content above it must not move.
    expect(Math.abs(delta.documentHeight), `what moved: ${moved.join(' | ')}`).toBeLessThanOrEqual(
      width < 500 ? 24 : 2,
    );
    expect(Math.abs(delta.paragraphY)).toBeLessThanOrEqual(2);
    expect(Math.abs(delta.navWidth)).toBeLessThanOrEqual(0.03);
    expect(Math.abs(delta.h1Width)).toBeLessThanOrEqual(0.03);
  });
}
