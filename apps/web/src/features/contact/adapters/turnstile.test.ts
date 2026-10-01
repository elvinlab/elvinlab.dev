import { afterEach, describe, expect, it, vi } from 'vitest';

import { CONTACT_POLICY } from '@/features/contact/config.ts';

import { createTurnstileVerifier } from './turnstile.ts';

const config = { secretKey: 'test-secret', hostname: 'example.test', action: 'contact' };
const valid = { success: true, hostname: config.hostname, action: config.action };
const makeFetch = (response = Response.json(valid)) =>
  vi.fn<typeof fetch>().mockResolvedValue(response);

afterEach(() => vi.restoreAllMocks());

describe('Turnstile verifier', () => {
  it('binds token to IP and checks expected hostname/action with a timeout and no redirects', async () => {
    const request = makeFetch();
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    expect(await createTurnstileVerifier(config, request).verify('token', '192.0.2.1')).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    const [url, options] = request.mock.calls[0] ?? [];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(options).toMatchObject({
      method: 'POST',
      redirect: 'manual',
      signal: expect.any(AbortSignal),
    });
    expect(timeout).toHaveBeenCalledWith(CONTACT_POLICY.providerTimeoutMs);
    expect(JSON.parse(String(options?.body))).toEqual({
      secret: config.secretKey,
      response: 'token',
      remoteip: '192.0.2.1',
    });
  });

  it.each([
    null,
    {},
    { ...valid, success: false },
    { ...valid, success: 'true' },
    { ...valid, hostname: 'attacker.test' },
    { ...valid, action: 'login' },
    { success: true, hostname: config.hostname },
    { success: true, action: config.action },
    { success: false, 'error-codes': ['timeout-or-duplicate'] },
  ])('rejects untrusted response %j', async (body) => {
    expect(
      await createTurnstileVerifier(config, makeFetch(Response.json(body))).verify(
        'token',
        '192.0.2.1',
      ),
    ).toBe(false);
  });

  it.each(['invalid JSON', 'x'.repeat(10_000)])(
    'rejects invalid/oversized bodies',
    async (body) => {
      expect(
        await createTurnstileVerifier(config, makeFetch(new Response(body))).verify(
          'token',
          '192.0.2.1',
        ),
      ).toBe(false);
    },
  );

  it('does not read a failed provider response', async () => {
    const response = new Response('private response', { status: 500 });
    const json = vi.spyOn(response, 'json');
    expect(
      await createTurnstileVerifier(config, makeFetch(response)).verify('token', '192.0.2.1'),
    ).toBe(false);
    expect(json).not.toHaveBeenCalled();
  });

  it.each([new Error('private upstream detail'), new DOMException('Timed out', 'TimeoutError')])(
    'fails closed on network failure',
    async (failure) => {
      const request = vi.fn<typeof fetch>().mockRejectedValue(failure);
      expect(await createTurnstileVerifier(config, request).verify('token', '192.0.2.1')).toBe(
        false,
      );
      expect(request).toHaveBeenCalledTimes(1);
    },
  );
});
