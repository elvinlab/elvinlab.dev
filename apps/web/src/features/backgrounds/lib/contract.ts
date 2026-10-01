import type { Rgb } from './color.ts';

/** Colors a background draws with, sampled from the active theme's tokens. */
export type Palette = {
  base: Rgb;
  primary: Rgb;
  cyan: Rgb;
  pink: Rgb;
};

/** Handle to a running background: stop it, or recolor it in place when the theme changes. */
export type BackgroundHandle = {
  destroy: () => void;
  /** Update the palette without tearing down the GL context (a rebuild would lose it). */
  setPalette: (palette: Palette) => void;
};

/**
 * A background effect: given an existing GL context, its canvas and a palette, it starts drawing
 * and returns a handle. Takes the context rather than creating one so effects can be swapped on
 * the same canvas without exhausting the browser's (notably Firefox's) concurrent-context limit.
 * Presentation-only; never fetches.
 */
export type Background = (
  gl: WebGL2RenderingContext,
  canvas: HTMLCanvasElement,
  palette: Palette,
) => BackgroundHandle;
