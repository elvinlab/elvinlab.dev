import type { NoteCatalog } from './ports.ts';

/** Fixed site pages that hold their own footprint counter, next to the published notes. */
export const PAGE_KEYS = ['home'] as const;

/** The slugs allowed to hold footprints: the published note ids plus the page keys. */
export function buildCatalog(noteIds: Iterable<string>): NoteCatalog {
  const allowed = new Set<string>([...noteIds, ...PAGE_KEYS]);
  return { has: (slug) => allowed.has(slug) };
}
