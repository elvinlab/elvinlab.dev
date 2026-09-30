import { site } from '@/shared/config/index.ts';
import type { Locale } from '@/shared/i18n/index.ts';

/**
 * Returns the notice text for the given locale, falling back to the default locale.
 * Returns undefined when the config has no notice key (white-label safe).
 */
export function getNotice(locale: Locale): string | undefined {
  const notice = site.notice;
  if (!notice) return undefined;
  const defaultLocale = site.locales.default;
  return notice[locale] ?? notice[defaultLocale];
}
