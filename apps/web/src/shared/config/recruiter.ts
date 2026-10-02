import type { SiteConfig } from './schema.ts';

/**
 * The CV link a visitor gets: a single URL serves every locale, a per-locale map picks the
 * visitor's locale and falls back to the default locale. No match means no CV button.
 */
export function resolveCvUrl(
  cvUrl: SiteConfig['recruiter']['cvUrl'],
  locale: string,
  defaultLocale: string,
): string | undefined {
  if (cvUrl === undefined || typeof cvUrl === 'string') return cvUrl;
  return cvUrl[locale] ?? cvUrl[defaultLocale];
}
