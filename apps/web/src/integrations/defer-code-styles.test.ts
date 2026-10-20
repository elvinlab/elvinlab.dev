import { describe, expect, it } from 'vitest';

import { deferCodeStyles } from './defer-code-styles.ts';

const blocking = '<link rel="stylesheet" href="/_astro/ec.v8m82.css"/>';

describe('deferCodeStyles', () => {
  it('loads the Expressive Code stylesheet without blocking the first paint, with a noscript fallback', () => {
    const result = deferCodeStyles(`<head>${blocking}</head>`);
    expect(result).toContain(
      '<link rel="stylesheet" href="/_astro/ec.v8m82.css" media="print" onload="this.onload=null;this.media=\'all\'"/>',
    );
    expect(result).toContain(`<noscript>${blocking}</noscript>`);
    expect(result.replace(`<noscript>${blocking}</noscript>`, '')).not.toContain(blocking);
  });

  it('leaves every other stylesheet blocking', () => {
    const other = '<link rel="stylesheet" href="/_astro/page.abc123.css"/>';
    expect(deferCodeStyles(`<head>${other}${blocking}</head>`)).toContain(other);
  });

  it('returns pages without code blocks untouched', () => {
    const html = '<head><link rel="stylesheet" href="/_astro/page.abc123.css"/></head>';
    expect(deferCodeStyles(html)).toBe(html);
  });

  it('is idempotent', () => {
    const once = deferCodeStyles(`<head>${blocking}</head>`);
    expect(deferCodeStyles(once)).toBe(once);
  });
});
