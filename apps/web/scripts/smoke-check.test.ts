import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const script = join(import.meta.dirname, '../../../.github/scripts/smoke-check.sh');

/** Only loopback HTTP is used; the server is closed even when an assertion fails. */
async function smoke(options: { blog?: string; notes?: string; missing?: string[] } = {}) {
  const requested: string[] = [];
  const missing = new Set(options.missing ?? []);
  const server = createServer((request, response) => {
    const path = request.url ?? '/';
    requested.push(path);
    if (missing.has(path)) {
      response.writeHead(404).end('missing');
      return;
    }
    if (path === '/_astro/app.css') {
      response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    response
      .writeHead(200)
      .end(
        path === '/version.txt'
          ? 'abc123'
          : '<html><head><link href="/_astro/app.css" rel="stylesheet"></head></html>',
      );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address() as AddressInfo;
    const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        SMOKE_NOTES: options.notes ?? '',
        SMOKE_MAX_ATTEMPTS: '1',
        SMOKE_RETRY_DELAY: '0',
      };
      delete env['SMOKE_BLOG'];
      if (options.blog !== undefined) env['SMOKE_BLOG'] = options.blog;
      const child = spawn('bash', [script, `http://127.0.0.1:${port}`, 'abc123'], {
        env,
      });
      let output = '';
      child.stdout.on('data', (data) => {
        output += String(data);
      });
      child.stderr.on('data', (data) => {
        output += String(data);
      });
      child.on('error', reject);
      child.on('close', (code) => resolve({ code, output }));
    });
    return { ...result, requested };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

describe('deployed smoke-check blog contract', () => {
  it('checks the notes index, feed and published note when blog is on', async () => {
    const result = await smoke({ notes: 'uno' });
    expect(result.code, result.output).toBe(0);
    expect(result.requested).toEqual(
      expect.arrayContaining(['/notes/', '/rss.xml', '/notes/uno/']),
    );
  });

  it('accepts an English note under its language prefix', async () => {
    const result = await smoke({ notes: 'three', missing: ['/notes/three/'] });
    expect(result.code, result.output).toBe(0);
    expect(result.requested).toContain('/en/notes/three/');
  });

  it('does not request intentionally absent blog routes when blog is off', async () => {
    const result = await smoke({ blog: 'false', missing: ['/notes/', '/rss.xml'] });
    expect(result.code, result.output).toBe(0);
    expect(result.requested).not.toContain('/notes/');
    expect(result.requested).not.toContain('/rss.xml');
  });

  it.each(['/notes/', '/rss.xml'])('fails when the required %s route is missing', async (path) => {
    const result = await smoke({ missing: [path] });
    expect(result.code).toBe(1);
    expect(result.output).toContain('FAIL:');
  });

  it('fails when a published note is absent under both prefixes', async () => {
    const result = await smoke({ notes: 'uno', missing: ['/notes/uno/', '/en/notes/uno/'] });
    expect(result.code).toBe(1);
    expect(result.output).toContain('FAIL:');
  });

  it.each(['unknown', '', '0'])('rejects the unknown blog flag %j before HTTP', async (blog) => {
    const result = await smoke({ blog });
    expect(result.code).toBe(1);
    expect(result.output).toContain('SMOKE_BLOG');
    expect(result.requested).toEqual([]);
  });

  it('rejects note targets when the candidate explicitly disables blog', async () => {
    const result = await smoke({ blog: 'false', notes: 'uno' });
    expect(result.code).toBe(1);
    expect(result.requested).toEqual([]);
  });
});
