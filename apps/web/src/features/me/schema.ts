import { z } from 'astro/zod';

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * One role in the `/me` experience timeline. `end` omitted means the current job (drawn with a solid
 * dot). Presentation-only data the site owner edits; no bullets, one truthful summary line.
 */
export function experienceSchema() {
  return z
    .object({
      role: z.string().trim().min(1).max(80).describe('Job title (max 80 characters).'),
      company: z.string().trim().min(1).max(80).describe('Company or client (max 80 characters).'),
      start: z.int().min(1970).describe('Year the role started.'),
      end: z
        .int()
        .min(1970)
        .optional()
        .describe('Year the role ended. Omit for the current role (drawn with a solid dot).'),
      location: z
        .string()
        .trim()
        .min(1)
        .max(80)
        .optional()
        .describe('Where the role was based (max 80 characters).'),
      summary: z
        .string()
        .trim()
        .min(1)
        .max(280)
        .describe('One truthful summary line, no bullets (max 280 characters).'),
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
