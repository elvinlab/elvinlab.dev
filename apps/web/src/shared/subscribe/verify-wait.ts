import { VERIFY_TIMEOUT_MS } from '@/shared/subscribe/client-policy.ts';

/** One timer for the wait on a Turnstile token: start it, clear it, or let it fire once. */
export function createVerifyTimeout(onTimeout: () => void): {
  start: () => void;
  clear: () => void;
} {
  let handle: ReturnType<typeof setTimeout> | undefined;
  const clear = () => {
    if (handle !== undefined) clearTimeout(handle);
    handle = undefined;
  };
  return {
    clear,
    start: () => {
      clear();
      handle = setTimeout(() => {
        handle = undefined;
        onTimeout();
      }, VERIFY_TIMEOUT_MS);
    },
  };
}

const SAFE_CODE = /^[A-Za-z0-9_-]{1,16}$/;

/** "message (code 600010)": only a short Turnstile code is shown, never anything else (privacy). */
export function withErrorCode(message: string, label: string, code: unknown): string {
  return typeof code === 'string' && SAFE_CODE.test(code)
    ? `${message} (${label} ${code})`
    : message;
}
