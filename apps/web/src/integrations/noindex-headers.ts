import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

const NOINDEX_RULE = '/*\n  X-Robots-Tag: noindex\n';

/** Prepends a catch-all X-Robots-Tag: noindex rule to a Cloudflare `_headers` file, keeping existing rules. */
export function addNoindexRule(existing: string): string {
  if (existing.includes('X-Robots-Tag: noindex')) return existing;
  return existing ? `${NOINDEX_RULE}\n${existing}` : NOINDEX_RULE;
}

/** Adds X-Robots-Tag: noindex to the built `_headers` unless SITE_INDEXABLE is exactly "true". */
export function noindexHeaders(): AstroIntegration {
  return {
    name: 'noindex-headers',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        if (process.env['SITE_INDEXABLE'] === 'true') return;
        const headersPath = join(fileURLToPath(dir), '_headers');
        let existing = '';
        try {
          existing = readFileSync(headersPath, 'utf-8');
        } catch {
          // No _headers was generated; create one.
        }
        writeFileSync(headersPath, addNoindexRule(existing));
        logger.info('Added X-Robots-Tag: noindex to _headers (non-production build)');
      },
    },
  };
}
