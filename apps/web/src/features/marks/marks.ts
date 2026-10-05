import { z } from 'zod';

import type { MarksPorts } from './ports.ts';

// Server-only and pure: no Astro or Cloudflare imports, so every rule runs under plain Vitest.
const slugSchema = z
  .string()
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const readSchema = z.strictObject({ slug: slugSchema });
const leaveSchema = z.strictObject({ slug: slugSchema, by: z.int().min(1).max(10) });

export type MarksResult =
  | { ok: true; total: number }
  | { ok: false; reason: 'invalid' | 'unknown_note' | 'rate_limited' };

const fail = (reason: Exclude<MarksResult, { ok: true }>['reason']): MarksResult => ({
  ok: false,
  reason,
});

/** Total footprints of a published note. Store failures propagate to the caller. */
export async function readMarks(input: unknown, ports: MarksPorts): Promise<MarksResult> {
  const parsed = readSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');
  if (!ports.catalog.has(parsed.data.slug)) return fail('unknown_note');
  return { ok: true, total: await ports.store.total(parsed.data.slug) };
}

/** Adds footprints to a published note after the rate limiter allows the client. */
export async function leaveMarks(
  input: unknown,
  ip: string | undefined,
  ports: MarksPorts,
): Promise<MarksResult> {
  const parsed = leaveSchema.safeParse(input);
  if (!parsed.success || !ip) return fail('invalid');
  if (!ports.catalog.has(parsed.data.slug)) return fail('unknown_note');
  if (!(await ports.limiter.allow(ip))) return fail('rate_limited');
  return { ok: true, total: await ports.store.add(parsed.data.slug, parsed.data.by) };
}
