import { z } from 'zod';

import type { MarkStore } from '@/features/marks/ports.ts';

/** The slice of the Cloudflare D1 API this adapter uses; a real D1 binding satisfies it. */
export interface D1Like {
  prepare(sql: string): {
    bind(...values: unknown[]): { first<T = unknown>(): Promise<T | null> };
  };
}

const rowSchema = z.object({ total: z.int().nonnegative() });

const TOTAL_SQL = 'SELECT total FROM marks WHERE slug = ?1';
// One statement, so concurrent taps cannot lose updates.
const ADD_SQL =
  'INSERT INTO marks (slug, total) VALUES (?1, ?2) ON CONFLICT(slug) DO UPDATE SET total = total + excluded.total RETURNING total';

export function createD1MarkStore(db: D1Like): MarkStore {
  return {
    async total(slug) {
      const row = await db.prepare(TOTAL_SQL).bind(slug).first();
      return row === null ? 0 : rowSchema.parse(row).total;
    },
    async add(slug, by) {
      const row = await db.prepare(ADD_SQL).bind(slug, by).first();
      return rowSchema.parse(row).total;
    },
  };
}
