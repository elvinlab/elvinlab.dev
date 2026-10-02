type ExperimentLike = { data: { year: number; featured: boolean } };

/** Whole years between `startedYear` and `reference` (this year by default), clamped at zero. */
export function yearsSince(startedYear: number, reference = new Date().getUTCFullYear()): number {
  return Math.max(0, reference - startedYear);
}

/** The recruiter status as a headline plus short tags; parts are separated by ` · `. */
export function splitStatus(status: string): { headline: string; tags: string[] } {
  const [headline = '', ...tags] = status
    .split('·')
    .map((part) => part.trim())
    .filter((part) => part !== '');
  return { headline, tags };
}

/** Experiments with featured ones first, then newest year. Returns a new array. */
export function sortExperiments<T extends ExperimentLike>(experiments: readonly T[]): T[] {
  return [...experiments].sort(
    (a, b) => Number(b.data.featured) - Number(a.data.featured) || b.data.year - a.data.year,
  );
}

/**
 * A `YYYY-MM-DD` calendar date as a long date in `locale` (for example "2 October 2026"). The date
 * is read and printed as UTC, so the result never depends on the viewer's or the build's timezone.
 */
export function formatNowDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
}
