import { describe, expect, it, vi } from 'vitest';

import { callSubscribeAction } from './action-client.ts';

const respond = (body: string, status = 200) => vi.fn(async () => new Response(body, { status }));

describe('callSubscribeAction', () => {
  it('posts JSON to the Action path and reads the devalue body', async () => {
    const request = respond('[{"result":1},"confirmed"]');
    await expect(callSubscribeAction('confirm', { token: 't' }, request)).resolves.toEqual({
      ok: true,
      data: { result: 'confirmed' },
    });
    expect(request).toHaveBeenCalledWith(
      '/_actions/subscribe.confirm/',
      expect.objectContaining({ method: 'POST', body: '{"token":"t"}' }),
    );
  });

  it('reads a boolean field', async () => {
    await expect(callSubscribeAction('request', {}, respond('[{"ok":1},true]'))).resolves.toEqual({
      ok: true,
      data: { ok: true },
    });
  });

  it('maps an error body to its code', async () => {
    await expect(
      callSubscribeAction('request', {}, respond('{"code":"SERVICE_UNAVAILABLE"}', 503)),
    ).resolves.toEqual({ ok: false, code: 'SERVICE_UNAVAILABLE' });
  });

  it.each([
    ['an unreadable success body', respond('nope')],
    ['an unreadable error body', respond('<html>', 502)],
    ['a network failure', vi.fn(async () => Promise.reject(new Error('offline')))],
  ])('treats %s as an unknown failure', async (_name, request) => {
    await expect(callSubscribeAction('request', {}, request)).resolves.toEqual({
      ok: false,
      code: 'UNKNOWN',
    });
  });
});
