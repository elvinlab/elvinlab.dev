import { describe, expect, it } from 'vitest';

import {
  claimProgressScript,
  PROGRESS_KEY_PREFIX,
  progressLabelsScript,
  progressNoteScript,
  READ_THRESHOLD,
  RESTORE_MIN,
} from './reading-progress-memory.ts';

type Listener = (event: { detail?: number }) => void;

type NoteOptions = {
  stored?: string | null;
  scrollY?: number;
  hash?: string;
  blocked?: boolean;
  article?: boolean;
};

/** A tiny DOM stand-in to run the note script and observe what it stores and where it scrolls. */
function note(options: NoteOptions = {}) {
  const { stored = null, scrollY = 0, hash = '', blocked = false, article = true } = options;
  const listeners: Record<string, Listener[]> = {};
  const add = (type: string, fn: Listener) => {
    listeners[type] = [...(listeners[type] ?? []), fn];
  };
  const timers: Array<() => void> = [];
  const writes: Record<string, string> = {};
  const scrolls: Array<{ top: number; behavior: string }> = [];
  const win = {
    scrollY,
    innerHeight: 800,
    addEventListener: add,
    scrollTo: (arg: { top: number; behavior: string }) => scrolls.push(arg),
  };
  const doc = {
    visibilityState: 'visible',
    querySelector: (selector: string) =>
      selector === '[data-article]' && article ? { offsetTop: 400, offsetHeight: 4800 } : null,
    addEventListener: add,
  };
  const storage = {
    getItem: (key: string) => {
      if (blocked) throw new Error('blocked');
      return key === `${PROGRESS_KEY_PREFIX}the-slug` ? stored : null;
    },
    setItem: (key: string, value: string) => {
      if (blocked) throw new Error('blocked');
      writes[key] = value;
    },
  };
  new Function(
    'localStorage',
    'document',
    'window',
    'location',
    'setTimeout',
    progressNoteScript('the-slug'),
  )(storage, doc, win, { hash }, (fn: () => void) => timers.push(fn));
  const emit = (type: string, event: { detail?: number } = {}) => {
    for (const fn of listeners[type] ?? []) fn(event);
  };
  const progress = (detail: number) => emit('reading-progress', { detail });
  const flush = () => {
    while (timers.length > 0) timers.shift()?.();
  };
  const saved = () => {
    const raw = writes[`${PROGRESS_KEY_PREFIX}the-slug`];
    return raw === undefined ? null : (JSON.parse(raw) as { p: number; t: number });
  };
  return { scrolls, progress, flush, saved, emit, win, doc };
}

const entry = (p: number) => JSON.stringify({ p, t: 1 });

describe('thresholds', () => {
  it('marks read at 90% and restores only between 5% and 90%', () => {
    expect(READ_THRESHOLD).toBe(0.9);
    expect(RESTORE_MIN).toBe(0.05);
  });
});

describe('progressNoteScript: restoring the position', () => {
  it('scrolls to the same fraction of the article the progress bar measures', () => {
    const { scrolls } = note({ stored: entry(0.5) });
    // top = offsetTop + p * (offsetHeight - innerHeight) = 400 + 0.5 * 4000
    expect(scrolls).toEqual([{ top: 2400, behavior: 'instant' }]);
  });

  it.each([0.05, 0.02, 0.9, 1])('does not restore a stored fraction of %s', (p) => {
    expect(note({ stored: entry(p) }).scrolls).toEqual([]);
  });

  it('leaves the page alone with a hash, an already scrolled page or no stored entry', () => {
    expect(note({ stored: entry(0.5), hash: '#section' }).scrolls).toEqual([]);
    expect(note({ stored: entry(0.5), scrollY: 900 }).scrolls).toEqual([]);
    expect(note({ stored: null }).scrolls).toEqual([]);
  });

  it('ignores corrupt or out-of-range entries', () => {
    for (const raw of ['not json', '{}', '{"p":"0.5"}', '{"p":3}', '{"p":-1}', 'null']) {
      expect(note({ stored: raw }).scrolls).toEqual([]);
    }
  });

  it('does nothing without an article', () => {
    expect(note({ stored: entry(0.5), article: false }).scrolls).toEqual([]);
  });
});

