import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import { beforeEach, describe, expect, it } from 'vitest';

import type { NewPendingSubscriber, SubscriberRepository } from '@/features/subscribe/ports.ts';

import { createD1SubscribeQuota, createD1SubscriberRepository, type D1Like } from './d1.ts';
import { asD1 } from './sqlite-d1.ts';

// The real migration files, applied in order, exactly as `wrangler d1 migrations apply` does.
const migrationFile = (name: string) =>
  readFileSync(new URL(`../../../../migrations/${name}`, import.meta.url), 'utf8');
const migrations = ['0002_subscribers.sql', '0003_subscriber_notes.sql'].map(migrationFile);

const row = (id: string, change: Partial<NewPendingSubscriber> = {}): NewPendingSubscriber => ({
  id,
  email: `${id}@example.test`,
  locale: 'es',
  confirmHash: `hash-${id}`,
  confirmExpires: 5_000,
  confirmSentAt: 1_000,
  createdAt: 1_000,
  ...change,
});

let sqlite: DatabaseSync;
let repo: SubscriberRepository;
let statements: string[];
beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  // D1 enforces foreign keys; node:sqlite enables them by default, stated here so it never silently differs.
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const migration of migrations) sqlite.exec(migration);
  statements = [];
  repo = createD1SubscriberRepository(asD1(sqlite, statements));
});

const confirm = async (id: string) => {
  await repo.insertPending(row(id));
  await repo.confirmByHash(`hash-${id}`, 2_000);
};

