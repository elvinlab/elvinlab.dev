import { resolveTheme, type ThemeOption } from './resolve-theme.ts';

/** localStorage key that holds the visitor's theme choice. */
export const THEME_STORAGE_KEY = 'theme';

type BootScriptOptions = { themes: ThemeOption[]; defaultTheme: string };

/**
 * Builds the inline script that sets `data-theme` on `<html>` before first paint, so the page never
 * flashes the wrong theme. Storage and media-query failures (privacy modes, old browsers) fall back
 * to the system preference and then to the default theme.
 *
 * Theme names are validated as kebab-case by `parseTokens`, so embedding them is safe.
 */
export const buildThemeBootScript = ({ themes, defaultTheme }: BootScriptOptions): string =>
  [
    '(function(){',
    'var stored=null;',
    `try{stored=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});}catch(e){}`,
    'var prefersDark=false;',
    "try{prefersDark=matchMedia('(prefers-color-scheme: dark)').matches;}catch(e){}",
    `var theme=(${resolveTheme.toString()})({themes:${JSON.stringify(themes)},defaultTheme:${JSON.stringify(defaultTheme)},stored:stored,prefersDark:prefersDark});`,
    "document.documentElement.setAttribute('data-theme',theme);",
    '})();',
  ].join('');
