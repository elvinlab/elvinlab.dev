import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Changelog stamp (`pnpm changelog:stamp [--date YYYY-MM-DD] [--dry-run]`): at release time, sets
 * `date` to the release day on every entry that is not in `changelog.json` of the local ref
 * `origin/main` (nothing is fetched). Entries already released are never touched. The file keeps its
 * formatting (2-space indent, trailing newline). See `CLAUDE.md` ("Changelog stays current").
 */

const FILE = 'apps/web/src/content/changelog.json';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

type Entries = Record<string, { date: string } & Record<string, unknown>>;

/** The entries to release get `date`; `changed` lists the keys whose date actually moved. */
export function stampEntries(
  current: Entries,
  released: Readonly<Record<string, unknown>>,
  date: string,
): { next: Entries; changed: string[] } {
  const changed: string[] = [];
  const next: Entries = {};
  for (const [key, entry] of Object.entries(current)) {
    if (key in released || entry.date === date) {
      next[key] = entry;
      continue;
    }
    next[key] = { ...entry, date };
    changed.push(key);
  }
  return { next, changed };
}

/** Today in the machine's local calendar, as `YYYY-MM-DD`. */
export function localToday(now: Date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The options of the command line; a bad date throws. */
export function parseArgs(argv: readonly string[]): { date: string | undefined; dryRun: boolean } {
  const at = argv.indexOf('--date');
  const date = at === -1 ? undefined : argv[at + 1];
  if (at !== -1 && (date === undefined || !DAY.test(date))) {
    throw new Error('--date needs a value like 2026-10-07');
  }
  return { date, dryRun: argv.includes('--dry-run') };
}

export function serialize(entries: Entries): string {
  return `${JSON.stringify(entries, null, 2)}\n`;
}

function run(root: string, argv: readonly string[]): void {
  const { date = localToday(), dryRun } = parseArgs(argv);
  const released = JSON.parse(
    execFileSync('git', ['show', `origin/main:${FILE}`], { cwd: root, encoding: 'utf8' }),
  ) as Record<string, unknown>;
  const path = resolve(root, FILE);
  const { next, changed } = stampEntries(
    JSON.parse(readFileSync(path, 'utf8')) as Entries,
    released,
    date,
  );
  if (changed.length === 0) {
    console.log(`Nothing to stamp: every unreleased entry already has the date ${date}.`);
    return;
  }
  console.log(`${dryRun ? 'Would stamp' : 'Stamped'} ${changed.length} entr(ies) with ${date}:`);
  for (const key of changed) console.log(`  ${key}`);
  if (!dryRun) writeFileSync(path, serialize(next));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  run(resolve(import.meta.dirname, '../../..'), process.argv.slice(2));
}
