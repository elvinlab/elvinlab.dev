import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The subset of a Playwright JSON report the flake summary needs. A test's `status` is the final
 * outcome across its retries: `flaky` means it failed once and passed on the CI retry.
 */
export interface FlakyTestEntry {
  status?: string;
  projectName?: string;
}

export interface FlakySpec {
  title: string;
  file: string;
  tests?: FlakyTestEntry[];
}

export interface FlakySuite {
  specs?: FlakySpec[];
  suites?: FlakySuite[];
}

export interface FlakyReport {
  suites?: FlakySuite[];
}

export interface FlakyTest {
  title: string;
  file: string;
  projects: string[];
}

/** The tests whose final outcome is `flaky`, with the projects that flaked, in report order. */
export function flakyTests(report: FlakyReport): FlakyTest[] {
  const out: FlakyTest[] = [];
  const walk = (suite: FlakySuite): void => {
    for (const spec of suite.specs ?? []) {
      const projects = (spec.tests ?? [])
        .filter((test) => test.status === 'flaky')
        .map((test) => test.projectName ?? '');
      if (projects.length > 0) {
        out.push({ title: spec.title, file: spec.file, projects });
      }
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of report.suites ?? []) walk(suite);
  return out;
}

/** One markdown line per flaky test; an empty list prints nothing. */
export function flakyMarkdown(tests: readonly FlakyTest[]): string {
  return tests
    .map(({ title, file, projects }) => `- ${title} \`${file}\` [${projects.join(', ')}]`)
    .join('\n');
}

function main(): void {
  const file = resolve(process.argv[2] ?? 'playwright-report/results.json');
  let report: FlakyReport;
  try {
    report = JSON.parse(readFileSync(file, 'utf8')) as FlakyReport;
  } catch {
    // No report yet (the run failed before Playwright wrote one): nothing to list.
    return;
  }
  const markdown = flakyMarkdown(flakyTests(report));
  if (markdown) process.stdout.write(`${markdown}\n`);
}

if (import.meta.main) {
  main();
}
