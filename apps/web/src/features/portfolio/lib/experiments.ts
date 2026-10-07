import type { Locale } from '@/shared/i18n/index.ts';

/** Display names for the experiment tag ids; an id that is not listed is shown as written. */
const EXPERIMENT_TAG_LABELS: Readonly<Record<string, string>> = {
  'ai-agents': 'AI agents',
  astro: 'Astro',
  cloudflare: 'Cloudflare',
  tooling: 'Tooling',
  typescript: 'TypeScript',
};

/** Most chips an experiment card shows. */
export const MAX_EXPERIMENT_TAGS = 3;

export const experimentTagLabel = (id: string): string => EXPERIMENT_TAG_LABELS[id] ?? id;

/** The tags a card shows: the first `MAX_EXPERIMENT_TAGS`, in the order written. */
export function visibleExperimentTags(tags: readonly string[]): string[] {
  return tags.slice(0, MAX_EXPERIMENT_TAGS);
}

/**
 * Fails the build when an experiment points at a note that is not published, so a case link can never
 * render dead. `publishedSlugs` are the ids of the notes collection.
 */
export function assertNotesExist(
  experiments: readonly { id: string; data: { note?: string | undefined } }[],
  publishedSlugs: readonly string[],
): void {
  for (const { id, data } of experiments) {
    if (data.note !== undefined && !publishedSlugs.includes(data.note)) {
      throw new Error(`Experiment "${id}" points to note "${data.note}", which is not published`);
    }
  }
}

/** i18n key of the case link: names the note's language when it differs from the page's. */
export function caseLinkLabelKey(
  pageLocale: Locale,
  noteLang: Locale,
): 'experiment.case' | 'experiment.case.es' | 'experiment.case.en' {
  return noteLang === pageLocale ? 'experiment.case' : `experiment.case.${noteLang}`;
}

/**
 * Fails the build when more than `max` experiments are featured (`experiments.maxFeatured` in
 * `site.config.ts`), so the big exhibition pieces stay few and the index stays scannable.
 */
export function assertFeaturedLimit(
  experiments: readonly { id: string; data: { featured: boolean } }[],
  max: number,
): void {
  const featured = experiments.filter(({ data }) => data.featured);
  if (featured.length > max) {
    throw new Error(
      `${featured.length} experiments are featured (${featured.map(({ id }) => id).join(', ')}), but at most ${max} may be (\`experiments.maxFeatured\` in site.config.ts): set \`featured\` to false on the others so the experiments page stays scannable`,
    );
  }
}

/**
 * Splits already sorted experiments into the big pieces (the featured ones, or the first entry when
 * none is featured) and the compact tier, grouped by year with the newest year first. Entries keep
 * their incoming order inside a year.
 */
export function tierExperiments<T extends { year: number; featured: boolean }>(
  sorted: readonly T[],
): { big: T[]; compact: { year: number; entries: T[] }[] } {
  const featured = sorted.filter((entry) => entry.featured);
  const big = featured.length > 0 ? featured : sorted.slice(0, 1);
  const bigSet = new Set<T>(big);
  const groups = new Map<number, T[]>();
  for (const entry of sorted) {
    if (bigSet.has(entry)) continue;
    groups.set(entry.year, [...(groups.get(entry.year) ?? []), entry]);
  }
  const compact = [...groups]
    .sort(([a], [b]) => b - a)
    .map(([year, entries]) => ({ year, entries }));
  return { big, compact };
}
