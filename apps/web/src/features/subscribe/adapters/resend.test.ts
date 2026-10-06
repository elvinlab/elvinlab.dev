import { afterEach, describe, expect, it, vi } from 'vitest';

import { SUBSCRIBE_POLICY } from '@/features/subscribe/config.ts';
import type { NoteMail } from '@/features/subscribe/ports.ts';

import { createResendMailer } from './resend.ts';

const config = { apiKey: 'test-api-key-123', from: 'Lab <notes@example.test>' };
const RECIPIENT = ['reader', 'example.test'].join('@');
const note = (change: Partial<NoteMail> = {}): NoteMail => ({
  to: RECIPIENT,
  locale: 'es',
  title: 'A note',
  summary: 'About something',
  url: 'https://site.test/notes/a-note/',
  unsubscribeUrl: 'https://site.test/subscribe/unsubscribe/?token=abc.def',
  ...change,
});
const ok = (body: unknown) =>
  vi.fn<typeof fetch>().mockImplementation(async () => Response.json(body));

afterEach(() => vi.restoreAllMocks());

describe('Resend mailer', () => {
  it('sends the confirmation as plain text with the link, a timeout and no redirects', async () => {
    const request = ok({ id: 'abc' });
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    await createResendMailer(config, request).sendConfirmation({
      to: RECIPIENT,
      locale: 'es',
      confirmUrl: 'https://site.test/es/confirm/?token=T',
    });
    const [url, options] = request.mock.calls[0] ?? [];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options).toMatchObject({ method: 'POST', redirect: 'manual' });
    expect(options?.headers).toMatchObject({ Authorization: 'Bearer test-api-key-123' });
    expect(timeout).toHaveBeenCalledWith(SUBSCRIBE_POLICY.providerTimeoutMs);
    const body = JSON.parse(String(options?.body));
    expect(body).toMatchObject({ from: config.from, to: [RECIPIENT] });
    expect(body.subject).toContain('Confirma');
    expect(body.text).toContain('https://site.test/es/confirm/?token=T');
    expect(body.text).toContain('aviso de algún proyecto');
    expect(body.html).toBeUndefined();
  });

  it('writes the confirmation in English for an English subscriber', async () => {
    const request = ok({ id: 'abc' });
    await createResendMailer(config, request).sendConfirmation({
      to: RECIPIENT,
      locale: 'en',
      confirmUrl: 'https://site.test/en/confirm/?token=T',
    });
    const body = JSON.parse(String(request.mock.calls[0]?.[1]?.body));
    expect(body.subject).toContain('Confirm');
    expect(body.text).toContain('expires in 48 hours');
    expect(body.text).toContain('announcement of one of the author');
  });

  it('sends a batch with per-message unsubscribe headers and the idempotency key', async () => {
    const request = ok({ data: [{ id: '1' }, { id: '2' }] });
    await createResendMailer(config, request).sendNote(
      [note(), note({ locale: 'en', to: 'other@example.test' })],
      'note:a-note:id1',
    );
    const [url, options] = request.mock.calls[0] ?? [];
    expect(url).toBe('https://api.resend.com/emails/batch');
    expect(options?.headers).toMatchObject({
      Authorization: 'Bearer test-api-key-123',
      'Idempotency-Key': 'note:a-note:id1',
    });
    const body = JSON.parse(String(options?.body));
    expect(body).toHaveLength(2);
    expect(body[0].headers).toEqual({
      'List-Unsubscribe': '<https://site.test/subscribe/unsubscribe/?token=abc.def>',
    });
    expect(body[0].subject).toBe('Nueva nota: A note');
    expect(body[1].subject).toBe('New note: A note');
    expect(body[0].text).toContain('https://site.test/notes/a-note/');
    expect(body[0].text).toContain('token=abc.def');
  });

  it('keeps a hostile title on one line so it cannot add headers', async () => {
    const request = ok({ data: [{ id: '1' }] });
    await createResendMailer(config, request).sendNote([note({ title: 'a\r\nBcc: x' })], 'k');
    const body = JSON.parse(String(request.mock.calls[0]?.[1]?.body));
    expect(body[0].subject).not.toMatch(/[\r\n]/);
  });

  it('rejects an empty or oversized batch without calling the provider', async () => {
    const request = ok({ data: [] });
    const mailer = createResendMailer(config, request);
    await expect(mailer.sendNote([], 'k')).rejects.toThrow('Unable to send note.');
    await expect(
      mailer.sendNote(
        Array.from({ length: 101 }, () => note()),
        'k',
      ),
    ).rejects.toThrow('Unable to send note.');
    expect(request).not.toHaveBeenCalled();
  });

  it('treats a partial batch as a failure', async () => {
    const request = ok({ data: [{ id: '1' }] });
    await expect(
      createResendMailer(config, request).sendNote([note(), note()], 'k'),
    ).rejects.toThrow('Unable to send note.');
  });

  it('throws generic errors that never carry the body, the key or an address', async () => {
    const reports: string[] = [];
    const request = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () => new Response(`bad ${RECIPIENT} ${config.apiKey}`, { status: 422 }),
      );
    const mailer = createResendMailer(config, request, (detail) => reports.push(detail));
    const failures = await Promise.allSettled([
      mailer.sendConfirmation({ to: RECIPIENT, locale: 'es', confirmUrl: 'https://site.test/c' }),
      mailer.sendNote([note()], 'k'),
    ]);
    for (const failure of failures) {
      expect(failure.status).toBe('rejected');
      const message = String((failure as PromiseRejectedResult).reason);
      expect(message).not.toContain(RECIPIENT);
      expect(message).not.toContain(config.apiKey);
      expect(message).not.toContain('bad');
    }
    expect(reports).toEqual(['resend http 422', 'resend http 422']);
  });

  it('fails on a redirect, a network error and a malformed answer, without retrying', async () => {
    const redirect = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () => new Response(null, { status: 302, headers: { location: 'https://evil.test' } }),
      );
    const broken = vi.fn<typeof fetch>().mockRejectedValue(new Error(`boom ${RECIPIENT}`));
    const wrong = ok({ unexpected: true });
    const mail = { to: RECIPIENT, locale: 'es' as const, confirmUrl: 'https://site.test/c' };
    for (const request of [redirect, broken, wrong]) {
      await expect(createResendMailer(config, request).sendConfirmation(mail)).rejects.toThrow(
        'Unable to send confirmation.',
      );
      expect(request).toHaveBeenCalledTimes(1);
    }
  });
});
