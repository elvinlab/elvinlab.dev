import { z } from 'astro/zod';

import { LOCALES } from '@/shared/i18n/index.ts';
import { localizableText } from '@/shared/lib/localized.ts';

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// A bare file name (no folders): it is looked up in the entry's own folder `src/assets/experiments/<id>/`.
const imageFile = /^[\w][\w.-]*\.(?:png|jpe?g|webp|avif)$/i;

const text = (max: number) =>
  localizableText({ max, defaultLocale: LOCALES.defaultLocale, locales: LOCALES.locales });

const httpsUrl = z.url({ protocol: /^https$/ });

const LOCALIZED_HINT = 'One string, or one text per locale such as `{ "es": "...", "en": "..." }`';

/**
 * A portfolio experiment (project), shown on `/experiments/`, `/me` and (optionally) the home. `url` and `repo` are
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
      .enum(['running', 'shipped', 'archived'])
      .default('shipped')
      .describe('`running` shows a green dot, `shipped` a violet one and `archived` a muted one.'),
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
    images: z
      .array(
        z.object({
          file: z
            .string()
            .regex(imageFile)
            .describe(
              'File name inside the own folder of the entry `apps/web/src/assets/experiments/<entry key>/` (png, jpg, webp or avif).',
            ),
          alt: text(140).describe(
            `Alternative text describing the screenshot (max 140 characters each). ${LOCALIZED_HINT}.`,
          ),
          caption: text(120)
            .optional()
            .describe(
              `A short caption shown under the image in the gallery (max 120 characters each). ${LOCALIZED_HINT}.`,
            ),
        }),
      )
      .min(1)
      .max(4)
      .optional()
      .describe(
        'One to four screenshots, in display order. The first is the cover (used by `/me` and as the first slide). Use your own screenshots only; leave the field out for a typographic cover.',
      ),
    order: z
      .int()
      .min(0)
      .max(1000)
      .optional()
      .describe(
        'Position among entries of the same tier: lower comes first (default 100). Featured entries always come before the others; ties go to the newest year, then the key.',
      ),
    featured: z.boolean().default(false).describe('Featured experiments lead the lists.'),
  });
}

export type Experiment = z.infer<ReturnType<typeof experimentSchema>>;
