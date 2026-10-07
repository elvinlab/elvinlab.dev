import { describe, expect, it } from 'vitest';

import {
  assertNotesExist,
  caseLinkLabelKey,
  projectTagLabel,
  visibleProjectTags,
} from './projects.ts';

describe('assertNotesExist', () => {
  const published = ['como-construi-este-sitio', 'agentic-dev-setup'];

  it('accepts projects without a note and projects whose note is published', () => {
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

  it('fails loudly, naming the project and the missing slug, for a dangling note', () => {
    expect(() =>
      assertNotesExist([{ id: 'elvinlab-dev', data: { note: 'no-existe' } }], published),
    ).toThrow('Project "elvinlab-dev" points to note "no-existe", which is not published');
  });
});

describe('caseLinkLabelKey', () => {
  it('uses the plain label when the note is written in the page language', () => {
    expect(caseLinkLabelKey('es', 'es')).toBe('project.case');
    expect(caseLinkLabelKey('en', 'en')).toBe('project.case');
  });

  it('adds the note language when it differs from the page language', () => {
    expect(caseLinkLabelKey('en', 'es')).toBe('project.case.es');
    expect(caseLinkLabelKey('es', 'en')).toBe('project.case.en');
  });
});

describe('projectTagLabel and visibleProjectTags', () => {
  it('names known ids and returns unknown ids unchanged', () => {
    expect(projectTagLabel('ai-agents')).toBe('AI agents');
    expect(projectTagLabel('cloudflare')).toBe('Cloudflare');
    expect(projectTagLabel('unknown-tag')).toBe('unknown-tag');
  });

  it('shows at most three tags, in order', () => {
    expect(visibleProjectTags(['a', 'b', 'c', 'd'])).toEqual(['a', 'b', 'c']);
    expect(visibleProjectTags(['a'])).toEqual(['a']);
  });
});
