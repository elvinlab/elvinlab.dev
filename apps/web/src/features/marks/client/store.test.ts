import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMarksStore, type MarksClient, type MarksResult } from './store.ts';

const ok = (total: number): MarksResult => ({ data: { total }, error: undefined });
const fail = (code: string): MarksResult => ({ data: undefined, error: { code } });

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

function setup(
  options: {
    get?: MarksClient['get'];
    leave?: MarksClient['leave'];
    storage?: ReturnType<typeof fakeStorage> | null;
    max?: number;
  } = {},
) {
  const get = vi.fn(options.get ?? (async () => ok(12)));
  const leave = vi.fn(options.leave ?? (async () => ok(100)));
  const storage = options.storage === undefined ? fakeStorage() : options.storage;
  const store = createMarksStore({
    slug: 'a-note',
    client: { get, leave },
    storage,
    maxPerVisitor: options.max ?? 50,
  });
  return { store, get, leave, storage };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('loading', () => {
  it('starts loading, then is ready with the server total', async () => {
    const { store, get } = setup();
    expect(store.getState().status).toBe('loading');
    await store.load();
    expect(get).toHaveBeenCalledWith({ slug: 'a-note' });
    expect(store.getState()).toMatchObject({ status: 'ready', total: 12, mine: 0 });
  });

  it('loads once even when two buttons ask', async () => {
    const { store, get } = setup();
    await Promise.all([store.load(), store.load()]);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it.each(['SERVICE_UNAVAILABLE', 'BAD_REQUEST', 'TOO_MANY_REQUESTS'])(
    'hides the feature when get fails with %s',
    async (code) => {
      const { store } = setup({ get: async () => fail(code) });
      await store.load();
      expect(store.getState().status).toBe('hidden');
    },
  );

  it('hides the feature when get throws', async () => {
    const { store } = setup({
      get: async () => {
        throw new Error('offline');
      },
    });
    await store.load();
    expect(store.getState().status).toBe('hidden');
  });

  it('reads the visitor count from storage, clamped to the cap', async () => {
    const stored = fakeStorage({ 'marks:a-note': '99' });
    const { store } = setup({ storage: stored, max: 50 });
    expect(store.getState().mine).toBe(50);
    expect(store.getState().capped).toBe(true);
  });

  it.each(['abc', '-4', '', '3.7'])('ignores a bad stored value %j', (value) => {
    const { store } = setup({ storage: fakeStorage({ 'marks:a-note': value }) });
    expect(store.getState().mine).toBe(value === '3.7' ? 3 : 0);
  });
});

describe('tapping', () => {
  it('ignores taps until ready', () => {
    const { store, leave } = setup();
    expect(store.tap()).toBe('ignored');
    vi.advanceTimersByTime(1000);
    expect(leave).not.toHaveBeenCalled();
  });

  it('adds one optimistically to the total and to mine, and remembers mine', async () => {
    const { store, storage } = setup();
    await store.load();
    expect(store.tap()).toBe('added');
    expect(store.getState()).toMatchObject({ total: 13, mine: 1, pending: 1 });
    expect(storage?.data.get('marks:a-note')).toBe('1');
  });

  it('batches many taps into one request after the debounce', async () => {
    const { store, leave } = setup();
    await store.load();
    for (let i = 0; i < 7; i++) {
      store.tap();
      vi.advanceTimersByTime(300);
    }
    expect(leave).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(700);
    expect(leave).toHaveBeenCalledTimes(1);
    expect(leave).toHaveBeenCalledWith({ slug: 'a-note', by: 7 });
  });

  it('splits more than ten taps into sequential chunks of at most ten', async () => {
    const calls: number[] = [];
    let running = 0;
    let overlap = false;
    const { store } = setup({
      max: 100,
      leave: async ({ by }) => {
        running++;
        overlap ||= running > 1;
        calls.push(by);
        await Promise.resolve();
        running--;
        return ok(100 + calls.length);
      },
    });
    await store.load();
    for (let i = 0; i < 25; i++) store.tap();
    await vi.advanceTimersByTimeAsync(700);
    expect(calls).toEqual([10, 10, 5]);
    expect(overlap).toBe(false);
  });

  it('adopts the server total after a flush', async () => {
    const { store } = setup({ leave: async () => ok(20) });
    await store.load();
    for (let i = 0; i < 7; i++) store.tap();
    expect(store.getState().total).toBe(19);
    await vi.advanceTimersByTimeAsync(700);
    expect(store.getState()).toMatchObject({ total: 20, pending: 0, flushes: 1 });
  });

  it('keeps newer taps on top of the adopted total', async () => {
    let release: (value: MarksResult) => void = () => {};
    const { store, leave } = setup({
      leave: () => new Promise<MarksResult>((resolve) => (release = resolve)),
    });
    await store.load();
    store.tap();
    store.tap();
    await vi.advanceTimersByTimeAsync(700);
    store.tap(); // arrives while the request is in flight
    release(ok(50));
    await vi.advanceTimersByTimeAsync(0);
    expect(store.getState().total).toBe(51);
    // The newer tap goes out in its own request.
    release = () => {};
    await vi.advanceTimersByTimeAsync(700);
    expect(leave).toHaveBeenLastCalledWith({ slug: 'a-note', by: 1 });
  });

  it('notifies subscribers and stops after unsubscribe', async () => {
    const { store } = setup();
    const listener = vi.fn();
    const off = store.subscribe(listener);
    await store.load();
    expect(listener).toHaveBeenCalled();
    listener.mockClear();
    off();
    store.tap();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('the per-browser cap', () => {
  it('adds and sends nothing once the cap is reached, but reports it', async () => {
    const { store, leave } = setup({ max: 3 });
    await store.load();
    expect([store.tap(), store.tap(), store.tap(), store.tap()]).toEqual([
      'added',
      'added',
      'added',
      'capped',
    ]);
    expect(store.getState()).toMatchObject({ total: 15, mine: 3, capped: true });
    await vi.advanceTimersByTimeAsync(700);
    expect(leave).toHaveBeenCalledWith({ slug: 'a-note', by: 3 });
  });

  it('sends nothing at all when the visitor starts at the cap', async () => {
    const { store, leave } = setup({ storage: fakeStorage({ 'marks:a-note': '50' }) });
    await store.load();
    expect(store.tap()).toBe('capped');
    await vi.advanceTimersByTimeAsync(2000);
    expect(leave).not.toHaveBeenCalled();
    expect(store.getState().total).toBe(12);
  });

  it('holds the cap for the session when storage is blocked', async () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const { store } = setup({ max: 2, storage: blocked as never });
    await store.load();
    expect([store.tap(), store.tap(), store.tap()]).toEqual(['added', 'added', 'capped']);
  });

  it('works without any storage object', async () => {
    const { store } = setup({ max: 1, storage: null });
    await store.load();
    expect([store.tap(), store.tap()]).toEqual(['added', 'capped']);
  });
});

describe('failures', () => {
  it('drops the pending taps quietly on TOO_MANY_REQUESTS', async () => {
    const { store, leave } = setup({ leave: async () => fail('TOO_MANY_REQUESTS') });
    await store.load();
    for (let i = 0; i < 3; i++) store.tap();
    await vi.advanceTimersByTimeAsync(700);
    expect(store.getState()).toMatchObject({ status: 'ready', pending: 0, flushes: 0 });
    await vi.advanceTimersByTimeAsync(5000);
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it('collapses on SERVICE_UNAVAILABLE', async () => {
    const { store } = setup({ leave: async () => fail('SERVICE_UNAVAILABLE') });
    await store.load();
    store.tap();
    await vi.advanceTimersByTimeAsync(700);
    expect(store.getState().status).toBe('hidden');
  });

  it.each([
    ['BAD_REQUEST', async () => fail('BAD_REQUEST')],
    [
      'a network error',
      async (): Promise<MarksResult> => {
        throw new Error('offline');
      },
    ],
  ])('reverts the unflushed amount on %s', async (_name, leave) => {
    const { store, storage } = setup({ leave });
    await store.load();
    for (let i = 0; i < 4; i++) store.tap();
    await vi.advanceTimersByTimeAsync(700);
    expect(store.getState()).toMatchObject({ status: 'ready', total: 12, mine: 0, pending: 0 });
    expect(storage?.data.get('marks:a-note')).toBe('0');
  });

  it('reverts only what was not delivered when a later chunk fails', async () => {
    let call = 0;
    const { store } = setup({
      max: 100,
      leave: async () => (++call === 1 ? ok(30) : fail('BAD_REQUEST')),
    });
    await store.load();
    for (let i = 0; i < 14; i++) store.tap();
    await vi.advanceTimersByTimeAsync(700);
    // 10 delivered (server total 30), 4 reverted.
    expect(store.getState()).toMatchObject({ total: 30, mine: 10 });
  });
});
