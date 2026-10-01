import { z } from 'astro/zod';

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A certificate or degree shown on `/me`, grouped by year (newest first). Presentation-only data;
 * `url` is https so a verification link never smuggles in an email or insecure endpoint.
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
    kind: z.enum(['degree', 'certificate']).describe('Whether it is a degree or a certificate.'),
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
    url: z
      .url({ protocol: /^https$/ })
      .optional()
      .describe('Verification link (https only).'),
    credentialId: z
      .string()
      .regex(kebab)
      .optional()
      .describe('Credential id in kebab-case, if the issuer gives one.'),
  });
}

export type Credential = z.infer<ReturnType<typeof credentialSchema>>;
