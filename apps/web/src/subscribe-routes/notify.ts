import { getCollection } from 'astro:content';
import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';

import { resolveClientIp } from '@/features/contact/index.ts';
import { noteToSend, notifyConfigured, projectToSend } from '@/features/subscribe/index.ts';
import { site } from '@/shared/config/index.ts';

// A server route: it reads the request, so it can never be prerendered.
export const prerender = false;

const identity = { url: site.url, name: site.identity.handle, ownerName: site.identity.name };

/** Owner trigger (ADR 0014): `POST /api/subscribe/notify` with `{ slug, kind?, dryRun? }` and a Bearer token (`kind: 'project'` names an experiment key). */
export const POST: APIRoute = async ({ request }) => {
  const result = await notifyConfigured(
    {
      authorization: request.headers.get('authorization'),
      contentType: request.headers.get('content-type'),
      // Cloudflare overwrites this header; it only feeds the rate limiter and is never stored.
      ip: resolveClientIp(request.headers.get('cf-connecting-ip'), import.meta.env.DEV),
      body: await request.text(),
    },
    env,
    identity,
    async (slug) => {
      const entry = (await getCollection('notes')).find((note) => note.id === slug);
      return entry ? noteToSend(entry, site.url) : null;
    },
    fetch,
    console.error,
    async (key) => {
      const entry = (await getCollection('experiments')).find((project) => project.id === key);
      return entry ? projectToSend(entry, site.url) : null;
    },
  );
  const headers = { 'cache-control': 'no-store' };
  return result.body === undefined
    ? new Response(null, { status: result.status, headers })
    : Response.json(result.body, { status: result.status, headers });
};
