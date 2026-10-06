import { ActionError, defineAction } from 'astro:actions';
import { getCollection } from 'astro:content';
import { env } from 'cloudflare:workers';

import { resolveClientIp, submitConfiguredContact } from '@/features/contact/index.ts';
import {
  buildCatalog,
  leaveConfiguredMarks,
  type MarksResult,
  type NoteCatalog,
  readConfiguredMarks,
} from '@/features/marks/index.ts';
import {
  confirmConfiguredSubscription,
  submitConfiguredSubscribe,
  unsubscribeConfigured,
} from '@/features/subscribe/index.ts';
import { site } from '@/shared/config/index.ts';
import { SUBSCRIBE_RATE_LIMITED_MESSAGE } from '@/shared/subscribe/client-policy.ts';

const FAILURE = 'Unable to send your message. Please try again later.';
const MARKS_FAILURE = 'Unable to save your footprint. Please try again later.';
const SUBSCRIBE_FAILURE = 'Unable to subscribe. Please try again later.';
const SUBSCRIBE_CAPPED = 'Too many requests today. Please try again tomorrow.';
const SUBSCRIBE_UNAVAILABLE = 'Subscriptions are not available right now.';

// Astro checkOrigin covers form content types; JSON requires this explicit check too.
function assertSameOrigin(request: Request, message: string): void {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    throw new ActionError({ code: 'FORBIDDEN', message });
  }
}

/** Only published notes and the fixed page keys may hold footprints, so nobody can create rows with made-up slugs. */
async function publishedNotes(): Promise<NoteCatalog> {
  return buildCatalog((await getCollection('notes')).map((note) => note.id));
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

/** The routes and Actions of the subscription exist only while the blog and the flag are on. */
function assertSubscribeEnabled(): void {
  if (!site.features.blog || !site.features.subscribe) {
    throw new ActionError({ code: 'SERVICE_UNAVAILABLE', message: SUBSCRIBE_UNAVAILABLE });
  }
}

/** The contact Action exists only while `features.contact` is on (its page is not routed otherwise). */
function assertContactEnabled(): void {
  if (!site.features.contact) {
    throw new ActionError({ code: 'SERVICE_UNAVAILABLE', message: FAILURE });
  }
}

/** Reads `token` from an untyped JSON body; the domain validates the value. */
function tokenOf(input: unknown): unknown {
  return typeof input === 'object' && input !== null
    ? (input as { token?: unknown }).token
    : undefined;
}

/** A list failure (D1 down) is unavailable, never a leaked stack; null is what the runtime returns. */
async function guardList<T>(run: () => Promise<T | null>): Promise<T> {
  let result: T | null = null;
  try {
    result = await run();
  } catch {
    console.error('subscribe store failed');
  }
  if (result === null) {
    throw new ActionError({ code: 'SERVICE_UNAVAILABLE', message: SUBSCRIBE_UNAVAILABLE });
  }
  return result;
}

export const server = {
  contact: defineAction({
    accept: 'json',
    async handler(input: unknown, { request }) {
      assertSameOrigin(request, FAILURE);
      assertContactEnabled();
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
  subscribe: {
    request: defineAction({
      accept: 'json',
      async handler(input: unknown, { request }) {
        assertSameOrigin(request, SUBSCRIBE_FAILURE);
        assertSubscribeEnabled();
        const ip = resolveClientIp(request.headers.get('cf-connecting-ip'), import.meta.env.DEV);
        const result = await guardList(() =>
          submitConfiguredSubscribe(input, ip, env, {
            url: site.url,
            name: site.identity.handle,
            ownerName: site.identity.name,
          }),
        );
        // The same fixed answer for every address once the day is capped.
        if (!result.ok && result.error === 'daily_cap') {
          throw new ActionError({ code: 'TOO_MANY_REQUESTS', message: SUBSCRIBE_CAPPED });
        }
        // The per-minute limiter runs before Turnstile and the lookup, so this answer says nothing about an address.
        if (!result.ok && result.error === 'rate_limited') {
          throw new ActionError({
            code: 'TOO_MANY_REQUESTS',
            message: SUBSCRIBE_RATE_LIMITED_MESSAGE,
          });
        }
        // One fixed message whatever the reason: it must not reveal who is on the list.
        if (!result.ok) throw new ActionError({ code: 'BAD_REQUEST', message: SUBSCRIBE_FAILURE });
        return { ok: true };
      },
    }),
    confirm: defineAction({
      accept: 'json',
      async handler(input: unknown, { request }) {
        assertSameOrigin(request, SUBSCRIBE_FAILURE);
        assertSubscribeEnabled();
        return {
          result: await guardList(() => confirmConfiguredSubscription(tokenOf(input), env)),
        };
      },
    }),
    unsubscribe: defineAction({
      accept: 'json',
      async handler(input: unknown, { request }) {
        assertSameOrigin(request, SUBSCRIBE_FAILURE);
        assertSubscribeEnabled();
        return { result: await guardList(() => unsubscribeConfigured(tokenOf(input), env)) };
      },
    }),
  },
};
