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

export const PAGE_TYPES = [
  'home',
  'me',
  'experiments',
  'education',
  'changelog',
  'contact',
  'subscribe',
  'result',
  'notes-index',
  'note',
  'topic',
  'default',
] as const;

export type PageType = (typeof PAGE_TYPES)[number];

/**
 * The page types whose HTML grows with the content, and what grows it. Every other type is fixed and
 * stays strict. Adding a page type to `PAGE_TYPES` without deciding which side it is on fails
 * `page-weight-budget.test.ts`, so growth is a decision made once, not a budget patched later.
 */
export const CONTENT_GROWTH = {
  'notes-index': 'listed-notes',
  topic: 'listed-notes',
  note: 'article-body',
} as const satisfies Partial<Record<PageType, 'listed-notes' | 'article-body'>>;

export const FIXED_PAGE_TYPES: readonly PageType[] = PAGE_TYPES.filter(
  (type) => !(type in CONTENT_GROWTH),
);

export interface PageWeight {
  /** URL path of the page, e.g. `/en/me/`. */
  path: string;
  /** Total bytes of the text of every inline `<style>` element. */
  styleBytes: number;
  /** Bytes of the HTML file. */
  htmlBytes: number;
  /** Rendered article body, delimited by inert templates in NotePage. */
  articleHtmlBytes?: number;
  /** Actual note rows listed by the page: the notes index (rows) or a topic page (its marker). */
  notesCount?: number;
}

export interface TypeBudget {
  /** Why the budget is what it is: one short sentence. */
  why: string;
  styleBytes: number;
  htmlBytes: number;
  /** Additional HTML per listed note (index row or topic row); htmlBytes then limits the fixed shell. */
  htmlBytesPerNote?: number;
  /** Article content ceiling; htmlBytes then limits the fixed shell. */
  articleBytes?: number;
  /** Absolute ceiling, even when a listing has many rows. */
  maxHtmlBytes?: number;
  /** Largest measured values of the type when the budget was set (documentation only). */
  measured?: {
    styleBytes: number;
    /** Fixed shell for content-aware budgets; total HTML otherwise. */
    htmlBytes: number;
    totalHtmlBytes?: number;
    articleHtmlBytes?: number;
    notesCount?: number;
    date: string;
  };
}

export interface Budgets {
  types: Readonly<Partial<Record<PageType, TypeBudget>>>;
}

export interface ReportRow extends PageWeight {
  type: PageType;
  styleBudget: number;
  htmlBudget: number;
  articleBudget?: number;
  /** How many more listed notes fit under the absolute ceiling (scaled types with a ceiling only). */
  roomNotes?: number;
  ok: boolean;
}

export interface Evaluation {
  rows: ReportRow[];
  failures: ReportRow[];
  /** Passing rows whose room is nearly spent: the next paginate-or-raise decision, seen early. */
  warnings: ReportRow[];
}

/** Fewer notes than this of room left is worth a warning (never a failure). */
export const ROOM_WARNING_NOTES = 5;

/** Notes sub-routes that are not a note page. */
const NOT_A_NOTE = new Set(['page', 'tag', 'tags']);

