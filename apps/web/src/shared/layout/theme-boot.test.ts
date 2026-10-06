import { THEME_BOOT_SCRIPT, THEME_STORAGE_KEY } from '@elvinlab/core';
import { describe, expect, it } from 'vitest';

import { themeBootScript } from './theme-boot.ts';

describe('themeBootScript', () => {
  it('is the unchanged core script while the theme toggle is on', () => {
    expect(themeBootScript(true)).toBe(THEME_BOOT_SCRIPT);
  });

  it('forgets a theme saved earlier before resolving when the toggle is off', () => {
    const script = themeBootScript(false);
    expect(script.startsWith('try{localStorage.removeItem(')).toBe(true);
    expect(script).toContain(JSON.stringify(THEME_STORAGE_KEY));
    expect(script.endsWith(THEME_BOOT_SCRIPT)).toBe(true);
  });
});
