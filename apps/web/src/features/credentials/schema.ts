import { z } from 'astro/zod';

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A certificate or degree shown on `/me`, grouped by year (newest first). Presentation-only data;
 * `url` is https so a verification link never smuggles in an email or insecure endpoint.
 */
export function credentialSchema() {
  return z.object({
    title: z.string().trim().min(1).max(120),
    issuer: z.string().trim().min(1).max(80),
    kind: z.enum(['degree', 'certificate']),
    year: z.int().min(1970),
    /** Optional month (1–12) for ordering within a year. */
    month: z.int().min(1).max(12).optional(),
    url: z.url({ protocol: /^https$/ }).optional(),
    credentialId: z.string().regex(kebab).optional(),
  });
}

export type Credential = z.infer<ReturnType<typeof credentialSchema>>;
