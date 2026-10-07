import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Page-weight guardrail: after a build, measures the inline `<style>` bytes and the HTML bytes of
 * every page and fails when a page type exceeds its budget (`page-weight-budget.json`). Head and
 * hero bytes are expensive for LCP in the lab (about 8-9 ms per raw KB), and the whole site
 * stylesheet is inlined in every page, so a regression of a few KB must fail before a release.
 * See `docs/TESTING.md` ("Page weight budget") and `docs/DESIGN.md` ("Page weight rule").
 */

export type PageType =
  | 'home'
  | 'me'
  | 'experiments'
  | 'changelog'
  | 'contact'
  | 'subscribe'
  | 'notes-index'
  | 'note'
  | 'default';

export interface PageWeight {
  /** URL path of the page, e.g. `/en/me/`. */
  path: string;
  /** Total bytes of the text of every inline `<style>` element. */
  styleBytes: number;
  /** Bytes of the HTML file. */
  htmlBytes: number;
}

export interface TypeBudget {
  /** Why the budget is what it is: one short sentence. */
  why: string;
  styleBytes: number;
  htmlBytes: number;
  /** Largest measured values of the type when the budget was set (documentation only). */
  measured?: { styleBytes: number; htmlBytes: number; date: string };
}

export interface Budgets {
  types: Readonly<Partial<Record<PageType, TypeBudget>>>;
}

export interface ReportRow extends PageWeight {
  type: PageType;
  styleBudget: number;
  htmlBudget: number;
  ok: boolean;
}

export interface Evaluation {
  rows: ReportRow[];
  failures: ReportRow[];
}

/** Notes sub-routes that are not a note page. */
const NOT_A_NOTE = new Set(['page', 'tag', 'tags']);

/** The page type of a URL path (the `/en/` locale prefix does not change it). */
export function classifyPage(path: string): PageType {
  const segments = path.split('/').filter(Boolean);
  if (segments[0] === 'en') segments.shift();
  const [first, second, ...rest] = segments;
  if (first === undefined) return 'home';
  // `/changelog/` and its later pages `/changelog/page/N/`.
  if (first === 'changelog' && (second === undefined || second === 'page')) return 'changelog';
  if (second === undefined) {
    if (first === 'me' || first === 'experiments' || first === 'contact' || first === 'subscribe')
      return first;
    if (first === 'notes') return 'notes-index';
    return 'default';
  }
  if (first === 'notes' && rest.length === 0 && !NOT_A_NOTE.has(second)) return 'note';
  return 'default';
}

const STYLE_ELEMENT = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;

/** Total bytes of the text inside every inline `<style>` element of an HTML document. */
export function inlineStyleBytes(html: string): number {
  let total = 0;
  for (const match of html.matchAll(STYLE_ELEMENT)) total += Buffer.byteLength(match[1] ?? '');
  return total;
}

function listIndexFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listIndexFiles(path));
    else if (entry.isFile() && entry.name === 'index.html') files.push(path);
  }
  return files;
}

/** Measures every `**\/index.html` of a build (`dist/client`), sorted by URL path. */
export function collectPageWeights(clientRoot: string): PageWeight[] {
  const root = resolve(clientRoot);
  return listIndexFiles(root)
    .map((file) => {
      const html = readFileSync(file);
      const directory = relative(root, file).split(sep).slice(0, -1).join('/');
      return {
        path: directory === '' ? '/' : `/${directory}/`,
        styleBytes: inlineStyleBytes(html.toString('utf8')),
        htmlBytes: html.byteLength,
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** Compares every page with the budget of its type; the `default` type covers the rest. */
export function evaluatePages(pages: readonly PageWeight[], budgets: Budgets): Evaluation {
  const rows = pages.map((page): ReportRow => {
    const type = classifyPage(page.path);
    const budget = budgets.types[type] ?? budgets.types.default;
    if (!budget)
      throw new Error(`No budget for page type "${type}" and no "default" type to fall back to`);
    return {
      ...page,
      type,
      styleBudget: budget.styleBytes,
      htmlBudget: budget.htmlBytes,
      ok: page.styleBytes <= budget.styleBytes && page.htmlBytes <= budget.htmlBytes,
    };
  });
  return { rows, failures: rows.filter((row) => !row.ok) };
}

function metric(label: string, value: number, budget: number): string {
  const over = value > budget ? ` (+${value - budget} B)` : '';
  return `${label} ${value} / ${budget} B${over}`;
}

/** A table with every page (numbers are printed even when everything passes). */
export function formatReport({ rows, failures }: Evaluation): string {
  const pathWidth = Math.max(4, ...rows.map((row) => row.path.length));
  const typeWidth = Math.max(4, ...rows.map((row) => row.type.length));
  const lines = rows.map(
    (row) =>
      `${row.ok ? 'PASS' : 'FAIL'}  ${row.path.padEnd(pathWidth)}  ${row.type.padEnd(typeWidth)}  ` +
      `${metric('style', row.styleBytes, row.styleBudget)}  ${metric('html', row.htmlBytes, row.htmlBudget)}`,
  );
  lines.push(
    failures.length === 0
      ? `All ${rows.length} pages within their page-weight budget.`
      : `${failures.length} of ${rows.length} pages over budget. Shrink the page, or raise the budget consciously (docs/TESTING.md, "Page weight budget").`,
  );
  return lines.join('\n');
}

function roundUp(value: number): number {
  return Math.ceil(value / 100 - 1e-9) * 100;
}

/** Budgets from today's build: the largest page of each type plus a headroom, rounded up to 100 B. */
export function suggestBudgets(
  pages: readonly PageWeight[],
  headroom: number,
): Partial<Record<PageType, { styleBytes: number; htmlBytes: number }>> {
  const largest = new Map<PageType, { styleBytes: number; htmlBytes: number }>();
  for (const page of pages) {
    const type = classifyPage(page.path);
    const current = largest.get(type) ?? { styleBytes: 0, htmlBytes: 0 };
    largest.set(type, {
      styleBytes: Math.max(current.styleBytes, page.styleBytes),
      htmlBytes: Math.max(current.htmlBytes, page.htmlBytes),
    });
  }
  return Object.fromEntries(
    [...largest].map(([type, value]) => [
      type,
      {
        styleBytes: roundUp(value.styleBytes * (1 + headroom)),
        htmlBytes: roundUp(value.htmlBytes * (1 + headroom)),
      },
    ]),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const clientRoot = resolve(import.meta.dirname, '../dist/client');
  const pages = collectPageWeights(clientRoot);
  if (pages.length === 0) throw new Error(`No built pages under ${clientRoot}: build first`);
  if (process.argv.includes('--suggest')) {
    console.log(JSON.stringify(suggestBudgets(pages, 0.04), null, 2));
  } else {
    const budgets = JSON.parse(
      readFileSync(resolve(import.meta.dirname, 'page-weight-budget.json'), 'utf8'),
    ) as Budgets;
    const evaluation = evaluatePages(pages, budgets);
    console.log(formatReport(evaluation));
    if (evaluation.failures.length > 0) process.exitCode = 1;
  }
}
