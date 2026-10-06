/** Shared limits for calls to third-party providers (Turnstile, Resend). */
export const PROVIDER_TIMEOUT_MS = 5_000;
export const PROVIDER_RESPONSE_MAX_BYTES = 8_192;

/** Caps decoded provider data in memory; timeout covers the body, not just response headers. */
export async function readProviderJson(response: Response, signal: AbortSignal): Promise<unknown> {
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error('Invalid provider response.');
  }
  const reader = response.body.getReader();
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    signal.throwIfAborted();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let size = 0;
    let text = '';
    while (true) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > PROVIDER_RESPONSE_MAX_BYTES) throw new Error('Invalid provider response.');
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as unknown;
  } finally {
    signal.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
