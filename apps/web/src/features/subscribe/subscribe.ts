import { z } from 'zod';

import { SUBSCRIBE_POLICY } from './config.ts';
import type { NoteMail, SubscribePorts, Subscriber } from './ports.ts';

// Server-only and pure: no Astro or Cloudflare imports, so every rule runs under plain Vitest.
const inputSchema = z.strictObject({
  email: z
    .string()
    .max(SUBSCRIBE_POLICY.emailMaxLength)
    .regex(/^[^\r\n]*$/)
    .trim()
    .toLowerCase()
    .pipe(z.email()),
  locale: z.enum(['es', 'en']),
  website: z.literal(''),
  startedAt: z.number().int().nonnegative(),
  token: z.string().min(1).max(SUBSCRIBE_POLICY.tokenMaxLength),
});
const ipSchema = z.union([z.ipv4(), z.ipv6()]);
const confirmTokenSchema = z.string().min(1).max(SUBSCRIBE_POLICY.tokenMaxLength);
const subscriberIdSchema = z.string().regex(/^[0-9a-f]{32}$/);
const noteSchema = z.strictObject({
  slug: z
    .string()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(300),
  url: z
    .url()
    .max(2_048)
    .refine((value) => value.startsWith('https://') || value.startsWith('http://localhost')),
  summary: z.string().max(1_000).optional(),
});

export type SubscribeResult =
  | { ok: true }
  | { ok: false; error: 'Unable to subscribe. Please try again later.' };
export type ConfirmResult = 'confirmed' | 'invalid_or_expired';
export type UnsubscribeResult = 'unsubscribed' | 'invalid';
export type NoteToSend = z.input<typeof noteSchema>;
export type SendNoteResult = { sent: number; remaining: number; failed: boolean };

const REJECTED: SubscribeResult = {
  ok: false,
  error: 'Unable to subscribe. Please try again later.',
};

/** `<id>.<HMAC(id)>`: stateless, so it can go into every later email without storing a secret per row. */
export async function createUnsubscribeToken(
  id: string,
  ports: Pick<SubscribePorts, 'tokens'>,
): Promise<string> {
  return `${id}.${await ports.tokens.sign(id)}`;
}

/**
 * Validates and gates all side effects. After the gates, the answer is the same generic success
 * whether the address is new, pending, confirmed or unsubscribed, so it never reveals who is on
 * the list. Failures report stage names only.
 */
export async function subscribe(
  input: unknown,
  ip: string | undefined,
  ports: SubscribePorts,
): Promise<SubscribeResult> {
  const reject = (stage: string): SubscribeResult => {
    ports.report?.(stage);
    return REJECTED;
  };
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success || !ip || !ipSchema.safeParse(ip).success) return reject('invalid_input');

  try {
    const { email, locale, startedAt, token } = parsed.data;
    // This client timestamp is only a spam heuristic, never proof of a human submission.
    const elapsed = ports.now() - startedAt;
    if (!Number.isFinite(elapsed) || elapsed < SUBSCRIBE_POLICY.minFillTimeMs)
      return reject('fill_time');
    if (!(await ports.limiter.allow(ip))) return reject('rate_limit');
    if (!(await ports.verifier.verify(token, ip))) return reject('turnstile');

    const now = ports.now();
    let existing: Subscriber | null;
    try {
      await ports.repository.purgePendingBefore(now - SUBSCRIBE_POLICY.pendingPurgeMs);
      existing = await ports.repository.findByEmail(email);
    } catch {
      return reject('store');
    }
    if (existing?.status === 'confirmed') return { ok: true };
    if (
      existing?.status === 'pending' &&
      existing.confirmSentAt !== null &&
      now - existing.confirmSentAt <= SUBSCRIBE_POLICY.resendCooldownMs
    )
      return { ok: true };

    const confirmToken = ports.tokens.randomToken();
    const confirmHash = await ports.tokens.hash(confirmToken);
    const confirmExpires = now + SUBSCRIBE_POLICY.confirmExpiryMs;
    let id: string;
    try {
      if (existing) {
        id = existing.id;
        await ports.repository.renewConfirmation(id, {
          locale,
          confirmHash,
          confirmExpires,
          confirmSentAt: now,
        });
      } else {
        id = ports.tokens.randomId();
        const inserted = await ports.repository.insertPending({
          id,
          email,
          locale,
          confirmHash,
          confirmExpires,
          confirmSentAt: now,
          createdAt: now,
        });
        // A concurrent request created the row first: it already sent the confirmation.
        if (!inserted) return { ok: true };
      }
    } catch {
      return reject('store');
    }
    try {
      await ports.mailer.sendConfirmation({
        to: email,
        locale,
        confirmUrl: ports.links.confirm(confirmToken, locale),
      });
    } catch {
      // Without this, the cooldown would silently swallow the visitor's retry.
      await ports.repository.clearConfirmationSent(id).catch(() => undefined);
      return reject('mail');
    }
    return { ok: true };
  } catch {
    return reject('unexpected');
  }
}

