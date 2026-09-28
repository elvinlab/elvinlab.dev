import { type LocaleConfig, localizePath } from '@elvinlab/core';

export type SeoLinksInput<L extends string> = {
  /** Route path without locale prefix, e.g. `/notes/`. */
  path: string;
  locale: L;
  site: URL;
  locales: LocaleConfig<L>;
  /** False for pages that exist in one locale only (e.g. an untranslated note). Default true. */
  translated?: boolean;
};

export type SeoLinks = {
  canonical: string;
  alternates: { hreflang: string; href: string }[];
};

/** Canonical URL and hreflang alternates (plus `x-default` on the default locale). */
export function seoLinks<L extends string>(input: SeoLinksInput<L>): SeoLinks {
  const { path, locale, site, locales, translated = true } = input;
  const href = (target: L): string => new URL(localizePath(path, target, locales), site).href;

  if (!translated) return { canonical: href(locale), alternates: [] };

  return {
    canonical: href(locale),
    alternates: [
      ...locales.locales.map((target) => ({ hreflang: target, href: href(target) })),
      { hreflang: 'x-default', href: href(locales.defaultLocale) },
    ],
  };
}
