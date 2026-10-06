import { describe, expect, it } from 'vitest';

import { parseShard, selectShard } from './run-lighthouse-ci.ts';

const urls = ['a', 'b', 'c', 'd', 'e', 'f'];

describe('parseShard', () => {
  it('is undefined without the option (every URL runs)', () => {
    expect(parseShard(['--runs', '1'])).toBeUndefined();
  });

  it('reads both the `--shard 1/2` and the `--shard=1/2` forms', () => {
    expect(parseShard(['--shard', '1/2'])).toEqual({ index: 1, total: 2 });
    expect(parseShard(['--shard=2/2'])).toEqual({ index: 2, total: 2 });
  });

  it.each(['0/2', '3/2', '1/0', '1.5/2', 'a/b', '1', '1/2/3', '', '-1/2'])(
    'rejects %j with a clear message',
    (value) => {
      expect(() => parseShard([`--shard=${value}`])).toThrow(/--shard needs N\/M/);
    },
  );

  it('rejects a missing value', () => {
    expect(() => parseShard(['--shard'])).toThrow(/--shard needs N\/M/);
  });
});

describe('selectShard', () => {
  it('takes every M-th item in order, by index modulo M', () => {
    expect(selectShard(urls, { index: 1, total: 2 })).toEqual(['a', 'c', 'e']);
    expect(selectShard(urls, { index: 2, total: 2 })).toEqual(['b', 'd', 'f']);
  });

  it('covers every item exactly once across all shards', () => {
    const all = [1, 2, 3, 4].flatMap((index) => selectShard(urls, { index, total: 4 }));
    expect([...all].sort()).toEqual(urls);
  });

  it('keeps every item for a single shard', () => {
    expect(selectShard(urls, { index: 1, total: 1 })).toEqual(urls);
  });
});
