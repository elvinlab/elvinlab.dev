import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VERIFY_TIMEOUT_MS } from './client-policy.ts';
import { createVerifyTimeout, withErrorCode } from './verify-wait.ts';

describe('createVerifyTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires once after the policy time', () => {
    const onTimeout = vi.fn();
    const wait = createVerifyTimeout(onTimeout);
    wait.start();
    vi.advanceTimersByTime(VERIFY_TIMEOUT_MS - 1);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does not fire after clear, and a second start does not stack timers', () => {
    const onTimeout = vi.fn();
    const wait = createVerifyTimeout(onTimeout);
    wait.start();
    wait.clear();
    vi.advanceTimersByTime(VERIFY_TIMEOUT_MS * 2);
    expect(onTimeout).not.toHaveBeenCalled();
    wait.start();
    wait.start();
    vi.advanceTimersByTime(VERIFY_TIMEOUT_MS);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});

describe('withErrorCode', () => {
  it('appends the code in parentheses', () => {
    expect(withErrorCode('Failed.', 'código', '600010')).toBe('Failed. (código 600010)');
  });

  it('keeps the plain message without a usable code', () => {
    expect(withErrorCode('Failed.', 'code', undefined)).toBe('Failed.');
    expect(withErrorCode('Failed.', 'code', '')).toBe('Failed.');
  });

  it('drops anything that is not a short alphanumeric code', () => {
    expect(withErrorCode('Failed.', 'code', 'a@b.test')).toBe('Failed.');
    expect(withErrorCode('Failed.', 'code', 'x'.repeat(40))).toBe('Failed.');
  });
});
