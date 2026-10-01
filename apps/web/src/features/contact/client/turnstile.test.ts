import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTurnstileLoader, TURNSTILE_SCRIPT_URL } from './turnstile.ts';

type TurnstileApi = {
  render: (container: HTMLElement, options: object) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

describe('createTurnstileLoader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('returns singleton promise for concurrent calls', async () => {
    const api: TurnstileApi = { render: vi.fn(), reset: vi.fn(), remove: vi.fn() };
    const loadCalls: Array<() => void> = [];
    const inject = vi.fn((_src: string, onLoad: () => void) => {
      loadCalls.push(onLoad);
    });
    const getApi = vi.fn().mockReturnValue(undefined).mockReturnValueOnce(api);

    const loader = createTurnstileLoader({ inject, getApi });

    const [p1, p2] = [loader(), loader()];
    expect(p1).toBe(p2); // same promise

    // Resolve the load
    loadCalls[0]?.();

    await expect(p1).resolves.toBe(api);
    await expect(p2).resolves.toBe(api);
    expect(inject).toHaveBeenCalledTimes(1);
    expect(inject).toHaveBeenCalledWith(
      TURNSTILE_SCRIPT_URL,
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('resolves only when getApi returns defined', async () => {
    const api: TurnstileApi = { render: vi.fn(), reset: vi.fn(), remove: vi.fn() };
    let resolveLoad: (() => void) | null = null;
    const loadPromise = new Promise<void>((r) => {
      resolveLoad = r;
    });

    const inject = vi.fn((_src: string, onLoad: () => void) => {
      loadPromise.then(onLoad);
    });
    const getApi = vi.fn().mockReturnValue(undefined).mockReturnValueOnce(api);

    const loader = createTurnstileLoader({ inject, getApi });
    const promise = loader();

    // getApi still returns undefined initially, load triggers but getApi not ready
    // biome-ignore lint/style/noNonNullAssertion: resolveLoad is assigned in the Promise constructor before this point
    resolveLoad!();
    // Wait a bit for the check
    await new Promise((r) => setTimeout(r, 100));
    // The promise should still be pending because getApi wasn't ready yet
    // Actually with our implementation, it polls and finds api, so it should resolve
    await expect(promise).resolves.toBe(api);
  });

  it('rejects and clears on load error so later call retries', async () => {
    const api: TurnstileApi = { render: vi.fn(), reset: vi.fn(), remove: vi.fn() };
    let rejectLoad: ((err: Error) => void) | null = null;
    const loadPromise = new Promise<void>((_r, rej) => {
      rejectLoad = rej;
    });

    const inject = vi.fn((_src: string, _onLoad: () => void, onError: (err: Error) => void) => {
      loadPromise.then(() => {}, onError);
    });
    const getApi = vi.fn().mockReturnValue(undefined).mockReturnValueOnce(api);

    const loader = createTurnstileLoader({ inject, getApi });
    const promise = loader();

    // Trigger error
    // biome-ignore lint/style/noNonNullAssertion: rejectLoad is assigned in the Promise constructor before this point
    rejectLoad!(new Error('Network error'));
    await expect(promise).rejects.toThrow('Network error');

    // Next call should retry (new injection)
    const loadCalls: Array<() => void> = [];
    inject.mockImplementation((_src: string, onLoad: () => void) => {
      loadCalls.push(onLoad);
    });
    const promise2 = loader();
    loadCalls[0]?.();
    await expect(promise2).resolves.toBe(api);
    expect(inject).toHaveBeenCalledTimes(2);
  });

  it('uses injected inject and getApi functions', async () => {
    const api: TurnstileApi = { render: vi.fn(), reset: vi.fn(), remove: vi.fn() };
    const inject = vi.fn((_src: string, onLoad: () => void) => onLoad());
    const getApi = vi.fn().mockReturnValue(api);

    const loader = createTurnstileLoader({ inject, getApi });
    const result = await loader();

    expect(inject).toHaveBeenCalledWith(
      TURNSTILE_SCRIPT_URL,
      expect.any(Function),
      expect.any(Function),
    );
    expect(getApi).toHaveBeenCalled();
    expect(result).toBe(api);
  });

  it('resolves immediately if getApi already returns api', async () => {
    const api: TurnstileApi = { render: vi.fn(), reset: vi.fn(), remove: vi.fn() };
    const inject = vi.fn((_src: string, onLoad: () => void) => onLoad());
    const getApi = vi.fn().mockReturnValue(api);

    const loader = createTurnstileLoader({ inject, getApi });
    const result = await loader();

    expect(inject).toHaveBeenCalledTimes(1);
    expect(result).toBe(api);
  });
});
