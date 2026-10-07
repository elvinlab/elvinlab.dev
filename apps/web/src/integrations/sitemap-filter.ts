import { LISTING_SORTS, site } from '@/shared/config/index.ts';

/** `/experiments/oldest/` and `/experiments/oldest/page/2/`: the URLs of a sort, whichever one is the default. */
const SORTED_EXPERIMENTS = new RegExp(
  `^/experiments/(?:${LISTING_SORTS.join('|')})/(?:page/\\d+/)?$`,
);

/**
 * True when a pathname should be excluded from the sitemap because its feature flag is off.
 * Pathnames are expected without locale prefix (e.g. `/me/`, `/en/me/` after locale is stripped).
 */
export function isHiddenFromSitemap(pathname: string, features?: typeof site.features): boolean {
  const flags = features ?? site.features;
  // Strip locale prefix if present (e.g. `/en/me/` -> `/me/`)
  const withoutLocale = pathname.replace(/^\/[a-z]{2}\//, '/');

  if (!flags.blog && (withoutLocale === '/notes/' || withoutLocale.startsWith('/notes/'))) {
    return true;
  }
  // The confirm and unsubscribe pages are token landing pages: never worth indexing, whatever the
  // flags say. The `/subscribe/` page itself is meant to be found and shared.
  if (/^\/subscribe\/(confirm|unsubscribe)(\/|$)/.test(withoutLocale)) return true;
  if (!flags.me && (withoutLocale === '/me/' || pathname === '/me/' || pathname === '/en/me/')) {
    return true;
  }
  if (
    !flags.experiments &&
    (withoutLocale === '/experiments/' ||
      pathname === '/experiments/' ||
      pathname === '/en/experiments/' ||
      // The later pages of the paginated list: `/experiments/page/2/` and its English twin.
      /^\/experiments\/page\/\d+\/$/.test(withoutLocale))
  ) {
    return true;
  }
  // The alternate sorts of the experiments list are `noindex` duplicates of the default order:
  // never in the sitemap, whatever the flags say. They exist only on a long enough list.
  if (SORTED_EXPERIMENTS.test(withoutLocale)) return true;
  if (!flags.contact && withoutLocale === '/contact/') return true;
  if (
    !flags.changelog &&
    (withoutLocale === '/changelog/' ||
      pathname === '/changelog/' ||
      pathname === '/en/changelog/' ||
      // The later pages of the paginated list: `/changelog/page/2/` and its English twin.
      /^\/changelog\/page\/\d+\/$/.test(withoutLocale))
  ) {
    return true;
  }
  return false;
}
