import { describe, expect, it } from 'vitest';

import {
  assertNotesExist,
  caseLinkLabelKey,
  experimentTagLabel,
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
