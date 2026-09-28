import { z } from 'astro/zod';

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * An "experiment" (portfolio project) shown on the home and `/me`. `url` is https-only so a
 * private repo is never linked and no email address slips in; leave it out for private work.
 */
export function experimentSchema() {
  return z.object({
    title: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(200),
    tags: z.array(z.string().regex(kebab)).max(5).default([]),
    year: z.int().min(2000),
    status: z.enum(['running', 'shipped']).default('shipped'),
    url: z.url({ protocol: /^https$/ }).optional(),
    /** Featured experiments lead the home strip. */
    featured: z.boolean().default(false),
  });
}

export type Experiment = z.infer<ReturnType<typeof experimentSchema>>;
