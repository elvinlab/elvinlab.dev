import { getCollection } from 'astro:content';

import type { Experiment } from '@/features/portfolio/schema.ts';
import type { Locale } from '@/shared/i18n/index.ts';

import { assertFeaturedLimit, assertNotesExist } from './experiments.ts';
import { sortExperiments } from './portfolio.ts';

/** An experiment ready to render: its data plus the language of the note that tells its case. */
export type ExperimentEntry = Experiment & { id: string; noteLang?: Locale };

/**
 * The experiments, featured first then newest. An experiment whose `note` is not a published note
 * fails the build here, so no page can render a dead case link.
 */
export async function loadExperiments(): Promise<ExperimentEntry[]> {
  const [experiments, notes] = await Promise.all([
    getCollection('experiments'),
    getCollection('notes'),
  ]);
  assertNotesExist(
    experiments,
    notes.map((note) => note.id),
  );
  assertFeaturedLimit(experiments);
  const noteLangs = new Map(notes.map((note) => [note.id, note.data.lang]));
  return sortExperiments(experiments).map(({ id, data }) => ({
    ...data,
    id,
    ...(data.note !== undefined ? { noteLang: noteLangs.get(data.note) ?? 'es' } : {}),
  }));
}
