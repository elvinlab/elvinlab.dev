import { describe, expect, it } from 'vitest';

import { CONTACT_POLICY } from '@/features/contact/config.ts';

import {
  buildPayload,
  formReducer,
  mapActionError,
  remainingFillDelay,
  validateContact,
} from './form.ts';

const VALUES = {
  name: ' Visitor ',
  email: 'visitor@example.test',
  message: ' A useful message. ',
};

describe('validateContact', () => {
  it('trims and accepts valid input', () => {
    expect(validateContact(VALUES)).toEqual({});
  });

  it('rejects missing name', () => {
    expect(validateContact({ ...VALUES, name: '' })).toEqual({ name: 'required' });
    expect(validateContact({ ...VALUES, name: '   ' })).toEqual({ name: 'required' });
  });

  it('rejects missing email', () => {
    expect(validateContact({ ...VALUES, email: '' })).toEqual({ email: 'required' });
    expect(validateContact({ ...VALUES, email: '   ' })).toEqual({ email: 'required' });
  });

  it('rejects missing message', () => {
    expect(validateContact({ ...VALUES, message: '' })).toEqual({ message: 'required' });
    expect(validateContact({ ...VALUES, message: '   ' })).toEqual({ message: 'required' });
  });

  it('rejects name too long', () => {
    expect(
      validateContact({ ...VALUES, name: 'x'.repeat(CONTACT_POLICY.nameMaxLength + 1) }),
    ).toEqual({
      name: 'too_long',
    });
    expect(validateContact({ ...VALUES, name: 'x'.repeat(CONTACT_POLICY.nameMaxLength) })).toEqual(
      {},
    );
  });

  it('rejects email too long', () => {
    // email = localPart + '@example.test' (13 chars). Max total = 254.
    const longEmail = `${'x'.repeat(CONTACT_POLICY.emailMaxLength - 12)}@example.test`; // 255 chars
    expect(validateContact({ ...VALUES, email: longEmail })).toEqual({ email: 'too_long' });
    const maxEmail = `${'x'.repeat(CONTACT_POLICY.emailMaxLength - 13)}@example.test`; // 254 chars
    expect(validateContact({ ...VALUES, email: maxEmail })).toEqual({});
  });

  it('rejects message too long', () => {
    expect(
      validateContact({ ...VALUES, message: 'x'.repeat(CONTACT_POLICY.messageMaxLength + 1) }),
    ).toEqual({
      message: 'too_long',
    });
    expect(
      validateContact({ ...VALUES, message: 'x'.repeat(CONTACT_POLICY.messageMaxLength) }),
    ).toEqual({});
  });

  it('rejects name with CRLF', () => {
    expect(validateContact({ ...VALUES, name: 'Visitor\r\nInjected' })).toEqual({
      name: 'invalid',
    });
    expect(validateContact({ ...VALUES, name: 'Visitor\nInjected' })).toEqual({ name: 'invalid' });
    expect(validateContact({ ...VALUES, name: 'Visitor\rInjected' })).toEqual({ name: 'invalid' });
  });

  it('rejects email with CRLF', () => {
    expect(validateContact({ ...VALUES, email: 'visitor@example.test\r\n' })).toEqual({
      email: 'invalid',
    });
    expect(validateContact({ ...VALUES, email: 'visitor@example.test\n' })).toEqual({
      email: 'invalid',
    });
    expect(validateContact({ ...VALUES, email: 'visitor@example.test\r' })).toEqual({
      email: 'invalid',
    });
  });

  it('rejects invalid email format', () => {
    expect(validateContact({ ...VALUES, email: 'invalid' })).toEqual({ email: 'invalid' });
    expect(validateContact({ ...VALUES, email: 'missing@domain' })).toEqual({ email: 'invalid' });
    expect(validateContact({ ...VALUES, email: '@missinglocal.com' })).toEqual({
      email: 'invalid',
    });
    expect(validateContact({ ...VALUES, email: 'double@@domain.com' })).toEqual({
      email: 'invalid',
    });
    expect(validateContact({ ...VALUES, email: 'spaces in@domain.com' })).toEqual({
      email: 'invalid',
    });
  });

  it('accepts email with plus and dots', () => {
    expect(validateContact({ ...VALUES, email: 'user+tag@example.test' })).toEqual({});
    expect(validateContact({ ...VALUES, email: 'user.name@example.test' })).toEqual({});
  });
});

