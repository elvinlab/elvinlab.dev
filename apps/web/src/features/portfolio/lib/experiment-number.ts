import { experimentDate } from './pagination.ts';

type Numbered = { id: string; year: number; publishedAt?: string | undefined };

/** `7` as `007`: at least three digits, like the number of a note. */
export const formatExperimentNumber = (position: number): string =>
  String(position).padStart(3, '0');

/**
 * The stable number of every experiment: its 1-based position in publication-date order over ALL
 * the experiments (oldest = 001, the id breaks ties), never its position in the current sort or
 * page. Keyed by id; the input order does not matter and the input is not mutated.
 */
export function experimentNumbers(experiments: readonly Numbered[]): Map<string, string> {
  const ordered = [...experiments].sort((a, b) => {
    const left = experimentDate(a);
    const right = experimentDate(b);
    return left < right ? -1 : left > right ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return new Map(ordered.map(({ id }, index) => [id, formatExperimentNumber(index + 1)]));
}
