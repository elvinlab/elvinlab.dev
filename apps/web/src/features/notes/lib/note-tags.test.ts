import { describe, expect, it } from 'vitest';

import { activeTag, rowHasTag, rowTagList, tagHref, visibleTags } from './note-tags.ts';

describe('visibleTags', () => {
  it('drops the tag that repeats the category and keeps the order', () => {
    expect(visibleTags(['astro', 'meta', 'css'], 'meta')).toEqual(['astro', 'css']);
  });

  it('returns every tag when none repeats the category', () => {
    expect(visibleTags(['astro', 'css'], 'meta')).toEqual(['astro', 'css']);
    expect(visibleTags([], 'meta')).toEqual([]);
  });
});

describe('tagHref', () => {
  it('points at the notes index with the tag in the query', () => {
    expect(tagHref('astro')).toBe('/notes/?tag=astro');
  });

  it('encodes characters that are not URL safe', () => {
    expect(tagHref('c# & más')).toBe('/notes/?tag=c%23%20%26%20m%C3%A1s');
  });
});

describe('activeTag', () => {
  it('reads the tag param lower-cased and trimmed', () => {
    expect(activeTag('?tag=Astro')).toBe('astro');
    expect(activeTag('?x=1&tag=%20css%20')).toBe('css');
  });

  it('returns an empty string without a tag', () => {
    expect(activeTag('')).toBe('');
    expect(activeTag('?q=astro')).toBe('');
    expect(activeTag('?tag=')).toBe('');
  });
});

describe('rowTagList', () => {
  it('joins the lower-cased category and tags without duplicates', () => {
    expect(rowTagList('Meta', ['Astro', 'meta', 'css', 'astro'])).toBe('meta|astro|css');
  });

  it('works with no tags', () => {
    expect(rowTagList('meta', [])).toBe('meta');
  });
});

describe('rowHasTag', () => {
  it('matches everything when no tag is active', () => {
    expect(rowHasTag('meta|astro', '')).toBe(true);
    expect(rowHasTag('', '')).toBe(true);
  });

  it('matches an exact entry, ignoring case', () => {
    expect(rowHasTag('meta|astro', 'astro')).toBe(true);
    expect(rowHasTag('meta|astro', 'ASTRO')).toBe(true);
  });

  it('does not match a substring or a missing tag', () => {
    expect(rowHasTag('meta|astro', 'ast')).toBe(false);
    expect(rowHasTag('meta|astro', 'css')).toBe(false);
    expect(rowHasTag('', 'css')).toBe(false);
  });
});
