import { z } from 'astro/zod';

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * An "experiment" (portfolio project) shown on the home and `/me`. `url` is https-only so a
 * private repo is never linked and no email address slips in; leave it out for private work.
 */
export function experimentSchema() {
  return z.object({
    title: z.string().trim().min(1).max(80).describe('Project name (max 80 characters).'),
    description: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .describe('What it is, in one or two sentences (max 200 characters).'),
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
    url: z
      .url({ protocol: /^https$/ })
      .optional()
      .describe(
        'Public link (https only). Leave it out for private work: a private repository is never linked.',
      ),
    featured: z.boolean().default(false).describe('Featured projects lead the home strip.'),
  });
}

export type Experiment = z.infer<ReturnType<typeof experimentSchema>>;
