import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it, vi } from 'vitest';

import { asD1 } from './adapters/sqlite-d1.ts';
import {
  confirmConfiguredSubscription,
  createLinks,
  notifyConfigured,
  sendNoteConfigured,
  submitConfiguredSubscribe,
  unsubscribeConfigured,
} from './runtime.ts';

const migrations = ['0002_subscribers.sql', '0003_subscriber_notes.sql'].map((name) =>
  readFileSync(new URL(`../../../migrations/${name}`, import.meta.url), 'utf8'),
);
const EMAIL = ['reader', 'example.test'].join('@');
const SITE = 'https://site.test/';

function setup(limit = { success: true }) {
  const sqlite = new DatabaseSync(':memory:');
  for (const migration of migrations) sqlite.exec(migration);
  const limiter = { limit: vi.fn(async (_options: { key: string }) => limit) };
  const bindings = {
    SITE_DB: asD1(sqlite),
    SUBSCRIBE_RATE_LIMITER: limiter,
    RESEND_API_KEY: 'resend-key-123',
    SUBSCRIBE_FROM: 'Lab <notes@example.test>',
    SUBSCRIBE_TOKEN_SECRET: 'x'.repeat(40),
    TURNSTILE_SECRET_KEY: 'turnstile-secret',
    TURNSTILE_HOSTNAME: 'site.test',
  };
  const sent: { url: string; body: unknown }[] = [];
  const request = vi.fn<typeof fetch>(async (url, init) => {
    const target = String(url);
    if (target.includes('turnstile'))
      return Response.json({ success: true, hostname: 'site.test', action: 'subscribe' });
    const body = JSON.parse(String(init?.body));
    sent.push({ url: target, body });
    return Response.json(
      target.endsWith('/batch') ? { data: body.map(() => ({ id: 'x' })) } : { id: 'x' },
    );
  });
  const logs: string[] = [];
  return {
    sqlite,
    bindings,
    limiter,
    request,
    sent,
    logs,
    log: (message: string) => logs.push(message),
  };
}

const form = () => ({
  email: EMAIL,
  locale: 'en',
  website: '',
  startedAt: Date.now() - 10_000,
  token: 'turnstile-token',
});

describe('configured subscribe runtime', () => {
  it('returns null and logs only the names of rejected bindings', async () => {
    const { bindings, request, logs, log } = setup();
    const broken = { ...bindings, SUBSCRIBE_TOKEN_SECRET: 'short-secret', SITE_DB: undefined };
    await expect(
      submitConfiguredSubscribe(form(), '192.0.2.1', broken, SITE, request, log),
    ).resolves.toBeNull();
    expect(logs).toEqual([
      'subscribe unavailable, bindings rejected: SITE_DB, SUBSCRIBE_TOKEN_SECRET',
    ]);
    expect(logs.join()).not.toContain('short-secret');
    expect(request).not.toHaveBeenCalled();
  });

  it('runs subscribe, confirm, send and unsubscribe end to end on a real SQL database', async () => {
    const { bindings, limiter, request, sent, sqlite, logs, log } = setup();
    await expect(
      submitConfiguredSubscribe(form(), '192.0.2.1', bindings, SITE, request, log),
    ).resolves.toEqual({ ok: true });
    expect(limiter.limit).toHaveBeenCalledWith({ key: 'subscribe:192.0.2.1' });

    const confirmation = sent[0]?.body as { text: string; to: string[] };
    expect(confirmation.to).toEqual([EMAIL]);
    const confirmToken = /token=([^\s]+)/.exec(confirmation.text)?.[1] ?? '';
    expect(confirmation.text).toContain('https://site.test/en/subscribe/confirm/?token=');
    expect(JSON.stringify(sqlite.prepare('SELECT * FROM subscribers').all())).not.toContain(
      confirmToken,
    );

    await expect(confirmConfiguredSubscription(confirmToken, bindings, log)).resolves.toBe(
      'confirmed',
    );
    await expect(confirmConfiguredSubscription(confirmToken, bindings, log)).resolves.toBe(
      'invalid_or_expired',
    );

    const note = {
      slug: 'a-note',
      title: 'A note',
      url: 'https://site.test/notes/a-note/',
      locale: 'en' as const,
    };
    await expect(sendNoteConfigured(note, bindings, SITE, {}, request, log)).resolves.toEqual({
      sent: 1,
      remaining: 0,
      failed: false,
    });
    const batch = sent[1]?.body as { text: string; headers: Record<string, string> }[];
    const unsubscribeUrl =
      /<(https:[^>]+)>/.exec(batch[0]?.headers['List-Unsubscribe'] ?? '')?.[1] ?? '';
    // The header and the body both carry the human page; there is no one-click POST.
    expect(unsubscribeUrl).toContain('https://site.test/en/subscribe/unsubscribe/?token=');
    expect(batch[0]?.text).toContain(unsubscribeUrl);
    expect(batch[0]?.headers['List-Unsubscribe-Post']).toBeUndefined();
    const token = decodeURIComponent(new URL(unsubscribeUrl).searchParams.get('token') ?? '');
    await expect(unsubscribeConfigured(token, bindings, log)).resolves.toBe('unsubscribed');
    await expect(unsubscribeConfigured(`${token}x`, bindings, log)).resolves.toBe('invalid');
    expect(logs.join()).not.toContain(EMAIL);
  });

  it('answers a rate limited client with the generic failure and sends nothing', async () => {
    const { bindings, request, sent, log } = setup({ success: false });
    await expect(
      submitConfiguredSubscribe(form(), '192.0.2.1', bindings, SITE, request, log),
    ).resolves.toMatchObject({ ok: false });
    expect(sent).toHaveLength(0);
  });

  it('confirm and unsubscribe need only the list bindings; unavailable is null', async () => {
    const { bindings, log } = setup();
    await expect(unsubscribeConfigured('a.b', {}, log)).resolves.toBeNull();
    await expect(
      confirmConfiguredSubscription('t', { SITE_DB: bindings.SITE_DB }, log),
    ).resolves.toBeNull();
    await expect(
      confirmConfiguredSubscription(
        't',
        { SITE_DB: bindings.SITE_DB, SUBSCRIBE_TOKEN_SECRET: bindings.SUBSCRIBE_TOKEN_SECRET },
        log,
      ),
    ).resolves.toBe('invalid_or_expired');
  });
});

