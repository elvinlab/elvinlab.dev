import { describe, expect, it } from 'vitest';

import { SHOW_TAG_LIST_FROM, shouldShowTagList, visibleTags } from './note-tags.ts';

describe('visibleTags', () => {
  it('drops the tag that repeats the category and keeps the order', () => {
    expect(visibleTags(['astro', 'meta', 'css'], 'meta')).toEqual(['astro', 'css']);
  });

  it('returns every tag when none repeats the category', () => {
    expect(visibleTags(['astro', 'css'], 'meta')).toEqual(['astro', 'css']);
    expect(visibleTags([], 'meta')).toEqual([]);
  });
});

describe('shouldShowTagList', () => {
  it('shows the sidebar tag list only from six notes', () => {
    expect(SHOW_TAG_LIST_FROM).toBe(6);
    expect(shouldShowTagList(0)).toBe(false);
    expect(shouldShowTagList(5)).toBe(false);
    expect(shouldShowTagList(6)).toBe(true);
    expect(shouldShowTagList(12)).toBe(true);
  });
});
