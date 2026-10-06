import { localizePath } from '@elvinlab/core';

import { LOCALES } from '@/shared/i18n/index.ts';

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
