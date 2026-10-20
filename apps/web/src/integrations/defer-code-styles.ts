import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

// The Expressive Code stylesheet (`/_astro/ec.<hash>.css`) is the only render-blocking request left
// on a note page, and the code frames it styles sit below the first screen. A `<link>` already
// wrapped in `<noscript>` is skipped, so running the rewrite twice changes nothing.
const BLOCKING_LINK =
  /(?<!<noscript>)<link rel="stylesheet" href="(\/_astro\/ec\.[^"]+\.css)"\s*\/?>/gu;

/** Loads the Expressive Code stylesheet without blocking the first paint, with a `noscript` fallback. */
export function deferCodeStyles(html: string): string {
  return html.replace(
    BLOCKING_LINK,
    (link, href: string) =>
      `<link rel="stylesheet" href="${href}" media="print" onload="this.onload=null;this.media='all'"/><noscript>${link}</noscript>`,
  );
}

/** Rewrites the built pages so the code-block styles stop delaying the largest contentful paint. */
export function deferCodeStylesIntegration(): AstroIntegration {
  return {
    name: 'defer-code-styles',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        let changed = 0;
        for (const entry of readdirSync(root, { recursive: true, encoding: 'utf-8' })) {
          if (!entry.endsWith('.html')) continue;
          const file = join(root, entry);
          const html = readFileSync(file, 'utf-8');
          const next = deferCodeStyles(html);
          if (next === html) continue;
          writeFileSync(file, next);
          changed += 1;
        }
        logger.info(`Deferred the code-block stylesheet on ${changed} pages`);
      },
    },
  };
}