describe('progressNoteScript: storing the progress', () => {
  it('writes the latest fraction after the throttle, not on every event', () => {
    const page = note();
    page.progress(0.2);
    page.progress(0.3);
    expect(page.saved()).toBeNull();
    page.flush();
    expect(page.saved()).toMatchObject({ p: 0.3 });
    expect(typeof page.saved()?.t).toBe('number');
  });

  it('stores 1 once the reader passes 90%', () => {
    const page = note();
    page.progress(0.91);
    page.flush();
    expect(page.saved()?.p).toBe(1);
  });

  it('keeps a finished note finished when the reader scrolls back up', () => {
    const page = note({ stored: entry(1) });
    page.progress(0.3);
    page.flush();
    expect(page.saved()).toBeNull();
  });

  it('does not store the first few percent', () => {
    const page = note();
    page.progress(0.01);
    page.flush();
    expect(page.saved()).toBeNull();
  });

  it('flushes when the page is hidden or left', () => {
    const page = note();
    page.progress(0.4);
    page.emit('pagehide');
    expect(page.saved()?.p).toBe(0.4);
    const hidden = note();
    hidden.progress(0.6);
    hidden.doc.visibilityState = 'hidden';
    hidden.emit('visibilitychange');
    expect(hidden.saved()?.p).toBe(0.6);
  });

  it('does not throw when the browser blocks storage', () => {
    const page = note({ blocked: true });
    page.progress(0.5);
    expect(() => page.flush()).not.toThrow();
    expect(page.saved()).toBeNull();
  });
});

type Row = { slug: string; label: boolean };

/** Runs the labels script over fake rows; returns what each label shows. */
function labels(stored: Record<string, string>, rows: Row[], blocked = false) {
  const shown = new Map<string, { text: string; state: string | null; hidden: boolean }>();
  const elements = rows.map((row) => {
    const label = {
      textContent: '',
      hidden: true,
      state: null as string | null,
      setAttribute(name: string, value: string) {
        if (name === 'data-state') this.state = value;
      },
    };
    return {
      label,
      row: {
        getAttribute: (name: string) => (name === 'data-slug' ? row.slug : null),
        querySelector: (selector: string) =>
          selector === '[data-progress-label]' && row.label ? label : null,
      },
    };
  });
  const listeners: Record<string, Array<(event?: { persisted: boolean }) => void>> = {};
  const doc = {
    readyState: 'complete',
    querySelectorAll: (selector: string) =>
      selector === '[data-slug]' ? elements.map((e) => e.row) : [],
    addEventListener: () => undefined,
  };
  const win = {
    addEventListener: (type: string, fn: () => void) => {
      listeners[type] = [...(listeners[type] ?? []), fn];
    },
  };
  const storage = {
    getItem: (key: string) => {
      if (blocked) throw new Error('blocked');
      return stored[key] ?? null;
    },
  };
  new Function(
    'localStorage',
    'document',
    'window',
    progressLabelsScript({ read: 'Read', continue: 'Continue reading' }),
  )(storage, doc, win);
  rows.forEach((row, i) => {
    const label = elements[i]?.label;
    if (label)
      shown.set(row.slug, { text: label.textContent, state: label.state, hidden: label.hidden });
  });
  return { shown, listeners };
}

describe('progressLabelsScript', () => {
  it('shows "read" at 90% or more and "continue" while in progress', () => {
    const { shown } = labels(
      {
        [`${PROGRESS_KEY_PREFIX}done`]: entry(1),
        [`${PROGRESS_KEY_PREFIX}half`]: entry(0.4),
        [`${PROGRESS_KEY_PREFIX}barely`]: entry(0.04),
      },
      [
        { slug: 'done', label: true },
        { slug: 'half', label: true },
        { slug: 'barely', label: true },
        { slug: 'new', label: true },
      ],
    );
    expect(shown.get('done')).toEqual({ text: 'Read', state: 'read', hidden: false });
    expect(shown.get('half')).toEqual({
      text: 'Continue reading',
      state: 'continue',
      hidden: false,
    });
    expect(shown.get('barely')?.hidden).toBe(true);
    expect(shown.get('new')?.hidden).toBe(true);
  });

  it('skips rows without a label and survives blocked storage', () => {
    expect(() => labels({}, [{ slug: 'a', label: false }])).not.toThrow();
    const { shown } = labels({}, [{ slug: 'a', label: true }], true);
    expect(shown.get('a')?.hidden).toBe(true);
  });

  it('runs again when a page returns from the back-forward cache', () => {
    expect(labels({}, []).listeners['pageshow']).toHaveLength(1);
  });
});

describe('claimProgressScript', () => {
  it('is true once per request', () => {
    const a = new Request('https://example.org/a');
    const b = new Request('https://example.org/b');
    expect(claimProgressScript(a)).toBe(true);
    expect(claimProgressScript(a)).toBe(false);
    expect(claimProgressScript(b)).toBe(true);
  });
});
