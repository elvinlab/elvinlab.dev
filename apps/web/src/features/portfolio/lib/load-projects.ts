import { getCollection } from 'astro:content';

import type { Experiment } from '@/features/portfolio/schema.ts';
import type { Locale } from '@/shared/i18n/index.ts';

import { sortExperiments } from './portfolio.ts';
import { assertNotesExist } from './projects.ts';

/** A project ready to render: its data plus the language of the note that tells its case. */
export type Project = Experiment & { id: string; noteLang?: Locale };

/**
 * The projects, featured first then newest. A project whose `note` is not a published note fails
 * the build here, so no page can render a dead case link.
 */
export async function loadProjects(): Promise<Project[]> {
  const [projects, notes] = await Promise.all([
    getCollection('experiments'),
    getCollection('notes'),
  ]);
  assertNotesExist(
    projects,
    notes.map((note) => note.id),
  );
  const noteLangs = new Map(notes.map((note) => [note.id, note.data.lang]));
  return sortExperiments(projects).map(({ id, data }) => ({
    ...data,
    id,
    ...(data.note !== undefined ? { noteLang: noteLangs.get(data.note) ?? 'es' } : {}),
  }));
}
