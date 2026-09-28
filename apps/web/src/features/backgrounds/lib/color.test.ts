import { describe, expect, it } from 'vitest';

import { clampDpr, frameInterval, parseColor } from './color.ts';

describe('parseColor', () => {
  it('parses #rrggbb to normalized rgb', () => {
    expect(parseColor('#7c3aed')).toEqual([124 / 255, 58 / 255, 237 / 255]);
  });

  it('parses shorthand #rgb', () => {
    expect(parseColor('#f0c')).toEqual([1, 0, 204 / 255]);
  });

  it('parses rgb() and rgba()', () => {
    expect(parseColor('rgb(34, 211, 238)')).toEqual([34 / 255, 211 / 255, 238 / 255]);
    expect(parseColor('rgba(236, 72, 153, 0.5)')).toEqual([236 / 255, 72 / 255, 153 / 255]);
  });

  it('falls back to black on an unparseable value', () => {
    expect(parseColor('not-a-color')).toEqual([0, 0, 0]);
  });
});

describe('clampDpr', () => {
  it('caps the device pixel ratio at 2 by default', () => {
    expect(clampDpr(3)).toBe(2);
    expect(clampDpr(1.5)).toBe(1.5);
  });

  it('never returns less than 1', () => {
    expect(clampDpr(0)).toBe(1);
  });
});

describe('frameInterval', () => {
  it('throttles coarse pointers to 30 fps and leaves fine pointers uncapped', () => {
    expect(frameInterval(true)).toBeCloseTo(1000 / 30);
    expect(frameInterval(false)).toBe(0);
  });
});
