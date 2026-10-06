import { beforeEach, describe, expect, it } from 'vitest';

import { SUBSCRIBE_POLICY } from './config.ts';
import { createFakePorts, createOutboxMailer, FAKE_CLOCK } from './fakes.ts';
import {
  confirmSubscription,
  createUnsubscribeToken,
  sendNote,
  subscribe,
  unsubscribe,
} from './subscribe.ts';

const IP = '192.0.2.1';
const EMAIL = ['reader', 'example.test'].join('@');
const START = 1_000_000_000;

const input = (change: Record<string, unknown> = {}) => ({
  email: EMAIL,
  locale: 'es',
  website: '',
  startedAt: FAKE_CLOCK.time - 10_000,
  token: 'turnstile-token',
  ...change,
});

beforeEach(() => {
  FAKE_CLOCK.time = START;
});

describe('subscribe', () => {
  it('stores a pending row and mails the confirmation link', async () => {
    const { ports, rows, confirmations } = createFakePorts();
    await expect(
      subscribe(input({ email: `  ${EMAIL.toUpperCase()} ` }), IP, ports),
    ).resolves.toEqual({
      ok: true,
    });
    const [row] = [...rows.values()];
    expect(rows.size).toBe(1);
    expect(row).toMatchObject({
      email: EMAIL,
      status: 'pending',
      locale: 'es',
      confirmHash: 'hash:token1',
      confirmExpires: START + SUBSCRIBE_POLICY.confirmExpiryMs,
    });
    expect(confirmations).toEqual([
      { to: EMAIL, locale: 'es', confirmUrl: 'https://site.test/es/confirm/?token=token1' },
    ]);
  });

  it('keeps only the hash of the token in the list', async () => {
    const { ports, rows } = createFakePorts();
    await subscribe(input(), IP, ports);
    expect(JSON.stringify([...rows.values()])).not.toContain('"token1"');
  });

  it('answers the same for a new and an existing address and never duplicates a row', async () => {
    const { ports, rows } = createFakePorts();
    const first = await subscribe(input(), IP, ports);
    FAKE_CLOCK.time += SUBSCRIBE_POLICY.resendCooldownMs + 1;
    const second = await subscribe(input(), IP, ports);
    expect(second).toEqual(first);
    expect(rows.size).toBe(1);
  });

  it('does not re-send to a pending address inside the cooldown, and does after it', async () => {
    const { ports, confirmations } = createFakePorts();
    await subscribe(input(), IP, ports);
    FAKE_CLOCK.time += SUBSCRIBE_POLICY.resendCooldownMs - 1;
    await subscribe(input(), IP, ports);
    expect(confirmations).toHaveLength(1);
    FAKE_CLOCK.time += 2;
    await subscribe(input(), IP, ports);
    expect(confirmations).toHaveLength(2);
    expect(confirmations[1]?.confirmUrl).toContain('token=token2');
  });

  it('leaves a confirmed address alone', async () => {
    const { ports, rows, confirmations } = createFakePorts();
    await subscribe(input(), IP, ports);
    await confirmSubscription('token1', ports);
    await expect(subscribe(input(), IP, ports)).resolves.toEqual({ ok: true });
    expect(confirmations).toHaveLength(1);
    expect([...rows.values()][0]?.status).toBe('confirmed');
  });

  it('moves an unsubscribed address back to pending with a fresh confirmation', async () => {
    const { ports, rows, confirmations } = createFakePorts();
    await subscribe(input(), IP, ports);
    await confirmSubscription('token1', ports);
    const id = [...rows.keys()][0] ?? '';
    await unsubscribe(await createUnsubscribeToken(id, ports), ports);
    await subscribe(input({ locale: 'en' }), IP, ports);
    expect(rows.get(id)).toMatchObject({ status: 'pending', locale: 'en' });
    expect(confirmations).toHaveLength(2);
    await expect(confirmSubscription('token2', ports)).resolves.toBe('confirmed');
  });

  it('purges pending rows older than seven days on each subscription', async () => {
    const { ports, rows } = createFakePorts();
    await subscribe(input({ email: ['old', 'example.test'].join('@') }), IP, ports);
    FAKE_CLOCK.time += SUBSCRIBE_POLICY.pendingPurgeMs + 1;
    await subscribe(input(), IP, ports);
    expect([...rows.values()].map((row) => row.email)).toEqual([EMAIL]);
  });

  it('rejects the honeypot, bad input and a missing address', async () => {
    const { ports, rows, reports } = createFakePorts();
    for (const bad of [
      input({ website: 'http://spam.test' }),
      input({ email: 'not-an-email' }),
      input({ locale: 'fr' }),
      input({ extra: 1 }),
      input({ email: `${'a'.repeat(250)}@example.test` }),
    ]) {
      expect((await subscribe(bad, IP, ports)).ok).toBe(false);
    }
    expect((await subscribe(input(), undefined, ports)).ok).toBe(false);
    expect(rows.size).toBe(0);
    expect(new Set(reports)).toEqual(new Set(['invalid_input']));
  });

  it('rejects a form filled faster than the minimum fill time', async () => {
    const { ports, rows, reports } = createFakePorts();
    const result = await subscribe(input({ startedAt: FAKE_CLOCK.time - 1_000 }), IP, ports);
    expect(result.ok).toBe(false);
    expect(reports).toEqual(['fill_time']);
    expect(rows.size).toBe(0);
  });

  it('rejects a rate limited client before any other work', async () => {
    let verified = false;
    const { ports, reports } = createFakePorts({
      limiter: { allow: async () => false },
      verifier: {
        verify: async () => {
          verified = true;
          return true;
        },
      },
    });
    expect((await subscribe(input(), IP, ports)).ok).toBe(false);
    expect(reports).toEqual(['rate_limit']);
    expect(verified).toBe(false);
  });

  it('rejects when Turnstile denies the token and touches nothing', async () => {
    const { ports, rows, confirmations, reports } = createFakePorts({
      verifier: { verify: async () => false },
    });
    expect((await subscribe(input(), IP, ports)).ok).toBe(false);
    expect(reports).toEqual(['turnstile']);
    expect(rows.size).toBe(0);
    expect(confirmations).toHaveLength(0);
  });

  it('fails with the generic error when the mail fails, and lets a retry send at once', async () => {
    const { ports, confirmations, reports, state } = createFakePorts();
    state.failNext = true;
    expect((await subscribe(input(), IP, ports)).ok).toBe(false);
    expect(reports).toEqual(['mail']);
    await expect(subscribe(input(), IP, ports)).resolves.toEqual({ ok: true });
    expect(confirmations).toHaveLength(1);
  });

  it('reports store failures by stage name only', async () => {
    const { ports, reports } = createFakePorts();
    ports.repository.findByEmail = async () => {
      throw new Error(`database said ${EMAIL}`);
    };
    expect((await subscribe(input(), IP, ports)).ok).toBe(false);
    expect(reports).toEqual(['store']);
  });

  it('never puts an address, token or hash in the report calls', async () => {
    const { ports, reports, state } = createFakePorts();
    await subscribe(input(), IP, ports);
    state.failNext = true;
    FAKE_CLOCK.time += SUBSCRIBE_POLICY.resendCooldownMs + 1;
    await subscribe(input(), IP, ports);
    await subscribe(input({ website: 'x' }), IP, ports);
    await subscribe(input({ startedAt: FAKE_CLOCK.time }), IP, ports);
    await confirmSubscription('token-unknown', ports);
    const text = reports.join('\n');
    expect(reports.length).toBeGreaterThan(0);
    for (const secret of [EMAIL, 'example.test', 'token', 'hash:', 'turnstile-token', IP])
      expect(text).not.toContain(secret);
    for (const line of reports) expect(line).toMatch(/^[a-z_]+$/);
  });
});

