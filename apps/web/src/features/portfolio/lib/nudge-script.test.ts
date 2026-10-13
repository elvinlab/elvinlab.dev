import { describe, expect, it } from 'vitest';

import { NUDGE_STORAGE_KEY, nudgeScript } from './nudge-script.ts';

type Listener = (...args: never[]) => void;

/** A tiny DOM stand-in: enough to run the script and observe what it does to the floating card. */
function fakeElement() {
  const attributes = new Map<string, string>();
  const listeners: Record<string, Listener> = {};
  const classes = new Set<string>();
  const element = {
    attributes,
    classes,
    listeners,
    className: '',
    textContent: '',
    appended: [] as unknown[],
    classList: { add: (name: string) => classes.add(name) },
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
    hasAttribute: (name: string) => attributes.has(name),
    addEventListener: (type: string, fn: Listener) => {
      listeners[type] = fn;
    },
    appendChild(child: unknown) {
      element.appended.push(child);
    },
    querySelectorAll: () => [] as unknown[],
    cloneNode: () => fakeElement(),
  };
  return element;
}

type Options = {
  top?: number;
  height?: number;
  viewport?: number;
  threshold?: number;
  local?: Record<string, string>;
  session?: Record<string, string>;
  blocked?: boolean;
  noObserver?: boolean;
  source?: 'template';
  target?: string;
  missingTarget?: boolean;
};

function run(options: Options = {}) {
  const { top = 0, height = 1000, viewport = 800, threshold = 0.7 } = options;
  const card = fakeElement();
  const article = { getBoundingClientRect: () => ({ top: article.top, height }), top };
  const local = { ...options.local };
  const session = { ...options.session };
  const store = (data: Record<string, string>) => ({
    getItem: (key: string) => {
      if (options.blocked) throw new Error('blocked');
      return data[key] ?? null;
    },
    setItem: (key: string, value: string) => {
      if (options.blocked) throw new Error('blocked');
      data[key] = value;
    },
  });
  const body = fakeElement();
  const windowListeners: Record<string, Listener> = {};
  const observed: Listener[] = [];
  const ObserverStub = options.noObserver
    ? undefined
    : class {
        constructor(callback: Listener) {
          observed.push(callback);
        }
        observe() {}
      };
  const document = {
    body,
    createElement: () => fakeElement(),
    querySelector: (selector: string) => {
      if (selector === '[data-experiment-card]') return options.source === 'template' ? null : card;
      if (selector === 'template[data-experiment-template]') {
        return options.source === 'template' ? { content: { firstElementChild: card } } : null;
      }
      return selector === (options.target ?? 'article') && !options.missingTarget ? article : null;
    },
  };
  const window = {
    innerHeight: viewport,
    addEventListener: (type: string, fn: Listener) => {
      windowListeners[type] = fn;
    },
    removeEventListener: (type: string) => {
      delete windowListeners[type];
    },
  };
  new Function(
    'document',
    'window',
    'localStorage',
    'sessionStorage',
    'IntersectionObserver',
    'requestAnimationFrame',
    nudgeScript({ threshold, closeLabel: 'Close', target: options.target ?? 'article' }),
  )(document, window, store(local), store(session), ObserverStub, (fn: () => void) => fn());
  const box = body.appended[0] as ReturnType<typeof fakeElement> | undefined;
  return {
    box,
    local,
    session,
    windowListeners,
    scrollTo: (nextTop: number) => {
      article.top = nextTop;
      windowListeners['scroll']?.(...([] as never[]));
    },
    cover: (visible: boolean) => observed[0]?.(...([[{ isIntersecting: visible }]] as never[])),
    close: () =>
      box?.appended.at(-1) &&
      (box.appended.at(-1) as ReturnType<typeof fakeElement>).listeners['click']?.(
        ...([] as never[]),
      ),
  };
}

const isOpen = (box?: ReturnType<typeof fakeElement>) => box?.hasAttribute('data-open') ?? false;

describe('nudgeScript', () => {
  it('adds a floating copy of the card that starts closed and unreachable', () => {
    const { box } = run({ top: 700 });
    expect(box?.classes.has('nudge-float')).toBe(true);
    expect(box?.hasAttribute('data-experiment-card')).toBe(false);
    expect(box?.hasAttribute('inert')).toBe(true);
    expect(isOpen(box)).toBe(false);
  });

  it('stays closed until the visitor has read the configured share of the note', () => {
    const page = run({ top: 700 });
    expect(isOpen(page.box)).toBe(false);
    page.scrollTo(300);
    expect(isOpen(page.box)).toBe(false);
    page.scrollTo(100);
    expect(isOpen(page.box)).toBe(true);
    expect(page.box?.hasAttribute('inert')).toBe(false);
  });

  it('opens at once when the page already loads past the threshold', () => {
    expect(isOpen(run({ top: 0 }).box)).toBe(true);
  });

  it('remembers for the session that it was shown, and stops listening to scroll', () => {
    const page = run({ top: 100 });
    expect(page.session[NUDGE_STORAGE_KEY]).toBe('1');
    expect(page.windowListeners['scroll']).toBeUndefined();
  });

  it('does nothing when it was already shown this session', () => {
    expect(run({ top: 0, session: { [NUDGE_STORAGE_KEY]: '1' } }).box).toBeUndefined();
  });

  it('does nothing when the visitor closed it before', () => {
    expect(run({ top: 0, local: { [NUDGE_STORAGE_KEY]: '1' } }).box).toBeUndefined();
  });

  it('hides while the static card is on screen and returns when it leaves', () => {
    const page = run({ top: 0 });
    page.cover(true);
    expect(isOpen(page.box)).toBe(false);
    page.cover(false);
    expect(isOpen(page.box)).toBe(true);
  });

  it('closes with the button and remembers the choice across visits', () => {
    const page = run({ top: 0 });
    page.close();
    expect(isOpen(page.box)).toBe(false);
    expect(page.local[NUDGE_STORAGE_KEY]).toBe('1');
  });

  it('keeps working when the browser blocks storage', () => {
    const page = run({ top: 0, blocked: true });
    expect(isOpen(page.box)).toBe(true);
    expect(() => page.close()).not.toThrow();
  });

  it('works without IntersectionObserver', () => {
    expect(isOpen(run({ top: 0, noObserver: true }).box)).toBe(true);
  });

  it('floats from a template on a page that has no static card', () => {
    const page = run({ top: 0, source: 'template' });
    expect(page.box?.classes.has('nudge-float')).toBe(true);
    expect(isOpen(page.box)).toBe(true);
  });

  it('measures the scroll against the configured element', () => {
    const page = run({ top: 700, target: 'main' });
    expect(isOpen(page.box)).toBe(false);
    page.scrollTo(100);
    expect(isOpen(page.box)).toBe(true);
  });

  it('does nothing when the element to measure is missing', () => {
    expect(run({ top: 0, missingTarget: true }).box).toBeUndefined();
  });

  it('is small enough to inline in a page', () => {
    expect(
      nudgeScript({ threshold: 0.7, closeLabel: 'Close', target: 'article' }).length,
    ).toBeLessThan(3000);
  });
});
