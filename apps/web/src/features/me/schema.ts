import { z } from 'astro/zod';

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * One role in the `/me` experience timeline. `end` omitted means the current job (drawn with a solid
 * dot). Presentation-only data the site owner edits; no bullets, one truthful summary line.
 */
export function experienceSchema() {
  return z
    .object({
      role: z.string().trim().min(1).max(80),
      company: z.string().trim().min(1).max(80),
      start: z.int().min(1970),
      /** Omit for the current role. */
      end: z.int().min(1970).optional(),
      location: z.string().trim().min(1).max(80).optional(),
      summary: z.string().trim().min(1).max(280),
      tags: z.array(z.string().regex(kebab)).max(5).default([]),
    })
    .refine((entry) => entry.end === undefined || entry.end >= entry.start, {
      path: ['end'],
      message: 'end must not be earlier than start',
    });
}

export type Experience = z.infer<ReturnType<typeof experienceSchema>>;
