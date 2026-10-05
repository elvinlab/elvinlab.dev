import { type LocaleConfig, localizePath, switchLocale } from '@elvinlab/core';

import { isSingleLocaleRoute } from './nav.ts';

export type LocaleTargetKind =
  /** The page declares its own translation. */
  | 'translation'
  /** The same route exists in the other locale. */
  | 'equivalent'
  /** The route is single-locale with no translation: the link lands on the other locale's home. */
  | 'home-fallback';

export type LocaleTarget = { href: string; kind: LocaleTargetKind };

type Input<L extends string> = {
  /** Current URL pathname, with its locale prefix. */
  pathname: string;
  current: L;
  target: L;
  translations?: Record<string, string> | undefined;
  locales: LocaleConfig<L>;
};

/** Where the language switch and the language hint send the visitor, and what kind of landing it is. */
export function resolveLocaleTarget<L extends string>({
  pathname,
  target,
  translations,
  locales,
}: Input<L>): LocaleTarget {
  const translated = translations?.[target];
  if (translated) return { href: translated, kind: 'translation' };
  const routePath = switchLocale(pathname, locales.defaultLocale, locales);
  if (isSingleLocaleRoute(routePath)) {
    return { href: localizePath('/', target, locales), kind: 'home-fallback' };
  }
  return { href: switchLocale(pathname, target, locales), kind: 'equivalent' };
}