describe('global daily confirmation cap', () => {
  const CAP = SUBSCRIBE_POLICY.confirmationsDailyCap;
  const mail = (index: number) => [`cap${index}`, 'example.test'].join('@');
  const fill = async (ports: Parameters<typeof subscribe>[2], count: number) => {
    for (let index = 0; index < count; index += 1)
      await subscribe(input({ email: mail(index) }), IP, ports);
  };

  it('refuses the confirmation after the cap with a fixed code and no mail', async () => {
    const { ports, confirmations, reports, rows } = createFakePorts();
    await fill(ports, CAP);
    expect(confirmations).toHaveLength(CAP);
    const newAddress = await subscribe(input({ email: mail(999) }), IP, ports);
    const knownAddress = await subscribe(input({ email: mail(0) }), IP, ports);
    expect(newAddress).toEqual({ ok: false, error: 'daily_cap' });
    expect(knownAddress).toEqual(newAddress);
    expect(confirmations).toHaveLength(CAP);
    expect(rows.size).toBe(CAP);
    expect(reports).toEqual(['daily_cap', 'daily_cap']);
  });

  it('resets on the next UTC day', async () => {
    const { ports, confirmations } = createFakePorts();
    await fill(ports, CAP);
    FAKE_CLOCK.time = Date.UTC(2030, 0, 2, 0, 0, 1);
    // START is 1970-01-12; the cap day above is that date, so any later UTC date is a new day.
    await expect(subscribe(input({ email: mail(999) }), IP, ports)).resolves.toEqual({ ok: true });
    expect(confirmations).toHaveLength(CAP + 1);
  });

  it('counts cooldown resends and returning unsubscribed addresses, not confirmed ones', async () => {
    const { ports, days, confirmations } = createFakePorts();
    await subscribe(input(), IP, ports);
    expect([...days.values()]).toEqual([1]);
    await subscribe(input(), IP, ports); // inside cooldown: no mail, no quota
    expect([...days.values()]).toEqual([1]);
    FAKE_CLOCK.time += SUBSCRIBE_POLICY.resendCooldownMs + 1;
    await subscribe(input(), IP, ports); // resend
    expect([...days.values()]).toEqual([2]);
    await confirmSubscription('token2', ports);
    await subscribe(input(), IP, ports); // confirmed: nothing
    expect([...days.values()]).toEqual([2]);
    const id = (await ports.repository.findByEmail(EMAIL))?.id ?? '';
    const token = await createUnsubscribeToken(id, ports);
    await unsubscribe(token, ports);
    await subscribe(input(), IP, ports); // coming back
    expect([...days.values()]).toEqual([3]);
    expect(confirmations).toHaveLength(3);
  });

  it('consumes quota even when the send fails', async () => {
    const { ports, days, state } = createFakePorts();
    state.failNext = true;
    await subscribe(input(), IP, ports);
    expect([...days.values()]).toEqual([1]);
  });
});

