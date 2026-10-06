/**
 * Pure planning for `pnpm verify`: changed files (and optionally the registry's stale ids) in,
 * an ordered plan with reasons and the commands that run it out. No I/O: `verify-scope.ts`
 * reads git and executes, `verify-state.ts` owns the fingerprints.
 */
import { CHECKS, type CheckDef, inScope, matchesAny, WIDE } from './verification-map.ts';

export type PlanMode = 'changed' | 'all' | 'stale';

export interface PlanInput {
  readonly mode: PlanMode;
  readonly changed: readonly string[];
  /** Ids whose scope fingerprint differs from the registry; undefined means "no registry data". */
  readonly staleIds?: ReadonlySet<string>;
  readonly viewports?: 'quick' | 'all';
  readonly checks?: readonly CheckDef[];
  readonly wide?: readonly string[];
}

export interface PlanItem {
  readonly id: string;
  readonly kind: CheckDef['kind'];
  readonly label: string;
  readonly reasons: readonly string[];
}

export interface PlanCommand {
  readonly label: string;
  /** Empty argv means there is nothing to execute (recorded as a pass). */
  readonly argv: readonly string[];
  /** Check ids a green run of this command proves. */
  readonly covers: readonly string[];
}

export interface Plan {
  readonly wide: boolean;
  readonly items: readonly PlanItem[];
  readonly commands: readonly PlanCommand[];
  /** Checks the diff selected but the registry says are unchanged since their last green run. */
  readonly skippedFresh: readonly string[];
}

const RANK: Readonly<Record<string, number>> = {
  lint: 0,
  typecheck: 1,
  depcruise: 2,
  'docs-config': 3,
  unit: 4,
  build: 5,
  'js-budget': 6,
  'white-label': 7,
  'cold-start': 8,
};
const E2E_RANK = 9;
const LIGHTHOUSE_RANK = 10;

const FAMILY_COMMAND: Readonly<Record<string, readonly string[]>> = {
  typecheck: ['pnpm', 'typecheck'],
  depcruise: ['pnpm', 'depcruise'],
  'docs-config': ['pnpm', 'docs:config'],
  build: ['pnpm', '--filter', 'web', 'build'],
  'js-budget': ['pnpm', 'check:js-budget'],
  'white-label': ['pnpm', 'test:white-label'],
  'cold-start': ['pnpm', 'check:dev-cold-start'],
};

const BIOME_EXTENSIONS = /\.(?:ts|tsx|js|mjs|cjs|mts|cts|json|jsonc|css|astro|html)$/;
const BIOME_IGNORED = ['packages/core/src/tokens/tokens.css'];
const UNIT_EXTENSIONS = /\.(?:ts|tsx|astro|js|mjs|css|json)$/;
const I18N_DICTIONARY = 'apps/web/src/shared/i18n/index.ts';

function rank(check: CheckDef): number {
  if (check.kind === 'e2e') return E2E_RANK;
  if (check.kind === 'lighthouse') return LIGHTHOUSE_RANK;
  return RANK[check.id] ?? E2E_RANK - 1;
}

function summarize(files: readonly string[]): string {
  const shown = files.slice(0, 3).join(', ');
  return files.length > 3 ? `${shown} (+${files.length - 3} more)` : shown;
}

/** True when a `git diff -U0` text only adds lines (and adds at least one). */
export function additionsOnly(diff: string): boolean {
  let added = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('-')) return false;
    if (line.startsWith('+')) added += 1;
  }
  return added > 0;
}

/** Drops the i18n dictionary from the changed set when its diff only adds lines. */
export function refineChanged(
  changed: readonly string[],
  readDiff: (file: string) => string,
): string[] {
  return changed.filter((file) => file !== I18N_DICTIONARY || !additionsOnly(readDiff(file)));
}

function select(input: PlanInput, checks: readonly CheckDef[]) {
  const wideGlobs = input.wide ?? WIDE;
  const wideFiles = input.changed.filter((file) => matchesAny(file, wideGlobs));
  const reasons = new Map<string, string[]>();
  const wide = input.mode === 'changed' && wideFiles.length > 0;
  for (const check of checks) {
    if (input.mode === 'all') {
      reasons.set(check.id, ['forced by --all']);
    } else if (input.mode === 'stale') {
      if (input.staleIds?.has(check.id) ?? true) {
        reasons.set(check.id, ['scope differs from the registry (or was never recorded)']);
      }
    } else if (wide) {
      reasons.set(check.id, [`wide change: ${summarize(wideFiles)}`]);
    } else {
      const matched = input.changed.filter((file) => inScope(check, file));
      if (matched.length > 0) reasons.set(check.id, [summarize(matched)]);
    }
  }
  const skippedFresh: string[] = [];
  if (input.mode === 'changed' && input.staleIds) {
    for (const id of [...reasons.keys()]) {
      if (!input.staleIds.has(id)) {
        reasons.delete(id);
        skippedFresh.push(id);
      }
    }
  }
  return { reasons, wide, skippedFresh };
}

