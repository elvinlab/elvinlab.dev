import { topicHref } from './topics.ts';

/** The tags worth showing on a row: the one that repeats the category chip is dropped. */
export function visibleTags(tags: readonly string[], category: string): string[] {
  return tags.filter((tag) => tag !== category);
}

/**
 * Link for a tag or category: the static topic page when `topics` (raw tag to topic slug) maps it,
 * otherwise the notes index filtered by it. The index exists only at `/notes/`.
 */
export function tagHref(tag: string, topics?: ReadonlyMap<string, string>): string {
  const topic = topics?.get(tag);
  return topic === undefined ? `/notes/?tag=${encodeURIComponent(tag)}` : topicHref(topic);
}

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
