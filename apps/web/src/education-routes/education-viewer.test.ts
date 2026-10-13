import { describe, expect, it } from 'vitest';

import { educationViewerScript } from './education-viewer.ts';

type Listener = (event: unknown) => void;

/** Runs the script against a minimal fake DOM and returns the click handler and the dialog spy. */
function run(options: { showModal?: boolean } = {}) {
  const calls: string[] = [];
  const img = { src: '', alt: '' };
  const dialog = {
    querySelector: () => img,
    showModal: () => calls.push('showModal'),
    close: () => calls.push('close'),
  };
  if (options.showModal === false) Reflect.deleteProperty(dialog, 'showModal');
  const listeners: Listener[] = [];
  const document = {
    querySelector: (selector: string) => (selector === '[data-ed-viewer]' ? dialog : null),
    addEventListener: (type: string, listener: Listener) => {
      if (type === 'click') listeners.push(listener);
    },
  };
  new Function('document', educationViewerScript())(document);
  return { calls, img, dialog, listeners };
}

describe('educationViewerScript', () => {
  it('is valid JavaScript that names the trigger and the dialog hooks', () => {
    const script = educationViewerScript();
    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain('[data-ed-open]');
    expect(script).toContain('[data-ed-viewer]');
    expect(script).toContain('showModal');
  });

  it('does nothing when the dialog API is missing', () => {
    expect(run({ showModal: false }).listeners).toHaveLength(0);
  });

  it('opens the dialog with the link target and the thumbnail alt, and cancels the navigation', () => {
    const { calls, img, listeners } = run();
    let prevented = false;
    const link = { href: 'https://x.test/full.webp', querySelector: () => ({ alt: 'Diploma' }) };
    listeners[0]?.({
      target: { closest: () => link },
      preventDefault: () => {
        prevented = true;
      },
    });
    expect(prevented).toBe(true);
    expect(img).toEqual({ src: 'https://x.test/full.webp', alt: 'Diploma' });
    expect(calls).toEqual(['showModal']);
  });

  it('leaves modified clicks to the browser', () => {
    const { calls, listeners } = run();
    listeners[0]?.({
      ctrlKey: true,
      target: { closest: () => ({ href: 'x', querySelector: () => null }) },
      preventDefault: () => calls.push('prevented'),
    });
    expect(calls).toEqual([]);
  });

  it('closes on a click on the backdrop (the dialog itself) and ignores other clicks', () => {
    const { calls, dialog, listeners } = run();
    listeners[0]?.({ target: { closest: () => null } });
    expect(calls).toEqual([]);
    listeners[0]?.({ target: Object.assign(dialog, { closest: () => null }) });
    expect(calls).toEqual(['close']);
  });
});
