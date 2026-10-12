import { type NoteLike, sortNotes } from './notes.ts';

/** Longest allowed topic `description` (the meta description), in characters. */
export const TOPIC_DESCRIPTION_MAX = 160;
/** Shortest and longest allowed topic `intro`, in words. */
export const TOPIC_INTRO_MIN_WORDS = 40;
export const TOPIC_INTRO_MAX_WORDS = 80;
/** Route segments under `/notes/tag/` and `/notes/` a topic slug must not take. */
export const TOPIC_RESERVED_SLUGS: readonly string[] = ['page', 'tag', 'tags'];
/** Topic pages are Spanish only, like the notes. */
const TOPIC_LANG = 'es';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A topic as the logic reads it: its slug (the content id) and its fields. */
export type TopicEntry = {
  slug: string;
  data: {
    title: string;
    description: string;
    intro?: string | undefined;
    tags: string[];
  };
};

export type TopicProblem = { level: 'error' | 'warning'; message: string };

/** A topic page that exists: the topic and its notes, newest first. */
export type ActiveTopic<T extends NoteLike = NoteLike> = { topic: TopicEntry; notes: T[] };

/** Path of the static page of a topic. */
export const topicHref = (slug: string): string => `/notes/tag/${slug}/`;

/** Whitespace separated words of a text. */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

const hasIntro = (topic: TopicEntry): boolean => (topic.data.intro?.trim() ?? '') !== '';

function notesOf<T extends NoteLike>(topic: TopicEntry, notes: readonly T[]): T[] {
  const tags = new Set(topic.data.tags);
  return sortNotes(
    notes.filter(
      (note) => note.data.lang === TOPIC_LANG && note.data.tags.some((tag) => tags.has(tag)),
    ),
  );
}

/**
 * The topics that get a page: those with an intro and at least `minNotes` Spanish notes carrying
 * any of their tags, each with its notes newest first. A note may appear in several topics.
 */
export function activeTopics<T extends NoteLike>(
  topics: readonly TopicEntry[],
  notes: readonly T[],
  minNotes: number,
): ActiveTopic<T>[] {
  return topics
    .filter(hasIntro)
    .map((topic) => ({ topic, notes: notesOf(topic, notes) }))
    .filter((entry) => entry.notes.length >= minNotes);
}

/** Raw tag to topic slug for the tags of active topics; the first topic in file order wins a shared tag. */
export function topicTagMap(active: readonly ActiveTopic[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const { topic } of active) {
    for (const tag of topic.data.tags) if (!map.has(tag)) map.set(tag, topic.slug);
  }
  return map;
}

/**
 * Everything wrong (errors) or worth knowing (warnings) about the topics. Errors: a duplicate or
 * badly formed slug, a slug that takes a route segment, a tag no note carries, a description over
 * 160 characters and an intro outside 40 to 80 words. Warnings: a topic without an intro or with
 * fewer notes than `minNotes`; its page is simply not generated.
 */
export function topicProblems(
  topics: readonly TopicEntry[],
  notes: readonly NoteLike[],
  options: { minNotes: number },
): TopicProblem[] {
  const problems: TopicProblem[] = [];
  const known = new Set(notes.flatMap((note) => note.data.tags));
  const slugs = new Set<string>();

  for (const topic of topics) {
    const { slug, data } = topic;
    if (slugs.has(slug)) {
      problems.push({ level: 'error', message: `Duplicate topic slug "${slug}".` });
    }
    slugs.add(slug);
    if (!KEBAB.test(slug)) {
      problems.push({
        level: 'error',
        message: `Topic slug "${slug}" must be kebab-case (lowercase letters, digits and hyphens).`,
      });
    }
    if (TOPIC_RESERVED_SLUGS.includes(slug)) {
      problems.push({
        level: 'error',
        message: `Topic slug "${slug}" collides with the route /notes/tag/${slug}/ or /notes/${slug}/; pick another.`,
      });
    }
    for (const tag of data.tags) {
      if (!known.has(tag)) {
        problems.push({
          level: 'error',
          message: `Topic "${slug}" lists the tag "${tag}", which no note carries.`,
        });
      }
    }
    if (data.description.length > TOPIC_DESCRIPTION_MAX) {
      problems.push({
        level: 'error',
        message: `Topic "${slug}" description has ${data.description.length} characters; the limit is ${TOPIC_DESCRIPTION_MAX}.`,
      });
    }
    if (!hasIntro(topic)) {
      problems.push({
        level: 'warning',
        message: `Topic "${slug}" has no intro; its page is not generated.`,
      });
      continue;
    }
    const words = wordCount(data.intro ?? '');
    if (words < TOPIC_INTRO_MIN_WORDS || words > TOPIC_INTRO_MAX_WORDS) {
      problems.push({
        level: 'error',
        message: `Topic "${slug}" intro has ${words} words; it needs ${TOPIC_INTRO_MIN_WORDS} to ${TOPIC_INTRO_MAX_WORDS}.`,
      });
    }
    const count = notesOf(topic, notes).length;
    if (count < options.minNotes) {
      problems.push({
        level: 'warning',
        message: `Topic "${slug}" has ${count} note(s), fewer than notes.topicMinNotes (${options.minNotes}); its page is not generated.`,
      });
    }
  }
  return problems;
}

const warned = new Set<string>();

/** Throws on topic errors (failing the build) and warns once per message on warnings. */
export function assertTopics(
  topics: readonly TopicEntry[],
  notes: readonly NoteLike[],
  options: { minNotes: number },
): void {
  const problems = topicProblems(topics, notes, options);
  const errors = problems.filter((problem) => problem.level === 'error');
  if (errors.length > 0) throw new Error(errors.map((problem) => problem.message).join('\n'));
  for (const { message } of problems) {
    if (warned.has(message)) continue;
    warned.add(message);
    console.warn(`[notes] ${message}`);
  }
}
