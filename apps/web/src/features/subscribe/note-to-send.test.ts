import { describe, expect, it } from 'vitest';

import { noteToSend } from './note-to-send.ts';

const base = { title: 'A title', description: 'A description' };

describe('noteToSend', () => {
  it('links a Spanish note at the root and an English one under /en', () => {
    expect(
      noteToSend({ id: 'una-nota', data: { ...base, lang: 'es' } }, 'https://site.test'),
    ).toEqual({
      slug: 'una-nota',
      title: 'A title',
      summary: 'A description',
      url: 'https://site.test/notes/una-nota/',
      locale: 'es',
    });
    expect(
      noteToSend({ id: 'a-note', data: { ...base, lang: 'en' } }, 'https://site.test/'),
    ).toMatchObject({
      url: 'https://site.test/en/notes/a-note/',
      locale: 'en',
    });
  });
});
