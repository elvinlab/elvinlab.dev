import { z } from 'astro/zod';

export function changelogSchema() {
  return z.object({
    date: z.coerce.date(),
    category: z.enum(['added', 'changed', 'fixed', 'removed', 'security', 'deprecated']),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(500).optional(),
  });
}

export type ChangelogEntry = z.infer<ReturnType<typeof changelogSchema>>;