describe('confirmSubscription', () => {
  it('confirms once and never again', async () => {
    const { ports, rows } = createFakePorts();
    await subscribe(input(), IP, ports);
    await expect(confirmSubscription('token1', ports)).resolves.toBe('confirmed');
    expect([...rows.values()][0]).toMatchObject({
      status: 'confirmed',
      confirmHash: null,
      confirmExpires: null,
    });
    await expect(confirmSubscription('token1', ports)).resolves.toBe('invalid_or_expired');
  });

  it('answers the same for unknown, empty, oversized and expired tokens', async () => {
    const { ports } = createFakePorts();
    await subscribe(input(), IP, ports);
    FAKE_CLOCK.time += SUBSCRIBE_POLICY.confirmExpiryMs;
    await expect(confirmSubscription('token1', ports)).resolves.toBe('invalid_or_expired');
    await expect(confirmSubscription('nope', ports)).resolves.toBe('invalid_or_expired');
    await expect(confirmSubscription('', ports)).resolves.toBe('invalid_or_expired');
    await expect(confirmSubscription('x'.repeat(5_000), ports)).resolves.toBe('invalid_or_expired');
    await expect(confirmSubscription(42, ports)).resolves.toBe('invalid_or_expired');
  });

  it('still confirms one millisecond before the expiry', async () => {
    const { ports } = createFakePorts();
    await subscribe(input(), IP, ports);
    FAKE_CLOCK.time += SUBSCRIBE_POLICY.confirmExpiryMs - 1;
    await expect(confirmSubscription('token1', ports)).resolves.toBe('confirmed');
  });

  it('does not confirm a row that unsubscribed meanwhile', async () => {
    const { ports, rows } = createFakePorts();
    await subscribe(input(), IP, ports);
    const id = [...rows.keys()][0] ?? '';
    await unsubscribe(await createUnsubscribeToken(id, ports), ports);
    await expect(confirmSubscription('token1', ports)).resolves.toBe('invalid_or_expired');
  });
});

