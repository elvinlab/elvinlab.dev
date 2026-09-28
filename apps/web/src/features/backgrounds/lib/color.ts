/** An RGB triple with each channel normalized to 0–1, ready for a GL uniform. */
export type Rgb = [number, number, number];

const BLACK: Rgb = [0, 0, 0];

/** Parses a CSS color (`#rgb`, `#rrggbb`, `rgb()`, `rgba()`) to normalized RGB; black on failure. */
export function parseColor(css: string): Rgb {
  const value = css.trim();

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex?.[1]) {
    const h = hex[1];
    const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
    const int = Number.parseInt(full, 16);
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((c) => c / 255) as Rgb;
  }

  const rgb = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (rgb?.[1]) {
    const parts = rgb[1].split(',').map((p) => Number.parseFloat(p));
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n))) {
      return parts.slice(0, 3).map((c) => c / 255) as Rgb;
    }
  }

  return BLACK;
}

/** Device pixel ratio clamped to [1, max]; caps GPU work on high-density screens. */
export function clampDpr(dpr: number, max = 2): number {
  return Math.min(max, Math.max(1, dpr || 1));
}

/** Minimum ms between frames: throttle coarse pointers (touch) to 30 fps, leave fine pointers free. */
export function frameInterval(coarsePointer: boolean): number {
  return coarsePointer ? 1000 / 30 : 0;
}
