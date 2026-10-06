import { THEME_BOOT_SCRIPT, THEME_STORAGE_KEY } from '@elvinlab/core';

/**
 * The pre-paint theme script. With the theme toggle off nobody can choose a theme, so a choice
 * saved earlier (while the toggle existed) is forgotten first: the theme then resolves from the
 * system preference, or the default theme, exactly like a first visit. Storage errors are ignored.
 */
export function themeBootScript(toggleOn: boolean): string {
  if (toggleOn) return THEME_BOOT_SCRIPT;
  return `try{localStorage.removeItem(${JSON.stringify(THEME_STORAGE_KEY)});}catch(e){}${THEME_BOOT_SCRIPT}`;
}
