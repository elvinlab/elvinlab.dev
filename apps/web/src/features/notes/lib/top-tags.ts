/** How many tags the sidebar of the notes index shows before the "more tags" disclosure. */
export const SIDEBAR_TAG_LIMIT = 12;

/**
 * Splits the tags of every note into the `limit` most used ones and the rest. A tag counts once per
 * note; order is use count descending, then alphabetical (code-unit order, so it never depends on
 * the runtime locale or on the order of the notes). `rest` keeps the same ranking.
 */
export function topTags(
  tagLists: readonly (readonly string[])[],
  limit: number = SIDEBAR_TAG_LIMIT,
): { top: string[]; rest: string[] } {
  const counts = new Map<string, number>();
  for (const list of tagLists) {
    for (const tag of new Set(list)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const ranked = [...counts.entries()]
    .sort(([a, countA], [b, countB]) => countB - countA || (a < b ? -1 : a > b ? 1 : 0))
    .map(([tag]) => tag);
  return { top: ranked.slice(0, limit), rest: ranked.slice(limit) };
}
