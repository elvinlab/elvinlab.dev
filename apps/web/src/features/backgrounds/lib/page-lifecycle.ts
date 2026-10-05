/**
 * Decides what the background does on `pagehide` / `pageshow`, kept free of DOM globals so it is
 * unit-testable. `pagehide` also fires when a page enters the back/forward cache
 * (`persisted === true`): the page may come back as-is, so it must only pause, never release its
 * GL context. A real departure (`persisted === false`) disposes everything. On a bfcache restore
 * (`pageshow` with `persisted === true`) nothing re-runs by itself, so the effect is resumed.
 */
export interface PageLifecycleHooks {
  /** Stop drawing but keep the GL context and observers alive. */
  pause: () => void;
  /** Re-run the current effect after a back/forward cache restore. */
  resume: () => void;
  /** Leave for good: release the GL context and observers. */
  dispose: () => void;
}

export interface PageLifecycle {
  onPageHide: (event: { persisted: boolean }) => void;
  onPageShow: (event: { persisted: boolean }) => void;
}

export function createPageLifecycle(hooks: PageLifecycleHooks): PageLifecycle {
  return {
    onPageHide: ({ persisted }) => (persisted ? hooks.pause() : hooks.dispose()),
    onPageShow: ({ persisted }) => {
      if (persisted) hooks.resume();
    },
  };
}
