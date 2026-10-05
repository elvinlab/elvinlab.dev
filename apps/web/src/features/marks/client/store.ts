/**
 * The footprint state of one note, shared by every button on the page. Taps are applied
 * optimistically, batched after a short quiet period and sent in chunks the server accepts.
 * Everything outside the store (the action client, the storage, the timers) is injected or global,
 * so the rules are unit-testable with fake timers. Client code only: never import the feature barrel.
 */

/** Largest `by` the server accepts in one request. */
const MAX_BY = 10;
/** Quiet period after the last tap before the batch is sent. */
const DEBOUNCE_MS = 700;

export type MarksResult =
  | { data: { total: number }; error: undefined }
  | { data: undefined; error: { code: string } };

export type MarksClient = {
  get(input: { slug: string }): Promise<MarksResult>;
  leave(input: { slug: string; by: number }): Promise<MarksResult>;
};

export type MarksStorage = Pick<Storage, 'getItem' | 'setItem'>;

export type MarksState = {
  /** `loading` until the first read answers; `hidden` when the feature is unavailable. */
  status: 'loading' | 'ready' | 'hidden';
  total: number;
  /** Footprints this browser left on this note. */
  mine: number;
  /** Taps not yet sent. */
  pending: number;
  capped: boolean;
  /** Counts successful flushes, so the UI can announce each result once. */
  flushes: number;
};

export type TapOutcome = 'added' | 'capped' | 'ignored';

export type MarksStore = {
  getState(): MarksState;
  subscribe(listener: () => void): () => void;
  load(): Promise<void>;
  tap(): TapOutcome;
};

type Options = {
  slug: string;
  client: MarksClient;
  storage: MarksStorage | null;
  maxPerVisitor: number;
};

function readMine(storage: MarksStorage | null, key: string, max: number): number {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(key) ?? null;
  } catch {
    // Storage can be blocked: the cap then holds for this session only.
  }
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), max) : 0;
}

export function createMarksStore({ slug, client, storage, maxPerVisitor }: Options): MarksStore {
  const key = `marks:${slug}`;
  const listeners = new Set<() => void>();
  const initialMine = readMine(storage, key, maxPerVisitor);
  let state: MarksState = {
    status: 'loading',
    total: 0,
    mine: initialMine,
    pending: 0,
    capped: initialMine >= maxPerVisitor,
    flushes: 0,
  };
  let loading: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let flushing = false;

  function update(patch: Partial<MarksState>): void {
    const next = { ...state, ...patch };
    state = { ...next, capped: next.mine >= maxPerVisitor };
    for (const listener of listeners) listener();
  }

  function persist(): void {
    try {
      storage?.setItem(key, String(state.mine));
    } catch {
      // Blocked or full: the in-memory count still holds the cap for this session.
    }
  }

  function schedule(): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => void flush(), DEBOUNCE_MS);
  }

  function hide(): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    update({ status: 'hidden', pending: 0 });
  }

  async function send(by: number): Promise<MarksResult> {
    try {
      return await client.leave({ slug, by });
    } catch {
      return { data: undefined, error: { code: 'NETWORK' } };
    }
  }

  async function flush(): Promise<void> {
    timer = undefined;
    if (flushing || state.pending === 0) return;
    flushing = true;
    let unflushed = state.pending;
    update({ pending: 0 });
    let delivered = false;
    while (unflushed > 0) {
      const chunk = Math.min(MAX_BY, unflushed);
      const result = await send(chunk);
      if (result.error === undefined) {
        unflushed -= chunk;
        delivered = true;
        // The server total plus whatever is still on its way (later chunks, newer taps).
        update({ total: result.data.total + unflushed + state.pending });
        continue;
      }
      if (result.error.code === 'SERVICE_UNAVAILABLE') {
        hide();
      } else if (result.error.code === 'TOO_MANY_REQUESTS') {
        // Stop quietly: the numbers stay as the visitor saw them.
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined;
        update({ pending: 0 });
      } else {
        update({
          total: Math.max(0, state.total - unflushed),
          mine: Math.max(0, state.mine - unflushed),
        });
        persist();
      }
      unflushed = 0;
      delivered = false;
    }
    flushing = false;
    if (delivered) update({ flushes: state.flushes + 1 });
    if (state.status === 'ready' && state.pending > 0) schedule();
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    load() {
      loading ??= (async () => {
        let result: MarksResult;
        try {
          result = await client.get({ slug });
        } catch {
          result = { data: undefined, error: { code: 'NETWORK' } };
        }
        if (result.error === undefined) update({ status: 'ready', total: result.data.total });
        else update({ status: 'hidden' });
      })();
      return loading;
    },
    tap() {
      if (state.status !== 'ready') return 'ignored';
      if (state.capped) return 'capped';
      update({ total: state.total + 1, mine: state.mine + 1, pending: state.pending + 1 });
      persist();
      schedule();
      return 'added';
    },
  };
}
