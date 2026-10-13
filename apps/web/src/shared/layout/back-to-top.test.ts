import { describe, expect, it } from 'vitest';

import {
  BAR_GAP_PX,
  BUTTON_SIZE_PX,
  fitsBelowBar,
  IDLE_HIDE_MS,
  liftAboveFooter,
  nextVisibility,
  shouldAutoHide,
} from './back-to-top.ts';

describe('nextVisibility', () => {
  it('stays hidden near the top and while reading downwards', () => {
    expect(nextVisibility({ y: 0, previousY: 0, shown: false })).toBe(false);
    expect(nextVisibility({ y: 1200, previousY: 1000, shown: false })).toBe(false);
  });

  it('appears when scrolling up past the threshold', () => {
    expect(nextVisibility({ y: 1100, previousY: 1200, shown: false })).toBe(true);
  });

  it('does not appear when scrolling up from a shallow position', () => {
    expect(nextVisibility({ y: 500, previousY: 600, shown: false })).toBe(false);
  });

  it('ignores tiny movements', () => {
    expect(nextVisibility({ y: 1103, previousY: 1100, shown: true })).toBe(true);
    expect(nextVisibility({ y: 1097, previousY: 1100, shown: false })).toBe(false);
  });

  it('hides again when scrolling down', () => {
    expect(nextVisibility({ y: 1300, previousY: 1100, shown: true })).toBe(false);
  });

  it('stays shown on the way up until the reader is near the top', () => {
    expect(nextVisibility({ y: 600, previousY: 700, shown: true })).toBe(true);
    expect(nextVisibility({ y: 300, previousY: 400, shown: true })).toBe(false);
  });
});

describe('liftAboveFooter', () => {
  it('does not lift while the footer is below the viewport', () => {
    expect(liftAboveFooter({ viewportHeight: 800, footerTop: 900 })).toBe(0);
    expect(liftAboveFooter({ viewportHeight: 800, footerTop: 800 })).toBe(0);
  });

  it('lifts by the part of the footer that is on screen', () => {
    expect(liftAboveFooter({ viewportHeight: 800, footerTop: 500 })).toBe(300);
  });
});

describe('fitsBelowBar', () => {
  const base = { viewportHeight: 740, base: 16, barBottom: 72 };

  it('fits when the button is not lifted at all', () => {
    expect(fitsBelowBar({ ...base, lift: 0 })).toBe(true);
  });

  it('fits while its top stays at least the gap below the bar', () => {
    // top = 740 - 16 - lift - 44 = 680 - lift; the ceiling is 72 + 8 = 80, so the last lift that fits is 600.
    expect(BUTTON_SIZE_PX).toBe(44);
    expect(BAR_GAP_PX).toBe(8);
    expect(fitsBelowBar({ ...base, lift: 600 })).toBe(true);
  });

  it('does not fit one pixel past the ceiling: the lift needed to clear the footer would reach the bar', () => {
    expect(fitsBelowBar({ ...base, lift: 601 })).toBe(false);
    expect(fitsBelowBar({ ...base, lift: 607 })).toBe(false);
  });

  it('counts the reading mode base offset', () => {
    expect(fitsBelowBar({ ...base, base: 64, lift: 552 })).toBe(true);
    expect(fitsBelowBar({ ...base, base: 64, lift: 553 })).toBe(false);
  });

  it('never fits in a viewport shorter than the button plus the bar', () => {
    expect(fitsBelowBar({ viewportHeight: 120, lift: 0, base: 16, barBottom: 72 })).toBe(false);
  });

  it('takes the bar height as given, so a taller bar leaves less room', () => {
    expect(fitsBelowBar({ ...base, barBottom: 90, lift: 582 })).toBe(true);
    expect(fitsBelowBar({ ...base, barBottom: 90, lift: 583 })).toBe(false);
  });
});

describe('shouldAutoHide', () => {
  it('hides on idle only when nothing keeps the button useful', () => {
    expect(shouldAutoHide({ lift: 0, focused: false, hovered: false })).toBe(true);
  });

  it('stays while the reader hovers or focuses it', () => {
    expect(shouldAutoHide({ lift: 0, focused: true, hovered: false })).toBe(false);
    expect(shouldAutoHide({ lift: 0, focused: false, hovered: true })).toBe(false);
  });

  it('stays at the bottom of the page, lifted above the footer, where it covers nothing', () => {
    expect(shouldAutoHide({ lift: 120, focused: false, hovered: false })).toBe(false);
  });

  it('waits a couple of seconds after the last scroll', () => {
    expect(IDLE_HIDE_MS).toBeGreaterThanOrEqual(2000);
    expect(IDLE_HIDE_MS).toBeLessThanOrEqual(3000);
  });
});
