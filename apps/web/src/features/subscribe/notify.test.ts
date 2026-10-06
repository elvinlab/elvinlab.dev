import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createFakePorts, FAKE_CLOCK } from './fakes.ts';
import { type NotifyPorts, type NotifyRequest, notifySubscribers } from './notify.ts';
import { confirmSubscription, subscribe } from './subscribe.ts';

const TOKEN = 'admin-token-'.padEnd(48, 'x');
const IP = '192.0.2.1';
const NOTE_ES = {
  slug: 'una-nota',
  title: 'Una nota',
  summary: 'Sobre algo',
  url: 'https://site.test/notes/una-nota/',
  locale: 'es' as const,
};
const NOTE_EN = {
  slug: 'a-note',
  title: 'A note',
  summary: 'About something',
  url: 'https://site.test/en/notes/a-note/',
  locale: 'en' as const,
};

const request = (change: Partial<NotifyRequest> = {}): NotifyRequest => ({
  authorization: `Bearer ${TOKEN}`,
  contentType: 'application/json',
  ip: IP,
  body: JSON.stringify({ slug: 'una-nota' }),
  ...change,
});

async function setup(count = 0, locale: 'es' | 'en' = 'es') {
  const fixture = createFakePorts();
  for (let index = 0; index < count; index += 1) {
    const email = [`reader${index}`, 'example.test'].join('@');
    await subscribe(
      {
        email,
        locale,
        website: '',
        startedAt: FAKE_CLOCK.time - 10_000,
        token: 'turnstile-token',
      },
      IP,
      fixture.ports,
    );
    await confirmSubscription(`token${index + 1}`, fixture.ports);
  }
  const notes = new Map([NOTE_ES, NOTE_EN].map((note) => [note.slug, note]));
  const findNote = vi.fn(async (slug: string) => notes.get(slug) ?? null);
  const ports: NotifyPorts = { ...fixture.ports, adminToken: TOKEN, findNote };
  return { ...fixture, ports, findNote };
}

let utcToday: string;
beforeEach(() => {
  utcToday = new Date(FAKE_CLOCK.time).toISOString().slice(0, 10);
});

describe('notifySubscribers authentication', () => {
  it.each([
    ['a missing header', null],
    ['an empty header', ''],
    ['a different scheme', `Basic ${TOKEN}`],
    ['a wrong token', 'Bearer wrong-token'],
    ['a token that only starts like the real one', `Bearer ${TOKEN.slice(0, -1)}`],
    ['a token with a suffix', `Bearer ${TOKEN}x`],
    ['a malformed header', `Bearer  ${TOKEN} extra`],
  ])('answers a bare 401 for %s and logs only the stage', async (_label, authorization) => {
    const { ports, reports, batches, findNote } = await setup(1);
    const result = await notifySubscribers(request({ authorization }), ports);
    expect(result).toEqual({ status: 401 });
    expect(reports).toEqual(['notify_auth']);
    expect(findNote).not.toHaveBeenCalled();
    expect(batches).toHaveLength(0);
  });

  it('checks the rate limiter before the token, so a right and a wrong token alike are throttled', async () => {
    const allow = vi.fn(async () => false);
    const { ports, reports, findNote } = await setup(1);
    for (const authorization of ['Bearer wrong', `Bearer ${TOKEN}`])
      await expect(
        notifySubscribers(request({ authorization }), { ...ports, limiter: { allow } }),
      ).resolves.toEqual({ status: 429 });
    expect(allow).toHaveBeenCalledWith(IP);
    expect(reports).toEqual(['notify_rate_limit', 'notify_rate_limit']);
    expect(findNote).not.toHaveBeenCalled();
  });

  it('keys the limiter by a placeholder when the address is unknown', async () => {
    const allow = vi.fn(async () => true);
    const { ports } = await setup(0);
    await notifySubscribers(request({ ip: undefined }), { ...ports, limiter: { allow } });
    expect(allow).toHaveBeenCalledWith('unknown');
  });

  it('answers 503 when the owner token is not configured', async () => {
    const { ports } = await setup(1);
    await expect(notifySubscribers(request(), { ...ports, adminToken: '' })).resolves.toEqual({
      status: 503,
    });
  });
});

describe('notifySubscribers input', () => {
  it('requires a JSON content type', async () => {
    const { ports } = await setup(1);
    for (const contentType of [null, 'text/plain', 'application/x-www-form-urlencoded'])
      await expect(notifySubscribers(request({ contentType }), ports)).resolves.toMatchObject({
        status: 415,
      });
    await expect(
      notifySubscribers(request({ contentType: 'application/json; charset=utf-8' }), ports),
    ).resolves.toMatchObject({ status: 200 });
  });

  it.each([
    ['malformed JSON', '{'],
    ['a non-object', '[]'],
    ['no slug', '{}'],
    ['a bad slug', '{"slug":"Bad Slug"}'],
    ['an extra key', '{"slug":"una-nota","title":"Free text"}'],
    ['a non-boolean dryRun', '{"slug":"una-nota","dryRun":"yes"}'],
  ])('answers 400 for %s', async (_label, body) => {
    const { ports, batches } = await setup(1);
    await expect(notifySubscribers(request({ body }), ports)).resolves.toMatchObject({
      status: 400,
    });
    expect(batches).toHaveLength(0);
  });

  it('answers 413 for an oversized body', async () => {
    const { ports } = await setup(1);
    const body = JSON.stringify({ slug: 'una-nota', pad: 'x'.repeat(10_000) });
    await expect(notifySubscribers(request({ body }), ports)).resolves.toMatchObject({
      status: 413,
    });
  });

  it('answers 404 for an unknown or draft slug, after authentication', async () => {
    const { ports, batches } = await setup(1);
    const body = JSON.stringify({ slug: 'no-such-note' });
    await expect(notifySubscribers(request({ body }), ports)).resolves.toMatchObject({
      status: 404,
    });
    await expect(
      notifySubscribers(request({ body, authorization: 'Bearer nope' }), ports),
    ).resolves.toEqual({ status: 401 });
    expect(batches).toHaveLength(0);
  });
});

