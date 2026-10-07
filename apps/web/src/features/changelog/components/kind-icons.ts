/** 9 x 9 pixel grids as `[x, y, width, height]` rectangles, one icon per kind plus the page log. */
type Rect = readonly [number, number, number, number];

const ICONS = {
  // Plus.
  added: [
    [4, 1, 1, 7],
    [1, 4, 7, 1],
  ],
  // Two arrows chasing each other.
  changed: [
    [1, 2, 6, 1],
    [6, 1, 1, 3],
    [7, 2, 1, 1],
    [2, 6, 6, 1],
    [2, 5, 1, 3],
    [1, 6, 1, 1],
  ],
  // A bug.
  fixed: [
    [2, 0, 1, 1],
    [6, 0, 1, 1],
    [3, 1, 3, 1],
    [3, 2, 3, 6],
    [1, 3, 2, 1],
    [1, 5, 2, 1],
    [1, 7, 2, 1],
    [6, 3, 2, 1],
    [6, 5, 2, 1],
    [6, 7, 2, 1],
  ],
  // Minus.
  removed: [[1, 4, 7, 1]],
  // Shield outline.
  security: [
    [1, 1, 7, 1],
    [1, 2, 1, 3],
    [7, 2, 1, 3],
    [2, 5, 1, 1],
    [6, 5, 1, 1],
    [3, 6, 1, 1],
    [5, 6, 1, 1],
    [4, 7, 1, 1],
  ],
  // Clock.
  deprecated: [
    [2, 0, 5, 1],
    [2, 8, 5, 1],
    [0, 2, 1, 5],
    [8, 2, 1, 5],
    [1, 1, 1, 1],
    [7, 1, 1, 1],
    [1, 7, 1, 1],
    [7, 7, 1, 1],
    [4, 2, 1, 3],
    [5, 4, 2, 1],
  ],
  // A page of log lines: the logo of the page.
  log: [
    [1, 0, 7, 1],
    [1, 8, 7, 1],
    [1, 1, 1, 7],
    [7, 1, 1, 7],
    [3, 2, 3, 1],
    [3, 4, 3, 1],
    [3, 6, 2, 1],
  ],
} as const satisfies Record<string, readonly Rect[]>;

export type IconName = keyof typeof ICONS;

/** SVG path data of an icon: one closed rectangle per pixel run. */
export function iconPath(name: IconName): string {
  return ICONS[name].map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h-${w}z`).join('');
}
