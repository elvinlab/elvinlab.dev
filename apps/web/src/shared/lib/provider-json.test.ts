import { describe, expect, it, vi } from 'vitest';

import { PROVIDER_RESPONSE_MAX_BYTES, readProviderJson } from './provider-json.ts';

const signal = () => new AbortController().signal;

describe('bounded provider JSON', () => {
  it('reads valid JSON across split UTF-8 chunks', async () => {
    const encoded = new TextEncoder().encode('{"value":"ñ"}');
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoded.slice(0, 11));
          controller.enqueue(encoded.slice(11));
          controller.close();
        },
      }),
    );
    expect(await readProviderJson(response, signal())).toEqual({ value: 'ñ' });
  });

  it('cancels without reading unsuccessful responses', async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }), { status: 500 });
    await expect(readProviderJson(response, signal())).rejects.toThrow();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('cancels when accumulated bytes exceed the cap, regardless of content-length', async () => {
    const cancel = vi.fn();
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(PROVIDER_RESPONSE_MAX_BYTES));
          controller.enqueue(new Uint8Array(1));
        },
        cancel,
      }),
      { headers: { 'Content-Length': '1' } },
    );
    await expect(readProviderJson(response, signal())).rejects.toThrow();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('cancels a stalled body when the request signal aborts', async () => {
    const controller = new AbortController();
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }));
    const pending = readProviderJson(response, controller.signal);
    const rejected = expect(pending).rejects.toThrow();
    controller.abort(new DOMException('Timed out', 'TimeoutError'));
    await rejected;
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('rejects an already-aborted response before parsing', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      readProviderJson(Response.json({ ok: true }), controller.signal),
    ).rejects.toThrow();
  });

  it('rejects read failures', async () => {
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.error(new Error('read failure'));
        },
      }),
    );
    await expect(readProviderJson(response, signal())).rejects.toThrow();
  });
});