describe('remainingFillDelay', () => {
  const minMs = CONTACT_POLICY.minFillTimeMs;
  const startedAt = 1_800_000_000_000;

  it('returns remaining time when not enough time passed', () => {
    expect(remainingFillDelay(startedAt, startedAt + minMs - 100, minMs)).toBe(100);
    expect(remainingFillDelay(startedAt, startedAt + minMs / 2, minMs)).toBe(minMs / 2);
  });

  it('returns 0 when enough time passed', () => {
    expect(remainingFillDelay(startedAt, startedAt + minMs, minMs)).toBe(0);
    expect(remainingFillDelay(startedAt, startedAt + minMs + 100, minMs)).toBe(0);
  });

  it('returns 0 when now is before startedAt (negative clamp)', () => {
    expect(remainingFillDelay(startedAt, startedAt - 100, minMs)).toBe(0);
  });
});

describe('buildPayload', () => {
  it('returns exact Action input with trimmed values and passed-through honeypot', () => {
    const startedAt = 1_800_000_000_000;
    const token = 'challenge-token';
    const payload = buildPayload(VALUES, startedAt, token, '');
    expect(payload).toEqual({
      name: 'Visitor',
      email: 'visitor@example.test',
      message: 'A useful message.',
      website: '',
      startedAt,
      token,
    });
  });

  it('passes through non-empty website value', () => {
    const startedAt = 1_800_000_000_000;
    const token = 'challenge-token';
    const payload = buildPayload(VALUES, startedAt, token, 'spam');
    expect(payload.website).toBe('spam');
  });

  it('includes no extra keys', () => {
    const startedAt = 1_800_000_000_000;
    const token = 'challenge-token';
    const payload = buildPayload(VALUES, startedAt, token, '');
    const keys = Object.keys(payload).sort();
    expect(keys).toEqual(['email', 'message', 'name', 'startedAt', 'token', 'website']);
  });
});

describe('mapActionError', () => {
  it('maps SERVICE_UNAVAILABLE', () => {
    expect(mapActionError({ code: 'SERVICE_UNAVAILABLE' })).toBe('unavailable');
  });

  it('maps FORBIDDEN', () => {
    expect(mapActionError({ code: 'FORBIDDEN' })).toBe('forbidden');
  });

  it('maps BAD_REQUEST', () => {
    expect(mapActionError({ code: 'BAD_REQUEST' })).toBe('rejected');
  });

  it('maps unknown code to network', () => {
    expect(mapActionError({ code: 'INTERNAL_SERVER_ERROR' })).toBe('network');
    expect(mapActionError({ code: 'RATE_LIMITED' })).toBe('network');
  });

  it('maps undefined error to network', () => {
    expect(mapActionError(undefined)).toBe('network');
    expect(mapActionError({})).toBe('network');
    expect(mapActionError({ code: '' })).toBe('network');
  });
});

describe('formReducer', () => {
  const idle = { status: 'idle' as const };
  const submitting = { status: 'submitting' as const };
  const success = { status: 'success' as const };
  const error = { status: 'error' as const, reason: 'network' as const };

  it('submit from idle goes to submitting', () => {
    expect(formReducer(idle, { type: 'submit' })).toEqual(submitting);
  });

  it('submit from error goes to submitting', () => {
    expect(formReducer(error, { type: 'submit' })).toEqual(submitting);
  });

  it('submit from submitting is ignored', () => {
    expect(formReducer(submitting, { type: 'submit' })).toEqual(submitting);
  });

  it('submit from success is ignored', () => {
    expect(formReducer(success, { type: 'submit' })).toEqual(success);
  });

  it('succeeded from submitting goes to success', () => {
    expect(formReducer(submitting, { type: 'succeeded' })).toEqual(success);
  });

  it('succeeded from other states is ignored', () => {
    expect(formReducer(idle, { type: 'succeeded' })).toEqual(idle);
    expect(formReducer(success, { type: 'succeeded' })).toEqual(success);
    expect(formReducer(error, { type: 'succeeded' })).toEqual(error);
  });

  it('failed from submitting goes to error with reason', () => {
    expect(formReducer(submitting, { type: 'failed', reason: 'rejected' })).toEqual({
      status: 'error',
      reason: 'rejected',
    });
  });

  it('failed from other states is ignored', () => {
    expect(formReducer(idle, { type: 'failed', reason: 'rejected' })).toEqual(idle);
    expect(formReducer(success, { type: 'failed', reason: 'rejected' })).toEqual(success);
    expect(formReducer(error, { type: 'failed', reason: 'rejected' })).toEqual(error);
  });

  it('edit from error goes to idle', () => {
    expect(formReducer(error, { type: 'edit' })).toEqual(idle);
  });

  it('edit from idle is ignored', () => {
    expect(formReducer(idle, { type: 'edit' })).toEqual(idle);
  });

  it('edit from submitting is ignored', () => {
    expect(formReducer(submitting, { type: 'edit' })).toEqual(submitting);
  });

  it('edit from success is ignored', () => {
    expect(formReducer(success, { type: 'edit' })).toEqual(success);
  });
});
