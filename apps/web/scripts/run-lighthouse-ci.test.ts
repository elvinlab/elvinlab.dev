import { describe, expect, it } from 'vitest';

import { failedUrls, flakyMarkdown, parseShard, selectShard } from './run-lighthouse-ci.ts';

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

describe('failedUrls', () => {
  it('groups error-level failures by URL with sorted audits, sorted by URL', () => {
    expect(
      failedUrls([
        {
          url: 'http://127.0.0.1:4323/me/',
          level: 'error',
          passed: false,
          auditId: 'cumulative-layout-shift',
        },
        {
          url: 'http://127.0.0.1:4323/me/',
          level: 'error',
          passed: false,
          auditId: 'categories:performance',
        },
        {
          url: 'http://127.0.0.1:4323/en/',
          level: 'error',
          passed: false,
          auditId: 'categories:accessibility',
        },
      ]),
    ).toEqual([
      { url: 'http://127.0.0.1:4323/en/', audits: ['categories:accessibility'] },
      {
        url: 'http://127.0.0.1:4323/me/',
        audits: ['categories:performance', 'cumulative-layout-shift'],
      },
    ]);
  });

  it('ignores warnings, passing results and duplicates', () => {
    expect(
      failedUrls([
        {
          url: 'http://127.0.0.1:4323/me/',
          level: 'warn',
          passed: false,
          auditId: 'categories:seo',
        },
        {
          url: 'http://127.0.0.1:4323/en/',
          level: 'error',
          passed: true,
          auditId: 'categories:seo',
        },
        {
          url: 'http://127.0.0.1:4323/en/',
          level: 'error',
          passed: false,
          auditId: 'categories:seo',
        },
        {
          url: 'http://127.0.0.1:4323/en/',
          level: 'error',
          passed: false,
          auditId: 'categories:seo',
        },
      ]),
    ).toEqual([{ url: 'http://127.0.0.1:4323/en/', audits: ['categories:seo'] }]);
  });

  it('keeps a URL even when a failure carries no audit id', () => {
    expect(
      failedUrls([{ url: 'http://127.0.0.1:4323/me/', level: 'error', passed: false }]),
    ).toEqual([{ url: 'http://127.0.0.1:4323/me/', audits: [] }]);
  });
});

describe('flakyMarkdown', () => {
  it('lists the pathname and the failing audits per URL', () => {
    expect(
      flakyMarkdown([
        { url: 'http://127.0.0.1:4323/me/', audits: ['categories:performance'] },
        { url: 'http://127.0.0.1:4323/en/contact/', audits: ['color-contrast'] },
      ]),
    ).toBe('- /me/ (categories:performance)\n- /en/contact/ (color-contrast)');
  });

  it('omits the parentheses when a URL failed with no audits', () => {
    expect(flakyMarkdown([{ url: 'http://127.0.0.1:4323/me/', audits: [] }])).toBe('- /me/');
  });

  it('is empty for no failures', () => {
    expect(flakyMarkdown([])).toBe('');
  });
});
