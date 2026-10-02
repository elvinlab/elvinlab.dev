import { z } from 'astro/zod';

import { LOCALES } from '@/shared/i18n/index.ts';

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const summary = z.string().trim().min(1).max(280);

/**
 * Frontmatter of a Lab Note. Each note is a numbered notebook entry written in one language and
 * summarized by a decision record (context, decision, outcome) shown before the text.
 */
export function noteSchema() {
  return z
    .object({
      number: z
        .int()
        .positive()
        .describe(
          'Entry number shown as `Nota 001`; a translation reuses the number of its original.',
        ),
      title: z
        .string()
        .trim()
        .min(1)
        .max(90)
        .describe(
          'Note title (max 90 characters): the page title and the headline of the share card.',
        ),
      description: z
        .string()
        .trim()
        .min(1)
        .max(160)
        .describe('One sentence for search results and link previews (max 160 characters).'),
      pubDate: z.coerce.date().meta({
        description: 'Publication date. Notes with the same date sort by number, highest first.',
        'x-type': 'date (YYYY-MM-DD)',
      }),
      updatedDate: z.coerce.date().optional().meta({
        description: 'Date of the last meaningful edit; must not be earlier than `pubDate`.',
        'x-type': 'date (YYYY-MM-DD)',
      }),
      lang: z
        .enum(LOCALES.locales)
        .describe('Language the note is written in (one language per note).'),
      translationOf: z
        .string()
        .regex(kebab)
        .optional()
        .describe(
          'Slug of the same note in the other language. One side is enough (the link works both ways). Both notes then point at each other with hreflang and the language switch goes to the translation. The target must be published too, or the build fails.',
        ),
      category: z
        .string()
        .regex(kebab)
        .describe(
          'One category in kebab-case (for example `decisiones`); shown above the title and used to group the index.',
        ),
      tags: z
        .array(z.string().regex(kebab))
        .max(5)
        .default([])
        .describe('Up to five kebab-case tags.'),
      decision: z
        .object({
          context: summary.describe('What forced a decision (max 280 characters).'),
          decision: summary.describe('What you chose and what you ruled out (max 280 characters).'),
          outcome: summary.describe('What happened next (max 280 characters).'),
        })
        .describe('Decision record shown before the text: context, decision and outcome.'),
    })
    .refine((note) => !note.updatedDate || note.updatedDate >= note.pubDate, {
      path: ['updatedDate'],
      message: 'updatedDate must not be earlier than pubDate',
    });
}

export type NoteData = z.infer<ReturnType<typeof noteSchema>>;
