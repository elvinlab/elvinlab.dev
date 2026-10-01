import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readNoteDatesFromDisk } from './note-dates.ts';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'note-dates-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('readNoteDatesFromDisk', () => {
  it('is empty when the notes folder does not exist', () => {
    expect(readNoteDatesFromDisk(root).size).toBe(0);
  });

  it('reads pubDate from a note frontmatter, keyed by canonical path', () => {
    mkdirSync(join(root, 'notes', 'my-note'), { recursive: true });
    writeFileSync(
      join(root, 'notes', 'my-note', 'index.mdx'),
      '---\ntitle: Hello\npubDate: 2026-03-05\n---\nbody\n',
    );
    const dates = readNoteDatesFromDisk(root);
    expect(dates.get('/notes/my-note/')).toEqual(new Date('2026-03-05'));
  });

  it('prefers updatedDate over pubDate when both are present', () => {
    mkdirSync(join(root, 'notes', 'my-note'), { recursive: true });
    writeFileSync(
      join(root, 'notes', 'my-note', 'index.mdx'),
      '---\ntitle: Hello\npubDate: 2026-03-05\nupdatedDate: 2026-04-10\n---\nbody\n',
    );
    const dates = readNoteDatesFromDisk(root);
    expect(dates.get('/notes/my-note/')).toEqual(new Date('2026-04-10'));
  });

  it('skips a note folder with no index.mdx', () => {
    mkdirSync(join(root, 'notes', 'half-written'), { recursive: true });
    writeFileSync(join(root, 'notes', 'half-written', 'cover.png'), '');
    expect(readNoteDatesFromDisk(root).size).toBe(0);
  });

  it('skips a note with no pubDate in frontmatter', () => {
    mkdirSync(join(root, 'notes', 'my-note'), { recursive: true });
    writeFileSync(join(root, 'notes', 'my-note', 'index.mdx'), '---\ntitle: Hello\n---\nbody\n');
    expect(readNoteDatesFromDisk(root).size).toBe(0);
  });
});
