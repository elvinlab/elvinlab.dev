/**
 * Browser-safe i18n helpers. This barrel imports no Zod and no tokens, so client `<script>`s can
 * import `suggestLocale`/path helpers from `@elvinlab/core/i18n` without pulling the whole package
 * (and Zod) into the bundle.
 */
export { type LocaleConfig, localeFromPath, localizePath, switchLocale } from './paths.ts';
export { suggestLocale } from './suggest-locale.ts';
export { createTranslator, type Dictionary, type Translator } from './translate.ts';
