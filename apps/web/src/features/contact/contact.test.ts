import { describe, expect, it, vi } from 'vitest';

import { CONTACT_POLICY } from './config.ts';
import { submitContact } from './contact.ts';

const NOW = 1_800_000_000_000;
const EMAIL = ['visitor', 'example.test'].join('@');
const input = () => ({
  name: ' Visitor ',
  email: EMAIL,
  message: ' A useful message. ',
  website: '',
  startedAt: NOW - CONTACT_POLICY.minFillTimeMs,
  token: 'challenge-token',
});
const setup = () => ({
  limiter: { allow: vi.fn().mockResolvedValue(true) },
  verifier: { verify: vi.fn().mockResolvedValue(true) },
  mailSender: { send: vi.fn().mockResolvedValue(undefined) },
  now: () => NOW,
});
const REJECTED = { ok: false, error: 'Unable to send your message. Please try again later.' };

describe('submitContact', () => {
  it('validates, limits, verifies and sends once with normalized text fields', async () => {
    const ports = setup();
    expect(await submitContact(input(), '192.0.2.1', ports)).toEqual({ ok: true });
    expect(ports.limiter.allow).toHaveBeenCalledExactlyOnceWith('192.0.2.1');
    expect(ports.verifier.verify).toHaveBeenCalledExactlyOnceWith('challenge-token', '192.0.2.1');
    expect(ports.mailSender.send).toHaveBeenCalledExactlyOnceWith({
      name: 'Visitor',
      email: EMAIL,
      message: 'A useful message.',
    });
    expect(ports.limiter.allow.mock.invocationCallOrder[0]).toBeLessThan(
      ports.verifier.verify.mock.invocationCallOrder[0] ?? 0,
    );
    expect(ports.verifier.verify.mock.invocationCallOrder[0]).toBeLessThan(
      ports.mailSender.send.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it.each([
    ['invalid email', { email: 'invalid' }],
    ['email CRLF', { email: `${EMAIL}\r\n` }],
    ['empty name', { name: ' ' }],
    ['long name', { name: 'x'.repeat(CONTACT_POLICY.nameMaxLength + 1) }],
    ['name CRLF', { name: 'Visitor\r\nInjected' }],
    ['long email', { email: `${'x'.repeat(CONTACT_POLICY.emailMaxLength)}@example.test` }],
    ['empty message', { message: ' ' }],
    ['long message', { message: 'x'.repeat(CONTACT_POLICY.messageMaxLength + 1) }],
    ['honeypot', { website: 'spam' }],
    ['whitespace honeypot', { website: ' ' }],
    ['fast fill', { startedAt: NOW - CONTACT_POLICY.minFillTimeMs + 1 }],
    ['future time', { startedAt: NOW + 1 }],
    ['invalid time', { startedAt: Number.NaN }],
    ['negative time', { startedAt: -1 }],
    ['empty token', { token: '' }],
    ['long token', { token: 'x'.repeat(CONTACT_POLICY.tokenMaxLength + 1) }],
    ['unknown field', { recipient: EMAIL }],
  ])('rejects %s before any provider call', async (_label, change) => {
    const ports = setup();
    expect(await submitContact({ ...input(), ...change }, '192.0.2.1', ports)).toEqual(REJECTED);
    expect(ports.limiter.allow).not.toHaveBeenCalled();
    expect(ports.verifier.verify).not.toHaveBeenCalled();
    expect(ports.mailSender.send).not.toHaveBeenCalled();
  });

  it.each([undefined, '', ' ', 'not-an-ip', '192.0.2.1, 192.0.2.2'])(
    'rejects missing/invalid IP %s',
    async (ip) => {
      const ports = setup();
      expect(await submitContact(input(), ip, ports)).toEqual(REJECTED);
      expect(ports.limiter.allow).not.toHaveBeenCalled();
      expect(ports.verifier.verify).not.toHaveBeenCalled();
      expect(ports.mailSender.send).not.toHaveBeenCalled();
    },
  );

  it('supports IPv6 and preserves plain text markup and newlines', async () => {
    const ports = setup();
    const message = '<strong>Plain text</strong>\nSecond line';
    expect(await submitContact({ ...input(), message }, '2001:db8::1', ports)).toEqual({
      ok: true,
    });
    expect(ports.mailSender.send).toHaveBeenCalledWith(expect.objectContaining({ message }));
  });

  it.each(['deny', 'throw'])('stops after limiter %s', async (mode) => {
    const ports = setup();
    if (mode === 'deny') ports.limiter.allow.mockResolvedValue(false);
    else ports.limiter.allow.mockRejectedValue(new Error('private provider failure'));
    expect(await submitContact(input(), '192.0.2.1', ports)).toEqual(REJECTED);
    expect(ports.verifier.verify).not.toHaveBeenCalled();
    expect(ports.mailSender.send).not.toHaveBeenCalled();
  });

  it.each(['deny', 'throw'])('stops after verifier %s', async (mode) => {
    const ports = setup();
    if (mode === 'deny') ports.verifier.verify.mockResolvedValue(false);
    else ports.verifier.verify.mockRejectedValue(new Error('private provider failure'));
    expect(await submitContact(input(), '192.0.2.1', ports)).toEqual(REJECTED);
    expect(ports.mailSender.send).not.toHaveBeenCalled();
  });

  it('hides send errors and never retries automatically', async () => {
    const ports = setup();
    ports.mailSender.send.mockRejectedValue(new Error('private provider failure'));
    expect(await submitContact(input(), '192.0.2.1', ports)).toEqual(REJECTED);
    expect(ports.mailSender.send).toHaveBeenCalledTimes(1);
  });
});