/** The page type of a URL path (the `/en/` locale prefix does not change it). */
export function classifyPage(path: string): PageType {
  const segments = path.split('/').filter(Boolean);
  if (segments[0] === 'en') segments.shift();
  const [first, second, ...rest] = segments;
  if (first === undefined) return 'home';
  // The 404 page and the confirm and unsubscribe results: one short card under the compact banner.
  if (first === '404') return 'result';
  if (
    first === 'subscribe' &&
    (second === 'confirm' || second === 'unsubscribe') &&
    rest.length === 0
  )
    return 'result';
  // `/changelog/` and its later pages `/changelog/page/N/`.
  if (first === 'changelog' && (second === undefined || second === 'page')) return 'changelog';
  // `/education/`, its later pages `/education/page/N/` and the alternate order `/education/<sort>/`
  // (a noindex duplicate of the same timeline, so it weighs the same).
  if (first === 'education') return 'education';
  if (second === undefined) {
    if (first === 'me' || first === 'experiments' || first === 'contact' || first === 'subscribe')
      return first;
    if (first === 'notes') return 'notes-index';
    return 'default';
  }
  // `/notes/tag/<topic>/`: a static topic page, about the size of the notes index.
  if (first === 'notes' && second === 'tag' && rest.length === 1) return 'topic';
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

/** Inert templates survive HTML compression and delimit only the rendered MDX body.
 * Reject missing halves, duplicates and reversed markers rather than silently exempting HTML. */
export function articleContentBytes(html: string): number | undefined {
  const starts = [
    ...html.matchAll(/<template\b[^>]*\bdata-page-weight-start(?:="")?\s*><\/template>/gi),
  ];
  const ends = [
    ...html.matchAll(/<template\b[^>]*\bdata-page-weight-end(?:="")?\s*><\/template>/gi),
  ];
  if (starts.length === 0 && ends.length === 0) return undefined;
  const start = starts[0];
  const end = ends[0];
  if (
    starts.length !== 1 ||
    ends.length !== 1 ||
    !start ||
    !end ||
    start.index + start[0].length > end.index
  )
    throw new Error('Invalid article page-weight markers');
  return Buffer.byteLength(html.slice(start.index + start[0].length, end.index));
}

export function noteRowCount(html: string): number {
  return [...html.matchAll(/<article\b[^>]*\bdata-note-row(?:="")?(?=\s|>)[^>]*>/gi)].length;
}

/** Notes listed by a topic page, read from the `data-topic-notes` marker of `TopicPage`; undefined if absent. */
export function topicNoteCount(html: string): number | undefined {
  const match = /\bdata-topic-notes="(\d+)"/.exec(html);
  return match?.[1] === undefined ? undefined : Number(match[1]);
}

function listIndexFiles(directory: string, root = directory): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listIndexFiles(path, root));
    else if (
      entry.isFile() &&
      (entry.name === 'index.html' || (entry.name === '404.html' && directory === root))
    )
      files.push(path);
  }
  return files;
}

