import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';

import { noteSchema } from '@/features/notes/index.ts';

import { nextNumber, scaffoldNote, slugify } from './scaffold-note.ts';

describe('slugify', () => {
  it('lowercases, strips accents and joins words with dashes', () => {
    expect(slugify('¿Por qué dejé el Descargador de MP3?')).toBe(
      'por-que-deje-el-descargador-de-mp3',
    );
  });
});

describe('nextNumber', () => {
  it('continues after the highest existing entry', () => {
    expect(nextNumber([1, 3, 2])).toBe(4);
  });

  it('starts at 1 in an empty notebook', () => {
    expect(nextNumber([])).toBe(1);
  });
});

describe('scaffoldNote', () => {
  const note = scaffoldNote({
    title: 'Mi primera nota',
    lang: 'es',
    number: 1,
    today: '2026-09-28',
  });

  it('produces frontmatter that passes the notes schema', () => {
    expect(() => noteSchema(() => z.string()).parse(note.data)).not.toThrow();
  });

  it('writes the frontmatter as YAML ahead of the body', () => {
    expect(note.mdx).toMatch(/^---\nnumber: 1\ntitle: "Mi primera nota"\n/);
    expect(note.mdx).toContain('pubDate: 2026-09-28\n');
    expect(note.mdx).toMatch(/\n---\n\n/);
  });
});
