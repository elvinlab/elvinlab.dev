import { z } from 'zod';

import { createTurnstileVerifier } from '@/shared/lib/turnstile.ts';

import {
  createD1SubscribeQuota,
  createD1SubscriberRepository,
  type D1Like,
} from './adapters/d1.ts';
import { createResendMailer } from './adapters/resend.ts';
import { createWebCryptoTokens } from './adapters/webcrypto.ts';
import { listBindingsSchema, sendBindingsSchema, subscribeBindingsSchema } from './bindings.ts';
import { SUBSCRIBE_PATHS, SUBSCRIBE_POLICY } from './config.ts';
import type { EmailSite, SubscribeLinks, SubscribePorts } from './ports.ts';
import {
  type ConfirmResult,
  confirmSubscription,
  type NoteToSend,
  type SendNoteResult,
  type SubscribeResult,
  sendNote,
  subscribe,
  type UnsubscribeResult,
  unsubscribe,
} from './subscribe.ts';

const allowedSchema = z.object({ success: z.literal(true) });

/** Names only: a rejected value may be a secret, so it never reaches the log. */
function rejectedNames(error: z.ZodError): string {
  return [...new Set(error.issues.map((issue) => String(issue.path[0] ?? 'bindings')))].join(', ');
}

/** Links for the emails: the Spanish site is at the root, English under `/en`. */
export function createLinks(siteUrl: string): SubscribeLinks {
  const origin = siteUrl.replace(/\/+$/, '');
  const link = (path: string, token: string, locale: 'es' | 'en') =>
    `${origin}${locale === 'en' ? '/en' : ''}${path}?token=${encodeURIComponent(token)}`;
  return {
    confirm: (token, locale) => link(SUBSCRIBE_PATHS.confirm, token, locale),
    unsubscribe: (token, locale) => link(SUBSCRIBE_PATHS.unsubscribe, token, locale),
  };
}

/**
 * A bare URL is accepted for callers that only know the origin: the site name falls back to the
 * hostname. Pass the full identity so the emails carry the site name and the owner's name.
 */
function emailSite(site: string | EmailSite): EmailSite {
  if (typeof site !== 'string') return site;
  const host = URL.canParse(site) ? new URL(site).hostname : site;
  return { url: site, name: host, ownerName: host };
}

function mailerConfig(
  config: { RESEND_API_KEY: string; SUBSCRIBE_FROM: string },
  site: string | EmailSite,
) {
  const identity = emailSite(site);
  return {
    apiKey: config.RESEND_API_KEY,
    from: config.SUBSCRIBE_FROM,
    siteUrl: identity.url,
    siteName: identity.name,
    ownerName: identity.ownerName,
  };
}

/** Public subscribe: null means unavailable (fail closed), never a partly configured provider. */
export async function submitConfiguredSubscribe(
  input: unknown,
  ip: string | undefined,
  bindings: unknown,
  site: string | EmailSite,
  request: typeof fetch = fetch,
  log: (message: string) => void = console.error,
): Promise<SubscribeResult | null> {
  const parsed = subscribeBindingsSchema.safeParse(bindings);
  if (!parsed.success) {
    log(`subscribe unavailable, bindings rejected: ${rejectedNames(parsed.error)}`);
    return null;
  }
  const config = parsed.data;
  const report = (detail: string) => log(`subscribe rejected: ${detail}`);
  const ports: SubscribePorts = {
    now: Date.now,
    report,
    repository: createD1SubscriberRepository(config.SITE_DB as D1Like),
    quota: createD1SubscribeQuota(config.SITE_DB as D1Like),
    tokens: createWebCryptoTokens(config.SUBSCRIBE_TOKEN_SECRET),
    links: createLinks(emailSite(site).url),
    limiter: {
      async allow(address) {
        const result = await config.SUBSCRIBE_RATE_LIMITER.limit({ key: `subscribe:${address}` });
        return allowedSchema.safeParse(result).success;
      },
    },
    verifier: createTurnstileVerifier(
      {
        secretKey: config.TURNSTILE_SECRET_KEY,
        hostname: config.TURNSTILE_HOSTNAME,
        action: SUBSCRIBE_POLICY.turnstileAction,
      },
      request,
      report,
    ),
    mailer: createResendMailer(mailerConfig(config, site), request, report),
  };
  return subscribe(input, ip, ports);
}

function listPorts(bindings: unknown, log: (message: string) => void) {
  const parsed = listBindingsSchema.safeParse(bindings);
  if (!parsed.success) {
    log(`subscribe unavailable, bindings rejected: ${rejectedNames(parsed.error)}`);
    return null;
  }
  return {
    now: Date.now,
    repository: createD1SubscriberRepository(parsed.data.SITE_DB as D1Like),
    tokens: createWebCryptoTokens(parsed.data.SUBSCRIBE_TOKEN_SECRET),
  };
}

/** Confirms a subscription from the emailed token; null means unavailable. */
export async function confirmConfiguredSubscription(
  token: unknown,
  bindings: unknown,
  log: (message: string) => void = console.error,
): Promise<ConfirmResult | null> {
  const ports = listPorts(bindings, log);
  return ports ? confirmSubscription(token, ports) : null;
}

/** Unsubscribes from the signed token of an email link; null means unavailable. */
export async function unsubscribeConfigured(
  token: unknown,
  bindings: unknown,
  log: (message: string) => void = console.error,
): Promise<UnsubscribeResult | null> {
  const ports = listPorts(bindings, log);
  return ports ? unsubscribe(token, ports) : null;
}

/** Sends a published note to the subscribers who have not got it yet; null means unavailable. */
export async function sendNoteConfigured(
  note: NoteToSend,
  bindings: unknown,
  site: string | EmailSite,
  options: { dailyCap?: number } = {},
  request: typeof fetch = fetch,
  log: (message: string) => void = console.error,
): Promise<SendNoteResult | null> {
  const parsed = sendBindingsSchema.safeParse(bindings);
  if (!parsed.success) {
    log(`subscribe unavailable, bindings rejected: ${rejectedNames(parsed.error)}`);
    return null;
  }
  const config = parsed.data;
  const report = (detail: string) => log(`subscribe note: ${detail}`);
  return sendNote(
    note,
    {
      report,
      now: Date.now,
      repository: createD1SubscriberRepository(config.SITE_DB as D1Like),
      quota: createD1SubscribeQuota(config.SITE_DB as D1Like),
      tokens: createWebCryptoTokens(config.SUBSCRIBE_TOKEN_SECRET),
      links: createLinks(emailSite(site).url),
      mailer: createResendMailer(mailerConfig(config, site), request, report),
    },
    options,
  );
}
