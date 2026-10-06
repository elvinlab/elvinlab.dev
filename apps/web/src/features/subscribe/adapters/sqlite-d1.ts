import type { DatabaseSync } from 'node:sqlite';

import type { D1Like } from './d1.ts';

// Test helper: nothing in production imports this file.
/** Wraps a real in-memory SQLite as the narrow slice of the D1 API the adapter uses. */
export function asD1(sqlite: DatabaseSync, seen: string[] = []): D1Like {
  return {
    prepare(sql) {
      seen.push(sql);
      const statement = sqlite.prepare(sql);
      return {
        bind(...values) {
          const args = values as never[];
          return {
            async first<T>() {
              return (statement.get(...args) ?? null) as T | null;
            },
            async all<T>() {
              return { results: statement.all(...args) as T[] };
            },
            async run() {
              return { meta: { changes: Number(statement.run(...args).changes) } };
            },
          };
        },
      };
    },
  };
}
