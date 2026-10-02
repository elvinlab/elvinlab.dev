import { describe, expect, it } from 'vitest';

import { noteSchema } from './schema.ts';

// Stand-in for Astro's `image()` helper, which only exists inside the content layer.
const schema = noteSchema();

const valid = {
  number: 3,
  title: 'Why I dropped the YouTube to MP3 downloader',
  description: 'The legal and hosting costs outweighed a weekend project.',
  pubDate: '2026-09-28',
  lang: 'es',
  category: 'decisions',
  tags: ['product', 'legal'],
  decision: {
    context: 'I wanted a first public project.',
    decision: 'Drop it before writing code.',
    outcome: 'Time went into this site instead.',
  },
};

describe('noteSchema', () => {
  it('has no cover field: nothing displays one', () => {
    expect(schema.parse({ ...valid, cover: './cover.png' })).not.toHaveProperty('cover');
  });

  it('accepts a complete note and coerces dates', () => {
    const note = schema.parse(valid);

    expect(note.pubDate).toBeInstanceOf(Date);
    expect(note.tags).toEqual(['product', 'legal']);
  });

  it('requires the full decision record', () => {
    const { outcome: _, ...partial } = valid.decision;

    expect(() => schema.parse({ ...valid, decision: partial })).toThrow();
  });

  it('only accepts site locales', () => {
    expect(() => schema.parse({ ...valid, lang: 'fr' })).toThrow();
  });

  it('keeps descriptions short enough for search snippets', () => {
    expect(() => schema.parse({ ...valid, description: 'x'.repeat(161) })).toThrow();
  });

  it('rejects tags that are not lowercase kebab-case', () => {
    expect(() => schema.parse({ ...valid, tags: ['Big Tag'] })).toThrow();
  });

  it('rejects an update older than the publication', () => {
    expect(() => schema.parse({ ...valid, updatedDate: '2026-01-01' })).toThrow(/updatedDate/);
  });
});
