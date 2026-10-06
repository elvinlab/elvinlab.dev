import { describe, expect, it, vi } from 'vitest';

import { createTurnstileLoader, TURNSTILE_SCRIPT_URL, type TurnstileApi } from './turnstile.ts';

const api: TurnstileApi = { render: () => 'w', reset: () => undefined };

describe('createTurnstileLoader', () => {
  it('injects the script once and shares the promise', async () => {
    const inject = vi.fn((_src: string, onLoad: () => void) => onLoad());
    const load = createTurnstileLoader({ inject, getApi: () => api });
    await expect(Promise.all([load(), load()])).resolves.toEqual([api, api]);
    expect(inject).toHaveBeenCalledTimes(1);
    expect(inject.mock.calls[0]?.[0]).toBe(TURNSTILE_SCRIPT_URL);
  });

  it('rejects when the script loads without the API, and retries next time', async () => {
    const inject = vi.fn((_src: string, onLoad: () => void) => onLoad());
    const load = createTurnstileLoader({ inject, getApi: () => undefined });
    await expect(load()).rejects.toThrow();
    await expect(load()).rejects.toThrow();
    expect(inject).toHaveBeenCalledTimes(2);
  });

  it('rejects when the script fails to load', async () => {
    const load = createTurnstileLoader({
      inject: (_src, _onLoad, onError) => onError(new Error('blocked')),
      getApi: () => undefined,
    });
    await expect(load()).rejects.toThrow('blocked');
  });
});
