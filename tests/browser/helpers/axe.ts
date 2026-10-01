import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * Runs axe (WCAG 2 A, AA and 2.1 AA) once the page has settled. Entrance animations fade content in
 * from a lower opacity, and axe computes contrast from the blended color, so scanning mid-animation
 * reports false `color-contrast` violations that depend on how fast the machine is.
 */
export async function scan(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const entranceAnimations = [...document.querySelectorAll<HTMLElement>('.animate-fade-in-up')]
      .flatMap((element) => element.getAnimations())
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity);
    await Promise.all(entranceAnimations.map((animation) => animation.finished));
  });
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
}

/** Violations as readable lines: rule id plus the elements it hit. */
export const describeViolations = (violations: Awaited<ReturnType<typeof scan>>['violations']) =>
  violations.map(
    (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(' | ')}`,
  );
