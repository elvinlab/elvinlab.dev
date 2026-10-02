import { z } from 'astro/zod';

import { LOCALES } from '@/shared/i18n/index.ts';
import { localizableText } from '@/shared/lib/localized.ts';

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const text = (max: number) =>
  localizableText({ max, defaultLocale: LOCALES.defaultLocale, locales: LOCALES.locales });

/**
 * One role in the `/me` experience timeline. `end` omitted means the current job (drawn with a solid
 * dot). Presentation-only data the site owner edits; no bullets, one truthful summary line. `role`,
 * `summary` and `location` are a plain string (shown for every locale) or one text per locale.
 */
export function experienceSchema() {
  return z
    .object({
      role: text(80).describe(
        'Job title: one string, or one text per locale such as `{ "es": "...", "en": "..." }` (max 80 characters each).',
      ),
      company: z.string().trim().min(1).max(80).describe('Company or client (max 80 characters).'),
      start: z.int().min(1970).describe('Year the role started.'),
      end: z
        .int()
        .min(1970)
        .optional()
        .describe('Year the role ended. Omit for the current role (drawn with a solid dot).'),
      location: text(80)
        .optional()
        .describe(
          'Where the role was based: one string, or one text per locale (max 80 characters each).',
        ),
      summary: text(280).describe(
        'One truthful summary, no bullets: one string, or one text per locale (max 280 characters each).',
      ),
      tags: z
        .array(z.string().regex(kebab))
        .max(5)
        .default([])
        .describe('Up to five kebab-case tags.'),
    })
    .refine((entry) => entry.end === undefined || entry.end >= entry.start, {
      path: ['end'],
      message: 'end must not be earlier than start',
    });
}

export type Experience = z.infer<ReturnType<typeof experienceSchema>>;
