import { describe, expect, it } from 'vitest';

import { externalAnchorHtml } from './external-anchor.ts';

describe('externalAnchorHtml', () => {
  it('opens in a new tab, cannot reach the opener and announces the tab in Spanish', () => {
    expect(externalAnchorHtml('es', 'https://giscus.app', 'giscus')).toBe(
      '<a href="https://giscus.app" target="_blank" rel="noopener noreferrer">giscus<span class="sr-only"> (se abre en una pestaña nueva)</span></a>',
    );
  });

  it('announces the tab in English', () => {
    expect(externalAnchorHtml('en', 'https://giscus.app', 'giscus')).toContain(
      '<span class="sr-only"> (opens in a new tab)</span>',
    );
  });
});
