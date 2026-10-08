/** The tags worth showing on a row: the one that repeats the category chip is dropped. */
export function visibleTags(tags: readonly string[], category: string): string[] {
  return tags.filter((tag) => tag !== category);
}

/** Link to the notes index filtered by a tag or category. The index exists only at `/notes/`. */
export const tagHref = (tag: string): string => `/notes/?tag=${encodeURIComponent(tag)}`;

/** The active tag filter from a `location.search` string: lower-cased, trimmed, or `''`. */
export function activeTag(search: string): string {
  return (new URLSearchParams(search).get('tag') ?? '').trim().toLowerCase();
}

/** Category and tags of a row as one `|`-separated, lower-cased, de-duplicated string (`data-tags`). */
export function rowTagList(category: string, tags: readonly string[]): string {
  return [...new Set([category, ...tags].map((entry) => entry.toLowerCase()))].join('|');
}

/** True when no tag is active or the row's `data-tags` holds it (exact entry, case-insensitive). */
export function rowHasTag(rowTags: string, tag: string): boolean {
  if (tag === '') return true;
  return rowTags.split('|').includes(tag.toLowerCase());
}
