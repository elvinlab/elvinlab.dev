import { describe, expect, it } from 'vitest';

import { parseReads, parseRows, renderSnapshot } from './pulse-snapshot.ts';

const ok = (results: unknown[]): string => JSON.stringify([{ success: true, results }]);

describe('parseRows', () => {
  it('reads the rows of a successful result', () => {
    expect(parseRows(ok([{ slug: 'a', total: 2 }]))).toEqual([{ slug: 'a', total: 2 }]);
  });

  it('throws on a failed result instead of returning an empty list', () => {
    expect(() => parseRows(JSON.stringify([{ success: false, results: [] }]))).toThrow();
    expect(() => parseRows(JSON.stringify({ error: {} }))).toThrow();
  });

  it('throws on a row of the wrong shape', () => {
    expect(() => parseRows(ok([{ slug: 'a', total: 'many' }]))).toThrow();
  });
});

describe('renderSnapshot', () => {
  it('sorts by slug and drops notes without footprints', () => {
    const source = renderSnapshot([
      { slug: 'b', total: 3 },
      { slug: 'a', total: 1 },
      { slug: 'c', total: 0 },
    ]);
    expect(source).toContain('  a: { marks: 1 },\n  b: { marks: 3 },\n};');
    expect(source).not.toContain('c:');
  });

  it('quotes a slug only when it is not a plain identifier', () => {
    const source = renderSnapshot([
      { slug: 'home', total: 1 },
      { slug: 'de-react', total: 2 },
    ]);
    expect(source).toContain("  'de-react': { marks: 2 },\n  home: { marks: 1 },");
  });

  it('renders an empty record when there is nothing', () => {
    expect(renderSnapshot([])).toContain('Record<string, PulseSignals>> = {};');
  });
});

const answer = (groups: { count: number; siteTag?: string; requestPath: string }[]) => ({
  data: {
    viewer: {
      accounts: [
        {
          rumPageloadEventsAdaptiveGroups: groups.map((group) => ({
            count: group.count,
            dimensions: { siteTag: group.siteTag ?? 'tag', requestPath: group.requestPath },
          })),
        },
      ],
    },
  },
});

describe('parseReads', () => {
  it('sums the Spanish and English path of a note and ignores other pages', () => {
    const reads = parseReads(
      answer([
        { count: 100, requestPath: '/notes/a/' },
        { count: 20, requestPath: '/en/notes/a/' },
        { count: 900, requestPath: '/' },
        { count: 30, requestPath: '/notes/' },
        { count: 7, requestPath: '/notes/tag/x/' },
        { count: 5, requestPath: '/notes/b' },
      ]),
    );
    expect(reads).toEqual({ a: 120, b: 5 });
  });

  it('throws on GraphQL errors instead of returning an empty record', () => {
    expect(() => parseReads({ errors: [{ message: 'denied' }] })).toThrow();
    expect(() => parseReads({})).toThrow();
  });

  it('refuses to guess between several sites, and filters when one is named', () => {
    const body = answer([
      { count: 10, siteTag: 'one', requestPath: '/notes/a/' },
      { count: 99, siteTag: 'two', requestPath: '/notes/a/' },
    ]);
    expect(() => parseReads(body)).toThrow(/--site-tag/);
    expect(parseReads(body, 'one')).toEqual({ a: 10 });
  });
});

describe('renderSnapshot with reads', () => {
  it('merges marks and reads per slug and keeps notes that only have one signal', () => {
    const source = renderSnapshot([{ slug: 'a', total: 2 }], { a: 40, b: 9 });
    expect(source).toContain('  a: { marks: 2, reads: 40 },\n  b: { reads: 9 },\n};');
  });
});