describe('D1 subscriber repository', () => {
  it('inserts a pending row and finds it by email and id', async () => {
    await expect(repo.insertPending(row('a'))).resolves.toBe(true);
    const expected = {
      id: 'a',
      email: 'a@example.test',
      status: 'pending',
      locale: 'es',
      confirmSentAt: 1_000,
      lastNote: null,
    };
    await expect(repo.findByEmail('a@example.test')).resolves.toEqual(expected);
    await expect(repo.findById('a')).resolves.toEqual(expected);
    await expect(repo.findById('missing')).resolves.toBeNull();
  });

  it('refuses a duplicate address without touching the original row', async () => {
    await repo.insertPending(row('a'));
    await expect(repo.insertPending(row('b', { email: 'a@example.test' }))).resolves.toBe(false);
    await expect(repo.findById('b')).resolves.toBeNull();
  });

  it('confirms once, only before the expiry, and clears the hash', async () => {
    await repo.insertPending(row('a'));
    await expect(repo.confirmByHash('hash-a', 5_000)).resolves.toBe(false);
    await expect(repo.confirmByHash('nope', 2_000)).resolves.toBe(false);
    await expect(repo.confirmByHash('hash-a', 2_000)).resolves.toBe(true);
    await expect(repo.confirmByHash('hash-a', 2_000)).resolves.toBe(false);
    await expect(repo.findById('a')).resolves.toMatchObject({ status: 'confirmed' });
    expect(
      sqlite.prepare('SELECT confirm_hash, confirm_expires, confirmed_at FROM subscribers').get(),
    ).toEqual({
      confirm_hash: null,
      confirm_expires: null,
      confirmed_at: 2_000,
    });
  });

  it('renews a pending or unsubscribed row and leaves a confirmed one alone', async () => {
    await repo.insertPending(row('a'));
    await repo.renewConfirmation('a', {
      locale: 'en',
      confirmHash: 'new',
      confirmExpires: 9_000,
      confirmSentAt: 3_000,
    });
    await expect(repo.findById('a')).resolves.toMatchObject({ locale: 'en', confirmSentAt: 3_000 });
    await expect(repo.confirmByHash('hash-a', 2_000)).resolves.toBe(false);
    await expect(repo.confirmByHash('new', 4_000)).resolves.toBe(true);
    await repo.renewConfirmation('a', {
      locale: 'es',
      confirmHash: 'other',
      confirmExpires: 9_000,
      confirmSentAt: 4_000,
    });
    await expect(repo.findById('a')).resolves.toMatchObject({ status: 'confirmed', locale: 'en' });
  });

  it('forgets the confirmation send time', async () => {
    await repo.insertPending(row('a'));
    await repo.clearConfirmationSent('a');
    await expect(repo.findById('a')).resolves.toMatchObject({ confirmSentAt: null });
  });

  it('unsubscribes idempotently and invalidates a pending confirmation', async () => {
    await repo.insertPending(row('a'));
    await repo.markUnsubscribed('a', 3_000);
    await repo.markUnsubscribed('a', 4_000);
    await expect(repo.findById('a')).resolves.toMatchObject({ status: 'unsubscribed' });
    expect(sqlite.prepare('SELECT unsubscribed_at FROM subscribers').get()).toEqual({
      unsubscribed_at: 3_000,
    });
    await expect(repo.confirmByHash('hash-a', 2_000)).resolves.toBe(false);
  });

  it('lists, counts and marks the confirmed subscribers who have not got a note', async () => {
    for (const id of ['c', 'a', 'b']) await confirm(id);
    await repo.insertPending(row('p'));
    await repo.markUnsubscribed('b', 3_000);
    expect((await repo.listUnnotified('n1', 'es', 10)).map((s) => s.id)).toEqual(['a', 'c']);
    expect((await repo.listUnnotified('n1', 'es', 1)).map((s) => s.id)).toEqual(['a']);
    await repo.markNotified(['a'], 'n1', 5_000);
    expect((await repo.listUnnotified('n1', 'es', 10)).map((s) => s.id)).toEqual(['c']);
    await expect(repo.countUnnotified('n1', 'es')).resolves.toBe(1);
    await expect(repo.countUnnotified('n2', 'es')).resolves.toBe(2);
    await repo.markNotified([], 'n1', 5_000);
  });

  it('lists and counts only the subscribers of the requested locale', async () => {
    await repo.insertPending(row('e', { locale: 'en' }));
    await repo.confirmByHash('hash-e', 2_000);
    await confirm('s');
    expect((await repo.listUnnotified('n1', 'en', 10)).map((s) => s.id)).toEqual(['e']);
    expect((await repo.listUnnotified('n1', 'es', 10)).map((s) => s.id)).toEqual(['s']);
    await expect(repo.countUnnotified('n1', 'en')).resolves.toBe(1);
    await expect(repo.countUnnotified("n1'; DROP TABLE subscribers;--", 'es')).resolves.toBe(1);
  });

  it('marks a hundred ids at once', async () => {
    const ids = Array.from({ length: 150 }, (_, index) => `s${String(index).padStart(3, '0')}`);
    for (const id of ids) await confirm(id);
    await repo.markNotified(ids.slice(0, 120), 'n1', 5_000);
    await expect(repo.countUnnotified('n1', 'es')).resolves.toBe(30);
  });

  it('remembers every note: listing is by delivery record, not by last_note', async () => {
    await confirm('a');
    await repo.markNotified(['a'], 'n1', 5_000);
    await repo.markNotified(['a'], 'n3', 6_000);
    await repo.markNotified(['a'], 'n1', 7_000);
    await expect(repo.findById('a')).resolves.toMatchObject({ lastNote: 'n1' });
    await expect(repo.countUnnotified('n1', 'es')).resolves.toBe(0);
    await expect(repo.countUnnotified('n3', 'es')).resolves.toBe(0);
    await expect(repo.countUnnotified('n2', 'es')).resolves.toBe(1);
    expect(
      sqlite.prepare('SELECT slug, sent_at FROM subscriber_notes ORDER BY slug').all(),
    ).toEqual([
      { slug: 'n1', sent_at: 5_000 },
      { slug: 'n3', sent_at: 6_000 },
    ]);
  });

  it('records nothing for a subscriber that does not exist', async () => {
    await repo.markNotified(['ghost'], 'n1', 5_000).catch(() => undefined);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM subscriber_notes').get()).toEqual({ n: 0 });
  });

  it('removes the delivery rows with their subscriber (ON DELETE CASCADE)', async () => {
    await confirm('a');
    await confirm('b');
    await repo.markNotified(['a', 'b'], 'n1', 5_000);
    sqlite.prepare("DELETE FROM subscribers WHERE id = 'a'").run();
    expect(sqlite.prepare('SELECT subscriber_id FROM subscriber_notes').all()).toEqual([
      { subscriber_id: 'b' },
    ]);
  });

  it('backfills the last note of each existing subscriber when 0003 runs', () => {
    const old = new DatabaseSync(':memory:');
    old.exec(migrations[0] ?? '');
    old.exec(`INSERT INTO subscribers (id, email, status, locale, last_note, created_at, confirmed_at)
      VALUES ('a', 'a@x.test', 'confirmed', 'es', 'n1', 100, 200),
             ('b', 'b@x.test', 'confirmed', 'es', NULL, 100, 200),
             ('c', 'c@x.test', 'unsubscribed', 'es', 'n1', 100, NULL)`);
    old.exec(migrations[1] ?? '');
    old.exec(migrations[1] ?? '');
    expect(
      old.prepare('SELECT subscriber_id, slug, sent_at FROM subscriber_notes ORDER BY 1').all(),
    ).toEqual([
      { subscriber_id: 'a', slug: 'n1', sent_at: 200 },
      { subscriber_id: 'c', slug: 'n1', sent_at: 100 },
    ]);
  });

  it('purges only old pending rows', async () => {
    await repo.insertPending(row('old', { createdAt: 10 }));
    await repo.insertPending(row('fresh', { createdAt: 900 }));
    await confirm('kept');
    sqlite.prepare("UPDATE subscribers SET created_at = 1 WHERE id = 'kept'").run();
    await expect(repo.purgePendingBefore(500)).resolves.toBe(1);
    await expect(repo.findById('old')).resolves.toBeNull();
    await expect(repo.findById('fresh')).resolves.not.toBeNull();
    await expect(repo.findById('kept')).resolves.not.toBeNull();
  });

  it('keeps hostile text as data: statements are static and values are bound', async () => {
    const hostile = "x'); DROP TABLE subscribers; --";
    await repo.insertPending(row('a', { email: hostile }));
    await expect(repo.findByEmail(hostile)).resolves.toMatchObject({ email: hostile });
    await repo.markNotified(['a'], hostile, 5_000);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM subscribers').get()).toEqual({ n: 1 });
    for (const sql of statements) expect(sql).not.toContain('DROP');
  });

  it('rejects a row of the wrong shape', async () => {
    const broken: D1Like = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({ id: 1 }) as never,
          all: async () => ({ results: [] }),
          run: async () => ({ meta: { changes: 0 } }),
        }),
      }),
    };
    await expect(createD1SubscriberRepository(broken).findById('a')).rejects.toThrow();
  });
});

describe('D1 subscribe quota', () => {
  it('counts per day, refuses at the cap and resets on a new day', async () => {
    const quota = createD1SubscribeQuota(asD1(sqlite, statements));
    await expect(quota.confirmationsToday('2030-01-01')).resolves.toBe(0);
    await expect(quota.reserveConfirmation('2030-01-01', 2)).resolves.toBe(true);
    await expect(quota.reserveConfirmation('2030-01-01', 2)).resolves.toBe(true);
    await expect(quota.reserveConfirmation('2030-01-01', 2)).resolves.toBe(false);
    await expect(quota.confirmationsToday('2030-01-01')).resolves.toBe(2);
    await expect(quota.reserveConfirmation('2030-01-02', 2)).resolves.toBe(true);
    await expect(quota.confirmationsToday('2030-01-02')).resolves.toBe(1);
  });

  it('binds its parameters instead of building SQL from them', async () => {
    const quota = createD1SubscribeQuota(asD1(sqlite, statements));
    await quota.reserveConfirmation("2030-01-01' OR 1=1 --", 5);
    expect(statements.join('\n')).not.toContain('OR 1=1');
  });
});
