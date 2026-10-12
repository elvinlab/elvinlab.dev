import type { Locale } from '@/shared/i18n/index.ts';

import { type NoteLike, relatedNotes, sortNotes } from './notes.ts';

/** How many notes the start-here block and the end-of-note block hold at most. */
export const START_HERE_SIZE = 3;
/** Longest allowed `startHereNote`, in characters. */
export const START_HERE_NOTE_MAX = 120;

/** A note as the start-here logic reads it: the base note plus the optional curation fields. */
export type StartHereNote = {
  slug: string;
  data: NoteLike['data'] & {
    startHere?: 1 | 2 | 3 | undefined;
    startHereNote?: string | undefined;
  };
};

export type StartHereProblem = { level: 'error' | 'warning'; message: string };

/**
 * Everything wrong (errors) or worth knowing (warnings) about the start-here flags of a
 * collection. Errors: a value outside 1 to 3, a flag without a reason (or a reason over 120
 * characters), and the same value used twice in one language. Warning: a language with notes but
 * fewer than three flagged, where the fallback applies.
 */
export function startHereProblems(notes: readonly StartHereNote[]): StartHereProblem[] {
  const problems: StartHereProblem[] = [];
  const seen = new Map<string, string>();
  const flaggedPerLang = new Map<string, number>();
  const langs = new Set<string>();

  for (const { slug, data } of notes) {
    langs.add(data.lang);
    if (data.startHere === undefined) continue;
    const value: number = data.startHere;
    if (!Number.isInteger(value) || value < 1 || value > START_HERE_SIZE) {
      problems.push({
        level: 'error',
        message: `Note "${slug}" has startHere ${value}; use a value from 1 to ${START_HERE_SIZE}.`,
      });
      continue;
    }
    const reason = data.startHereNote?.trim() ?? '';
    if (reason === '' || reason.length > START_HERE_NOTE_MAX) {
      problems.push({
        level: 'error',
        message: `Note "${slug}" sets startHere but its startHereNote is ${reason === '' ? 'missing' : 'over 120 characters'} (1 to ${START_HERE_NOTE_MAX} characters required).`,
      });
    }
    const key = `${data.lang}:${value}`;
    const first = seen.get(key);
    if (first !== undefined) {
      problems.push({
        level: 'error',
        message: `Notes "${first}" and "${slug}" both use startHere ${value} in ${data.lang}; each value can be used once per language.`,
      });
    } else {
      seen.set(key, slug);
    }
    flaggedPerLang.set(data.lang, (flaggedPerLang.get(data.lang) ?? 0) + 1);
  }

  for (const lang of langs) {
    const count = flaggedPerLang.get(lang) ?? 0;
    if (count < START_HERE_SIZE) {
      problems.push({
        level: 'warning',
        message: `Only ${count} of ${START_HERE_SIZE} start-here notes are flagged in ${lang}; the most recent notes fill the rest.`,
      });
    }
  }
  return problems;
}

const warned = new Set<string>();

/** Throws on start-here errors (failing the build) and warns once per message on warnings. */
export function assertStartHere(notes: readonly StartHereNote[]): void {
  const problems = startHereProblems(notes);
  const errors = problems.filter((problem) => problem.level === 'error');
  if (errors.length > 0) throw new Error(errors.map((problem) => problem.message).join('\n'));
  for (const { message } of problems) {
    if (warned.has(message)) continue;
    warned.add(message);
    console.warn(`[notes] ${message}`);
  }
}

/** The flagged notes of `lang`, in `startHere` order. */
function flaggedNotes<T extends StartHereNote>(notes: readonly T[], lang: Locale): T[] {
  return notes
    .filter((note) => note.data.lang === lang && note.data.startHere !== undefined)
    .sort((a, b) => (a.data.startHere ?? 0) - (b.data.startHere ?? 0));
}

/**
 * The start-here notes of `lang`: those flagged, by `startHere`, then the most recent notes of the
 * language to reach three. Only notes in `notes` can appear, so an unpublished or removed note
 * never produces a link.
 */
export function selectStartHere<T extends StartHereNote>(
  notes: readonly T[],
  lang: Locale,
  limit: number = START_HERE_SIZE,
): T[] {
  const picked = flaggedNotes(notes, lang).slice(0, limit);
  const taken = new Set(picked.map((note) => note.slug));
  const fill = sortNotes(notes.filter((note) => note.data.lang === lang && !taken.has(note.slug)));
  return [...picked, ...fill].slice(0, limit);
}

/**
 * The "keep reading" list at the end of a note: flagged start-here notes first, then related ones,
 * up to `limit`. The current note and `exclude` (the previous and next notes already on the page)
 * never appear.
 */
export function continueReading<T extends StartHereNote>(
  notes: readonly T[],
  current: NoteLike,
  limit: number,
  exclude: readonly string[],
): T[] {
  const skip = new Set([current.slug, ...exclude]);
  const start = flaggedNotes(notes, current.data.lang)
    .filter((note) => !skip.has(note.slug))
    .slice(0, limit);
  const taken = [...skip, ...start.map((note) => note.slug)];
  const related = relatedNotes(notes, current, limit - start.length, taken);
  return [...start, ...related];
}
