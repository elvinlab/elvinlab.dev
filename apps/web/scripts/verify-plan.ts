/**
 * Pure planning for `pnpm verify`: changed files (and optionally the registry's stale ids) in,
 * an ordered plan with reasons and the commands that run it out. No I/O: `verify-scope.ts`
 * reads git and executes, `verify-state.ts` owns the fingerprints.
 */
import {
  CHECKS,
  type CheckDef,
  FULL_WIDE,
  inScope,
  LAYOUT_FAMILIES,
  LAYOUT_LIGHTHOUSE,
  LAYOUT_WIDE,
  matchesAny,
} from './verification-map.ts';

export type PlanMode = 'changed' | 'all' | 'stale';

export interface PlanInput {
  readonly mode: PlanMode;
  readonly changed: readonly string[];
  /** Ids whose scope fingerprint differs from the registry; undefined means "no registry data". */
  readonly staleIds?: ReadonlySet<string>;
  readonly viewports?: 'quick' | 'all';
  readonly checks?: readonly CheckDef[];
  /** Overrides the FULL-wide globs (tests). */
  readonly wide?: readonly string[];
  /** Overrides the LAYOUT-wide globs (tests). */
  readonly layoutWide?: readonly string[];
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
  /** Extra environment variables for the process. */
  readonly env?: Readonly<Record<string, string>>;
  /** Check ids a green run of this command proves. */
  readonly covers: readonly string[];
}

export interface Plan {
  /** FULL-wide change: every check is selected. */
  readonly wide: boolean;
  /** LAYOUT-wide change: cheap families, every e2e spec at 1280 px, two Lighthouse URLs. */
  readonly layoutWide: boolean;
  readonly items: readonly PlanItem[];
  readonly commands: readonly PlanCommand[];
  /** Checks the diff selected but the registry says are unchanged since their last green run. */
  readonly skippedFresh: readonly string[];
}

/** Lighthouse runs per URL for `pnpm verify`; `lighthouserc.json` (CI, `pnpm test:lighthouse`) keeps 3. */
export const LOCAL_LIGHTHOUSE_RUNS = 1;

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
  const wideGlobs = input.wide ?? FULL_WIDE;
  const layoutGlobs = input.layoutWide ?? LAYOUT_WIDE;
  const wideFiles = input.changed.filter((file) => matchesAny(file, wideGlobs));
  const wide = input.mode === 'changed' && wideFiles.length > 0;
  const layoutFiles = wide
    ? []
    : input.changed.filter((file) => input.mode === 'changed' && matchesAny(file, layoutGlobs));
  const layoutWide = layoutFiles.length > 0;
  // Files that only matter through the layout class do not also select by per-check scope, or a
  // Navbar edit would pull every Lighthouse URL and the three-viewport specs back in.
  const scoped = input.changed.filter((file) => !layoutFiles.includes(file));
  const reasons = new Map<string, string[]>();
  /** Checks selected only because of the layout class (e2e stays at 1280 px). */
  const layoutOnly = new Set<string>();
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
      const matched = scoped.filter((file) => inScope(check, file));
      if (matched.length > 0) reasons.set(check.id, [summarize(matched)]);
      if (layoutWide && layoutSelects(check)) {
        const because = `layout-wide change: ${summarize(layoutFiles)}`;
        if (matched.length === 0) layoutOnly.add(check.id);
        reasons.set(check.id, [...(reasons.get(check.id) ?? []), because]);
      }
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
  return { reasons, wide, layoutWide, layoutOnly, skippedFresh };
}

function layoutSelects(check: CheckDef): boolean {
  if (check.kind === 'family') return LAYOUT_FAMILIES.includes(check.id);
  if (check.kind === 'e2e') return true;
  return LAYOUT_LIGHTHOUSE.includes(check.urlPath ?? '');
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
  const { reasons, wide, layoutWide, layoutOnly, skippedFresh } = select(input, checks);
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

  const full = input.mode !== 'changed' || wide || layoutWide;
  const commands: PlanCommand[] = [];
  const specs = { quick: [] as CheckDef[], all: [] as CheckDef[] };
  const urls: CheckDef[] = [];
  for (const check of selected) {
    if (check.kind === 'e2e') {
      const wideRun = (check.responsive && !layoutOnly.has(check.id)) || input.viewports === 'all';
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
  const e2eChecks = [...specs.quick, ...specs.all];
  if (e2eChecks.length > 0) {
    // One Playwright invocation (one fixture server). Specs that are not width dependent run on
    // the 1280 px project only: the config narrows the 360 and 768 projects to E2E_WIDE_SPECS.
    const wideSpecs = specs.all.flatMap((check) => (check.spec ? [check.spec] : []));
    const label =
      specs.all.length === 0
        ? 'e2e (1280 px)'
        : specs.quick.length === 0
          ? 'e2e (3 viewports)'
          : `e2e (1280 px, plus 3 viewports for ${specs.all.length})`;
    commands.push({
      label: `${label}: ${e2eChecks.length} spec${e2eChecks.length === 1 ? '' : 's'}`,
      argv: ['pnpm', 'test:e2e', ...e2eChecks.flatMap((check) => (check.spec ? [check.spec] : []))],
      ...(specs.quick.length > 0 ? { env: { E2E_WIDE_SPECS: wideSpecs.join(',') } } : {}),
      covers: e2eChecks.map((check) => check.id),
    });
  }
  if (urls.length > 0) {
    const every = checks.filter((check) => check.kind === 'lighthouse').length === urls.length;
    commands.push({
      label: `lighthouse: ${urls.length} URL${urls.length === 1 ? '' : 's'}`,
      argv: [
        'node',
        'apps/web/scripts/run-lighthouse-ci.ts',
        '--runs',
        String(LOCAL_LIGHTHOUSE_RUNS),
        ...(every ? [] : urls.flatMap((check) => ['--url', check.urlPath ?? ''])),
      ],
      covers: urls.map((check) => check.id),
    });
  }
  return { wide, layoutWide, items, commands, skippedFresh };
}
