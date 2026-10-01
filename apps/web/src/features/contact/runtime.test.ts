import { describe, expect, it, vi } from 'vitest';

import { CONTACT_POLICY } from './config.ts';
import { submitConfiguredContact } from './runtime.ts';

const address = (name: string) => [name, 'example.test'].join('@');
const input = () => ({
  name: 'Visitor',
  email: address('visitor'),
  message: 'Hello there',
  website: '',
  startedAt: Date.now() - 10_000,
  token: 'token',
});
const bindings = () => ({
  RESEND_API_KEY: 'test-key',
  CONTACT_FROM: address('sender'),
  CONTACT_TO: address('recipient'),
  TURNSTILE_SECRET_KEY: 'test-secret',
  TURNSTILE_HOSTNAME: 'example.test',
  CONTACT_RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
});
const mockFetch = () =>
  vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({
        success: true,
        hostname: 'example.test',
        action: CONTACT_POLICY.turnstileAction,
      }),
    )
    .mockResolvedValueOnce(Response.json({ id: '49a3999c-0ce1-4ea6-ab68-afcd6dc2e794' }));

describe('configured contact runtime', () => {
  it('wires validated bindings to the limiter and provider adapters', async () => {
    const env = bindings();
    const request = mockFetch();
    expect(await submitConfiguredContact(input(), '192.0.2.1', env, request)).toEqual({ ok: true });
    expect(env.CONTACT_RATE_LIMITER.limit).toHaveBeenCalledExactlyOnceWith({
      key: 'contact:192.0.2.1',
    });
    expect(request).toHaveBeenCalledTimes(2);
    expect(String(request.mock.calls[0]?.[1]?.body)).toContain('test-secret');
    expect(String(request.mock.calls[1]?.[1]?.body)).toContain(address('recipient'));
  });

  it.each([
    'RESEND_API_KEY',
    'CONTACT_FROM',
    'CONTACT_TO',
    'TURNSTILE_SECRET_KEY',
    'TURNSTILE_HOSTNAME',
    'CONTACT_RATE_LIMITER',
  ])('rejects missing %s before any provider', async (key) => {
    const env: Record<string, unknown> = bindings();
    delete env[key];
    const request = mockFetch();
    expect(await submitConfiguredContact(input(), '192.0.2.1', env, request)).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    { RESEND_API_KEY: '' },
    { RESEND_API_KEY: 'key\r\n' },
    { CONTACT_FROM: 'invalid' },
    { CONTACT_FROM: `${address('sender')}\r\n` },
    { CONTACT_TO: `${address('recipient')}\n` },
    { TURNSTILE_SECRET_KEY: ' ' },
    { TURNSTILE_HOSTNAME: 'https://example.test' },
    { TURNSTILE_HOSTNAME: 'example.test/path' },
    { TURNSTILE_HOSTNAME: '*.example.test' },
    { TURNSTILE_HOSTNAME: '-invalid.test' },
    { CONTACT_RATE_LIMITER: {} },
    { CONTACT_RATE_LIMITER: { limit: true } },
  ])('rejects malformed binding %j before any provider', async (change) => {
    const request = mockFetch();
    expect(
      await submitConfiguredContact(input(), '192.0.2.1', { ...bindings(), ...change }, request),
    ).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it('reports only the names of the invalid bindings, never their values', async () => {
    const log = vi.fn<(message: string) => void>();
    const secret = 'super-secret-value\n';
    const env = { ...bindings(), RESEND_API_KEY: secret, CONTACT_FROM: 'invalid' };
    delete (env as Record<string, unknown>)['TURNSTILE_HOSTNAME'];

    expect(await submitConfiguredContact(input(), '192.0.2.1', env, mockFetch(), log)).toBeNull();

    expect(log).toHaveBeenCalledTimes(1);
    const message = log.mock.calls[0]?.[0] ?? '';
    for (const name of ['RESEND_API_KEY', 'CONTACT_FROM', 'TURNSTILE_HOSTNAME']) {
      expect(message).toContain(name);
    }
    expect(message).not.toContain('super-secret-value');
    expect(message).not.toContain('invalid');
    expect(message).not.toContain('TURNSTILE_SECRET_KEY');
  });

  it('stays silent when the bindings are valid', async () => {
    const log = vi.fn<(message: string) => void>();
    await submitConfiguredContact(input(), '192.0.2.1', bindings(), mockFetch(), log);
    expect(log).not.toHaveBeenCalled();
  });

  it('reads configuration each request, never caches a valid credential set', async () => {
    const env = bindings();
    const request = mockFetch();
    expect(await submitConfiguredContact(input(), '192.0.2.1', env, request)).toEqual({ ok: true });
    env.RESEND_API_KEY = '';
    expect(await submitConfiguredContact(input(), '192.0.2.1', env, request)).toBeNull();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it.each([{ success: false }, {}, { success: 'true' }, null])(
    'fails closed on limiter result %j',
    async (result) => {
      const env = bindings();
      env.CONTACT_RATE_LIMITER.limit.mockResolvedValue(result);
      const request = mockFetch();
      expect(await submitConfiguredContact(input(), '192.0.2.1', env, request)).toMatchObject({
        ok: false,
      });
      expect(request).not.toHaveBeenCalled();
    },
  );

  it('fails closed when limiter throws', async () => {
    const env = bindings();
    env.CONTACT_RATE_LIMITER.limit.mockRejectedValue(new Error('private'));
    const request = mockFetch();
    expect(await submitConfiguredContact(input(), '192.0.2.1', env, request)).toMatchObject({
      ok: false,
    });
    expect(request).not.toHaveBeenCalled();
  });

  it('does not accept a client IP from the payload', async () => {
    const request = mockFetch();
    expect(
      await submitConfiguredContact(
        { ...input(), ip: '192.0.2.1' },
        undefined,
        bindings(),
        request,
      ),
    ).toMatchObject({ ok: false });
    expect(request).not.toHaveBeenCalled();
  });
});
