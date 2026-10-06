/** Scroll depth past which the back-to-top button may appear (while scrolling up). */
export const SHOW_AFTER_PX = 800;
/** While shown, the button stays until the reader is this close to the top. */
export const HIDE_BELOW_PX = 400;
/** How long the button waits after the last scroll before getting out of the way. */
export const IDLE_HIDE_MS = 2500;
/** Movements smaller than this are noise, like the navbar's threshold. */
export const SCROLL_STEP_PX = 6;

type VisibilityInput = { y: number; previousY: number; shown: boolean };

/**
 * Same direction logic as the navbar: appear only after a deep scroll when the reader scrolls up,
 * hide when scrolling down or near the top, keep the current state on tiny movements.
 */
export function nextVisibility({ y, previousY, shown }: VisibilityInput): boolean {
  const delta = y - previousY;
  if (Math.abs(delta) <= SCROLL_STEP_PX) return shown;
  if (delta > 0) return false;
  return y > (shown ? HIDE_BELOW_PX : SHOW_AFTER_PX);
}

/** Bottom offset (px) that keeps the button above the footer once the footer enters the viewport. */
export function liftAboveFooter({
  viewportHeight,
  footerTop,
}: {
  viewportHeight: number;
  footerTop: number;
}): number {
  return Math.max(0, viewportHeight - footerTop);
}

/**
 * Whether the idle timer may hide the button: not while the reader hovers or focuses it, and not at
 * the bottom of the page (lifted above the footer), where it covers nothing and is most wanted.
 */
export function shouldAutoHide({
  lift,
  focused,
  hovered,
}: {
  lift: number;
  focused: boolean;
  hovered: boolean;
}): boolean {
  return lift === 0 && !focused && !hovered;
}