describe('unsubscribe', () => {
  it('unsubscribes with a valid token and is idempotent', async () => {
    const { ports, rows } = createFakePorts();
    await subscribe(input(), IP, ports);
    await confirmSubscription('token1', ports);
    const token = await createUnsubscribeToken([...rows.keys()][0] ?? '', ports);
    await expect(unsubscribe(token, ports)).resolves.toBe('unsubscribed');
    await expect(unsubscribe(token, ports)).resolves.toBe('unsubscribed');
    expect([...rows.values()][0]?.status).toBe('unsubscribed');
  });

  it('rejects a bad signature, a malformed token and an unknown id', async () => {
    const { ports, rows } = createFakePorts();
    await subscribe(input(), IP, ports);
    const id = [...rows.keys()][0] ?? '';
    const stranger = await createUnsubscribeToken('f'.repeat(32), ports);
    for (const bad of [`${id}.forged`, id, '', '.', `${id}.`, 'zz.sig', stranger, 7])
      await expect(unsubscribe(bad, ports)).resolves.toBe('invalid');
    expect([...rows.values()][0]?.status).toBe('pending');
  });
});

describe('sendNote', () => {
  const note = {
    slug: 'a-note',
    title: 'A note',
    url: 'https://site.test/notes/a-note/',
    summary: 'About something',
    locale: 'es' as const,
  };

  async function withConfirmed(count: number) {
    const fixture = createFakePorts();
    for (let index = 0; index < count; index += 1) {
      const email = [`reader${index}`, 'example.test'].join('@');
      await subscribe(input({ email }), IP, fixture.ports);
      await confirmSubscription(`token${index + 1}`, fixture.ports);
    }
    return fixture;
  }

  it('sends to confirmed subscribers only, each with its own unsubscribe link', async () => {
    const { ports, rows, batches } = await withConfirmed(2);
    await subscribe(input({ email: ['pending', 'example.test'].join('@') }), IP, ports);
    const result = await sendNote(note, ports);
    expect(result).toEqual({ sent: 2, remaining: 0, failed: false });
    const [batch] = batches;
    expect(batch?.messages).toHaveLength(2);
    const ids = [...rows.values()].filter((row) => row.status === 'confirmed').map((row) => row.id);
    expect(batch?.messages.map((message) => message.unsubscribeUrl).sort()).toEqual(
      ids.map((id) => `https://site.test/es/unsubscribe/?token=${id}.sig-${id}`).sort(),
    );
    expect(batch?.messages[0]).toMatchObject({
      title: 'A note',
      url: note.url,
      summary: note.summary,
    });
    expect(batch?.key).toBe(`note:a-note:${[...ids].sort()[0]}`);
  });

  it('sends a note only to the confirmed subscribers of its language', async () => {
    const { ports, batches } = await withConfirmed(2);
    await subscribe(
      input({ email: ['lector', 'example.test'].join('@'), locale: 'en' }),
      IP,
      ports,
    );
    await confirmSubscription('token3', ports);
    await expect(sendNote(note, ports)).resolves.toEqual({ sent: 2, remaining: 0, failed: false });
    expect(batches[0]?.messages.map((message) => message.locale)).toEqual(['es', 'es']);
    await expect(sendNote({ ...note, locale: 'en' }, ports)).resolves.toEqual({
      sent: 1,
      remaining: 0,
      failed: false,
    });
    expect(batches[1]?.messages.map((message) => message.locale)).toEqual(['en']);
  });

  it('marks last_note only after the mailer succeeded', async () => {
    const { ports, rows, state } = await withConfirmed(2);
    state.failNext = true;
    await expect(sendNote(note, ports)).resolves.toEqual({ sent: 0, remaining: 2, failed: true });
    expect([...rows.values()].every((row) => row.lastNote === null)).toBe(true);
    await expect(sendNote(note, ports)).resolves.toEqual({ sent: 2, remaining: 0, failed: false });
    expect([...rows.values()].every((row) => row.lastNote === 'a-note')).toBe(true);
  });

  it('splits into batches of at most 100 and respects the daily cap, then resumes', async () => {
    const { ports, batches } = await withConfirmed(7);
    const first = await sendNote(note, ports, { dailyCap: 5, batchSize: 2 });
    expect(first).toEqual({ sent: 5, remaining: 2, failed: false });
    expect(batches.map((batch) => batch.messages.length)).toEqual([2, 2, 1]);
    const second = await sendNote(note, ports, { dailyCap: 5, batchSize: 2 });
    expect(second).toEqual({ sent: 2, remaining: 0, failed: false });
    const recipients = batches.flatMap((batch) => batch.messages.map((message) => message.to));
    expect(new Set(recipients).size).toBe(7);
    expect(recipients).toHaveLength(7);
  });

  it('sends only what is left of the shared provider pool', async () => {
    const { ports, days } = await withConfirmed(3);
    const today = new Date(START).toISOString().slice(0, 10);
    expect(SUBSCRIBE_POLICY.providerDailyTotal - SUBSCRIBE_POLICY.confirmationsDailyCap).toBe(70);
    days.set(today, SUBSCRIBE_POLICY.providerDailyTotal - 2);
    await expect(sendNote(note, ports)).resolves.toEqual({ sent: 2, remaining: 1, failed: false });
  });

  it('is a no-op once the provider pool is used up', async () => {
    const { ports, batches, days } = await withConfirmed(2);
    days.set(new Date(START).toISOString().slice(0, 10), SUBSCRIBE_POLICY.providerDailyTotal);
    await expect(sendNote(note, ports)).resolves.toEqual({ sent: 0, remaining: 2, failed: false });
    expect(batches).toHaveLength(0);
  });

  it('never sends a second time to someone who already got the note', async () => {
    const { ports, batches } = await withConfirmed(3);
    await sendNote(note, ports);
    await expect(sendNote(note, ports)).resolves.toEqual({ sent: 0, remaining: 0, failed: false });
    expect(batches).toHaveLength(1);
  });

  it('caps batches at the provider limit by default', async () => {
    expect(SUBSCRIBE_POLICY.batchSize).toBe(100);
    expect(SUBSCRIBE_POLICY.dailyCap).toBe(100);
  });

  it('skips unsubscribed subscribers', async () => {
    const { ports, rows, batches } = await withConfirmed(2);
    const gone = [...rows.keys()][0] ?? '';
    await unsubscribe(await createUnsubscribeToken(gone, ports), ports);
    await sendNote(note, ports);
    expect(batches[0]?.messages).toHaveLength(1);
  });

  it('rejects an invalid note before sending anything', async () => {
    const { ports, batches } = await withConfirmed(1);
    await expect(sendNote({ ...note, slug: 'Bad Slug' }, ports)).rejects.toThrow();
    await expect(sendNote({ ...note, url: 'javascript:alert(1)' }, ports)).rejects.toThrow();
    expect(batches).toHaveLength(0);
  });

  it('reports a failed batch by name only', async () => {
    const { ports, reports, state } = await withConfirmed(1);
    state.failNext = true;
    await sendNote(note, ports);
    expect(reports).toEqual(['mail']);
  });
});

describe('the mail provider is behind a port', () => {
  it('swapping the mail adapter needs no change to the domain', async () => {
    const { mailer, outbox } = createOutboxMailer();
    const { ports, rows } = createFakePorts({ mailer });
    await subscribe(input(), IP, ports);
    expect(outbox).toEqual([`confirm|${EMAIL}|https://site.test/es/confirm/?token=token1`]);
    await expect(confirmSubscription('token1', ports)).resolves.toBe('confirmed');
    const result = await sendNote(
      {
        slug: 'a-note',
        title: 'A note',
        url: 'https://site.test/notes/a-note/',
        locale: 'es',
      },
      ports,
    );
    expect(result).toEqual({ sent: 1, remaining: 0, failed: false });
    const id = [...rows.keys()][0] ?? '';
    expect(outbox[1]).toBe(
      `note|${EMAIL}|https://site.test/es/unsubscribe/?token=${id}.sig-${id}|note:a-note:${id}`,
    );
    await expect(unsubscribe(await createUnsubscribeToken(id, ports), ports)).resolves.toBe(
      'unsubscribed',
    );
  });
});
