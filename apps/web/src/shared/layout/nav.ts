import type { SiteConfig } from '@/shared/config/index.ts';

export type NavKey = 'home' | 'notes' | 'experiments' | 'about' | 'contact';

export type NavItem = {
  key: NavKey;
  /** Path in the default locale; localize it with `localizePath` before linking. */
  path: string;
};

const ITEMS: { item: NavItem; feature?: keyof SiteConfig['features'] }[] = [
  { item: { key: 'home', path: '/' } },
  { item: { key: 'notes', path: '/notes/' }, feature: 'blog' },
  { item: { key: 'experiments', path: '/experiments/' }, feature: 'experiments' },
  { item: { key: 'about', path: '/me/' } },
  { item: { key: 'contact', path: '/contact/' }, feature: 'contact' },
];

/** Navbar entries in design order, without the sections whose feature flag is off. */
export function navItems(features: SiteConfig['features']): NavItem[] {
  return ITEMS.filter(({ feature }) => !feature || features[feature]).map(({ item }) => item);
}

/** True when `pathname` (without locale prefix) is `itemPath` or below it; home matches only itself. */
export function isCurrent(pathname: string, itemPath: string): boolean {
  if (itemPath === '/') return pathname === '/';
  return pathname.startsWith(itemPath);
}