describe('createLinks', () => {
  it('puts Spanish at the root and English under /en, and encodes the token', () => {
    const links = createLinks('https://site.test///');
    expect(links.confirm('a b', 'es')).toBe('https://site.test/subscribe/confirm/?token=a%20b');
    expect(links.unsubscribe('id.sig', 'en')).toBe(
      'https://site.test/en/subscribe/unsubscribe/?token=id.sig',
    );
  });
});

describe('notifyConfigured', () => {
  const ADMIN = 'a'.repeat(48);
  const body = JSON.stringify({ slug: 'a-note', dryRun: true });
  const call = (extra: Record<string, unknown>, authorization = `Bearer ${ADMIN}`) => {
    const { bindings, limiter } = setup();
    const log = vi.fn();
    const findNote = vi.fn(async () => ({
      slug: 'a-note',
      title: 'A note',
      url: 'https://site.test/notes/a-note/',
      locale: 'es' as const,
    }));
    const result = notifyConfigured(
      { authorization, contentType: 'application/json', ip: '192.0.2.9', body },
      { ...bindings, ...extra },
      SITE,
      findNote,
      vi.fn<typeof fetch>(),
      log,
    );
    return { result, limiter, log };
  };

  it('answers 503 without the owner secret, whatever else is configured', async () => {
    const { result, log } = call({});
    await expect(result).resolves.toEqual({ status: 503 });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('SUBSCRIBE_ADMIN_TOKEN'));
    expect(JSON.stringify(log.mock.calls)).not.toContain(ADMIN);
  });

  it('answers 503 for a short secret and never logs its value', async () => {
    const { result, log } = call({ SUBSCRIBE_ADMIN_TOKEN: 'short-secret' });
    await expect(result).resolves.toEqual({ status: 503 });
    expect(JSON.stringify(log.mock.calls)).not.toContain('short-secret');
  });

  it('throttles with its own limiter key and answers a dry run with counts', async () => {
    const { result, limiter } = call({ SUBSCRIBE_ADMIN_TOKEN: ADMIN });
    await expect(result).resolves.toEqual({
      status: 200,
      body: { recipients: 0, wouldSend: 0, remainingPool: 100 },
    });
    expect(limiter.limit).toHaveBeenCalledWith({ key: 'notify:192.0.2.9' });
  });

  it('answers a bare 401 for a wrong token', async () => {
    const { result } = call({ SUBSCRIBE_ADMIN_TOKEN: ADMIN }, 'Bearer nope');
    await expect(result).resolves.toEqual({ status: 401 });
  });
});