describe('notifySubscribers dry run', () => {
  it('returns counts and makes no mailer call and no last_note write', async () => {
    const { ports, rows, batches, reports } = await setup(3);
    const body = JSON.stringify({ slug: 'una-nota', dryRun: true });
    const result = await notifySubscribers(request({ body }), ports);
    expect(result).toEqual({
      status: 200,
      body: { recipients: 3, wouldSend: 3, remainingPool: 97 },
    });
    expect(batches).toHaveLength(0);
    expect([...rows.values()].every((row) => row.lastNote === null)).toBe(true);
    expect(reports).toEqual([]);
  });

  it('subtracts the confirmations of today from the shared pool', async () => {
    const { ports, days } = await setup(5);
    days.set(utcToday, 98);
    const body = JSON.stringify({ slug: 'una-nota', dryRun: true });
    await expect(notifySubscribers(request({ body }), ports)).resolves.toEqual({
      status: 200,
      body: { recipients: 5, wouldSend: 2, remainingPool: 2 },
    });
  });

  it('counts only subscribers of the note language', async () => {
    const { ports } = await setup(2, 'en');
    const dry = (slug: string) =>
      notifySubscribers(request({ body: JSON.stringify({ slug, dryRun: true }) }), ports);
    await expect(dry('una-nota')).resolves.toMatchObject({ body: { recipients: 0 } });
    await expect(dry('a-note')).resolves.toMatchObject({ body: { recipients: 2 } });
  });
});

describe('notifySubscribers real send', () => {
  it('sends, marks last_note and returns counts only', async () => {
    const { ports, rows, batches } = await setup(2);
    const result = await notifySubscribers(request(), ports);
    expect(result).toEqual({ status: 200, body: { sent: 2, remaining: 0, failed: false } });
    expect(batches[0]?.messages[0]).toMatchObject({ title: 'Una nota', url: NOTE_ES.url });
    expect([...rows.values()].every((row) => row.lastNote === 'una-nota')).toBe(true);
  });

  it('never sends an English note to a Spanish subscriber, nor the reverse', async () => {
    const { ports, batches } = await setup(2, 'es');
    const body = JSON.stringify({ slug: 'a-note' });
    await expect(notifySubscribers(request({ body }), ports)).resolves.toEqual({
      status: 200,
      body: { sent: 0, remaining: 0, failed: false },
    });
    expect(batches).toHaveLength(0);
  });

  it('respects the shared pool and reports what remains', async () => {
    const { ports, days, batches } = await setup(5);
    days.set(utcToday, 97);
    await expect(notifySubscribers(request(), ports)).resolves.toEqual({
      status: 200,
      body: { sent: 3, remaining: 2, failed: false },
    });
    expect(batches[0]?.messages).toHaveLength(3);
  });

  it('answers 502 with counts when the provider fails and keeps last_note unwritten', async () => {
    const { ports, rows, state } = await setup(2);
    state.failNext = true;
    await expect(notifySubscribers(request(), ports)).resolves.toEqual({
      status: 502,
      body: { sent: 0, remaining: 2, failed: true },
    });
    expect([...rows.values()].every((row) => row.lastNote === null)).toBe(true);
  });

  it('answers 503 when the store fails, without any detail', async () => {
    const { ports, reports } = await setup(1);
    const broken = {
      ...ports.repository,
      listUnnotified: async () => {
        throw new Error('d1 down for reader0@example.test');
      },
    };
    const result = await notifySubscribers(request(), { ...ports, repository: broken });
    expect(result).toEqual({ status: 503 });
    expect(reports).toEqual(['notify_unavailable']);
  });

  it('never puts an address or a token in a response or a report line', async () => {
    const { ports, reports, state } = await setup(2);
    const results = [
      await notifySubscribers(
        request({ body: JSON.stringify({ slug: 'una-nota', dryRun: true }) }),
        ports,
      ),
      await notifySubscribers(request({ authorization: 'Bearer wrong' }), ports),
    ];
    state.failNext = true;
    results.push(await notifySubscribers(request(), ports));
    results.push(await notifySubscribers(request(), ports));
    const text = JSON.stringify({ results, reports });
    expect(text).not.toContain('example.test');
    expect(text).not.toContain(TOKEN);
    expect(text).not.toContain('wrong');
    expect(text).not.toContain('sig-');
  });
});
