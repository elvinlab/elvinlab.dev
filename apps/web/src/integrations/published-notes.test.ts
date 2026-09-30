import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { hasPublishedNotesOnDisk } from './published-notes.ts';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'published-notes-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('hasPublishedNotesOnDisk', () => {
  it('is false when the notes folder does not exist', () => {
    expect(hasPublishedNotesOnDisk(root)).toBe(false);
  });

  it('is false when the notes folder is empty', () => {
    mkdirSync(join(root, 'notes'));
    expect(hasPublishedNotesOnDisk(root)).toBe(false);
  });

  it('is false for a note folder without index.mdx', () => {
    mkdirSync(join(root, 'notes', 'half-written'), { recursive: true });
    writeFileSync(join(root, 'notes', 'half-written', 'cover.png'), '');
    expect(hasPublishedNotesOnDisk(root)).toBe(false);
  });

  it('ignores drafts, which never ship', () => {
    mkdirSync(join(root, 'drafts', 'idea'), { recursive: true });
    writeFileSync(join(root, 'drafts', 'idea', 'index.mdx'), '');
    expect(hasPublishedNotesOnDisk(root)).toBe(false);
  });

  it('is true when notes/<slug>/index.mdx exists', () => {
    mkdirSync(join(root, 'notes', 'first-post'), { recursive: true });
    writeFileSync(join(root, 'notes', 'first-post', 'index.mdx'), '');
    expect(hasPublishedNotesOnDisk(root)).toBe(true);
  });
});
