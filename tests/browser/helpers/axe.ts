import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * Lets the page reach its resting state before axe reads it. Three things change colors after the
 * HTML is on screen, and axe computes contrast from whatever is painted at that instant, so a scan
 * that lands in the middle reports false `color-contrast` violations that depend on how loaded the
 * machine is:
 * - an island that hydrates when it becomes visible (`client:visible`) swaps state, for example a
 *   disabled submit button turning enabled;
 * - entrance animations fade content in from a lower opacity, and color transitions blend two colors;
 * - Expressive Code makes a horizontally scrollable code block keyboard-focusable from a script that
 *   runs after load, so wait for its `tabindex` too.
 */
async function settle(page: Page): Promise<void> {
  // Only islands in the viewport hydrate on their own; give those a bounded time, never forever.
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll('astro-island[ssr]')].every((island) => {
          const box = island.getBoundingClientRect();
          return box.bottom < 0 || box.top > window.innerHeight;
        }),
      undefined,
      { timeout: 5000 },
    )
    .catch(() => undefined);
  await page.evaluate(async () => {
    await document.fonts.ready;
    // A cancelled animation must not break the wait.
    const settling = document
      .getAnimations()
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity);
    await Promise.all(settling.map((animation) => animation.finished.catch(() => undefined)));
  });
  await page.waitForFunction(() =>
    [...document.querySelectorAll('pre')].every(
      (block) => block.scrollWidth <= block.clientWidth || block.hasAttribute('tabindex'),
    ),
  );
}

const analyze = (page: Page) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();

/**
 * Runs axe (WCAG 2 A, AA and 2.1 AA) once the page has settled. If the only findings are contrast
 * ones it settles again and scans a second time: a real contrast problem is the same both times,
 * while one caught mid-transition is gone. The second result is the one returned.
 */
export async function scan(page: Page) {
  await settle(page);
  const first = await analyze(page);
  if (!first.violations.some((violation) => violation.id === 'color-contrast')) return first;
  await settle(page);
  await page.waitForTimeout(300);
  return analyze(page);
}

/** Violations as readable lines: rule id plus the elements it hit. */
export const describeViolations = (violations: Awaited<ReturnType<typeof scan>>['violations']) =>
  violations.map(
    (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(' | ')}`,
  );
