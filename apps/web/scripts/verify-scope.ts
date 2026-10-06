/**
 * `pnpm verify`: plans, and with `--run` executes, only the checks that cover what changed.
 *
 *   pnpm verify                      dry run on uncommitted work (tracked diff vs HEAD + untracked)
 *   pnpm verify --since <ref>        changes since a ref instead
 *   pnpm verify --all                every check
 *   pnpm verify --stale              checks whose scope differs from odd/verification-state.json
 *   pnpm verify --run [--record]     execute the plan; --record stores green results
 *   pnpm verify --viewports all      run e2e specs on three viewports, not only 1280 px
 *   pnpm verify --files a b          plan for these paths instead of git (for dry runs and tests)
 *
 * The map lives in `verification-map.ts`, planning in `verify-plan.ts`, fingerprints and the
 * registry in `verify-state.ts`. This file is the only one besides `verify-state.ts` doing git I/O.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { CHECKS, FULL_WIDE } from './verification-map.ts';
import { type Plan, type PlanMode, planChecks, refineChanged } from './verify-plan.ts';
import {
  computeFingerprints,
  gitIo,
  readRegistry,
  staleIds,
  writeRegistry,
} from './verify-state.ts';

/**
 * Wall time of the full local stack (`pnpm verify --all --run`, 12 cores, 2026-10-05), the
 * reference for the "saved" line. Measurements and what changed: odd/verification-timings.md.
 */
const FULL_STACK_BASELINE_SECONDS = 340;

const root = resolve(import.meta.dirname, '../../..');
const STATE_PATH = resolve(root, 'odd/verification-state.json');

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function lines(text: string): string[] {
  return text.split('\n').filter(Boolean);
}

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

/** Paths after `--files` up to the next flag: a simulated change set. */
function filesOption(args: string[]): string[] | undefined {
  const index = args.indexOf('--files');
  if (index === -1) return undefined;
  const rest = args.slice(index + 1);
  const end = rest.findIndex((arg) => arg.startsWith('--'));
  return end === -1 ? rest : rest.slice(0, end);
}

function detectChanged(base: string): string[] {
  const tracked = lines(git(['diff', '--name-only', '-M', base]));
  const untracked = lines(git(['ls-files', '--others', '--exclude-standard']));
  const changed = [...new Set([...tracked, ...untracked])].sort();
  return refineChanged(changed, (file) => git(['diff', '-U0', base, '--', file]));
}

function printPlan(plan: Plan, mode: PlanMode, changedCount: number): void {
  console.log(
    `verify plan (${mode}${mode === 'changed' ? `, ${changedCount} changed files` : ''})`,
  );
  if (plan.wide)
    console.log('  wide change (dependencies, toolchain, config): every check is selected');
  if (plan.layoutWide) {
    console.log(
      '  layout-wide change: cheap families, every e2e spec at 1280 px, Lighthouse for / and /notes/smoke-es/ (1 run); not the 3-viewport reruns or the dev cold start (use --all or --viewports all)',
    );
  }
  if (plan.items.length === 0) console.log('  nothing to run: no check covers this change');
  for (const item of plan.items) {
    console.log(`  ${item.id.padEnd(34)} ${item.reasons.join('; ')}`);
  }
  if (plan.skippedFresh.length > 0) {
    console.log(`  fresh in the registry, not planned: ${plan.skippedFresh.join(', ')}`);
  }
  if (plan.commands.length > 0) console.log('commands, in order:');
  for (const command of plan.commands) {
    const env = command.env ? `${Object.keys(command.env).join(',')}=... ` : '';
    const note = command.argv.includes('run-lighthouse-ci.ts')
      ? '   # 1 run (local; CI keeps 3)'
      : '';
    console.log(
      `  ${command.argv.length === 0 ? `(nothing to run) ${command.label}` : `${env}${command.argv.join(' ')}`}${note}`,
    );
  }
}

interface Outcome {
  readonly label: string;
  readonly because: string;
  readonly result: string;
  readonly seconds: number;
  readonly passed: boolean;
  readonly covers: readonly string[];
}

