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
      startHere: z
        .union([z.literal(1), z.literal(2), z.literal(3)])
        .optional()
        .meta({
          description:
            'Marks the note as a start-here entry point and sets its order (1 to 3). Each value can be used once per language; requires `startHereNote`.',
          'x-type': '1 | 2 | 3',
        }),
      startHereNote: z
        .string()
        .trim()
        .min(1)
        .max(120)
        .optional()
        .describe(
          'One line saying why to start with this note (max 120 characters); required when `startHere` is set.',
        ),
      decision: z
        .object({
          context: summary.describe('What forced a decision (max 280 characters).'),
          decision: summary.describe('What you chose and what you ruled out (max 280 characters).'),
          outcome: summary.describe('What happened next (max 280 characters).'),
        })
        .describe('Decision record shown before the text: context, decision and outcome.'),
    })
    .refine((note) => note.startHere === undefined || note.startHereNote !== undefined, {
      path: ['startHereNote'],
      message: 'startHereNote is required when startHere is set',
    })
    .refine((note) => !note.updatedDate || note.updatedDate >= note.pubDate, {
      path: ['updatedDate'],
      message: 'updatedDate must not be earlier than pubDate',
    });
}

/**
 * One entry of `src/content/topics.json`, keyed by the topic slug (the key becomes the URL
 * `/notes/tag/<slug>/`). Several raw note tags can map to one topic. The length limits of
 * `description` and `intro` are enforced by the build guard (`assertTopics`), which also reports
 * tags that no note carries, duplicate slugs and slugs that take a route.
 */
export function topicSchema() {
  return z.object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .describe('Topic name: the page `<h1>` and its title (max 60 characters).'),
    description: z
      .string()
      .trim()
      .min(1)
      .describe('Meta description of the topic page (max 160 characters, checked at build).'),
    intro: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        'Short unique introduction shown on the topic page, 40 to 80 words, checked at build. Without it the topic has no page.',
      ),
    tags: z
      .array(z.string().regex(kebab))
      .min(1)
      .describe(
        'Raw note tags that belong to this topic. A note belongs to it when any of its tags is listed; every listed tag must exist in some note.',
      ),
  });
}

export type TopicData = z.infer<ReturnType<typeof topicSchema>>;

export type NoteData = z.infer<ReturnType<typeof noteSchema>>;