/** Single use: the stored hash is cleared on confirmation. Unknown, used and expired look alike. */
export async function confirmSubscription(
  token: unknown,
  ports: Pick<SubscribePorts, 'repository' | 'tokens' | 'now'>,
): Promise<ConfirmResult> {
  const parsed = confirmTokenSchema.safeParse(token);
  if (!parsed.success) return 'invalid_or_expired';
  const confirmed = await ports.repository.confirmByHash(
    await ports.tokens.hash(parsed.data),
    ports.now(),
  );
  return confirmed ? 'confirmed' : 'invalid_or_expired';
}

/** Idempotent: an already unsubscribed address is a success; a bad signature or unknown id is not. */
export async function unsubscribe(
  token: unknown,
  ports: Pick<SubscribePorts, 'repository' | 'tokens' | 'now'>,
): Promise<UnsubscribeResult> {
  const parsed = confirmTokenSchema.safeParse(token);
  if (!parsed.success) return 'invalid';
  const [id, signature, ...rest] = parsed.data.split('.');
  if (!id || !signature || rest.length > 0 || !subscriberIdSchema.safeParse(id).success)
    return 'invalid';
  if (!(await ports.tokens.verify(id, signature))) return 'invalid';
  const subscriber = await ports.repository.findById(id);
  if (!subscriber) return 'invalid';
  if (subscriber.status !== 'unsubscribed')
    await ports.repository.markUnsubscribed(id, ports.now());
  return 'unsubscribed';
}

/**
 * Sends a note to the confirmed subscribers who have not received it yet, in provider-sized
 * batches and at most `dailyCap` per run. `lastNote` is written only after a batch was accepted, so
 * a failed or capped run resumes where it stopped. Returns counts only.
 */
export async function sendNote(
  note: NoteToSend,
  ports: Pick<SubscribePorts, 'repository' | 'mailer' | 'tokens' | 'links' | 'report'>,
  options: { dailyCap?: number; batchSize?: number } = {},
): Promise<SendNoteResult> {
  const { slug, title, url, summary } = noteSchema.parse(note);
  const dailyCap = options.dailyCap ?? SUBSCRIBE_POLICY.dailyCap;
  const batchSize = Math.min(
    options.batchSize ?? SUBSCRIBE_POLICY.batchSize,
    SUBSCRIBE_POLICY.batchSize,
  );
  let sent = 0;
  let failed = false;
  while (sent < dailyCap && !failed) {
    const batch = await ports.repository.listUnnotified(slug, Math.min(batchSize, dailyCap - sent));
    const first = batch[0];
    if (!first) break;
    const messages: NoteMail[] = await Promise.all(
      batch.map(async (subscriber) => {
        const unsubscribeToken = await createUnsubscribeToken(subscriber.id, ports);
        return {
          to: subscriber.email,
          locale: subscriber.locale,
          title,
          url,
          ...(summary === undefined ? {} : { summary }),
          unsubscribeUrl: ports.links.unsubscribe(unsubscribeToken, subscriber.locale),
        };
      }),
    );
    try {
      await ports.mailer.sendNote(messages, `note:${slug}:${first.id}`);
    } catch {
      ports.report?.('mail');
      failed = true;
      break;
    }
    await ports.repository.markNotified(
      batch.map((subscriber) => subscriber.id),
      slug,
    );
    sent += batch.length;
  }
  return { sent, remaining: await ports.repository.countUnnotified(slug), failed };
}
