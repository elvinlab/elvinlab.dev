import { z } from 'astro/zod';

/** One entry of `src/content/changelog.json` (keyed by an id; the page sorts by date, newest first). */
export function changelogSchema() {
  return z.object({
    date: z.coerce.date().meta({
      description: 'Day the change shipped to production.',
      'x-type': 'date (YYYY-MM-DD)',
    }),
    category: z
      .enum(['added', 'changed', 'fixed', 'removed', 'security', 'deprecated'])
      .describe('Keep-a-Changelog category.'),
    title: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .describe('What a visitor would notice, in plain words (max 120 characters).'),
    description: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .optional()
      .describe('One or two sentences of detail (max 500 characters).'),
  });
}

export type ChangelogEntry = z.infer<ReturnType<typeof changelogSchema>>;
