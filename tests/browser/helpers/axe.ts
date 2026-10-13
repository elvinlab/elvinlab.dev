import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * Runs axe (WCAG 2 A, AA and 2.1 AA) once the page has settled. Entrance animations fade content in
 * from a lower opacity and color transitions blend two colors, and axe computes contrast from the
 * blended color, so scanning mid-animation or mid-transition reports false `color-contrast`
 * violations that depend on how fast the machine is. Expressive Code
 * makes a horizontally scrollable code block keyboard-focusable from a script that runs after load,
 * so wait for that too, or a loaded machine scans a block that is about to get its `tabindex`.
 */
export async function scan(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Entrance animations and color transitions (a button settling into its theme color) both
    // blend colors; wait for every finite one. A cancelled animation must not break the wait.
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
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
}

/** Violations as readable lines: rule id plus the elements it hit. */
export const describeViolations = (violations: Awaited<ReturnType<typeof scan>>['violations']) =>
  violations.map(
    (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(' | ')}`,
  );
