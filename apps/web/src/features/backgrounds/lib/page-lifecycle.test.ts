import { describe, expect, it, vi } from 'vitest';

import { createPageLifecycle } from './page-lifecycle.ts';

function setup() {
  const hooks = { pause: vi.fn(), resume: vi.fn(), dispose: vi.fn() };
  return { hooks, lifecycle: createPageLifecycle(hooks) };
}

describe('createPageLifecycle', () => {
  it('only pauses when the page enters the back/forward cache', () => {
    const { hooks, lifecycle } = setup();
    lifecycle.onPageHide({ persisted: true });
    expect(hooks.pause).toHaveBeenCalledOnce();
    expect(hooks.dispose).not.toHaveBeenCalled();
  });

  it('disposes when the page is really going away', () => {
    const { hooks, lifecycle } = setup();
    lifecycle.onPageHide({ persisted: false });
    expect(hooks.dispose).toHaveBeenCalledOnce();
    expect(hooks.pause).not.toHaveBeenCalled();
  });

  it('resumes when the page is restored from the back/forward cache', () => {
    const { hooks, lifecycle } = setup();
    lifecycle.onPageShow({ persisted: true });
    expect(hooks.resume).toHaveBeenCalledOnce();
  });

  it('does nothing on a fresh pageshow', () => {
    const { hooks, lifecycle } = setup();
    lifecycle.onPageShow({ persisted: false });
    expect(hooks.resume).not.toHaveBeenCalled();
    expect(hooks.pause).not.toHaveBeenCalled();
    expect(hooks.dispose).not.toHaveBeenCalled();
  });

  it('still disposes after an earlier persisted pagehide', () => {
    const { hooks, lifecycle } = setup();
    lifecycle.onPageHide({ persisted: true });
    lifecycle.onPageShow({ persisted: true });
    lifecycle.onPageHide({ persisted: false });
    expect(hooks.pause).toHaveBeenCalledOnce();
    expect(hooks.dispose).toHaveBeenCalledOnce();
  });
});
