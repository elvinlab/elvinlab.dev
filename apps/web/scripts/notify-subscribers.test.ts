import { describe, expect, it, vi } from 'vitest';

import { buildRequest, parseArgs, run } from './notify-subscribers.ts';

const TOKEN = 'owner-token-'.padEnd(48, 'z');
const BASE = 'https://site.test';

describe('parseArgs', () => {
  it('defaults to a dry run and sends only with --send, in any position', () => {
    expect(parseArgs(['a-note'])).toEqual({ ok: true, args: { slug: 'a-note', send: false } });
    expect(parseArgs(['a-note', '--send'])).toEqual({
      ok: true,
      args: { slug: 'a-note', send: true },
    });
    expect(parseArgs(['--send', 'a-note'])).toEqual({
      ok: true,
      args: { slug: 'a-note', send: true },
    });
  });

  it.each([[[]], [['a', 'b']], [['Bad Slug']], [['a-note', '--token', 'x']], [['--send']]])(
    'rejects %j',
    (argv) => {
      expect(parseArgs(argv).ok).toBe(false);
    },
  );
});

describe('buildRequest', () => {
  it('builds a JSON POST with the token in the header only', () => {
    const { url, init } = buildRequest(`${BASE}/`, TOKEN, { slug: 'a-note', send: false });
    expect(url).toBe(`${BASE}/api/subscribe/notify`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      authorization: `Bearer ${TOKEN}`,
      'content-type': 'application/json',
    });
    expect(JSON.parse(String(init.body))).toEqual({ slug: 'a-note', dryRun: true });
    expect(String(init.body)).not.toContain(TOKEN);
    expect(url).not.toContain(TOKEN);
    expect(
      JSON.parse(String(buildRequest(BASE, TOKEN, { slug: 'a-note', send: true }).init.body)),
    ).toEqual({
      slug: 'a-note',
      dryRun: false,
    });
  });
});

function harness(status: number, body: unknown) {
  const lines: string[] = [];
  const out = {
    log: (line: string) => lines.push(line),
    error: (line: string) => lines.push(line),
  };
  const request = vi.fn<typeof fetch>(async () => Response.json(body, { status }));
  return { lines, out, request };
}

describe('run', () => {
  it('prints a dry run in plain sentences and sends nothing for real', async () => {
    const { lines, out, request } = harness(200, {
      recipients: 4,
      wouldSend: 4,
      remainingPool: 90,
    });
    await expect(
      run(['a-note'], { SUBSCRIBE_ADMIN_TOKEN: TOKEN }, BASE, request, out),
    ).resolves.toBe(0);
    expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body))).toMatchObject({ dryRun: true });
    expect(lines.join('\n')).toContain('4 subscribers');
    expect(lines.join('\n')).toContain('Add --send');
    expect(lines.join('\n')).not.toContain(TOKEN);
  });

  it('sends for real with --send and says to run again when some remain', async () => {
    const { lines, out, request } = harness(200, { sent: 70, remaining: 30, failed: false });
    await expect(
      run(['a-note', '--send'], { SUBSCRIBE_ADMIN_TOKEN: TOKEN }, BASE, request, out),
    ).resolves.toBe(0);
    expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body))).toMatchObject({ dryRun: false });
    expect(lines.join('\n')).toContain('30 still waiting');
    expect(lines.join('\n')).toContain('Run it again tomorrow');
  });

  it('does not ask to run again when nothing remains', async () => {
    const { lines, out, request } = harness(200, { sent: 3, remaining: 0, failed: false });
    await run(['a-note', '--send'], { SUBSCRIBE_ADMIN_TOKEN: TOKEN }, BASE, request, out);
    expect(lines.join('\n')).not.toContain('again');
  });

  it.each([401, 403, 404, 429, 500, 503])(
    'exits non-zero on %i without printing the token',
    async (status) => {
      const { lines, out, request } = harness(status, {});
      await expect(
        run(['a-note', '--send'], { SUBSCRIBE_ADMIN_TOKEN: TOKEN }, BASE, request, out),
      ).resolves.toBe(1);
      expect(lines).toHaveLength(1);
      expect(lines.join('\n')).not.toContain(TOKEN);
    },
  );

  it('reports a partial send on 502 and still exits non-zero', async () => {
    const { lines, out, request } = harness(502, { sent: 0, remaining: 5, failed: true });
    await expect(
      run(['a-note', '--send'], { SUBSCRIBE_ADMIN_TOKEN: TOKEN }, BASE, request, out),
    ).resolves.toBe(1);
    expect(lines.join('\n')).toContain('5 still waiting');
  });

  it('needs the token in the environment and an https site', async () => {
    const { lines, out, request } = harness(200, {});
    await expect(run(['a-note'], {}, BASE, request, out)).resolves.toBe(1);
    await expect(
      run(['a-note'], { SUBSCRIBE_ADMIN_TOKEN: TOKEN }, 'http://site.test', request, out),
    ).resolves.toBe(1);
    expect(request).not.toHaveBeenCalled();
    expect(lines.join('\n')).not.toContain(TOKEN);
  });

  it('survives a network failure without leaking details', async () => {
    const { lines, out } = harness(200, {});
    const request = vi.fn<typeof fetch>(async () => {
      throw new Error(`boom ${TOKEN}`);
    });
    await expect(
      run(['a-note'], { SUBSCRIBE_ADMIN_TOKEN: TOKEN }, BASE, request, out),
    ).resolves.toBe(1);
    expect(lines.join('\n')).not.toContain(TOKEN);
  });
});
