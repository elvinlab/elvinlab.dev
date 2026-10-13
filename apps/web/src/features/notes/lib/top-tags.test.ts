import { describe, expect, it } from 'vitest';

import { SIDEBAR_TAG_LIMIT, topTags } from './top-tags.ts';

describe('topTags', () => {
  it('ranks by use count descending, then alphabetically', () => {
    const { top } = topTags([['b', 'a'], ['b', 'c'], ['a']], 10);
    expect(top).toEqual(['a', 'b', 'c']);
  });

  it('keeps the N most used tags and returns the rest in the same order', () => {
    const lists = [['x', 'y', 'z'], ['x', 'y'], ['x'], ['w']];
    const { top, rest } = topTags(lists, 2);
    expect(top).toEqual(['x', 'y']);
    expect(rest).toEqual(['w', 'z']);
  });

  it('counts a tag once per note even if the note repeats it', () => {
    const { top } = topTags([['a', 'a', 'a'], ['b'], ['b']], 1);
    expect(top).toEqual(['b']);
  });

  it('returns an empty rest when there are no more than N tags', () => {
    const { top, rest } = topTags([['a'], ['b']], 2);
    expect(top).toEqual(['a', 'b']);
    expect(rest).toEqual([]);
  });

  it('is stable: the same input gives the same output whatever the note order', () => {
    const lists = [['m', 'n'], ['n', 'o'], ['p']];
    expect(topTags(lists, 2)).toEqual(topTags([...lists].reverse(), 2));
  });

  it('defaults to a limit of 12', () => {
    expect(SIDEBAR_TAG_LIMIT).toBe(12);
    const lists = [Array.from({ length: 15 }, (_, i) => `t${String(i).padStart(2, '0')}`)];
    const { top, rest } = topTags(lists);
    expect(top).toHaveLength(12);
    expect(rest).toHaveLength(3);
  });
});