function lintCommand(full: boolean, changed: readonly string[], lint: CheckDef): PlanCommand {
  if (full) return { label: 'lint', argv: ['pnpm', 'lint'], covers: ['lint'] };
  const files = changed.filter(
    (file) => inScope(lint, file) && BIOME_EXTENSIONS.test(file) && !BIOME_IGNORED.includes(file),
  );
  const argv = files.length === 0 ? [] : ['pnpm', 'exec', 'biome', 'check', ...files];
  return { label: 'lint', argv, covers: ['lint'] };
}

function unitCommands(full: boolean, changed: readonly string[]): PlanCommand[] {
  const everything: PlanCommand = { label: 'unit', argv: ['pnpm', 'test'], covers: ['unit'] };
  if (full) return [everything];
  const web = changed
    .filter((file) => file.startsWith('apps/web/') && UNIT_EXTENSIONS.test(file))
    .map((file) => file.slice('apps/web/'.length));
  const core = changed.some((file) => file.startsWith('packages/core/'));
  const commands: PlanCommand[] = [];
  if (web.length > 0) {
    commands.push({
      label: 'unit (web, related)',
      argv: [
        'pnpm',
        '--filter',
        'web',
        'exec',
        'vitest',
        'related',
        ...web,
        '--run',
        '--passWithNoTests',
      ],
      covers: ['unit'],
    });
  }
  if (core) {
    commands.push({
      label: 'unit (core)',
      argv: ['pnpm', '--filter', '@elvinlab/core', 'test'],
      covers: ['unit'],
    });
  }
  return commands.length > 0 ? commands : [everything];
}

export function planChecks(input: PlanInput): Plan {
  const checks = input.checks ?? CHECKS;
  const { reasons, wide, skippedFresh } = select(input, checks);
  const byId = new Map(checks.map((check) => [check.id, check]));

  if (reasons.has('js-budget') && !reasons.has('build') && byId.has('build')) {
    reasons.set('build', ['required by js-budget (it measures the built pages)']);
  }

  const selected = checks
    .filter((check) => reasons.has(check.id))
    .sort((a, b) => rank(a) - rank(b));
  const items: PlanItem[] = selected.map((check) => ({
    id: check.id,
    kind: check.kind,
    label: check.label,
    reasons: reasons.get(check.id) ?? [],
  }));

  const full = input.mode !== 'changed' || wide;
  const commands: PlanCommand[] = [];
  const specs = { quick: [] as CheckDef[], all: [] as CheckDef[] };
  const urls: CheckDef[] = [];
  for (const check of selected) {
    if (check.kind === 'e2e') {
      const wideRun = check.responsive || input.viewports === 'all';
      (wideRun ? specs.all : specs.quick).push(check);
    } else if (check.kind === 'lighthouse') {
      urls.push(check);
    } else if (check.id === 'lint') {
      commands.push(lintCommand(full, input.changed, check));
    } else if (check.id === 'unit') {
      commands.push(...unitCommands(full, input.changed));
    } else {
      const argv = FAMILY_COMMAND[check.id];
      if (argv) commands.push({ label: check.label, argv, covers: [check.id] });
    }
  }
  for (const [script, group, label] of [
    ['test:e2e:quick', specs.quick, 'e2e (1280 px)'],
    ['test:e2e', specs.all, 'e2e (3 viewports)'],
  ] as const) {
    if (group.length === 0) continue;
    commands.push({
      label: `${label}: ${group.length} spec${group.length === 1 ? '' : 's'}`,
      argv: ['pnpm', script, ...group.flatMap((check) => (check.spec ? [check.spec] : []))],
      covers: group.map((check) => check.id),
    });
  }
  if (urls.length > 0) {
    const every = checks.filter((check) => check.kind === 'lighthouse').length === urls.length;
    commands.push({
      label: `lighthouse: ${urls.length} URL${urls.length === 1 ? '' : 's'}`,
      argv: [
        'node',
        'apps/web/scripts/run-lighthouse-ci.ts',
        ...(every ? [] : urls.flatMap((check) => ['--url', check.urlPath ?? ''])),
      ],
      covers: urls.map((check) => check.id),
    });
  }
  return { wide, items, commands, skippedFresh };
}
