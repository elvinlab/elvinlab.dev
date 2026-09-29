type ExperienceLike = { data: { start: number; end?: number | undefined } };

/** Experience newest first: ongoing roles (no end) lead, then by start year descending. */
export function sortExperience<T extends ExperienceLike>(entries: readonly T[]): T[] {
  const rank = (e: T): number => e.data.end ?? Number.POSITIVE_INFINITY;
  return [...entries].sort((a, b) => rank(b) - rank(a) || b.data.start - a.data.start);
}
