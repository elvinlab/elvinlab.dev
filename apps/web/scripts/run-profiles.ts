import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { E2E_FEATURE_PROFILE_ENV, E2E_PROFILES } from './e2e-profiles.ts';

/**
 * `pnpm test:profiles [name ...]`: runs the e2e suite (1280 px) once per adopter profile, each one
 * the real site with some features switched off, and fails when any run does. It is the proof that
 * someone who turns features off in `site.config.ts` still gets a green pipeline. With no name it
 * runs every profile in `e2e-profiles.ts`.
 */

export type Counts = { passed: number; failed: number; skipped: number };
export type ProfileResult = { name: string; counts: Counts; status: number };

/** The counts of the Playwright list reporter's summary; a line that is missing counts as zero. */
export function parseSummary(output: string): Counts {
  const count = (word: string): number => {
    const match = output.match(new RegExp(`^\\s+(\\d+) ${word}\\b`, 'm'));
    return match ? Number(match[1]) : 0;
  };
  return { passed: count('passed'), failed: count('failed'), skipped: count('skipped') };
}

/** The profiles to run: the ones named, or all of them; an unknown name fails with the choices. */
export function selectProfiles(names: readonly string[]): string[] {
  const known = Object.keys(E2E_PROFILES);
  const unknown = names.filter((name) => !known.includes(name));
  if (unknown.length > 0) {
    throw new Error(`unknown profile ${unknown.join(', ')}; use one of ${known.join(', ')}`);
  }
  return names.length > 0 ? [...names] : known;
}

/** The failing tests the reporter lists in its final summary, one line each (project › file › title). */
export function failedTests(output: string): string[] {
  return [...output.matchAll(/^ {4}(\[chromium-\d+\] › .+)$/gm)].map((match) =>
    (match[1] ?? '').trim(),
  );
}

/** A run failed when it had failures or exited non-zero (a crash must not look like a pass). */
const failed = (result: ProfileResult): boolean => result.counts.failed > 0 || result.status !== 0;

export function formatReport(results: readonly ProfileResult[]): string {
  const lines = results.map((result) => {
    const { passed, skipped, failed: bad } = result.counts;
    return `${failed(result) ? 'FAIL' : 'PASS'}  ${result.name.padEnd(10)} ${passed} passed, ${skipped} skipped, ${bad} failed`;
  });
  const bad = results.filter(failed).length;
  lines.push(
    bad > 0
      ? `${bad} of ${results.length} profiles failed`
      : `all ${results.length} profiles passed`,
  );
  return lines.join('\n');
}

function main(): void {
  const root = resolve(import.meta.dirname, '../../..');
  const names = selectProfiles(process.argv.slice(2).filter((arg) => !arg.startsWith('-')));
  const results: ProfileResult[] = [];
  for (const name of names) {
    console.log(`\n=== profile ${name}: ${E2E_PROFILES[name]?.description ?? ''}`);
    const run = spawnSync('pnpm', ['test:e2e:quick'], {
      cwd: root,
      env: { ...process.env, [E2E_FEATURE_PROFILE_ENV]: name },
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
    });
    const output = `${run.stdout}\n${run.stderr}`;
    const result = { name, counts: parseSummary(output), status: run.status ?? 1 };
    results.push(result);
    if (failed(result)) {
      const tests = failedTests(output);
      for (const line of tests.slice(0, 15)) console.log(`  ${line}`);
      if (tests.length > 15) console.log(`  ... and ${tests.length - 15} more`);
      if (tests.length === 0)
        console.log(`  exited ${run.status}: ${output.trim().split('\n').slice(-3).join(' | ')}`);
    }
  }
  console.log(`\n${formatReport(results)}`);
  process.exitCode = results.some(failed) ? 1 : 0;
}

if (import.meta.main) main();
