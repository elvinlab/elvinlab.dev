import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Changelog audit (`pnpm changelog:audit`): lists the `feat`, `fix` and `perf` commits made since
 * the last release that did not touch `changelog.json`. The rule is that the entry travels in the
 * same work unit as the change, so a commit without one is a missing entry. The last release is the
 * `develop: <sha>` line the release commit records at the end of its message, read from the local
 * ref `origin/main` (nothing is fetched). Exits 1 when any commit is missing its entry.
 * See `CLAUDE.md` ("Changelog stays current") and `docs/CONFIGURATION.md`.
 */

export const CHANGELOG_FILE = 'apps/web/src/content/changelog.json';

export interface Commit {
  sha: string;
  date: string;
  subject: string;
  /** Repository paths the commit changed. */
  files: readonly string[];
}

/** The `develop: <sha>` a release commit records, or `null` when the message has none. */
export function parseReleaseSha(message: string): string | null {
  return /^develop:\s*([0-9a-f]{7,40})\s*$/im.exec(message)?.[1] ?? null;
}

/** True for a conventional `feat`, `fix` or `perf` subject (any scope, optional `!`). */
export function isTrackedSubject(subject: string): boolean {
  return /^(?:feat|fix|perf)(?:\([^)]*\))?!?:/.test(subject);
}

/** The tracked commits that did not change the changelog file. */
export function commitsMissingEntry(commits: readonly Commit[]): Commit[] {
  return commits.filter(
    (commit) => isTrackedSubject(commit.subject) && !commit.files.includes(CHANGELOG_FILE),
  );
}

/** Keys present in `current` and absent from `released` (both parsed `changelog.json` objects). */
export function entriesAddedSince(
  released: Readonly<Record<string, unknown>>,
  current: Readonly<Record<string, unknown>>,
): string[] {
  return Object.keys(current).filter((key) => !(key in released));
}

/** The report the command prints. */
export function formatAudit({
  releaseSha,
  missing,
  added,
}: {
  releaseSha: string;
  missing: readonly Commit[];
  added: readonly string[];
}): string {
  const lines = [`Last release: develop ${releaseSha}`, `Entries added since: ${added.length}`];
  if (missing.length === 0) {
    lines.push('Every feat/fix/perf commit since the last release carries a changelog entry.');
  } else {
    lines.push(
      '',
      `${missing.length} feat/fix/perf commit(s) did not touch ${CHANGELOG_FILE}:`,
      'sha      date        subject',
      ...missing.map((commit) => `${commit.sha}  ${commit.date}  ${commit.subject}`),
      '',
      'Add the entry (or decide none is visitor-visible), then run `pnpm changelog:stamp` at release time.',
    );
  }
  return lines.join('\n');
}

function git(root: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

function run(root: string): number {
  const message = git(root, 'log', '-1', '--format=%B', 'origin/main');
  const releaseSha = parseReleaseSha(message);
  if (releaseSha === null) {
    console.error(
      'The tip of origin/main has no "develop: <sha>" line in its message, so the last release cannot be found.\n' +
        'Pass nothing and check `git log -1 origin/main`; if the ref is stale, fetch it yourself first.',
    );
    return 2;
  }
  const rows = git(
    root,
    'log',
    '--no-merges',
    '--reverse',
    '--date=short',
    '--format=%h%x09%ad%x09%s',
    `${releaseSha}..develop`,
  )
    .split('\n')
    .filter(Boolean);
  const commits = rows.map((row): Commit => {
    const [sha = '', date = '', ...subject] = row.split('\t');
    const files = git(root, 'diff-tree', '--no-commit-id', '--name-only', '-r', sha)
      .split('\n')
      .filter(Boolean);
    return { sha, date, subject: subject.join('\t'), files };
  });
  const released = JSON.parse(git(root, 'show', `origin/main:${CHANGELOG_FILE}`)) as Record<
    string,
    unknown
  >;
  const current = JSON.parse(readFileSync(resolve(root, CHANGELOG_FILE), 'utf8')) as Record<
    string,
    unknown
  >;
  const missing = commitsMissingEntry(commits);
  console.log(formatAudit({ releaseSha, missing, added: entriesAddedSince(released, current) }));
  return missing.length > 0 ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = run(resolve(import.meta.dirname, '../../..'));
}
