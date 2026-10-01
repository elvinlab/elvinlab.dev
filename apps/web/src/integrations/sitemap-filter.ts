import { site } from '@/shared/config/index.ts';

/**
 * True when a pathname should be excluded from the sitemap because its feature flag is off.
 * Pathnames are expected without locale prefix (e.g. `/me/`, `/en/me/` after locale is stripped).
 */
export function isHiddenFromSitemap(pathname: string, features?: typeof site.features): boolean {
  const flags = features ?? site.features;
  // Strip locale prefix if present (e.g. `/en/me/` -> `/me/`)
  const withoutLocale = pathname.replace(/^\/[a-z]{2}\//, '/');

  if (!flags.me && (withoutLocale === '/me/' || pathname === '/me/' || pathname === '/en/me/')) {
    return true;
  }
  if (
    !flags.experiments &&
    (withoutLocale === '/experiments/' ||
      pathname === '/experiments/' ||
      pathname === '/en/experiments/')
  ) {
    return true;
  }
  if (
    !flags.changelog &&
    (withoutLocale === '/changelog/' || pathname === '/changelog/' || pathname === '/en/changelog/')
  ) {
    return true;
  }
  return false;
}
