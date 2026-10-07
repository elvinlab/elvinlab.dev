import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const headers = readFileSync(
  fileURLToPath(new URL('../../public/_headers', import.meta.url)),
  'utf8',
);

/** The block of rules that applies to one path pattern of the `_headers` file. */
function rulesFor(pattern: string): string[] {
  const lines = headers.split('\n');
  const start = lines.findIndex((line) => line.trim() === pattern);
  if (start === -1) return [];
  const rules: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith(' ') && line.trim() !== '') break;
    if (line.trim() !== '') rules.push(line.trim());
  }
  return rules;
}

describe('static asset headers', () => {
  it('leaves the cache policy of the fingerprinted /_astro files to the Astro adapter', () => {
    // The Cloudflare adapter writes `/_astro/* Cache-Control: public, max-age=31536000, immutable`
    // into the built `_headers` by itself, but only when this file has no `/_astro/*` rule. A rule
    // here switches that default off and its value is served instead; `.github/scripts/smoke-check.sh`
    // expects exactly `public, max-age=31536000, immutable` and rolls the deploy back otherwise (the
    // release of 2026-10-07 was rolled back because of a `max-age=31556952` rule added here).
    expect(rulesFor('/_astro/*')).toEqual([]);
    expect(headers).not.toMatch(/cache-control/i);
  });

  it('keeps the security headers on every path', () => {
    expect(rulesFor('/*')).toContain('X-Content-Type-Options: nosniff');
  });
});
