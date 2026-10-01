import { ActionError, defineAction } from 'astro:actions';
import { env } from 'cloudflare:workers';

import { resolveClientIp, submitConfiguredContact } from '@/features/contact/index.ts';

const FAILURE = 'Unable to send your message. Please try again later.';

export const server = {
  contact: defineAction({
    accept: 'json',
    async handler(input: unknown, { request }) {
      // Astro checkOrigin covers form content types; JSON requires this explicit check too.
      if (request.headers.get('origin') !== new URL(request.url).origin) {
        throw new ActionError({ code: 'FORBIDDEN', message: FAILURE });
      }
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
};
