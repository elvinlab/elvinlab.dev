import { z } from 'astro/zod';

import { LOCALES } from '@/shared/i18n/index.ts';

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const summary = z.string().trim().min(1).max(280);

/** Astro's `image()` helper type, injected so the schema stays testable outside the content layer. */
type ImageSchema = () => z.ZodType;

/**
 * Frontmatter of a Lab Note. Each note is a numbered notebook entry written in one language and
 * summarized by a decision record (context, decision, outcome) shown before the text.
 */
export function noteSchema(image: ImageSchema) {
  return z
    .object({
      /** Entry number shown as `Note 003`; a translation reuses the number of its original. */
      number: z.int().positive(),
      title: z.string().trim().min(1).max(90),
      /** Search snippet and card summary. */
      description: z.string().trim().min(1).max(160),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      lang: z.enum(LOCALES.locales),
      /** Slug of the same note in another language, for hreflang and the language switch. */
      translationOf: z.string().regex(kebab).optional(),
      category: z.string().regex(kebab),
      tags: z.array(z.string().regex(kebab)).max(5).default([]),
      cover: image().optional(),
      decision: z.object({ context: summary, decision: summary, outcome: summary }),
    })
    .refine((note) => !note.updatedDate || note.updatedDate >= note.pubDate, {
      path: ['updatedDate'],
      message: 'updatedDate must not be earlier than pubDate',
    });
}

export type NoteData = z.infer<ReturnType<typeof noteSchema>>;
