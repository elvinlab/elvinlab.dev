import { describe, expect, it } from 'vitest';

import { READING_STORAGE_KEY, readingBootScript, readingControlsScript } from './reading-mode.ts';

/** Runs the boot script against a fake document and storage; returns the attributes it set. */
function boot(storage: { getItem: (key: string) => string | null }): string[] {
  const attributes: string[] = [];
  const document = { documentElement: { setAttribute: (name: string) => attributes.push(name) } };
  new Function('localStorage', 'document', readingBootScript())(storage, document);
  return attributes;
}

describe('readingBootScript', () => {
  it('marks the page as reading when the visitor turned the mode on', () => {
    expect(boot({ getItem: (key) => (key === READING_STORAGE_KEY ? '1' : null) })).toEqual([
      'data-reading',
    ]);
  });

  it('leaves the page alone when the mode is off or was never chosen', () => {
    expect(boot({ getItem: () => '0' })).toEqual([]);
    expect(boot({ getItem: () => null })).toEqual([]);
  });

  it('does not throw when the browser blocks storage', () => {
    expect(
      boot({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toEqual([]);
  });

  it('is small enough to inline in the head', () => {
    expect(readingBootScript().length).toBeLessThan(200);
  });
});

type Listener = () => void;

/** A tiny DOM stand-in: enough to run the controls script and observe what it does. */
function controls(options: { blocked?: boolean } = {}) {
  const listeners: Record<string, Listener> = {};
  const attributes = new Set<string>();
  const pressed: string[] = [];
  const stored: Record<string, string> = {};
  const events: string[] = [];
  const toggle = {
    addEventListener: (_: string, fn: Listener) => (listeners['toggle'] = fn),
    setAttribute: (_: string, value: string) => pressed.push(value),
  };
  const exit = { addEventListener: (_: string, fn: Listener) => (listeners['exit'] = fn) };
  const document = {
    documentElement: {
      hasAttribute: (name: string) => attributes.has(name),
      toggleAttribute: (name: string, on: boolean) =>
        on ? attributes.add(name) : attributes.delete(name),
    },
    querySelectorAll: (selector: string) =>
      selector === '[data-reading-toggle]' ? [toggle] : [exit],
    dispatchEvent: (event: { type: string }) => events.push(event.type),
  };
  const localStorage = {
    setItem: (key: string, value: string) => {
      if (options.blocked) throw new Error('blocked');
      stored[key] = value;
    },
  };
  new Function('document', 'localStorage', 'CustomEvent', readingControlsScript())(
    document,
    localStorage,
    class {
      constructor(public type: string) {}
    },
  );
  return { listeners, attributes, pressed, stored, events };
}

describe('readingControlsScript', () => {
  it('shows the current state on the toggle as soon as it runs', () => {
    expect(controls().pressed).toEqual(['false']);
  });

  it('turns the mode on from the toggle, remembers it and announces the change', () => {
    const page = controls();
    page.listeners['toggle']?.();
    expect([...page.attributes]).toEqual(['data-reading']);
    expect(page.stored[READING_STORAGE_KEY]).toBe('1');
    expect(page.pressed.at(-1)).toBe('true');
    expect(page.events).toEqual(['reading-mode-change']);
  });

  it('turns it off again from the toggle and from the floating exit button', () => {
    const page = controls();
    page.listeners['toggle']?.();
    page.listeners['toggle']?.();
    expect(page.attributes.size).toBe(0);
    expect(page.stored[READING_STORAGE_KEY]).toBe('0');
    page.listeners['toggle']?.();
    page.listeners['exit']?.();
    expect(page.attributes.size).toBe(0);
    expect(page.pressed.at(-1)).toBe('false');
  });

  it('still works for the current view when the browser blocks storage', () => {
    const page = controls({ blocked: true });
    expect(() => page.listeners['toggle']?.()).not.toThrow();
    expect([...page.attributes]).toEqual(['data-reading']);
  });
});
