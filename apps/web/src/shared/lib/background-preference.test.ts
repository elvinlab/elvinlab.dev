import { describe, expect, it } from 'vitest';

import {
  nextBackgroundChoice,
  ownerDefaultChoice,
  resolveBackgroundChoice,
} from './background-preference.ts';

describe('ownerDefaultChoice', () => {
  it('is galaxy when galaxy is on', () => {
    expect(ownerDefaultChoice({ galaxy: true, cursorWaves: true })).toBe('galaxy');
  });

  it('is cursor-waves when only cursor-waves is on', () => {
    expect(ownerDefaultChoice({ galaxy: false, cursorWaves: true })).toBe('cursor-waves');
  });

  it('is off when neither is on', () => {
    expect(ownerDefaultChoice({ galaxy: false, cursorWaves: false })).toBe('off');
  });
});

describe('resolveBackgroundChoice', () => {
  it('uses the stored value when it is a real choice', () => {
    expect(resolveBackgroundChoice('cursor-waves', 'galaxy')).toBe('cursor-waves');
  });

  it('falls back to the owner default when storage is null', () => {
    expect(resolveBackgroundChoice(null, 'off')).toBe('off');
  });

  it('falls back to the owner default when storage holds garbage', () => {
    expect(resolveBackgroundChoice('rainbow', 'galaxy')).toBe('galaxy');
  });
});

describe('nextBackgroundChoice', () => {
  it('cycles galaxy -> cursor-waves -> off -> galaxy', () => {
    expect(nextBackgroundChoice('galaxy')).toBe('cursor-waves');
    expect(nextBackgroundChoice('cursor-waves')).toBe('off');
    expect(nextBackgroundChoice('off')).toBe('galaxy');
  });
});
