import { z } from 'astro/zod';

/** Text that is either one string shown for every locale or a record keyed by locale. */
export type LocalizedText = string | Readonly<Record<string, string>>;

/** A record of locale to non-empty trimmed text, e.g. `{ es: 'Hola', en: 'Hello' }`. */
export const localizedText = z.record(z.string(), z.string().trim().min(1));

type LocalizableOptions = {
  /** Maximum length of the plain string and of each locale's text. */
  max: number;
  /** Locale whose text is required in a per-locale object. */
  defaultLocale: string;
  /** Locales the site supports; any other key is rejected. */
  locales: readonly string[];
};

/**
 * Content text that stays backward compatible: a plain string is valid and shown for every locale
 * (a white-label fork with plain strings keeps building), while a per-locale object must carry the
 * default locale and only supported locales, like the localized text of the site config.
 */
export function localizableText({ max, defaultLocale, locales }: LocalizableOptions) {
  return z.union([z.string().trim().min(1), localizedText]).superRefine((text, ctx) => {
    const entries = typeof text === 'string' ? [text] : Object.values(text);
    if (entries.some((entry) => entry.length > max)) {
      ctx.addIssue({ code: 'custom', message: `must be at most ${max} characters` });
    }
    if (typeof text === 'string') return;
    if (!(defaultLocale in text)) {
      ctx.addIssue({ code: 'custom', message: `missing default locale "${defaultLocale}"` });
    }
    for (const locale of Object.keys(text)) {
      if (!locales.includes(locale)) {
        ctx.addIssue({ code: 'custom', message: `unsupported locale "${locale}"` });
      }
    }
  });
}

/** The text for `locale`, else the default locale's, else `''`. A plain string serves every locale. */
export function pickLocale(
  text: LocalizedText | undefined,
  locale: string,
  defaultLocale: string,
): string {
  if (text === undefined) return '';
  if (typeof text === 'string') return text;
  return text[locale] ?? text[defaultLocale] ?? '';
}
