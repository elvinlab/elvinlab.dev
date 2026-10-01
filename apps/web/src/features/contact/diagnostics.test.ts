import { describe, expect, it, vi } from 'vitest';

import { createResendSender } from './adapters/resend.ts';
import { createTurnstileVerifier } from './adapters/turnstile.ts';
import { CONTACT_POLICY } from './config.ts';
import { submitContact } from './contact.ts';
import type { ContactPorts } from './ports.ts';

const address = (name: string) => [name, 'example.test'].join('@');
const IP = '192.0.2.1';
const SECRET = 'secret-value-123';
const TOKEN = 'token-value-456';

const input = (change: Record<string, unknown> = {}) => ({
  name: 'Visitor',
  email: address('visitor'),
  message: 'Hello there',
  website: '',
  startedAt: Date.now() - 10_000,
  token: TOKEN,
  ...change,
});

const ports = (change: Partial<ContactPorts> = {}) => {
  const report = vi.fn<(detail: string) => void>();
  const value: ContactPorts = {
    now: Date.now,
    limiter: { allow: async () => true },
    verifier: { verify: async () => true },
    mailSender: { send: async () => {} },
    report,
    ...change,
  };
  return { value, report };
};

describe('contact rejection stages', () => {
  it.each([
    ['invalid_input', input({ email: 'nope' }), {}],
    ['fill_time', input({ startedAt: Date.now() }), {}],
    ['rate_limit', input(), { limiter: { allow: async () => false } }],
    ['turnstile', input(), { verifier: { verify: async () => false } }],
    [
      'mail',
      input(),
      {
        mailSender: {
          send: async () => {
            throw new Error('boom');
          },
        },
      },
    ],
  ])('reports %s', async (stage, payload, change) => {
    const { value, report } = ports(change);
    const result = await submitContact(payload, IP, value);
    expect(result.ok).toBe(false);
    expect(report).toHaveBeenCalledExactlyOnceWith(stage);
  });

  it('stays silent on success and never reports user data', async () => {
    const { value, report } = ports();
    expect(await submitContact(input(), IP, value)).toEqual({ ok: true });
    expect(report).not.toHaveBeenCalled();
  });
});

describe('turnstile verifier diagnostics', () => {
  const config = {
    secretKey: SECRET,
    hostname: 'example.test',
    action: CONTACT_POLICY.turnstileAction,
  };
  const run = async (response: Response) => {
    const report = vi.fn<(detail: string) => void>();
    const verifier = createTurnstileVerifier(config, async () => response, report);
    const ok = await verifier.verify(TOKEN, IP);
    return { ok, details: report.mock.calls.map((call) => call[0]) };
  };

  it('reports the provider error codes', async () => {
    const { ok, details } = await run(
      Response.json({ success: false, 'error-codes': ['invalid-input-secret'] }),
    );
    expect(ok).toBe(false);
    expect(details).toEqual(['turnstile rejected: invalid-input-secret']);
  });

  it('reports a hostname mismatch without printing either hostname', async () => {
    const { ok, details } = await run(
      Response.json({ success: true, hostname: 'other.test', action: config.action }),
    );
    expect(ok).toBe(false);
    expect(details).toEqual(['turnstile hostname mismatch']);
  });

  it('reports an action mismatch', async () => {
    const { details } = await run(
      Response.json({ success: true, hostname: config.hostname, action: 'other' }),
    );
    expect(details).toEqual(['turnstile action mismatch']);
  });

  it('treats a redirect as a failure (Workers only supports follow or manual)', async () => {
    const { ok, details } = await run(
      new Response(null, { status: 302, headers: { Location: 'https://elsewhere.test/' } }),
    );
    expect(ok).toBe(false);
    expect(details).toEqual(['turnstile http 302']);
  });

  it('reports the HTTP status of a failing provider', async () => {
    const { ok, details } = await run(new Response('{}', { status: 500 }));
    expect(ok).toBe(false);
    expect(details).toEqual(['turnstile http 500']);
  });

  it('names the error that broke the request, never the request body', async () => {
    const report = vi.fn<(detail: string) => void>();
    const verifier = createTurnstileVerifier(
      config,
      async () => {
        throw new TypeError('network exploded');
      },
      report,
    );
    expect(await verifier.verify(TOKEN, IP)).toBe(false);
    expect(report).toHaveBeenCalledExactlyOnceWith(
      'turnstile request failed: TypeError: network exploded',
    );
    expect(report.mock.calls.flat().join(' ')).not.toContain(SECRET);
  });

  it('never leaks the secret or the token', async () => {
    const { details } = await run(
      Response.json({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
    );
    expect(details.join(' ')).not.toContain(SECRET);
    expect(details.join(' ')).not.toContain(TOKEN);
  });

  it('stays silent when the token verifies', async () => {
    const { ok, details } = await run(
      Response.json({ success: true, hostname: config.hostname, action: config.action }),
    );
    expect(ok).toBe(true);
    expect(details).toEqual([]);
  });
});

describe('resend sender diagnostics', () => {
  const config = { apiKey: 'resend-key-789', from: address('sender'), to: address('recipient') };

  it('reports the HTTP status and still throws the generic error', async () => {
    const report = vi.fn<(detail: string) => void>();
    const sender = createResendSender(
      config,
      async () => new Response('{"message":"x"}', { status: 403 }),
      report,
    );
    await expect(
      sender.send({ name: 'Visitor', email: address('visitor'), message: 'Hello' }),
    ).rejects.toThrow('Unable to send message.');
    expect(report).toHaveBeenCalledExactlyOnceWith('resend http 403');
  });

  it('treats a redirect as a failure', async () => {
    const report = vi.fn<(detail: string) => void>();
    const sender = createResendSender(
      config,
      async () =>
        new Response(null, { status: 302, headers: { Location: 'https://elsewhere.test/' } }),
      report,
    );
    await expect(
      sender.send({ name: 'Visitor', email: address('visitor'), message: 'Hello' }),
    ).rejects.toThrow('Unable to send message.');
    expect(report).toHaveBeenCalledExactlyOnceWith('resend http 302');
  });

  it('never leaks the api key', async () => {
    const report = vi.fn<(detail: string) => void>();
    const sender = createResendSender(
      config,
      async () => new Response('{}', { status: 401 }),
      report,
    );
    await sender
      .send({ name: 'Visitor', email: address('visitor'), message: 'Hello' })
      .catch(() => {});
    expect(report.mock.calls.flat().join(' ')).not.toContain(config.apiKey);
  });
});
