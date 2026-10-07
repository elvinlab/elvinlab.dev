import { pickLocale } from '@/shared/lib/localized.ts';

/** Most words the decorative comment stack shows. */
const MAX_WORDS = 6;

const COMMENT_MARKER = /^\/\/\s*/;

/**
 * The decorative `// word` stack of the experiments header: the words configured for the locale
 * (`experiments.words`), else those of the default locale, else the interface defaults. The comment
 * marker is added here, and one the owner already wrote is not doubled.
 */
export function labWords(
  configured: Readonly<Record<string, readonly string[]>> | undefined,
  locale: string,
  defaultLocale: string,
  fallback: readonly string[],
): string[] {
  const words = configured?.[locale] ?? configured?.[defaultLocale] ?? fallback;
  return words.slice(0, MAX_WORDS).map((word) => `// ${word.replace(COMMENT_MARKER, '').trim()}`);
}

/** The intro under the title: the configured text (`experiments.intro`) or the interface default. */
export function introText(
  configured: Readonly<Record<string, string>> | undefined,
  locale: string,
  defaultLocale: string,
  fallback: string,
): string {
  return pickLocale(configured, locale, defaultLocale) || fallback;
}
