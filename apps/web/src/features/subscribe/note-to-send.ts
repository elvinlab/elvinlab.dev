import { localizePath } from '@elvinlab/core';

import { LOCALES } from '@/shared/i18n/index.ts';
import { type LocalizedText, pickLocale } from '@/shared/lib/localized.ts';

import type { NoteToSend } from './subscribe.ts';

/** The slice of a published note the email needs. */
export type PublishedNote = {
  id: string;
  data: { title: string; description: string; lang: 'es' | 'en' };
};

/**
 * Builds what goes to the list from the published note itself, never from the request: the
 * public link follows the note's language (Spanish at the root, English under `/en`).
 */
export function noteToSend(note: PublishedNote, siteUrl: string): NoteToSend {
  return {
    slug: note.id,
    title: note.data.title,
    summary: note.data.description,
    url: new URL(localizePath(`/notes/${note.id}/`, note.data.lang, LOCALES), siteUrl).href,
    locale: note.data.lang,
  };
}

/** The slice of a portfolio experiment the email needs; its texts are plain or one per locale. */
export type PublishedProject = {
  id: string;
  data: { title: string; description: LocalizedText };
};

/**
 * One notice per locale, built from the experiment itself, never from the request: a project is
 * bilingual, so each subscriber gets it in their own language, linked to that language's case page.
 * It is recorded under `project:<id>`, apart from the note slugs.
 */
export function projectToSend(project: PublishedProject, siteUrl: string): NoteToSend[] {
  return LOCALES.locales.map((locale) => ({
    slug: `project:${project.id}`,
    kind: 'project',
    title: project.data.title,
    summary: pickLocale(project.data.description, locale, LOCALES.defaultLocale),
    url: new URL(localizePath(`/experiments/${project.id}/`, locale, LOCALES), siteUrl).href,
    locale,
  }));
}
