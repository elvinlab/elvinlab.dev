/** Locales of the site; the default locale lives at the root, the others under `/<locale>/`. */
export type LocaleConfig<L extends string = string> = {
  locales: readonly L[];
  defaultLocale: L;
};

const firstSegment = (pathname: string): string => pathname.split('/').filter(Boolean)[0] ?? '';

/** Returns the locale encoded in `pathname`, or the default locale for unprefixed paths. */
export const localeFromPath = <L extends string>(pathname: string, config: LocaleConfig<L>): L => {
  const segment = firstSegment(pathname);
  const match = config.locales.find((locale) => locale === segment);
  return match ?? config.defaultLocale;
};

const stripLocale = <L extends string>(pathname: string, config: LocaleConfig<L>): string => {
  const locale = localeFromPath(pathname, config);
  if (locale === config.defaultLocale) return pathname || '/';
  const rest = pathname.slice(locale.length + 1);
  return rest.startsWith('/') ? rest : `/${rest}`;
};

/** Builds the URL of a locale-neutral `path` (e.g. `/notes/why`) for `locale`. */
export const localizePath = <L extends string>(
  path: string,
  locale: L,
  config: LocaleConfig<L>,
): string => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return locale === config.defaultLocale ? normalized : `/${locale}${normalized}`;
};

/** Returns the same page in another locale, e.g. `/es/notes/why` → `/notes/why`. */
export const switchLocale = <L extends string>(
  pathname: string,
  target: L,
  config: LocaleConfig<L>,
): string => localizePath(stripLocale(pathname, config), target, config);
