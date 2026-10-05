import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import { beforeEach, describe, expect, it } from 'vitest';

import { createD1MarkStore, type D1Like } from './d1.ts';

const migration = readFileSync(
  new URL('../../../../migrations/0001_marks.sql', import.meta.url),
  'utf8',
);

/** Wraps a real in-memory SQLite as the narrow slice of the D1 API the adapter uses. */
function asD1(sqlite: DatabaseSync): D1Like {
  return {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      return {
        bind(...values) {
          return {
            async first<T>() {
              const row = statement.get(...(values as never[]));
              return (row ?? null) as T | null;
            },
          };
        },
      };
    },
  };
}

let sqlite: DatabaseSync;
beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec(migration);
});

describe('createD1MarkStore', () => {
  it('reads 0 for a slug without a row', async () => {
    await expect(createD1MarkStore(asD1(sqlite)).total('nothing-here')).resolves.toBe(0);
  });

  it('creates the row on the first add', async () => {
    const store = createD1MarkStore(asD1(sqlite));
    await expect(store.add('a-note', 3)).resolves.toBe(3);
    await expect(store.total('a-note')).resolves.toBe(3);
  });

  it('adds up on later adds and keeps slugs apart', async () => {
    const store = createD1MarkStore(asD1(sqlite));
    await store.add('a-note', 3);
    await expect(store.add('a-note', 4)).resolves.toBe(7);
    await expect(store.add('other-note', 1)).resolves.toBe(1);
    await expect(store.total('a-note')).resolves.toBe(7);
  });

  it('stays exact over many sequential adds', async () => {
    const store = createD1MarkStore(asD1(sqlite));
    const results = await Promise.all(Array.from({ length: 25 }, () => store.add('busy', 2)));
    expect(Math.max(...results)).toBe(50);
    await expect(store.total('busy')).resolves.toBe(50);
  });

  it('rejects a row of the wrong shape', async () => {
    const broken: D1Like = {
      prepare: () => ({ bind: () => ({ first: async () => ({ total: 'many' }) as never }) }),
    };
    await expect(createD1MarkStore(broken).total('a-note')).rejects.toThrow();
  });

  it('fails when the statement returns no row on add', async () => {
    const empty: D1Like = {
      prepare: () => ({ bind: () => ({ first: async () => null as never }) }),
    };
    await expect(createD1MarkStore(empty).add('a-note', 1)).rejects.toThrow();
  });
});