function execute(plan: Plan): Outcome[] {
  const reasonOf = new Map(plan.items.map((item) => [item.id, item.reasons.join('; ')]));
  const outcomes: Outcome[] = [];
  for (const command of plan.commands) {
    const first = reasonOf.get(command.covers[0] ?? '') ?? '';
    const because =
      command.covers.length > 1 ? `${first} (+${command.covers.length - 1} more)` : first;
    const started = Date.now();
    let passed = true;
    let result = 'pass (nothing to run)';
    if (command.argv.length > 0) {
      console.log(`\n$ ${command.argv.join(' ')}`);
      const [program = '', ...rest] = command.argv;
      const run = spawnSync(program, rest, {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env, ...command.env },
      });
      passed = run.status === 0;
      result = passed ? 'pass' : run.error ? `FAIL (${run.error.message})` : 'FAIL';
    }
    outcomes.push({
      label: command.label,
      because,
      result,
      seconds: (Date.now() - started) / 1000,
      passed,
      covers: command.covers,
    });
  }
  return outcomes;
}

function printTable(outcomes: readonly Outcome[]): void {
  const width = Math.max(5, ...outcomes.map((outcome) => outcome.label.length));
  console.log('\nverify summary');
  console.log(`  ${'check'.padEnd(width)}  ${'result'.padEnd(22)}  ${'sec'.padStart(6)}  because`);
  for (const outcome of outcomes) {
    const because =
      outcome.because.length > 70 ? `${outcome.because.slice(0, 67)}...` : outcome.because;
    console.log(
      `  ${outcome.label.padEnd(width)}  ${outcome.result.padEnd(22)}  ${outcome.seconds.toFixed(1).padStart(6)}  ${because}`,
    );
  }
}

function main(): number {
  const args = process.argv.slice(2);
  const run = args.includes('--run');
  const record = args.includes('--record');
  if (record && !run) {
    console.error('✗ --record needs --run: only executed, green checks are recorded');
    return 2;
  }
  if (record && args.includes('--files')) {
    console.error(
      '✗ --record cannot be combined with --files: a simulated change set proves nothing',
    );
    return 2;
  }
  const since = option(args, '--since');
  const mode: PlanMode = args.includes('--all')
    ? 'all'
    : args.includes('--stale')
      ? 'stale'
      : 'changed';
  const viewports = option(args, '--viewports') === 'all' ? 'all' : 'quick';

  const registry = readRegistry(STATE_PATH);
  const io = gitIo(root);
  const recorded = Object.keys(registry.checks).length > 0;
  let before: Record<string, string> | undefined;
  let stale: Set<string> | undefined;
  if (mode !== 'all' && recorded) {
    before = computeFingerprints(CHECKS, io, FULL_WIDE);
    stale = staleIds(CHECKS, before, registry);
  } else if (mode === 'stale') {
    stale = new Set(CHECKS.map((check) => check.id));
  }

  const simulated = filesOption(args);
  const changed = mode === 'changed' ? (simulated ?? detectChanged(since ?? 'HEAD')) : [];
  const plan = planChecks({
    mode,
    changed,
    viewports,
    ...(stale ? { staleIds: stale } : {}),
  });
  printPlan(plan, mode, changed.length);
  if (!run) {
    console.log('\ndry run: pass --run to execute this plan');
    return 0;
  }
  if (plan.commands.length === 0) return 0;

  if (record && !before) before = computeFingerprints(CHECKS, io, FULL_WIDE);
  const startedAt = Date.now();
  const outcomes = execute(plan);
  printTable(outcomes);
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  const saved = Math.round((1 - elapsed / FULL_STACK_BASELINE_SECONDS) * 100);
  console.log(
    `elapsed ${elapsed}s (full stack baseline ${FULL_STACK_BASELINE_SECONDS} s: saved ${saved}%)`,
  );
  const green = outcomes.every((outcome) => outcome.passed);

  if (record) {
    if (!green) {
      console.log('\nnot recorded: the run was not green');
    } else {
      try {
        const after = computeFingerprints(CHECKS, io, FULL_WIDE);
        const checks = { ...registry.checks };
        const skipped: string[] = [];
        for (const id of outcomes.flatMap((outcome) => outcome.covers)) {
          const fingerprint = after[id];
          if (fingerprint === undefined || fingerprint !== before?.[id]) {
            skipped.push(id);
            continue;
          }
          checks[id] = { fingerprint, recordedAt: new Date().toISOString(), result: 'pass' };
        }
        writeRegistry(STATE_PATH, { version: 1, checks });
        console.log(
          `\nrecorded ${outcomes.flatMap((o) => o.covers).length - skipped.length} checks in odd/verification-state.json`,
        );
        if (skipped.length > 0)
          console.log(`not recorded (scope changed during the run): ${skipped.join(', ')}`);
      } catch (error) {
        console.log(`\nnot recorded: could not fingerprint the tree (${String(error)})`);
      }
    }
  }
  return green ? 0 : 1;
}

process.exitCode = main();
