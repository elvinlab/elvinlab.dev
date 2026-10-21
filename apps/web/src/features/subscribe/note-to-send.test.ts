import { describe, expect, it } from 'vitest';

import { noteToSend, projectToSend } from './note-to-send.ts';

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

describe('projectToSend', () => {
  it('builds one notice per locale from the experiment, apart from note slugs', () => {
    const project = {
      id: 'my-tool',
      data: { title: 'My tool', description: { es: 'Una herramienta', en: 'A tool' } },
    };
    expect(projectToSend(project, 'https://site.test')).toEqual([
      {
        slug: 'project:my-tool',
        kind: 'project',
        title: 'My tool',
        summary: 'Una herramienta',
        url: 'https://site.test/experiments/my-tool/',
        locale: 'es',
      },
      {
        slug: 'project:my-tool',
        kind: 'project',
        title: 'My tool',
        summary: 'A tool',
        url: 'https://site.test/en/experiments/my-tool/',
        locale: 'en',
      },
    ]);
  });

  it('uses a plain description for every locale', () => {
    const notices = projectToSend(
      { id: 'x', data: { title: 'X', description: 'Same text' } },
      'https://site.test',
    );
    expect(notices.map((notice) => notice.summary)).toEqual(['Same text', 'Same text']);
  });
});
