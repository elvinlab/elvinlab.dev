/**
 * Publishes a Lab Note in one command: `pnpm publish-note <slug> [--dry-run] [--no-release]`.
 * Moves the draft into `src/content/notes/`, dates it today, adds its changelog entry, builds (the
 * build is the only validator of frontmatter and `translationOf`), commits on `develop`, pushes it
 * and releases to `main` (docs/CONFIGURATION.md section 7). Running it is the authorization to push.
 * `--dry-run` changes nothing; `--no-release` stops after the local commit.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';

import { changelogEntry, readNoteMeta, releaseMessage, setPubDate } from './publish-note-plan.ts';

const repo = join(import.meta.dirname, '../../..');
const content = join(repo, 'apps/web/src/content');
const changelogPath = join(content, 'changelog.json');

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { 'dry-run': { type: 'boolean' }, 'no-release': { type: 'boolean' } },
});
const dryRun = values['dry-run'] === true;
const release = values['no-release'] !== true;

const slug = positionals[0];
if (!slug || positionals.length > 1) {
  console.error('Usage: pnpm publish-note <slug> [--dry-run] [--no-release]');
  process.exit(1);
}

function fail(message: string): never {
  console.error(`publish-note: ${message}`);
  process.exit(1);
}

function run(command: string, args: string[]): void {
  console.log(`$ ${command} ${args.join(' ')}`);
  execFileSync(command, args, { cwd: repo, stdio: 'inherit' });
}

function out(command: string, args: string[]): string {
  return execFileSync(command, args, { cwd: repo, encoding: 'utf8' }).trim();
}

const draftDir = join(content, 'drafts', slug);
const noteDir = join(content, 'notes', slug);
const draftFile = join(draftDir, 'index.mdx');
if (!existsSync(draftFile)) fail(`no draft at ${relative(repo, draftFile)}.`);
if (existsSync(noteDir)) fail(`a published note "${slug}" already exists.`);
if (out('git', ['rev-parse', '--abbrev-ref', 'HEAD']) !== 'develop') {
  fail('run it on the develop branch.');
}
if (out('git', ['status', '--porcelain']) !== '') {
  fail('the working tree has uncommitted changes; commit or stash them first.');
}

// Local calendar date: the UTC date is already tomorrow in the evening in the Americas.
const today = new Date().toLocaleDateString('en-CA');
const meta = readNoteMeta(readFileSync(draftFile, 'utf8'));
const { key, entry } = changelogEntry(meta, today);
const changelog = JSON.parse(readFileSync(changelogPath, 'utf8')) as Record<string, unknown>;
if (key in changelog) fail(`the changelog already has an entry "${key}".`);

console.log(
  `Note ${String(meta.number).padStart(3, '0')} "${meta.title}" (${meta.lang}), dated ${today}.`,
);
if (dryRun) {
  console.log('Dry run, nothing changed. It would:');
  console.log(`  1. move drafts/${slug} to notes/${slug} and set pubDate to ${today}`);
  console.log(`  2. add the changelog entry "${key}"`);
  console.log('  3. build the site (validates the frontmatter and translations)');
  console.log('  4. stamp the changelog, commit on develop and run the changelog audit');
  console.log(
    release
      ? '  5. push develop and release to main (the push triggers CI and the deploy)'
      : '  5. stop here (--no-release)',
  );
  process.exit(0);
}

renameSync(draftDir, noteDir);
const noteFile = join(noteDir, 'index.mdx');
writeFileSync(noteFile, setPubDate(readFileSync(noteFile, 'utf8'), today));
writeFileSync(changelogPath, `${JSON.stringify({ ...changelog, [key]: entry }, null, 2)}\n`);

try {
  run('pnpm', ['--filter', 'web', 'build']);
} catch {
  // Put the draft back so the failed build leaves nothing half-published.
  renameSync(noteDir, draftDir);
  writeFileSync(changelogPath, `${JSON.stringify(changelog, null, 2)}\n`);
  fail('the build failed; the note was moved back to drafts. Fix the error above and retry.');
}

run('pnpm', ['changelog:stamp']);
run('git', ['add', 'apps/web/src/content/notes', 'apps/web/src/content/changelog.json']);
run('git', ['commit', '-m', `feat(notes): publish "${meta.title}"`]);
run('pnpm', ['changelog:audit']);

if (!release) {
  console.log('Committed on develop. Push and release when you are ready (--no-release).');
  process.exit(0);
}

run('git', ['push', 'origin', 'develop']);
run('git', ['fetch', 'origin', 'main']);
const developSha = out('git', ['rev-parse', 'develop']);
const releaseSha = out('git', [
  'commit-tree',
  'develop^{tree}',
  '-p',
  'origin/main',
  '-m',
  releaseMessage(meta.title, developSha),
]);
run('git', ['push', 'origin', `${releaseSha}:refs/heads/main`]);
run('git', ['fetch', 'origin', 'main']);
console.log(`Released ${releaseSha.slice(0, 7)} to main. Follow CI: gh run watch`);
