import type { SiteConfig } from '@/shared/config/index.ts';

export type NavKey = 'home' | 'notes' | 'experiments' | 'about' | 'contact';

export type NavItem = {
  key: NavKey;
  /** Path in the default locale; localize it with `localizePath` before linking. */
  path: string;
  /** Override the localized label for this locale (e.g. "(in Spanish)"). */
  labelOverride?: string;
  /** Override hreflang for this item in a specific locale. */
  hreflang?: string;
  /** False keeps `path` as is in every locale (content that exists in one language only). */
  localize?: boolean;
};

const ITEMS: { item: NavItem; feature?: keyof SiteConfig['features'] }[] = [
  { item: { key: 'home', path: '/' } },
  { item: { key: 'notes', path: '/notes/' }, feature: 'blog' },
  { item: { key: 'experiments', path: '/experiments/' }, feature: 'experiments' },
  { item: { key: 'about', path: '/me/' }, feature: 'me' },
  { item: { key: 'contact', path: '/contact/' }, feature: 'contact' },
];

/** Navbar entries in design order, without the sections whose feature flag is off. */
export function navItems(
  features: SiteConfig['features'],
  locale: 'es' | 'en',
  hasPublishedNotes: boolean,
): NavItem[] {
  if (!hasPublishedNotes) {
    return ITEMS.filter(
      ({ feature, item }) => item.key !== 'notes' && (!feature || features[feature]),
    ).map(({ item }) => item);
  }
  const items = ITEMS.filter(({ feature }) => !feature || features[feature]).map(
    ({ item }) => item,
  );
  if (locale === 'en') {
    return items.map((item) =>
      item.key === 'notes'
        ? { ...item, labelOverride: 'nav.notes.es', hreflang: 'es', localize: false }
        : item,
    );
  }
  return items;
}

/** True for routes that exist in Spanish only (the notes section): no English alternate, no locale switch. */
export function isSingleLocaleRoute(pathname: string): boolean {
  return pathname.startsWith('/notes/');
}

/** True when `pathname` (without locale prefix) is `itemPath` or below it; home matches only itself. */
export function isCurrent(pathname: string, itemPath: string): boolean {
  if (itemPath === '/') return pathname === '/';
  return pathname.startsWith(itemPath);
}
