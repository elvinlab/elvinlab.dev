import { z } from 'zod';

import { createD1MarkStore, type D1Like } from './adapters/d1.ts';
import { marksBindingsSchema } from './bindings.ts';
import { leaveMarks, type MarksResult, readMarks } from './marks.ts';
import type { MarksPorts, NoteCatalog } from './ports.ts';

const allowedSchema = z.object({ success: z.literal(true) });

/** Validates the bindings per request; null means unavailable (fail closed), never partial setup. */
function buildPorts(
  bindings: unknown,
  catalog: NoteCatalog,
  log: (message: string) => void,
): MarksPorts | null {
  const parsed = marksBindingsSchema.safeParse(bindings);
  if (!parsed.success) {
    // Names only: a rejected value must never reach the log.
    const names = new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? 'bindings')));
    log(`marks unavailable, bindings rejected: ${[...names].join(', ')}`);
    return null;
  }
  const { MARKS_DB, MARKS_RATE_LIMITER } = parsed.data;
  return {
    catalog,
    store: createD1MarkStore(MARKS_DB as D1Like),
    limiter: {
      async allow(ip) {
        const result = await MARKS_RATE_LIMITER.limit({ key: `marks:${ip}` });
        return allowedSchema.safeParse(result).success;
      },
    },
  };
}

export async function readConfiguredMarks(
  input: unknown,
  bindings: unknown,
  catalog: NoteCatalog,
  log: (message: string) => void = console.error,
): Promise<MarksResult | null> {
  const ports = buildPorts(bindings, catalog, log);
  return ports ? readMarks(input, ports) : null;
}

export async function leaveConfiguredMarks(
  input: unknown,
  ip: string | undefined,
  bindings: unknown,
  catalog: NoteCatalog,
  log: (message: string) => void = console.error,
): Promise<MarksResult | null> {
  const ports = buildPorts(bindings, catalog, log);
  return ports ? leaveMarks(input, ip, ports) : null;
}
