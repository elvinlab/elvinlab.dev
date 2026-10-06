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

export type NotifyPorts = Pick<
  SubscribePorts,
  'repository' | 'quota' | 'mailer' | 'tokens' | 'links' | 'limiter' | 'report' | 'now'
> & {
  /** The owner secret; an empty value means the endpoint is not configured. */
  adminToken: string;
  findNote: NoteLookup;
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

    const note = await ports.findNote(parsed.data.slug);
    if (!note) return { status: 404 };

    if (parsed.data.dryRun === true) {
      const recipients = await ports.repository.countUnnotified(note.slug, note.locale);
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

    const result = await sendNote(note, ports);
    return { status: result.failed ? 502 : 200, body: result };
  } catch {
    return reject(503, 'notify_unavailable');
  }
}
