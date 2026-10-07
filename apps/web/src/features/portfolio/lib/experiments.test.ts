import { describe, expect, it } from 'vitest';

import {
  assertFeaturedLimit,
  assertNotesExist,
  caseLinkLabelKey,
  experimentTagLabel,
  splitTiers,
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

  it('accepts zero up to the configured maximum of featured entries', () => {
    for (const n of [0, 1, 3]) expect(() => assertFeaturedLimit(featured(n), 3)).not.toThrow();
    expect(() => assertFeaturedLimit(featured(6), 6)).not.toThrow();
  });

  it('fails the build with a clear message naming the offenders and the setting', () => {
    expect(() => assertFeaturedLimit(featured(4), 3)).toThrow(
      /4 experiments are featured \(f0, f1, f2, f3\).*at most 3.*experiments\.maxFeatured/,
    );
    expect(() => assertFeaturedLimit(featured(2), 1)).toThrow(/at most 1/);
  });

  it('does not count entries that are not featured', () => {
    const mixed = [...featured(3), { id: 'x', data: { featured: false } }];
    expect(() => assertFeaturedLimit(mixed, 3)).not.toThrow();
  });
});

describe('splitTiers', () => {
  it('makes the featured entries the big pieces and keeps the rest in their incoming order', () => {
    const list = [
      entry('a', 2026, true),
      entry('b', 2026),
      entry('c', 2025),
      entry('d', 2026),
      entry('e', 2024),
    ];
    const { big, rest } = splitTiers(list);
    expect(big.map((e) => e.id)).toEqual(['a']);
    expect(rest.map((e) => e.id)).toEqual(['b', 'c', 'd', 'e']);
  });

  it('uses the first entry as the only big piece when none is featured', () => {
    const { big, rest } = splitTiers([entry('a', 2026), entry('b', 2025)]);
    expect(big.map((e) => e.id)).toEqual(['a']);
    expect(rest.map((e) => e.id)).toEqual(['b']);
  });

  it('has nothing left over when every entry is featured, and handles an empty list', () => {
    expect(splitTiers([entry('a', 2026, true), entry('b', 2026, true)]).rest).toEqual([]);
    expect(splitTiers([])).toEqual({ big: [], rest: [] });
  });
});
