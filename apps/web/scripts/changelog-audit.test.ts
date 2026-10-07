import { describe, expect, it } from 'vitest';

import {
  CHANGELOG_FILE,
  type Commit,
  commitsMissingEntry,
  entriesAddedSince,
  formatAudit,
  isTrackedSubject,
  parseReleaseSha,
} from './changelog-audit.ts';

const commit = (sha: string, subject: string, files: string[] = []): Commit => ({
  sha,
  date: '2026-10-07',
  subject,
  files,
});

describe('parseReleaseSha', () => {
  it('reads the develop line at the end of a release message', () => {
    expect(parseReleaseSha('release: twelfth\n\nbody\n\ndevelop: b5d1495\n')).toBe('b5d1495');
  });
  it('returns null when the message has no develop line', () => {
    expect(parseReleaseSha('Merge branch develop\n')).toBeNull();
  });
});

describe('isTrackedSubject', () => {
  it('tracks feat, fix and perf with or without scope and bang', () => {
    for (const subject of ['feat: a', 'fix(web): b', 'perf(x)!: c']) {
      expect(isTrackedSubject(subject), subject).toBe(true);
    }
  });
  it('ignores docs, chore, test and look-alikes', () => {
    for (const subject of ['docs: a', 'chore(deps): b', 'test: c', 'feature: d', 'fixup: e']) {
      expect(isTrackedSubject(subject), subject).toBe(false);
    }
  });
});

describe('commitsMissingEntry', () => {
  it('keeps only tracked commits that did not change the changelog', () => {
    const commits = [
      commit('a1', 'feat: with entry', [CHANGELOG_FILE, 'x.ts']),
      commit('b2', 'fix: without entry', ['x.ts']),
      commit('c3', 'docs: not tracked', ['x.md']),
    ];
    expect(commitsMissingEntry(commits).map((item) => item.sha)).toEqual(['b2']);
  });
});

describe('entriesAddedSince', () => {
  it('lists the keys absent from the released file', () => {
    expect(entriesAddedSince({ a: 1 }, { a: 1, b: 2, c: 3 })).toEqual(['b', 'c']);
  });
});

describe('formatAudit', () => {
  it('prints a table of the missing commits', () => {
    const text = formatAudit({
      releaseSha: 'abc1234',
      missing: [commit('b2', 'fix: x')],
      added: ['k'],
    });
    expect(text).toContain('Last release: develop abc1234');
    expect(text).toContain('Entries added since: 1');
    expect(text).toContain('b2  2026-10-07  fix: x');
  });
  it('says so when nothing is missing', () => {
    expect(formatAudit({ releaseSha: 'abc1234', missing: [], added: [] })).toContain(
      'carries a changelog entry',
    );
  });
});
