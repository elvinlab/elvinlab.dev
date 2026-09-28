export type SuggestLocaleInput = {
  /** Browser languages in preference order (`navigator.languages`, e.g. `en-US`). */
  preferred: readonly string[];
  /** Locale of the page being viewed. */
  current: string;
  locales: readonly string[];
};

/**
 * Returns the locale to suggest to the visitor, or `null` when the page already matches their
 * first supported language. Used for a dismissible hint, never for redirects: search engines crawl
 * without language preferences and must see every locale.
 *
 * Must stay self-contained: its source is inlined into a client script.
 */
export function suggestLocale(input: SuggestLocaleInput): string | null {
  for (const language of input.preferred) {
    const base = language.toLowerCase().split('-')[0];
    if (base && input.locales.indexOf(base) !== -1) {
      return base === input.current ? null : base;
    }
  }
  return null;
}
