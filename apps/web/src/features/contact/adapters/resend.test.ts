import { afterEach, describe, expect, it, vi } from 'vitest';

import { CONTACT_POLICY } from '@/features/contact/config.ts';

import { createResendSender } from './resend.ts';

const address = (name: string) => [name, 'example.test'].join('@');
const config = { apiKey: 'test-key', from: address('sender'), to: address('recipient') };
const message = {
  name: 'Visitor',
  email: address('visitor'),
  message: '<b>Plain text</b>\nSecond line',
};
const ID = '49a3999c-0ce1-4ea6-ab68-afcd6dc2e794';
const makeFetch = (response = Response.json({ id: ID })) =>
  vi.fn<typeof fetch>().mockResolvedValue(response);

afterEach(() => vi.restoreAllMocks());

describe('Resend sender', () => {
  it('sends text only with fixed addresses and validated reply_to; bounds timeout and rejects redirects', async () => {
    const request = makeFetch();
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    await expect(createResendSender(config, request).send(message)).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledTimes(1);
    const [url, options] = request.mock.calls[0] ?? [];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options).toMatchObject({
      method: 'POST',
      redirect: 'manual',
      headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' },
      signal: expect.any(AbortSignal),
    });
    expect(timeout).toHaveBeenCalledWith(CONTACT_POLICY.providerTimeoutMs);
    expect(JSON.parse(String(options?.body))).toEqual({
      from: config.from,
      to: [config.to],
      reply_to: message.email,
      subject: 'New contact message',
      text: `From: Visitor\n\n${message.message}`,
    });
  });

  it.each([{}, null, { id: '' }, { id: 123 }, { id: 'not-a-uuid' }])(
    'rejects malformed success %j',
    async (body) => {
      const request = makeFetch(Response.json(body));
      await expect(createResendSender(config, request).send(message)).rejects.toThrow(
        'Unable to send message.',
      );
      expect(request).toHaveBeenCalledTimes(1);
    },
  );

  it('does not read a provider failure body', async () => {
    const response = new Response('sensitive provider data', { status: 429 });
    const json = vi.spyOn(response, 'json');
    const request = makeFetch(response);
    await expect(createResendSender(config, request).send(message)).rejects.toThrow(
      'Unable to send message.',
    );
    expect(json).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each(['invalid JSON', 'x'.repeat(10_000)])(
    'rejects invalid/oversized bodies without leaking content',
    async (body) => {
      const request = makeFetch(new Response(body));
      await expect(createResendSender(config, request).send(message)).rejects.toThrow(
        /^Unable to send message\.$/,
      );
    },
  );

  it.each([new Error('private upstream detail'), new DOMException('Timed out', 'TimeoutError')])(
    'hides network failures',
    async (failure) => {
      const request = vi.fn<typeof fetch>().mockRejectedValue(failure);
      await expect(createResendSender(config, request).send(message)).rejects.toThrow(
        /^Unable to send message\.$/,
      );
      expect(request).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['invalid', `${address('visitor')}\r\n`])(
    'rejects unsafe Reply-To without fetch',
    async (email) => {
      const request = makeFetch();
      await expect(createResendSender(config, request).send({ ...message, email })).rejects.toThrow(
        'Unable to send message.',
      );
      expect(request).not.toHaveBeenCalled();
    },
  );
});
