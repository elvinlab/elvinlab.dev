import { z } from 'astro/zod';

import { LOCALES } from '@/shared/i18n/index.ts';
import { localizableText } from '@/shared/lib/localized.ts';

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// A bare file name (no folders) so an image can only come from `src/assets/projects/`.
const imageFile = /^[\w][\w.-]*\.(?:png|jpe?g|webp|avif)$/i;

const text = (max: number) =>
  localizableText({ max, defaultLocale: LOCALES.defaultLocale, locales: LOCALES.locales });

const httpsUrl = z.url({ protocol: /^https$/ });

const LOCALIZED_HINT = 'One string, or one text per locale such as `{ "es": "...", "en": "..." }`';

/**
 * A portfolio project, shown on `/projects/`, `/me` and (optionally) the home. `url` and `repo` are
 * https-only so a private repo is never linked and no email address slips in; leave them out for
 * private work. Text fields are a plain string (every locale) or one text per locale.
 */
export function experimentSchema() {
  return z.object({
    title: z.string().trim().min(1).max(80).describe('Project name (max 80 characters).'),
    description: text(200).describe(
      `What it is, in one or two sentences (max 200 characters each). ${LOCALIZED_HINT}.`,
    ),
    subtitle: text(200)
      .optional()
      .describe(`A short muted line under the title (max 200 characters each). ${LOCALIZED_HINT}.`),
    problem: text(200)
      .optional()
      .describe(`The problem it solves (max 200 characters each). ${LOCALIZED_HINT}.`),
    contribution: text(200)
      .optional()
      .describe(
        `What you did yourself, as opposed to tools or teammates (max 200 characters each). ${LOCALIZED_HINT}.`,
      ),
    result: text(200)
      .optional()
      .describe(
        `What it delivered, with no invented numbers (max 200 characters each). ${LOCALIZED_HINT}.`,
      ),
    tags: z
      .array(z.string().regex(kebab))
      .max(5)
      .default([])
      .describe('Up to five kebab-case tags.'),
    year: z.int().min(2000).describe('Year the project started or shipped.'),
    status: z
      .enum(['running', 'shipped'])
      .default('shipped')
      .describe('`running` shows a green dot; `shipped` a violet one.'),
    url: httpsUrl
      .optional()
      .describe(
        'Live or main link (https only). Leave it out for private work: a private repository is never linked.',
      ),
    repo: httpsUrl
      .optional()
      .describe('Public code link (https only). Never a private repository.'),
    note: z
      .string()
      .regex(kebab)
      .optional()
      .describe(
        'Slug of a published note that tells the case. The build fails if no such note is published.',
      ),
    image: z
      .object({
        file: z
          .string()
          .regex(imageFile)
          .describe('File name inside `apps/web/src/assets/projects/` (png, jpg, webp or avif).'),
        alt: text(140).describe(
          `Alternative text describing the screenshot (max 140 characters each). ${LOCALIZED_HINT}.`,
        ),
      })
      .optional()
      .describe('Screenshot shown on the card. Use your own screenshots only.'),
    featured: z.boolean().default(false).describe('Featured projects lead the lists.'),
  });
}

export type Experiment = z.infer<ReturnType<typeof experimentSchema>>;
