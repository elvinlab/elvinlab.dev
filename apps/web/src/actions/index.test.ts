import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({ env: {} }));
vi.mock('astro:actions', () => ({
  defineAction: (definition: unknown) => definition,
  ActionError: class extends Error {
    code: string;
    constructor({ code, message }: { code: string; message: string }) {
      super(message);
      this.code = code;
    }
  },
}));

import { server } from './index.ts';

const handler = (
  server.contact as unknown as {
    handler: (input: unknown, context: { request: Request }) => Promise<unknown>;
  }
).handler;
afterEach(() => vi.unstubAllGlobals());

describe('contact Action boundary', () => {
  it.each([null, 'https://attacker.test'])(
    'rejects missing or foreign Origin %s before any fetch',
    async (origin) => {
      const fetch = vi.fn();
      vi.stubGlobal('fetch', fetch);
      const headers = new Headers({ 'Content-Type': 'application/json' });
      if (origin) headers.set('Origin', origin);
      await expect(
        handler(
          {},
          {
            request: new Request('https://example.test/_actions/contact', {
              method: 'POST',
              headers,
            }),
          },
        ),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('fails closed on missing runtime configuration', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(
      handler(
        {},
        {
          request: new Request('https://example.test/_actions/contact', {
            method: 'POST',
            headers: { Origin: 'https://example.test', 'CF-Connecting-IP': '192.0.2.1' },
          }),
        },
      ),
    ).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
