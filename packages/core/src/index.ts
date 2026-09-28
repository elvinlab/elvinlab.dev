/**
 * @packageDocumentation
 * `@elvinlab/core` — presentation-only design base: tokens, themes and i18n infrastructure.
 * No fetch, no persistence. Data in via props, events out.
 */

import { buildThemeBootScript } from './themes/boot-script.ts';
import type { ThemeOption } from './themes/resolve-theme.ts';
import { parseTokens, type Tokens } from './tokens/schema.ts';
import rawTokens from './tokens/tokens.json' with { type: 'json' };

export { renderTokensCss } from './tokens/render-css.ts';
export { parseTokens, type Tokens } from './tokens/schema.ts';

/** Validated design tokens of the default theme set (`tokens.json`). */
export const tokens: Tokens = parseTokens(rawTokens);

/** Theme applied when the visitor has no stored or system preference. */
export const DEFAULT_THEME: string = tokens.defaultTheme;

export { buildThemeBootScript, THEME_STORAGE_KEY } from './themes/boot-script.ts';
export { resolveTheme, type ThemeOption } from './themes/resolve-theme.ts';

/** Every theme defined in `tokens.json`, in declaration order. */
export const THEMES: ThemeOption[] = Object.entries(tokens.themes).map(([name, theme]) => ({
  name,
  scheme: theme.scheme,
}));

/** Inline pre-paint script for `<head>`: applies the stored or system theme before first paint. */
export const THEME_BOOT_SCRIPT: string = buildThemeBootScript({
  themes: THEMES,
  defaultTheme: DEFAULT_THEME,
});

export {
  type LocaleConfig,
  localeFromPath,
  localizePath,
  switchLocale,
} from './i18n/paths.ts';
export { suggestLocale } from './i18n/suggest-locale.ts';
export { createTranslator, type Dictionary, type Translator } from './i18n/translate.ts';
