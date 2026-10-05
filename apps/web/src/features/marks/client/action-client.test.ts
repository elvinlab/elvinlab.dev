import { describe, expect, it, vi } from 'vitest';

import { createActionClient } from './action-client.ts';

const reply = (status: number, body: string) => async () => new Response(body, { status });

describe('createActionClient', () => {
  it('posts JSON to the action path and reads the devalue total', async () => {
    const request = vi.fn(reply(200, '[{"total":1},25]'));
    const client = createActionClient(request);
    expect(await client.leave({ slug: 'a-note', by: 7 })).toEqual({
      data: { total: 25 },
      error: undefined,
    });
    expect(request).toHaveBeenCalledWith('/_actions/marks.leave/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: '{"slug":"a-note","by":7}',
    });
  });

  it('reads a zero total', async () => {
    const client = createActionClient(reply(200, '[{"total":1},0]'));
    expect((await client.get({ slug: 'a-note' })).data).toEqual({ total: 0 });
  });

  it.each([
    [503, 'SERVICE_UNAVAILABLE'],
    [429, 'TOO_MANY_REQUESTS'],
    [400, 'BAD_REQUEST'],
  ])('maps the error body of a %i to its code', async (status, code) => {
    const client = createActionClient(
      reply(status, JSON.stringify({ type: 'AstroActionError', code })),
    );
    expect((await client.get({ slug: 'a-note' })).error).toEqual({ code });
  });

  it.each([
    [200, 'not json'],
    [200, '[{"total":1},"x"]'],
    [500, '<html>'],
  ])('treats an unreadable %i body as an unknown failure', async (status, body) => {
    const client = createActionClient(reply(status, body));
    expect((await client.get({ slug: 'a-note' })).error).toEqual({ code: 'UNKNOWN' });
  });
});
