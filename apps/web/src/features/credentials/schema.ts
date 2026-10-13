import { z } from 'astro/zod';

import { LOCALES } from '@/shared/i18n/index.ts';
import { localizableText } from '@/shared/lib/localized.ts';

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A bare file name: no directories, so it can only point inside `src/assets/education`. */
const IMAGE_FILE = /^[\w-][\w.-]*\.(?:png|jpe?g|webp|avif)$/i;

const localized = (max: number) =>
  localizableText({ max, defaultLocale: LOCALES.defaultLocale, locales: LOCALES.locales });

/**
 * A degree or certificate shown on `/me` and on the `/education/` timeline. Presentation-only data;
 * `url` is the verification link and is https so it never smuggles in an email or insecure endpoint.
 * The optional fields (`image`, `learnings`, `appliedIn`, `expires`) render only when present: an entry
 * without them shows no placeholder. Text fields accept one string or a per-locale object.
 */
export function credentialSchema() {
  return z.object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .describe('Name of the certificate or degree (max 120 characters).'),
    issuer: z.string().trim().min(1).max(80).describe('Who issued it (max 80 characters).'),
    kind: z
      .enum(['degree', 'certificate', 'professional'])
      .describe('Whether it is a degree, a course certificate or a professional certification.'),
    year: z
      .int()
      .min(1970)
      .describe('Year obtained; certificates are grouped by year, newest first.'),
    month: z
      .int()
      .min(1)
      .max(12)
      .optional()
      .describe('Optional month (1-12) to order items within a year.'),
    order: z
      .int()
      .min(0)
      .optional()
      .describe(
        'Optional editorial position inside its year on `/education/` (lower first). Entries without it follow, ordered by id.',
      ),
    url: z
      .url({ protocol: /^https$/ })
      .optional()
      .describe('Verification link (https only).'),
    credentialId: z
      .string()
      .regex(kebab)
      .optional()
      .describe('Credential id in kebab-case, if the issuer gives one.'),
    image: z
      .object({
        file: z
          .string()
          .regex(IMAGE_FILE)
          .describe('File name inside `src/assets/education/` (a public copy of the document).'),
        alt: localized(140).describe('What the image shows (max 140 characters).'),
      })
      .optional()
      .describe('Optional public copy of the document.'),
    learnings: z
      .array(localized(240))
      .min(1)
      .max(8)
      .optional()
      .describe('Optional points learned; the entry gets a details block only when present.'),
    appliedIn: localized(160)
      .optional()
      .describe('Optional note on where it was applied (max 160 characters).'),
    expires: z
      .string()
      .regex(/^\d{4}-(?:0[1-9]|1[0-2])$/)
      .optional()
      .describe('Optional expiry as YYYY-MM, for certifications that lapse.'),
  });
}

export type Credential = z.infer<ReturnType<typeof credentialSchema>>;
