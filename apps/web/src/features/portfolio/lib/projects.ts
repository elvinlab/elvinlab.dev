import type { Locale } from '@/shared/i18n/index.ts';

/** Display names for the project tag ids; an id that is not listed is shown as written. */
const PROJECT_TAG_LABELS: Readonly<Record<string, string>> = {
  'ai-agents': 'AI agents',
  astro: 'Astro',
  cloudflare: 'Cloudflare',
  tooling: 'Tooling',
  typescript: 'TypeScript',
};

/** Most chips a project card shows on the projects page. */
export const MAX_PROJECT_TAGS = 3;

export const projectTagLabel = (id: string): string => PROJECT_TAG_LABELS[id] ?? id;

/** The tags a card shows: the first `MAX_PROJECT_TAGS`, in the order written. */
export function visibleProjectTags(tags: readonly string[]): string[] {
  return tags.slice(0, MAX_PROJECT_TAGS);
}

/**
 * Fails the build when a project points at a note that is not published, so a case link can never
 * render dead. `publishedSlugs` are the ids of the notes collection.
 */
export function assertNotesExist(
  projects: readonly { id: string; data: { note?: string | undefined } }[],
  publishedSlugs: readonly string[],
): void {
  for (const { id, data } of projects) {
    if (data.note !== undefined && !publishedSlugs.includes(data.note)) {
      throw new Error(`Project "${id}" points to note "${data.note}", which is not published`);
    }
  }
}

/** i18n key of the case link: names the note's language when it differs from the page's. */
export function caseLinkLabelKey(
  pageLocale: Locale,
  noteLang: Locale,
): 'project.case' | 'project.case.es' | 'project.case.en' {
  return noteLang === pageLocale ? 'project.case' : `project.case.${noteLang}`;
}
