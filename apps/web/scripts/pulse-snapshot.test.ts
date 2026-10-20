import { describe, expect, it } from 'vitest';

import { parseRows, renderSnapshot } from './pulse-snapshot.ts';

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
