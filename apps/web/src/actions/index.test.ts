import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ env: {} as Record<string, unknown> }));
vi.mock('cloudflare:workers', () => ({ env: mocks.env }));
vi.mock('astro:content', () => ({
  getCollection: async () => [{ id: 'first-note' }, { id: 'second-note' }],
}));
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

type Handler = (input: unknown, context: { request: Request }) => Promise<unknown>;
const marks = server.marks as unknown as { get: { handler: Handler }; leave: { handler: Handler } };

const request = (origin: string | null = 'https://example.test') => {
  const headers = new Headers({ 'CF-Connecting-IP': '192.0.2.1' });
  if (origin) headers.set('Origin', origin);
  return new Request('https://example.test/_actions/marks', { method: 'POST', headers });
};

function configure(options: { success?: boolean; row?: unknown } = {}) {
  const { success = true, row = { total: 8 } } = options;
  const first = vi.fn(async () => row);
  mocks.env['SITE_DB'] = { prepare: () => ({ bind: () => ({ first }) }) };
  mocks.env['MARKS_RATE_LIMITER'] = { limit: async () => ({ success }) };
  return first;
}

describe('marks Actions boundary', () => {
  afterEach(() => {
    delete mocks.env['SITE_DB'];
    delete mocks.env['MARKS_RATE_LIMITER'];
  });

  it.each([
    ['get', marks.get],
    ['leave', marks.leave],
  ])('%s rejects a foreign Origin before touching the store', async (_name, action) => {
    const first = configure();
    await expect(
      action.handler({ slug: 'first-note', by: 1 }, { request: request('https://attacker.test') }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      action.handler({ slug: 'first-note', by: 1 }, { request: request(null) }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(first).not.toHaveBeenCalled();
  });

  it.each([
    ['get', marks.get],
    ['leave', marks.leave],
  ])('%s is SERVICE_UNAVAILABLE when unconfigured', async (_name, action) => {
    await expect(
      action.handler({ slug: 'first-note', by: 1 }, { request: request() }),
    ).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
  });

  it('get returns the total', async () => {
    configure();
    await expect(
      marks.get.handler({ slug: 'first-note' }, { request: request() }),
    ).resolves.toEqual({ total: 8 });
  });

  it('leave returns the new total', async () => {
    configure({ row: { total: 11 } });
    await expect(
      marks.leave.handler({ slug: 'second-note', by: 3 }, { request: request() }),
    ).resolves.toEqual({ total: 11 });
  });

  it.each([
    ['get', marks.get, { slug: 'Bad Slug' }],
    ['get', marks.get, { slug: 'made-up' }],
    ['leave', marks.leave, { slug: 'first-note', by: 99 }],
    ['leave', marks.leave, { slug: 'made-up', by: 1 }],
  ])('%s maps invalid input or unknown notes to BAD_REQUEST', async (_name, action, input) => {
    configure();
    await expect(action.handler(input, { request: request() })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('leave maps a denied limiter to TOO_MANY_REQUESTS', async () => {
    configure({ success: false });
    await expect(
      marks.leave.handler({ slug: 'first-note', by: 1 }, { request: request() }),
    ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  });

  it.each([
    ['get', marks.get],
    ['leave', marks.leave],
  ])('%s maps a store failure to SERVICE_UNAVAILABLE without details', async (name, action) => {
    configure({ row: { total: 'broken' } });
    const input = name === 'get' ? { slug: 'first-note' } : { slug: 'first-note', by: 1 };
    const error = await action
      .handler(input, { request: request() })
      .catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
    expect(String((error as Error).message)).not.toMatch(/total|zod|broken/i);
  });
});
