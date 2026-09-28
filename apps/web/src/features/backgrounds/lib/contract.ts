import type { Rgb } from './color.ts';

/** Colors a background draws with, sampled from the active theme's tokens. */
export type Palette = {
  base: Rgb;
  primary: Rgb;
  cyan: Rgb;
  pink: Rgb;
};

/**
 * A background effect: given a canvas and a palette, it starts drawing and returns a cleanup
 * function that stops it and releases every resource. Effects are presentation-only and never fetch.
 */
export type Background = (canvas: HTMLCanvasElement, palette: Palette) => () => void;
