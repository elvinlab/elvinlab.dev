/** The tags worth showing on a row: the one that repeats the category chip is dropped. */
export function visibleTags(tags: readonly string[], category: string): string[] {
  return tags.filter((tag) => tag !== category);
}

/** The sidebar tag list needs enough notes to be useful; with fewer it only repeats the rows. */
export const SHOW_TAG_LIST_FROM = 6;

export const shouldShowTagList = (noteCount: number): boolean => noteCount >= SHOW_TAG_LIST_FROM;
