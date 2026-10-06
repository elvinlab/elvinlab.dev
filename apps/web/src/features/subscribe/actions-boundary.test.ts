import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  features: { blog: true, subscribe: true },
  subscribe: vi.fn(),
  confirm: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock('cloudflare:workers', () => ({ env: {} }));
vi.mock('astro:content', () => ({ getCollection: async () => [] }));
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
vi.mock('@/shared/config/index.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/shared/config/index.ts')>();
  return {
    ...original,
    site: {
      ...original.site,
      url: 'https://site.test',
      get features() {
        return mocks.features;
      },
    },
  };
});
vi.mock('@/features/subscribe/index.ts', () => ({
  submitConfiguredSubscribe: mocks.subscribe,
  confirmConfiguredSubscription: mocks.confirm,
  unsubscribeConfigured: mocks.unsubscribe,
}));

import { server } from '@/actions/index.ts';

type Handler = (input: unknown, context: { request: Request }) => Promise<unknown>;
const actions = server.subscribe as unknown as Record<
  'request' | 'confirm' | 'unsubscribe',
  { handler: Handler }
>;
const request = (origin: string | null = 'https://example.test') => {
  const headers = new Headers({ 'CF-Connecting-IP': '192.0.2.1' });
  if (origin) headers.set('Origin', origin);
  return new Request('https://example.test/_actions/subscribe', { method: 'POST', headers });
};
const all = [
  ['request', { email: 'a@b.test' }],
  ['confirm', { token: 'secret-token' }],
  ['unsubscribe', { token: 'secret-token' }],
] as const;

afterEach(() => {
  vi.resetAllMocks();
  mocks.features = { blog: true, subscribe: true };
});

describe('subscribe Actions boundary', () => {
  it.each(all)('%s rejects a missing or foreign Origin before any work', async (name, input) => {
    for (const origin of [null, 'https://attacker.test']) {
      await expect(
        actions[name].handler(input, { request: request(origin) }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
    expect(mocks.subscribe).not.toHaveBeenCalled();
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.unsubscribe).not.toHaveBeenCalled();
  });

  it.each(all)('%s is unavailable while the flag or the blog is off', async (name, input) => {
    for (const features of [
      { blog: true, subscribe: false },
      { blog: false, subscribe: true },
    ]) {
      mocks.features = features;
      await expect(actions[name].handler(input, { request: request() })).rejects.toMatchObject({
        code: 'SERVICE_UNAVAILABLE',
      });
    }
    expect(mocks.subscribe).not.toHaveBeenCalled();
  });

  it.each(all)(
    '%s maps an unavailable runtime or a store failure to SERVICE_UNAVAILABLE',
    async (name, input) => {
      mocks.subscribe.mockResolvedValueOnce(null);
      mocks.confirm.mockResolvedValueOnce(null);
      mocks.unsubscribe.mockResolvedValueOnce(null);
      await expect(actions[name].handler(input, { request: request() })).rejects.toMatchObject({
        code: 'SERVICE_UNAVAILABLE',
      });
      mocks.subscribe.mockRejectedValueOnce(new Error('d1 down: a@b.test'));
      mocks.confirm.mockRejectedValueOnce(new Error('d1 down: secret-token'));
      mocks.unsubscribe.mockRejectedValueOnce(new Error('d1 down: secret-token'));
      const error = await actions[name]
        .handler(input, { request: request() })
        .catch((caught: unknown) => caught);
      expect(error).toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
      expect(String((error as Error).message)).not.toMatch(/d1|a@b|secret/);
    },
  );

  it('request maps a rejection to BAD_REQUEST with one fixed message', async () => {
    mocks.subscribe.mockResolvedValueOnce({ ok: false, error: 'x' });
    const error = await actions.request
      .handler({ email: 'a@b.test' }, { request: request() })
      .catch((caught: unknown) => caught);
    expect(error).toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Unable to subscribe. Please try again later.',
    });
  });

  it('request passes the client IP and answers a generic success', async () => {
    mocks.subscribe.mockResolvedValueOnce({ ok: true });
    await expect(
      actions.request.handler({ email: 'a@b.test' }, { request: request() }),
    ).resolves.toEqual({ ok: true });
    expect(mocks.subscribe).toHaveBeenCalledWith(
      { email: 'a@b.test' },
      '192.0.2.1',
      expect.anything(),
      {
        url: 'https://site.test',
        name: expect.any(String),
        ownerName: expect.any(String),
      },
    );
  });

  it('request maps the daily cap to a fixed TOO_MANY_REQUESTS error', async () => {
    mocks.subscribe.mockResolvedValueOnce({ ok: false, error: 'daily_cap' });
    await expect(
      actions.request.handler({ email: 'a@b.test' }, { request: request() }),
    ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  });

  it('confirm and unsubscribe return their result strings as data, not errors', async () => {
    mocks.confirm.mockResolvedValueOnce('invalid_or_expired');
    mocks.unsubscribe.mockResolvedValueOnce('unsubscribed');
    await expect(actions.confirm.handler({ token: 't' }, { request: request() })).resolves.toEqual({
      result: 'invalid_or_expired',
    });
    await expect(
      actions.unsubscribe.handler({ token: 't' }, { request: request() }),
    ).resolves.toEqual({ result: 'unsubscribed' });
    expect(mocks.confirm).toHaveBeenCalledWith('t', expect.anything());
  });
});
