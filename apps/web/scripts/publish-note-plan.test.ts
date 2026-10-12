import { describe, expect, it } from 'vitest';

import { changelogSchema } from '@/features/changelog/schema.ts';

import { changelogEntry, readNoteMeta, releaseMessage, setPubDate } from './publish-note-plan.ts';
import { scaffoldNote } from './scaffold-note.ts';

const draft = scaffoldNote({
  title: 'Why I dropped X',
  lang: 'en',
  number: 8,
  today: '2026-10-01',
});

describe('setPubDate', () => {
  it('rewrites the bare pubDate line and leaves the body alone', () => {
    const out = setPubDate(draft.mdx, '2026-10-12');
    expect(out).toContain('\npubDate: 2026-10-12\n');
    expect(out).not.toContain('2026-10-01');
    expect(out.split('\n---\n')[1]).toBe(draft.mdx.split('\n---\n')[1]);
  });

  it('only touches the frontmatter, never a pubDate-looking line in the body', () => {
    const mdx = `${draft.mdx}\npubDate: 1999-01-01\n`;
    expect(setPubDate(mdx, '2026-10-12')).toContain('\npubDate: 1999-01-01\n');
  });

  it('refuses a file without a pubDate', () => {
    expect(() => setPubDate('---\ntitle: x\n---\n\nbody', '2026-10-12')).toThrow(/pubDate/);
  });
});

describe('readNoteMeta', () => {
  it('reads number, lang, title and description from JSON-quoted scalars', () => {
    expect(readNoteMeta(draft.mdx)).toEqual({
      number: 8,
      lang: 'en',
      title: 'Why I dropped X',
      description: 'One sentence: what was decided and why it matters.',
    });
  });

  it('accepts plain and single-quoted scalars that the owner typed by hand', () => {
    const mdx =
      "---\nnumber: 3\nlang: es\ntitle: Por qué cambié\ndescription: 'Una frase.'\npubDate: 2026-10-01\n---\n";
    expect(readNoteMeta(mdx)).toMatchObject({
      number: 3,
      title: 'Por qué cambié',
      description: 'Una frase.',
    });
  });

  it('names the missing field', () => {
    expect(() => readNoteMeta('---\nnumber: 3\n---\n')).toThrow(/lang/);
  });
});

describe('changelogEntry', () => {
  const meta = readNoteMeta(draft.mdx);

  it('keys the entry by note number and adds a language suffix for English', () => {
    expect(changelogEntry(meta, '2026-10-12').key).toBe('note-008-en');
    expect(changelogEntry({ ...meta, lang: 'es' }, '2026-10-12').key).toBe('note-008');
  });

  it('produces an entry that satisfies the changelog schema', () => {
    const { entry } = changelogEntry(meta, '2026-10-12');
    expect(entry).toMatchObject({ date: '2026-10-12', category: 'added' });
    expect(() => changelogSchema().parse(entry)).not.toThrow();
  });

  it('keeps a maximum-length title inside the changelog title limit', () => {
    const long = { ...meta, title: 'x'.repeat(90), description: 'y'.repeat(160) };
    expect(() => changelogSchema().parse(changelogEntry(long, '2026-10-12').entry)).not.toThrow();
  });
});

describe('releaseMessage', () => {
  it('ends with the develop line that changelog:audit reads', () => {
    const message = releaseMessage('Why I dropped X', 'abc123');
    expect(message.split('\n').at(-1)).toBe('develop: abc123');
    expect(message.split('\n')[0]).toBe('chore(release): publish note "Why I dropped X"');
  });
});
