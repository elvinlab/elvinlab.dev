import { z } from 'zod';

import type {
  SubscribeQuota,
  Subscriber,
  SubscriberRepository,
} from '@/features/subscribe/ports.ts';

/** The slice of the Cloudflare D1 API this adapter uses; a real D1 binding satisfies it. */
export interface D1Like {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      all<T = unknown>(): Promise<{ results: T[] }>;
      run(): Promise<{ meta: { changes: number } }>;
    };
  };
}

const rowSchema = z.object({
  id: z.string(),
  email: z.string(),
  status: z.enum(['pending', 'confirmed', 'unsubscribed']),
  locale: z.enum(['es', 'en']),
  confirm_sent_at: z.number().nullable(),
  last_note: z.string().nullable(),
});
const countSchema = z.object({ total: z.int().nonnegative() });

const COLUMNS = 'id, email, status, locale, confirm_sent_at, last_note';

const toSubscriber = (raw: unknown): Subscriber => {
  const row = rowSchema.parse(raw);
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    locale: row.locale,
    confirmSentAt: row.confirm_sent_at,
    lastNote: row.last_note,
  };
};

// Every statement binds its values; nothing user-controlled is ever concatenated into SQL.
const SQL = {
  byEmail: `SELECT ${COLUMNS} FROM subscribers WHERE email = ?1`,
  byId: `SELECT ${COLUMNS} FROM subscribers WHERE id = ?1`,
  insertPending: `INSERT INTO subscribers (id, email, status, locale, confirm_hash, confirm_expires, confirm_sent_at, created_at)
    VALUES (?1, ?2, 'pending', ?3, ?4, ?5, ?6, ?7) ON CONFLICT(email) DO NOTHING RETURNING id`,
  renew: `UPDATE subscribers SET status = 'pending', locale = ?2, confirm_hash = ?3, confirm_expires = ?4, confirm_sent_at = ?5
    WHERE id = ?1 AND status IN ('pending', 'unsubscribed')`,
  clearSent: 'UPDATE subscribers SET confirm_sent_at = NULL WHERE id = ?1',
  // One statement: the match, the expiry check and the single-use clear cannot be split by a race.
  confirm: `UPDATE subscribers SET status = 'confirmed', confirm_hash = NULL, confirm_expires = NULL, confirmed_at = ?2
    WHERE confirm_hash = ?1 AND status = 'pending' AND confirm_expires > ?2 RETURNING id`,
  unsubscribe: `UPDATE subscribers SET status = 'unsubscribed', confirm_hash = NULL, confirm_expires = NULL, unsubscribed_at = ?2
    WHERE id = ?1 AND status <> 'unsubscribed'`,
  unnotified: `SELECT ${COLUMNS} FROM subscribers
    WHERE status = 'confirmed' AND locale = ?2
      AND NOT EXISTS (SELECT 1 FROM subscriber_notes WHERE subscriber_id = subscribers.id AND slug = ?1)
    ORDER BY id LIMIT ?3`,
  countUnnotified: `SELECT COUNT(*) AS total FROM subscribers
    WHERE status = 'confirmed' AND locale = ?2
      AND NOT EXISTS (SELECT 1 FROM subscriber_notes WHERE subscriber_id = subscribers.id AND slug = ?1)`,
  // The ids travel as one JSON array parameter: D1 caps bound parameters per statement at 100.
  recordNotified: `INSERT OR IGNORE INTO subscriber_notes (subscriber_id, slug, sent_at)
    SELECT value, ?2, ?3 FROM json_each(?1)`,
  markNotified: `UPDATE subscribers SET last_note = ?2 WHERE status = 'confirmed' AND id IN (SELECT value FROM json_each(?1))`,
  // One statement: the increment is refused (no row returned) once the day reached the cap.
  reserve: `INSERT INTO subscribe_quota (day, confirmations) VALUES (?1, 1)
    ON CONFLICT(day) DO UPDATE SET confirmations = confirmations + 1 WHERE confirmations < ?2 RETURNING confirmations`,
  quotaToday: 'SELECT confirmations AS total FROM subscribe_quota WHERE day = ?1',
  purge: "DELETE FROM subscribers WHERE status = 'pending' AND created_at < ?1",
} as const;

export function createD1SubscriberRepository(db: D1Like): SubscriberRepository {
  const one = async (sql: string, ...values: unknown[]) =>
    db
      .prepare(sql)
      .bind(...values)
      .first();
  const run = async (sql: string, ...values: unknown[]) =>
    db
      .prepare(sql)
      .bind(...values)
      .run();
  return {
    async findByEmail(email) {
      const row = await one(SQL.byEmail, email);
      return row === null ? null : toSubscriber(row);
    },
    async findById(id) {
      const row = await one(SQL.byId, id);
      return row === null ? null : toSubscriber(row);
    },
    async insertPending(row) {
      const created = await one(
        SQL.insertPending,
        row.id,
        row.email,
        row.locale,
        row.confirmHash,
        row.confirmExpires,
        row.confirmSentAt,
        row.createdAt,
      );
      return created !== null;
    },
    async renewConfirmation(id, renewal) {
      await run(
        SQL.renew,
        id,
        renewal.locale,
        renewal.confirmHash,
        renewal.confirmExpires,
        renewal.confirmSentAt,
      );
    },
    async clearConfirmationSent(id) {
      await run(SQL.clearSent, id);
    },
    async confirmByHash(confirmHash, now) {
      return (await one(SQL.confirm, confirmHash, now)) !== null;
    },
    async markUnsubscribed(id, now) {
      await run(SQL.unsubscribe, id, now);
    },
    async listUnnotified(slug, locale, limit) {
      const { results } = await db.prepare(SQL.unnotified).bind(slug, locale, limit).all();
      return results.map(toSubscriber);
    },
    async countUnnotified(slug, locale) {
      return countSchema.parse(await one(SQL.countUnnotified, slug, locale)).total;
    },
    async markNotified(ids, slug, now) {
      if (ids.length === 0) return;
      const json = JSON.stringify(ids);
      // The delivery records decide who gets a note; `last_note` only documents the last send.
      await run(SQL.recordNotified, json, slug, now);
      await run(SQL.markNotified, json, slug);
    },
    async purgePendingBefore(cutoff) {
      return (await run(SQL.purge, cutoff)).meta.changes;
    },
  };
}

export function createD1SubscribeQuota(db: D1Like): SubscribeQuota {
  return {
    async reserveConfirmation(day, cap) {
      if (cap <= 0) return false;
      const reserved = await db.prepare(SQL.reserve).bind(day, cap).first();
      return reserved !== null;
    },
    async confirmationsToday(day) {
      const row = await db.prepare(SQL.quotaToday).bind(day).first();
      return row === null ? 0 : countSchema.parse(row).total;
    },
  };
}
