import { describe, expect, it } from 'vitest';

import {
  assertFeaturedLimit,
  assertNotesExist,
  caseLinkLabelKey,
  experimentTagLabel,
  MAX_BIG_PIECES,
  tierExperiments,
  visibleExperimentTags,
} from './experiments.ts';

describe('assertNotesExist', () => {
  const published = ['como-construi-este-sitio', 'agentic-dev-setup'];

  it('accepts experiments without a note and experiments whose note is published', () => {
    expect(() =>
      assertNotesExist(
        [
          { id: 'a', data: {} },
          { id: 'b', data: { note: 'agentic-dev-setup' } },
        ],
        published,
      ),
    ).not.toThrow();
  });

  it('fails loudly, naming the experiment and the missing slug, for a dangling note', () => {
    expect(() =>
      assertNotesExist([{ id: 'elvinlab-dev', data: { note: 'no-existe' } }], published),
    ).toThrow('Experiment "elvinlab-dev" points to note "no-existe", which is not published');
  });
});

describe('caseLinkLabelKey', () => {
  it('uses the plain label when the note is written in the page language', () => {
    expect(caseLinkLabelKey('es', 'es')).toBe('experiment.case');
    expect(caseLinkLabelKey('en', 'en')).toBe('experiment.case');
  });

  it('adds the note language when it differs from the page language', () => {
    expect(caseLinkLabelKey('en', 'es')).toBe('experiment.case.es');
    expect(caseLinkLabelKey('es', 'en')).toBe('experiment.case.en');
  });
});

describe('experimentTagLabel and visibleExperimentTags', () => {
  it('names known ids and returns unknown ids unchanged', () => {
    expect(experimentTagLabel('ai-agents')).toBe('AI agents');
    expect(experimentTagLabel('cloudflare')).toBe('Cloudflare');
    expect(experimentTagLabel('unknown-tag')).toBe('unknown-tag');
  });

  it('shows at most three tags, in order', () => {
    expect(visibleExperimentTags(['a', 'b', 'c', 'd'])).toEqual(['a', 'b', 'c']);
    expect(visibleExperimentTags(['a'])).toEqual(['a']);
  });
});

const entry = (id: string, year: number, featured = false) => ({ id, year, featured });

describe('assertFeaturedLimit', () => {
  const featured = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `f${i}`, data: { featured: true } }));

  it('accepts zero to three featured entries', () => {
    for (const n of [0, 1, MAX_BIG_PIECES])
      expect(() => assertFeaturedLimit(featured(n))).not.toThrow();
  });

  it('fails the build with a clear message when more than three are featured', () => {
    expect(() => assertFeaturedLimit(featured(MAX_BIG_PIECES + 1))).toThrow(
      /4 experiments are featured \(f0, f1, f2, f3\).*at most 3/,
    );
  });

  it('does not count entries that are not featured', () => {
    const mixed = [...featured(3), { id: 'x', data: { featured: false } }];
    expect(() => assertFeaturedLimit(mixed)).not.toThrow();
  });
});

describe('tierExperiments', () => {
  it('makes the featured entries the big pieces and the rest compact, grouped by year, newest first', () => {
    const list = [
      entry('a', 2026, true),
      entry('b', 2026),
      entry('c', 2025),
      entry('d', 2026),
      entry('e', 2024),
    ];
    const { big, compact } = tierExperiments(list);
    expect(big.map((e) => e.id)).toEqual(['a']);
    expect(compact.map((g) => g.year)).toEqual([2026, 2025, 2024]);
    expect(compact[0]?.entries.map((e) => e.id)).toEqual(['b', 'd']);
  });

  it('uses the first entry as the only big piece when none is featured', () => {
    const { big, compact } = tierExperiments([entry('a', 2026), entry('b', 2025)]);
    expect(big.map((e) => e.id)).toEqual(['a']);
    expect(compact.flatMap((g) => g.entries.map((e) => e.id))).toEqual(['b']);
  });

  it('has no compact tier when every entry is featured, and handles an empty list', () => {
    expect(tierExperiments([entry('a', 2026, true), entry('b', 2026, true)]).compact).toEqual([]);
    expect(tierExperiments([])).toEqual({ big: [], compact: [] });
  });
});
