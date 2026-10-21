import { z } from 'zod';

import { SUBSCRIBE_POLICY } from './config.ts';
import { constantTimeEqual } from './constant-time.ts';
import type { SubscribePorts } from './ports.ts';
import { type NoteToSend, sendNote } from './subscribe.ts';

// Server-only and pure, like `subscribe.ts`: the Astro route only moves bytes in and out.
const bodySchema = z.strictObject({
  slug: z
    .string()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  /** What the slug names: a published note (the default) or a portfolio experiment. */
  kind: z.enum(['note', 'project']).optional(),
  dryRun: z.boolean().optional(),
});
const bearerPattern = /^Bearer (\S+)$/;
const encoder = new TextEncoder();

/** What the route hands over: raw header values and the raw body text, nothing parsed yet. */
export type NotifyRequest = {
  authorization: string | null;
  contentType: string | null;
  ip: string | undefined;
  body: string;
};

export type NotifyBody =
  | { recipients: number; wouldSend: number; remainingPool: number }
  | { sent: number; remaining: number; failed: boolean };

export type NotifyResponse = { status: number; body?: NotifyBody };

/** Looks up a published note and builds what the email carries; null for an unknown or draft slug. */
export type NoteLookup = (slug: string) => Promise<NoteToSend | null>;

/** Looks up a portfolio experiment and builds one notice per locale; null for an unknown key. */
export type ProjectLookup = (key: string) => Promise<NoteToSend[] | null>;

export type NotifyPorts = Pick<
  SubscribePorts,
  'repository' | 'quota' | 'mailer' | 'tokens' | 'links' | 'limiter' | 'report' | 'now'
> & {
  /** The owner secret; an empty value means the endpoint is not configured. */
  adminToken: string;
  findNote: NoteLookup;
  /** Absent when the site has no experiments: a project request then answers 404. */
  findProject?: ProjectLookup;
};

const utcDay = (time: number): string => new Date(time).toISOString().slice(0, 10);

/**
 * The owner trigger. The owner sends only a slug: title, summary and link come from the published
 * note, so a leaked token can never put arbitrary text in front of the list. Answers carry counts
 * and status codes, never addresses or tokens; the report receives stage names only.
 */
export async function notifySubscribers(
  request: NotifyRequest,
  ports: NotifyPorts,
): Promise<NotifyResponse> {
  const reject = (status: number, stage: string): NotifyResponse => {
    ports.report?.(stage);
    return { status };
  };
  if (!ports.adminToken) return { status: 503 };
  try {
    // Before the token comparison, so guessing is throttled whether or not a guess is right.
    if (!(await ports.limiter.allow(request.ip ?? 'unknown')))
      return reject(429, 'notify_rate_limit');

    const presented = bearerPattern.exec(request.authorization ?? '')?.[1];
    const same = await constantTimeEqual(presented ?? '', ports.adminToken);
    if (presented === undefined || !same) return reject(401, 'notify_auth');

    if (!/^application\/json(?:\s*;|$)/i.test(request.contentType ?? '')) return { status: 415 };
    if (encoder.encode(request.body).length > SUBSCRIBE_POLICY.notifyRequestMaxBytes)
      return { status: 413 };
    let json: unknown;
    try {
      json = JSON.parse(request.body);
    } catch {
      return { status: 400 };
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return { status: 400 };

    const notices =
      parsed.data.kind === 'project'
        ? await ports.findProject?.(parsed.data.slug)
        : [await ports.findNote(parsed.data.slug)];
    // A project is bilingual: one notice per locale, each going only to that locale's subscribers.
    const found = notices?.filter((notice): notice is NoteToSend => notice != null) ?? [];
    if (found.length === 0) return { status: 404 };

    if (parsed.data.dryRun === true) {
      let recipients = 0;
      for (const notice of found)
        recipients += await ports.repository.countUnnotified(notice.slug, notice.locale);
      const remainingPool = Math.max(
        0,
        SUBSCRIBE_POLICY.providerDailyTotal -
          (await ports.quota.confirmationsToday(utcDay(ports.now()))),
      );
      return {
        status: 200,
        body: {
          recipients,
          wouldSend: Math.min(recipients, SUBSCRIBE_POLICY.dailyCap, remainingPool),
          remainingPool,
        },
      };
    }

    // The daily cap is shared by the locales of one notice, so a project never doubles it.
    let sent = 0;
    let remaining = 0;
    let failed = false;
    for (const notice of found) {
      const result = await sendNote(notice, ports, {
        dailyCap: Math.max(0, SUBSCRIBE_POLICY.dailyCap - sent),
      });
      sent += result.sent;
      remaining += result.remaining;
      failed = failed || result.failed;
      if (failed) break;
    }
    const result = { sent, remaining, failed };
    return { status: result.failed ? 502 : 200, body: result };
  } catch {
    return reject(503, 'notify_unavailable');
  }
}
