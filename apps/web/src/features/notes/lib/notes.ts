import type { Locale } from '@/shared/i18n/index.ts';

/** Minimal shape the note helpers need; content entries and test fixtures both satisfy it. */
export type NoteLike = {
  slug: string;
  data: {
    number: number;
    title: string;
    description: string;
    pubDate: Date;
    lang: Locale;
    category: string;
    tags: string[];
  };
};

const WORDS_PER_MINUTE = 220;

/** Entry number as a three-digit label, e.g. `3` → `003` (design shows `Note 003`). */
export function noteNumber(value: number): string {
  return String(value).padStart(3, '0');
}

/** Reading time in whole minutes (at least one), counting words after stripping markdown noise. */
export function readingMinutes(body: string): number {
  const words = body
    .replace(/[#>*_`~[\]()!-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** Notes newest first, by publication date and then entry number. Returns a new array. */
export function sortNotes<T extends NoteLike>(notes: readonly T[]): T[] {
  return [...notes].sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime() || b.data.number - a.data.number,
  );
}

/** Keeps notes in `lang`, or every note for `'all'`. */
export function filterByLang<T extends NoteLike>(notes: readonly T[], lang: Locale | 'all'): T[] {
  return lang === 'all' ? [...notes] : notes.filter((note) => note.data.lang === lang);
}

/** Groups already-sorted notes by publication year, newest year first. */
export function groupByYear<T extends NoteLike>(
  notes: readonly T[],
): { year: number; notes: T[] }[] {
  const groups = new Map<number, T[]>();
  for (const note of sortNotes(notes)) {
    // UTC: frontmatter dates are calendar dates (midnight UTC), local time would shift the year.
    const year = note.data.pubDate.getUTCFullYear();
    const bucket = groups.get(year);
    if (bucket) bucket.push(note);
    else groups.set(year, [note]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, yearNotes]) => ({ year, notes: yearNotes }));
}

/** Previous (older) and next (newer) note around `slug` within an already-sorted list. */
export function adjacentNotes<T extends NoteLike>(
  sorted: readonly T[],
  slug: string,
): { prev?: T | undefined; next?: T | undefined } {
  const index = sorted.findIndex((note) => note.slug === slug);
  if (index === -1) return {};
  return { next: sorted[index - 1], prev: sorted[index + 1] };
}

/** Notes in the same language sharing tags or category, ranked by shared-tag count then category. */
export function relatedNotes<T extends NoteLike>(
  notes: readonly T[],
  current: NoteLike,
  limit: number,
): T[] {
  const tags = new Set(current.data.tags);
  return notes
    .filter((note) => note.slug !== current.slug && note.data.lang === current.data.lang)
    .map((note) => {
      const sharedTags = note.data.tags.filter((tag) => tags.has(tag)).length;
      const sharedCategory = note.data.category === current.data.category ? 1 : 0;
      return { note, score: sharedTags * 2 + sharedCategory };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.note);
}

/** Publication date as a localized long date, formatted in UTC so it never shifts by a day. */
export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(date);
}

/** Lower-cased blob of the fields a reader searches by, for the client-side filter. */
export function searchText(note: NoteLike): string {
  const { title, description, tags, category } = note.data;
  return [title, description, category, ...tags].join(' ').toLowerCase();
}
