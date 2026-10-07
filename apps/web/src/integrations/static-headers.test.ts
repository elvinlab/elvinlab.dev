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
  it('caches the fingerprinted /_astro files for a year as immutable', () => {
    // Workers static assets default to `max-age=0, must-revalidate`, so without this rule every
    // font, script and image is revalidated on every visit.
    expect(rulesFor('/_astro/*')).toContain('Cache-Control: public, max-age=31556952, immutable');
  });

  it('keeps the security headers on every path', () => {
    expect(rulesFor('/*')).toContain('X-Content-Type-Options: nosniff');
  });
});
