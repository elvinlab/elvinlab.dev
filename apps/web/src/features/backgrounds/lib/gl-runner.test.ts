import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Palette } from './contract.ts';
import { runShader } from './gl-runner.ts';

const PALETTE: Palette = {
  base: [0, 0, 0],
  primary: [1, 0, 0],
  cyan: [0, 1, 0],
  pink: [0, 0, 1],
};

type IntersectionCallback = (entries: { isIntersecting: boolean }[]) => void;

/** A WebGL2 stand-in: every method is a no-op and every shader/program query succeeds. */
function fakeGl(): WebGL2RenderingContext {
  const gl = new Proxy(
    {},
    {
      get: (_target, name) => {
        if (name === 'isContextLost') return () => false;
        if (name === 'getShaderParameter' || name === 'getProgramParameter') return () => true;
        if (
          name === 'createShader' ||
          name === 'createProgram' ||
          name === 'createBuffer' ||
          name === 'getUniformLocation'
        )
          return () => ({});
        if (name === 'getAttribLocation') return () => 0;
        if (typeof name === 'string' && /^[A-Z_0-9]+$/.test(name)) return 0;
        return () => undefined;
      },
    },
  );
  return gl as unknown as WebGL2RenderingContext;
}

/** Controllable browser surface: tab visibility, viewport intersection and the rAF queue. */
function stubBrowser() {
  let intersection: IntersectionCallback = () => undefined;
  const visibilityListeners: (() => void)[] = [];
  const state = { hidden: false, frameRequests: 0, cancelled: 0 };

  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionCallback) {
        intersection = callback;
      }
      observe(): void {}
      disconnect(): void {}
    },
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      disconnect(): void {}
    },
  );
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.stubGlobal('requestAnimationFrame', () => {
    state.frameRequests += 1;
    return state.frameRequests;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    state.cancelled += 1;
  });
  vi.stubGlobal('window', {
    devicePixelRatio: 1,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });
  vi.stubGlobal('document', {
    get hidden() {
      return state.hidden;
    },
    addEventListener: (type: string, listener: () => void) => {
      if (type === 'visibilitychange') visibilityListeners.push(listener);
    },
    removeEventListener: () => undefined,
  });

  return {
    state,
    setIntersecting: (isIntersecting: boolean) => intersection([{ isIntersecting }]),
    setTabHidden: (hidden: boolean) => {
      state.hidden = hidden;
      for (const listener of visibilityListeners) listener();
    },
  };
}

const canvas = {
  clientWidth: 100,
  clientHeight: 100,
  width: 100,
  height: 100,
  style: {},
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
} as unknown as HTMLCanvasElement;

describe('runShader visibility guards', () => {
  beforeEach(() => {
    vi.stubGlobal('performance', { now: () => 0 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not resume drawing when the tab becomes visible while the canvas is offscreen', () => {
    const browser = stubBrowser();
    const handle = runShader(fakeGl(), canvas, PALETTE, 'void main() {}');

    browser.setIntersecting(true);
    browser.setIntersecting(false);
    browser.setTabHidden(true);
    const before = browser.state.frameRequests;
    browser.setTabHidden(false);

    expect(browser.state.frameRequests).toBe(before);
    handle.destroy();
  });

  it('resumes when the tab becomes visible while the canvas intersects the viewport', () => {
    const browser = stubBrowser();
    const handle = runShader(fakeGl(), canvas, PALETTE, 'void main() {}');

    browser.setIntersecting(true);
    browser.setTabHidden(true);
    const before = browser.state.frameRequests;
    browser.setTabHidden(false);

    expect(browser.state.frameRequests).toBe(before + 1);
    handle.destroy();
  });

  it('stays paused after scrolling back into view while the tab is hidden', () => {
    const browser = stubBrowser();
    const handle = runShader(fakeGl(), canvas, PALETTE, 'void main() {}');

    browser.setIntersecting(false);
    browser.setTabHidden(true);
    const before = browser.state.frameRequests;
    browser.setIntersecting(true);

    expect(browser.state.frameRequests).toBe(before);
    handle.destroy();
  });
});
