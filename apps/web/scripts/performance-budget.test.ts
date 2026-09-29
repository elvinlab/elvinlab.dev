import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

import { afterEach, describe, expect, it } from 'vitest';

import { collectJavaScriptGzipBytes } from './performance-budget.ts';

const temporaryDirectories: string[] = [];

function createFixture(): { client: string; html: string } {
  const root = mkdtempSync(join(tmpdir(), 'performance-budget-'));
  temporaryDirectories.push(root);
  const client = join(root, 'client');
  mkdirSync(join(client, '_astro'), { recursive: true });
  const html = join(client, 'index.html');
  return { client, html };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('collectJavaScriptGzipBytes', () => {
  it('counts inline and external JavaScript plus transitive module imports once', () => {
    const { client, html } = createFixture();
    const entry = 'import "./shared.js"; console.log("entry");';
    const shared = 'console.log("shared");';
    const inline = 'console.log("inline");';
    writeFileSync(
      html,
      `<script type="application/ld+json">{"ignored":true}</script><script type="module">${inline}</script><script type="module" src="/_astro/entry.js"></script><script type="module" src="/_astro/entry.js"></script>`,
    );
    writeFileSync(join(client, '_astro', 'entry.js'), entry);
    writeFileSync(join(client, '_astro', 'shared.js'), shared);

    expect(collectJavaScriptGzipBytes(html, client)).toBe(
      gzipSync(Buffer.from(inline)).byteLength +
        gzipSync(Buffer.from(entry)).byteLength +
        gzipSync(Buffer.from(shared)).byteLength,
    );
  });

  it('includes classic scripts and nested imports while ignoring non-script assets', () => {
    const { client, html } = createFixture();
    const classic = 'window.ready = true;';
    const entry = 'import "./nested/child.js";';
    const child = 'export const value = 1;';
    writeFileSync(
      html,
      `<script src="/_astro/classic.js"></script><script type="module" src="/_astro/entry.js"></script><script type="application/json">{"x":1}</script>`,
    );
    mkdirSync(join(client, '_astro', 'nested'));
    writeFileSync(join(client, '_astro', 'classic.js'), classic);
    writeFileSync(join(client, '_astro', 'entry.js'), entry);
    writeFileSync(join(client, '_astro', 'nested', 'child.js'), child);
    writeFileSync(
      join(client, 'page.html'),
      `<script type="module" src="/_astro/entry.js"></script>`,
    );

    expect(collectJavaScriptGzipBytes(html, client)).toBe(
      gzipSync(Buffer.from(classic)).byteLength +
        gzipSync(Buffer.from(entry)).byteLength +
        gzipSync(Buffer.from(child)).byteLength,
    );
  });
});