/** Measures every `**\/index.html` and the root `404.html` of a build (`dist/client`), sorted by URL path. */
export function collectPageWeights(clientRoot: string): PageWeight[] {
  const root = resolve(clientRoot);
  return listIndexFiles(root)
    .map((file) => {
      const html = readFileSync(file);
      const parts = relative(root, file).split(sep);
      // `404.html` is the one page that is not an `index.html`: it answers every unknown path.
      const directory =
        parts[parts.length - 1] === '404.html' ? '404' : parts.slice(0, -1).join('/');
      const path = directory === '' ? '/' : `/${directory}/`;
      const text = html.toString('utf8');
      const type = classifyPage(path);
      const articleHtmlBytes = type === 'note' ? articleContentBytes(text) : undefined;
      const notesCount =
        type === 'notes-index'
          ? noteRowCount(text)
          : type === 'topic'
            ? topicNoteCount(text)
            : undefined;
      return {
        path,
        styleBytes: inlineStyleBytes(html.toString('utf8')),
        htmlBytes: html.byteLength,
        ...(articleHtmlBytes !== undefined && { articleHtmlBytes }),
        ...(notesCount !== undefined && { notesCount }),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** How many more listed notes a scaled page fits under its absolute ceiling, at the per-note allowance
 * (a new row costs about that much, usually a bit less). Undefined when the page does not scale or has no ceiling. */
export function notesRoom(page: PageWeight, budget: TypeBudget): number | undefined {
  if (budget.htmlBytesPerNote === undefined || budget.maxHtmlBytes === undefined) return undefined;
  if (page.notesCount === undefined) return undefined;
  return Math.max(0, Math.floor((budget.maxHtmlBytes - page.htmlBytes) / budget.htmlBytesPerNote));
}

/** Compares every page with the budget of its type; the `default` type covers the rest. */
export function evaluatePages(pages: readonly PageWeight[], budgets: Budgets): Evaluation {
  const rows = pages.map((page): ReportRow => {
    const type = classifyPage(page.path);
    const budget = budgets.types[type] ?? budgets.types.default;
    if (!budget)
      throw new Error(`No budget for page type "${type}" and no "default" type to fall back to`);
    if (budget.articleBytes !== undefined && page.articleHtmlBytes === undefined)
      throw new Error(`Missing article page-weight markers on ${page.path}; rebuild the site`);
    if (budget.htmlBytesPerNote !== undefined && page.notesCount === undefined)
      throw new Error(`Missing note row count on ${page.path}; rebuild the site`);
    const contentBytes = budget.articleBytes === undefined ? 0 : (page.articleHtmlBytes ?? 0);
    const htmlBudget = Math.min(
      budget.htmlBytes + contentBytes + (budget.htmlBytesPerNote ?? 0) * (page.notesCount ?? 0),
      budget.maxHtmlBytes ?? Number.POSITIVE_INFINITY,
    );
    const roomNotes = notesRoom(page, budget);
    const contentOk = budget.articleBytes === undefined || contentBytes <= budget.articleBytes;
    return {
      ...page,
      type,
      styleBudget: budget.styleBytes,
      htmlBudget,
      ...(budget.articleBytes !== undefined && { articleBudget: budget.articleBytes }),
      ...(roomNotes !== undefined && { roomNotes }),
      ok: contentOk && page.styleBytes <= budget.styleBytes && page.htmlBytes <= htmlBudget,
    };
  });
  return {
    rows,
    failures: rows.filter((row) => !row.ok),
    warnings: rows.filter(
      (row) => row.ok && row.roomNotes !== undefined && row.roomNotes < ROOM_WARNING_NOTES,
    ),
  };
}

function metric(label: string, value: number, budget: number): string {
  const over = value > budget ? ` (+${value - budget} B)` : '';
  return `${label} ${value} / ${budget} B${over}`;
}

/** A table with every page (numbers are printed even when everything passes). */
export function formatReport({ rows, failures, warnings }: Evaluation): string {
  const pathWidth = Math.max(4, ...rows.map((row) => row.path.length));
  const typeWidth = Math.max(4, ...rows.map((row) => row.type.length));
  const lines = rows.map(
    (row) =>
      `${row.ok ? 'PASS' : 'FAIL'}  ${row.path.padEnd(pathWidth)}  ${row.type.padEnd(typeWidth)}  ` +
      `${metric('style', row.styleBytes, row.styleBudget)}  ${metric('html', row.htmlBytes, row.htmlBudget)}` +
      (row.articleBudget === undefined
        ? ''
        : `  ${metric('article', row.articleHtmlBytes ?? 0, row.articleBudget)}`) +
      (row.notesCount === undefined ? '' : `  notes ${row.notesCount}`) +
      (row.roomNotes === undefined ? '' : `  room +${row.roomNotes} notes`),
  );
  for (const row of warnings)
    lines.push(
      `WARN  ${row.path}  room +${row.roomNotes} notes before ${row.type} pages need pagination or a conscious ceiling raise.`,
    );
  const tightest = new Map<PageType, number>();
  for (const row of rows)
    if (row.roomNotes !== undefined)
      tightest.set(row.type, Math.min(tightest.get(row.type) ?? row.roomNotes, row.roomNotes));
  if (tightest.size > 0)
    lines.push(
      `Room left: ${[...tightest].map(([type, room]) => `${type} +${room} notes`).join(', ')}`,
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
  budgets?: Budgets,
): Partial<Record<PageType, { styleBytes: number; htmlBytes: number }>> {
  const largest = new Map<PageType, { styleBytes: number; htmlBytes: number }>();
  for (const page of pages) {
    const type = classifyPage(page.path);
    const budget = budgets?.types[type];
    const fixedHtmlBytes =
      page.htmlBytes -
      (budget?.articleBytes === undefined ? 0 : (page.articleHtmlBytes ?? 0)) -
      (budget?.htmlBytesPerNote ?? 0) * (page.notesCount ?? 0);
    const current = largest.get(type) ?? { styleBytes: 0, htmlBytes: 0 };
    largest.set(type, {
      styleBytes: Math.max(current.styleBytes, page.styleBytes),
      htmlBytes: Math.max(current.htmlBytes, fixedHtmlBytes),
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
  const budgets = JSON.parse(
    readFileSync(resolve(import.meta.dirname, 'page-weight-budget.json'), 'utf8'),
  ) as Budgets;
  if (process.argv.includes('--suggest')) {
    console.log(JSON.stringify(suggestBudgets(pages, 0.04, budgets), null, 2));
  } else {
    const evaluation = evaluatePages(pages, budgets);
    console.log(formatReport(evaluation));
    if (evaluation.failures.length > 0) process.exitCode = 1;
  }
}
