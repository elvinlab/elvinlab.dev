type ExperimentLike = { data: { year: number; featured: boolean } };

/** Whole years between `startedYear` and `reference` (this year by default), clamped at zero. */
export function yearsSince(startedYear: number, reference = new Date().getUTCFullYear()): number {
  return Math.max(0, reference - startedYear);
}

/** Experiments with featured ones first, then newest year. Returns a new array. */
export function sortExperiments<T extends ExperimentLike>(experiments: readonly T[]): T[] {
  return [...experiments].sort(
    (a, b) => Number(b.data.featured) - Number(a.data.featured) || b.data.year - a.data.year,
  );
}
