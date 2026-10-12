import { describe, expect, it } from 'vitest';

import type { NoteLike } from './notes.ts';
import {
  activeTopics,
  assertTopics,
  TOPIC_DESCRIPTION_MAX,
  TOPIC_INTRO_MAX_WORDS,
  TOPIC_INTRO_MIN_WORDS,
  type TopicEntry,
  topicHref,
  topicProblems,
  topicTagMap,
  wordCount,
} from './topics.ts';

const note = (slug: string, tags: string[], over: Partial<NoteLike['data']> = {}): NoteLike => ({
  slug,
  data: {
    number: 1,
    title: slug,
    description: 'Desc',
    pubDate: new Date('2026-01-01'),
    lang: 'es',
    category: 'decisiones',
    tags,
    ...over,
  },
});

const words = (count: number): string => Array.from({ length: count }, () => 'palabra').join(' ');

const topic = (
  slug: string,
  tags: string[],
  over: Partial<TopicEntry['data']> = {},
): TopicEntry => ({
  slug,
  data: {
    title: `Tema ${slug}`,
    description: 'Una descripción corta.',
    intro: words(50),
    tags,
    ...over,
  },
});

const notes = [
  note('a', ['astro', 'css'], { pubDate: new Date('2026-01-01') }),
  note('b', ['astro', 'ci'], { pubDate: new Date('2026-03-01') }),
  note('c', ['ci'], { pubDate: new Date('2026-02-01') }),
  note('d', ['astro'], { lang: 'en', pubDate: new Date('2026-04-01') }),
];

const errors = (topics: TopicEntry[], list: NoteLike[] = notes, minNotes = 2) =>
  topicProblems(topics, list, { minNotes })
    .filter((problem) => problem.level === 'error')
    .map((problem) => problem.message);

describe('wordCount', () => {
  it('counts whitespace separated words', () => {
    expect(wordCount('  uno dos\n tres ')).toBe(3);
    expect(wordCount('')).toBe(0);
  });
});

describe('topicHref', () => {
  it('points at the static topic page', () => {
    expect(topicHref('agentes-de-ia')).toBe('/notes/tag/agentes-de-ia/');
  });
});

describe('activeTopics', () => {
  it('gives each topic the Spanish notes that carry any of its tags, newest first', () => {
    const [first] = activeTopics([topic('web', ['astro', 'ci'])], notes, 2);
    expect(first?.notes.map((entry) => entry.slug)).toEqual(['b', 'c', 'a']);
  });

  it('lets a note appear in several topics', () => {
    const active = activeTopics([topic('x', ['astro']), topic('y', ['astro', 'ci'])], notes, 2);
    expect(active.map((entry) => entry.topic.slug)).toEqual(['x', 'y']);
    expect(active[0]?.notes.map((entry) => entry.slug)).toContain('b');
    expect(active[1]?.notes.map((entry) => entry.slug)).toContain('b');
  });

  it('skips a topic with fewer notes than the minimum', () => {
    expect(activeTopics([topic('x', ['css'])], notes, 2)).toEqual([]);
    expect(activeTopics([topic('x', ['css'])], notes, 1)).toHaveLength(1);
  });

  it('skips a topic without an intro', () => {
    expect(activeTopics([topic('x', ['astro'], { intro: undefined })], notes, 1)).toEqual([]);
    expect(activeTopics([topic('x', ['astro'], { intro: '  ' })], notes, 1)).toEqual([]);
  });
});

describe('topicTagMap', () => {
  it('maps every raw tag of an active topic to its slug, the first topic winning a shared tag', () => {
    const active = activeTopics([topic('x', ['astro']), topic('y', ['astro', 'ci'])], notes, 2);
    const map = topicTagMap(active);
    expect(map.get('astro')).toBe('x');
    expect(map.get('ci')).toBe('y');
    expect(map.has('css')).toBe(false);
  });
});

describe('topicProblems', () => {
  it('accepts a valid collection', () => {
    expect(errors([topic('web', ['astro', 'ci'])])).toEqual([]);
  });

  it('reports a tag that no note carries', () => {
    expect(errors([topic('web', ['astro', 'ghost'])])).toEqual([
      expect.stringContaining('"ghost"'),
    ]);
  });

  it('reports a duplicate slug', () => {
    expect(errors([topic('web', ['astro']), topic('web', ['ci'])])).toEqual([
      expect.stringContaining('Duplicate topic slug "web"'),
    ]);
  });

  it('reports a slug that collides with a route', () => {
    expect(errors([topic('page', ['astro'])])).toEqual([expect.stringContaining('"page"')]);
    expect(errors([topic('tag', ['astro'])])).toHaveLength(1);
  });

  it('reports a slug that is not kebab-case', () => {
    expect(errors([topic('Not Kebab', ['astro'])])).toHaveLength(1);
  });

  it('reports a description over the limit', () => {
    const description = 'x'.repeat(TOPIC_DESCRIPTION_MAX + 1);
    expect(errors([topic('web', ['astro'], { description })])).toEqual([
      expect.stringContaining('description'),
    ]);
    expect(
      errors([topic('web', ['astro'], { description: 'x'.repeat(TOPIC_DESCRIPTION_MAX) })]),
    ).toEqual([]);
  });

  it('reports an intro outside 40 to 80 words', () => {
    expect(errors([topic('web', ['astro'], { intro: words(TOPIC_INTRO_MIN_WORDS - 1) })])).toEqual([
      expect.stringContaining('intro'),
    ]);
    expect(errors([topic('web', ['astro'], { intro: words(TOPIC_INTRO_MAX_WORDS + 1) })])).toEqual([
      expect.stringContaining('intro'),
    ]);
    expect(errors([topic('web', ['astro'], { intro: words(TOPIC_INTRO_MIN_WORDS) })])).toEqual([]);
    expect(errors([topic('web', ['astro'], { intro: words(TOPIC_INTRO_MAX_WORDS) })])).toEqual([]);
  });

  it('warns, without failing, about a topic with fewer notes than the minimum', () => {
    const problems = topicProblems([topic('web', ['css'])], notes, { minNotes: 2 });
    expect(problems.filter((problem) => problem.level === 'error')).toEqual([]);
    expect(problems.filter((problem) => problem.level === 'warning')).toEqual([
      expect.objectContaining({ message: expect.stringContaining('"web"') }),
    ]);
  });

  it('warns about a topic without an intro and does not validate its words', () => {
    const problems = topicProblems([topic('web', ['astro'], { intro: undefined })], notes, {
      minNotes: 2,
    });
    expect(problems.map((problem) => problem.level)).toEqual(['warning']);
  });
});

describe('assertTopics', () => {
  it('throws with every error message', () => {
    expect(() => assertTopics([topic('page', ['ghost'])], notes, { minNotes: 2 })).toThrow(
      /"page"[\s\S]*"ghost"/,
    );
  });

  it('does not throw on warnings', () => {
    expect(() => assertTopics([topic('web', ['css'])], notes, { minNotes: 2 })).not.toThrow();
  });
});
