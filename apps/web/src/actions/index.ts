import { ActionError, defineAction } from 'astro:actions';
import { getCollection } from 'astro:content';
import { env } from 'cloudflare:workers';

import { resolveClientIp, submitConfiguredContact } from '@/features/contact/index.ts';
import {
  leaveConfiguredMarks,
  type MarksResult,
  type NoteCatalog,
  readConfiguredMarks,
} from '@/features/marks/index.ts';

const FAILURE = 'Unable to send your message. Please try again later.';
const MARKS_FAILURE = 'Unable to save your footprint. Please try again later.';

// Astro checkOrigin covers form content types; JSON requires this explicit check too.
function assertSameOrigin(request: Request, message: string): void {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    throw new ActionError({ code: 'FORBIDDEN', message });
  }
}

/** Only published notes may hold footprints, so nobody can create rows with made-up slugs. */
async function publishedNotes(): Promise<NoteCatalog> {
  const ids = new Set((await getCollection('notes')).map((note) => note.id));
  return { has: (slug) => ids.has(slug) };
}

/** Maps the outcome to Action errors; messages never carry internal details. */
function unwrapMarks(result: MarksResult | null): { total: number } {
  if (!result) throw new ActionError({ code: 'SERVICE_UNAVAILABLE', message: MARKS_FAILURE });
  if (result.ok) return { total: result.total };
  if (result.reason === 'rate_limited') {
    throw new ActionError({ code: 'TOO_MANY_REQUESTS', message: MARKS_FAILURE });
  }
  throw new ActionError({ code: 'BAD_REQUEST', message: MARKS_FAILURE });
}

/** A store failure (D1 down, unexpected row) is unavailable, never a leaked stack. */
async function guardStore(run: () => Promise<MarksResult | null>): Promise<MarksResult | null> {
  try {
    return await run();
  } catch {
    console.error('marks store failed');
    return null;
  }
}

export const server = {
  contact: defineAction({
    accept: 'json',
    async handler(input: unknown, { request }) {
      assertSameOrigin(request, FAILURE);
      // Cloudflare overwrites this header; never use user input or X-Forwarded-For as identity.
      const result = await submitConfiguredContact(
        input,
        resolveClientIp(request.headers.get('cf-connecting-ip'), import.meta.env.DEV),
        env,
      );
      if (!result) throw new ActionError({ code: 'SERVICE_UNAVAILABLE', message: FAILURE });
      if (!result.ok) throw new ActionError({ code: 'BAD_REQUEST', message: FAILURE });
      return { ok: true };
    },
  }),
  marks: {
    get: defineAction({
      accept: 'json',
      async handler(input: unknown, { request }) {
        assertSameOrigin(request, MARKS_FAILURE);
        const catalog = await publishedNotes();
        return unwrapMarks(await guardStore(() => readConfiguredMarks(input, env, catalog)));
      },
    }),
    leave: defineAction({
      accept: 'json',
      async handler(input: unknown, { request }) {
        assertSameOrigin(request, MARKS_FAILURE);
        const catalog = await publishedNotes();
        // Cloudflare overwrites this header; it only feeds the rate limiter and is never stored.
        const ip = resolveClientIp(request.headers.get('cf-connecting-ip'), import.meta.env.DEV);
        return unwrapMarks(await guardStore(() => leaveConfiguredMarks(input, ip, env, catalog)));
      },
    }),
  },
};
