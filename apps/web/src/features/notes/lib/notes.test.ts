import { describe, expect, it } from 'vitest';

import { hasPublishedNotes } from '@/shared/lib/notes-helpers.ts';

import {
  adjacentNotes,
  filterByLang,
  formatDate,
  groupByYear,
  noteNumber,
  readingMinutes,
  relatedNotes,
  searchText,
  sortNotes,
} from './notes.ts';

type TestNote = {
  slug: string;
  data: {
    number: number;
    title: string;
    description: string;
    pubDate: Date;
    lang: 'es' | 'en';
    category: string;
    tags: string[];
  };
};

const note = (over: Partial<TestNote['data']> & { slug: string }): TestNote => {
  const { slug, ...data } = over;
  return {
    slug,
    data: {
      number: 1,
      title: 'Title',
      description: 'Desc',
      pubDate: new Date('2026-01-01'),
      lang: 'es',
      category: 'decisions',
      tags: [],
      ...data,
    },
  };
};

describe('noteNumber', () => {
  it('pads to three digits', () => {
    expect(noteNumber(3)).toBe('003');
    expect(noteNumber(42)).toBe('042');
    expect(noteNumber(128)).toBe('128');
  });
});

describe('readingMinutes', () => {
  it('rounds up and never returns less than one minute', () => {
    expect(readingMinutes('one two three')).toBe(1);
    expect(readingMinutes(Array.from({ length: 440 }, () => 'word').join(' '))).toBe(2);
  });

  it('ignores markdown noise when counting words', () => {
    expect(readingMinutes('# Heading\n\n`code` **bold** [link](/x)')).toBe(1);
  });
});

describe('sortNotes', () => {
  it('orders by publication date then number, newest first', () => {
    const older = note({ slug: 'a', pubDate: new Date('2025-05-01'), number: 1 });
    const newer = note({ slug: 'b', pubDate: new Date('2026-05-01'), number: 2 });
    const sameDay = note({ slug: 'c', pubDate: new Date('2026-05-01'), number: 3 });

    expect(sortNotes([older, newer, sameDay]).map((n) => n.slug)).toEqual(['c', 'b', 'a']);
  });

  it('does not mutate its input', () => {
    const notes = [note({ slug: 'a' }), note({ slug: 'b' })];
    sortNotes(notes);
    expect(notes.map((n) => n.slug)).toEqual(['a', 'b']);
  });
});

describe('filterByLang', () => {
  const notes = [note({ slug: 'a', lang: 'es' }), note({ slug: 'b', lang: 'en' })];

  it('keeps every note for "all"', () => {
    expect(filterByLang(notes, 'all')).toHaveLength(2);
  });

  it('keeps only the requested language', () => {
    expect(filterByLang(notes, 'en').map((n) => n.slug)).toEqual(['b']);
  });
});

describe('groupByYear', () => {
  it('groups sorted notes by publication year, newest year first', () => {
    const notes = [
      note({ slug: 'a', pubDate: new Date('2026-03-01') }),
      note({ slug: 'b', pubDate: new Date('2025-11-01') }),
      note({ slug: 'c', pubDate: new Date('2026-01-01') }),
    ];

    const groups = groupByYear(notes);

    expect(groups.map((g) => g.year)).toEqual([2026, 2025]);
    expect(groups[0]?.notes.map((n) => n.slug)).toEqual(['a', 'c']);
  });
});

describe('adjacentNotes', () => {
  const sorted = sortNotes([
    note({ slug: 'a', pubDate: new Date('2026-03-01') }),
    note({ slug: 'b', pubDate: new Date('2026-02-01') }),
    note({ slug: 'c', pubDate: new Date('2026-01-01') }),
  ]);

  it('returns the newer note as next and the older as prev', () => {
    const { prev, next } = adjacentNotes(sorted, 'b');
    expect(next?.slug).toBe('a');
    expect(prev?.slug).toBe('c');
  });

  it('leaves ends open', () => {
    expect(adjacentNotes(sorted, 'a').next).toBeUndefined();
    expect(adjacentNotes(sorted, 'c').prev).toBeUndefined();
  });
});

describe('relatedNotes', () => {
  const current = note({ slug: 'cur', category: 'arch', tags: ['astro', 'seo'] });
  const notes = [
    current,
    note({ slug: 'shares-two', category: 'arch', tags: ['astro', 'seo'] }),
    note({ slug: 'shares-one', category: 'business', tags: ['astro'] }),
    note({ slug: 'shares-category', category: 'arch', tags: ['ai'] }),
    note({ slug: 'unrelated', category: 'business', tags: ['ai'] }),
    note({ slug: 'other-lang', category: 'arch', tags: ['astro', 'seo'], lang: 'en' }),
  ];

  it('excludes the current note, other languages and unrelated notes', () => {
    const slugs = relatedNotes(notes, current, 5).map((n) => n.slug);
    expect(slugs).not.toContain('cur');
    expect(slugs).not.toContain('other-lang');
    expect(slugs).not.toContain('unrelated');
  });

  it('ranks by shared tags then category and respects the limit', () => {
    const slugs = relatedNotes(notes, current, 2).map((n) => n.slug);
    expect(slugs).toEqual(['shares-two', 'shares-one']);
  });
});

describe('formatDate', () => {
  it('formats a midnight-UTC date in UTC, not local time', () => {
    expect(formatDate(new Date('2026-01-01'), 'en')).toBe('January 1, 2026');
  });
});

describe('searchText', () => {
  it('joins the searchable fields in lower case', () => {
    const text = searchText(
      note({ slug: 'a', title: 'Astro SEO', tags: ['perf'], category: 'Arch' }),
    );
    expect(text).toContain('astro seo');
    expect(text).toContain('perf');
    expect(text).toContain('arch');
  });
});

describe('hasPublishedNotes', () => {
  it('returns false for empty collection', () => {
    expect(hasPublishedNotes([])).toBe(false);
  });

  it('returns true when at least one note exists', () => {
    const notes = [note({ slug: 'a' })];
    expect(hasPublishedNotes(notes)).toBe(true);
  });
});
