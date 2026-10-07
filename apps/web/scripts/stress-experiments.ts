/**
 * Stress tool for the paginated experiments list: builds the site in a TEMPORARY workspace with N
 * generated experiments and reports how many pages came out, the HTML bytes of each page and the
 * cost of one compact card, then checks that the pager links resolve between pages. The real
 * `experiments.json` and `src/assets/experiments/` are never touched: the workspace is a copy that
 * is deleted at the end. `pnpm stress:experiments [count] [--serve <port>]`, 30 entries by default.
 * With `--serve` the temporary build stays up with `astro preview` on that port until the process
 * is stopped (Ctrl+C), for browser checks.
 */
import { type ChildProcess, spawn } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

import { createFixtureWorkspace, neutralizeFixtureIntegrations } from './fixture-workspace.ts';

/** Names of the stress entries: `stress-01`, `stress-02`, ... */
const slug = (n: number): string => `stress-${String(n).padStart(3, '0')}`;

const TAGS = ['astro', 'typescript', 'cloudflare', 'tooling', 'ai-agents'] as const;
const STATUSES = ['running', 'shipped', 'archived'] as const;
const FEATURED = 3;
const FEATURED_WITH_GALLERY = 2;
const GALLERY_SIZE = 4;

export type StressImage = { slug: string; files: string[] };

export type GeneratedExperiments = {
  /** The content of a stress `experiments.json`, keyed by entry slug. */
  entries: Record<string, Record<string, unknown>>;
  /** Which image files each entry needs in `src/assets/experiments/<slug>/`. */
  images: StressImage[];
};

const image = (file: string, n: number) => ({
  file,
  alt: { es: `Captura ${n} de prueba`, en: `Test screenshot ${n}` },
  caption: { es: `Captura ${n}`, en: `Shot ${n}` },
});

/**
 * `total` experiments: three featured (the first two with a four-image gallery, the third with one
 * image) and the rest compact, spread over several years, every third with a cover. Pure and
 * deterministic, so the same count always yields the same site.
 */
export function generateExperiments(total: number): GeneratedExperiments {
  if (!Number.isInteger(total) || total < 1) throw new Error('count must be a positive integer');
  const entries: GeneratedExperiments['entries'] = {};
  const images: StressImage[] = [];
  for (let n = 1; n <= total; n++) {
    const isFeatured = n <= FEATURED;
    const compactIndex = n - FEATURED - 1;
    const year = isFeatured ? 2026 : Math.max(2000, 2026 - Math.floor(compactIndex / 6));
    const gallery = isFeatured
      ? n <= FEATURED_WITH_GALLERY
        ? GALLERY_SIZE
        : 1
      : compactIndex % 3 === 0
        ? 1
        : 0;
    const files = Array.from({ length: gallery }, (_, i) =>
      i === 0 ? 'cover.jpg' : `shot-${i + 1}.jpg`,
    );
    const id = slug(n);
    entries[id] = {
      title: `Stress experiment ${String(n).padStart(3, '0')}`,
      description: {
        es: `Experimento de prueba número ${n}: una descripción de longitud parecida a la real para medir el peso de cada tarjeta.`,
        en: `Test experiment number ${n}: a description about as long as a real one, to measure the weight of each card.`,
      },
      tags: [TAGS[n % TAGS.length], TAGS[(n + 2) % TAGS.length]],
      year,
      status: STATUSES[n % STATUSES.length],
      ...(n % 2 === 0
        ? { url: `https://example.com/${id}/` }
        : { repo: `https://github.com/example/${id}` }),
      ...(isFeatured ? { featured: true } : {}),
      ...(files.length > 0 ? { images: files.map((file, i) => image(file, i + 1)) } : {}),
    };
    if (files.length > 0) images.push({ slug: id, files });
  }
  return { entries, images };
}

/** Pathname of a built page keyed as the site serves it: `/experiments/`, `/en/experiments/page/2/`. */
export type BuiltPages = Readonly<Record<string, string>>;

const attr = (html: string, tag: string, name: string): string[] =>
  [...html.matchAll(new RegExp(`<link[^>]*\\brel="${tag}"[^>]*>`, 'g'))].flatMap(([link]) => {
    const value = new RegExp(`\\b${name}="([^"]*)"`).exec(link ?? '')?.[1];
    return value === undefined ? [] : [value];
  });

const pathOf = (url: string): string => new URL(url, 'https://stress.invalid').pathname;

const pagerNav = (html: string): string =>
  /<nav[^>]*\bclass="xp-pager"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? '';

const pagerHrefs = (html: string): string[] =>
  [...pagerNav(html).matchAll(/\bhref="([^"]+)"/g)].map((match) => match[1] ?? '');

/**
 * Reads the built HTML and returns every problem found, an empty list when all is well: every pager
 * link points at a built page, the current page is exactly one non-link item, a page 1 URL never
 * exists, and each page has a self canonical, prev/next heads that match its neighbours and
 * hreflang alternates for the same page number in the other locale.
 */
export function checkPagerLinks(pages: BuiltPages, expectedPages: number): string[] {
  const problems: string[] = [];
  for (const prefix of ['', '/en']) {
    if (`${prefix}/experiments/page/1/` in pages)
      problems.push(`${prefix}/experiments/page/1/ exists`);
    for (let n = 1; n <= expectedPages; n++) {
      const path = n === 1 ? `${prefix}/experiments/` : `${prefix}/experiments/page/${n}/`;
      const html = pages[path];
      if (html === undefined) {
        problems.push(`${path} was not built`);
        continue;
      }
      const hrefs = pagerHrefs(html);
      if (expectedPages > 1 && hrefs.length === 0) problems.push(`${path} has no pager`);
      for (const href of hrefs)
        if (!(href in pages)) problems.push(`${path}: pager link ${href} does not resolve`);
      if (hrefs.includes(path)) problems.push(`${path}: the current page is a link`);
      // Only inside the pager: the site navbar marks its own current link the same way.
      const current = (pagerNav(html).match(/aria-current="page"/g) ?? []).length;
      if (expectedPages > 1 && current !== 1)
        problems.push(`${path}: ${current} aria-current items`);
      const canonical = attr(html, 'canonical', 'href').map(pathOf);
      if (canonical.length !== 1 || canonical[0] !== path)
        problems.push(`${path}: canonical is ${canonical.join(',') || 'missing'}`);
      const prev = attr(html, 'prev', 'href').map(pathOf);
      const next = attr(html, 'next', 'href').map(pathOf);
      const prevPath = n === 2 ? `${prefix}/experiments/` : `${prefix}/experiments/page/${n - 1}/`;
      const nextPath = `${prefix}/experiments/page/${n + 1}/`;
      if (n > 1 && prev.join() !== prevPath)
        problems.push(`${path}: rel=prev is ${prev.join() || 'missing'}`);
      if (n === 1 && prev.length > 0) problems.push(`${path}: page 1 has rel=prev`);
      if (n < expectedPages && next.join() !== nextPath)
        problems.push(`${path}: rel=next is ${next.join() || 'missing'}`);
      if (n === expectedPages && next.length > 0)
        problems.push(`${path}: the last page has rel=next`);
      const otherLocale = prefix === '' ? `/en${path}` : path.replace(/^\/en/, '');
      const alternates = attr(html, 'alternate', 'href').map(pathOf);
      if (!alternates.includes(otherLocale))
        problems.push(`${path}: hreflang alternate ${otherLocale} missing`);
      if (/<meta name="robots"[^>]*noindex/.test(html)) problems.push(`${path}: noindex`);
    }
  }
  return problems;
}

export type PageWeight = { path: string; bytes: number; cards: number };

/** Number of compact cards in a built page. */
export const countCards = (html: string): number =>
  (html.match(/<li id="[^"]+" class="xc"/g) ?? []).length;

/**
 * Marginal HTML cost of one compact card, in bytes: the difference between two pages with a
 * different number of cards divided by that difference. Only the pages after the first are
 * compared: page 1 also holds the big pieces, so it has another shell and would inflate the cost
 * (it did: 2,563 B against about 1,000 B between pages 2 and 3). Null when no two of those pages
 * differ in card count.
 */
export function perCardCost(weights: readonly PageWeight[]): number | null {
  const later = weights.filter((w) => /\/page\/\d+\/$/.test(w.path));
  const sorted = later.filter((w) => w.cards > 0).sort((a, b) => b.cards - a.cards);
  const [most] = sorted;
  const fewest = sorted.at(-1);
  if (!most || !fewest || most.cards === fewest.cards) return null;
  return (most.bytes - fewest.bytes) / (most.cards - fewest.cards);
}

function readBuilt(client: string, prefix: string): BuiltPages {
  const pages: Record<string, string> = {};
  const add = (path: string): boolean => {
    const file = join(client, path, 'index.html');
    if (!existsSync(file)) return false;
    pages[path] = readFileSync(file, 'utf8');
    return true;
  };
  add(`${prefix}/experiments/`);
  for (let n = 2; add(`${prefix}/experiments/page/${n}/`); n++);
  // `/page/1/` must not exist: record it if it does so the check reports it.
  add(`${prefix}/experiments/page/1/`);
  return pages;
}

const run = (cli: string, cwd: string, args: string[]): Promise<void> =>
  new Promise((accept, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd,
      stdio: ['ignore', 'ignore', 'inherit'],
      env: { ...process.env, SITE_INDEXABLE: 'true' },
    });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? accept() : reject(new Error(`astro ${args[0]} exited with ${code}`)),
    );
  });

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const serveAt = args.indexOf('--serve');
  const port = serveAt >= 0 ? (args[serveAt + 1] ?? '4331') : undefined;
  const count = Number(
    args.find((arg, i) => /^\d+$/.test(arg) && (serveAt < 0 || i !== serveAt + 1)) ?? 30,
  );
  const source = resolve(import.meta.dirname, '../../..');
  const workspace = createFixtureWorkspace(source, join(source, 'tests/fixtures/notes'));
  let preview: ChildProcess | undefined;
  const stop = (): void => {
    preview?.kill('SIGTERM');
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    neutralizeFixtureIntegrations(workspace.web);
    const { entries, images } = generateExperiments(count);
    writeFileSync(
      join(workspace.web, 'src/content/experiments.json'),
      `${JSON.stringify(entries, null, 2)}\n`,
    );
    const cover = join(source, 'apps/web/src/assets/experiments/elvinlab-dev/cover.jpg');
    for (const { slug: id, files } of images) {
      const folder = join(workspace.web, 'src/assets/experiments', id);
      mkdirSync(folder, { recursive: true });
      for (const file of files) copyFileSync(cover, join(folder, file));
    }
    const cli = join(realpathSync(join(source, 'apps/web/node_modules/astro')), 'bin/astro.mjs');
    console.log(`Building ${count} generated experiments in a temporary workspace...`);
    await run(cli, workspace.web, ['build']);

    const client = join(workspace.web, 'dist/client');
    const built = { ...readBuilt(client, ''), ...readBuilt(client, '/en') };
    const spanish = Object.keys(built)
      .filter((path) => !path.startsWith('/en/') && !path.endsWith('/page/1/'))
      .sort();
    const pageCount = spanish.length;
    const weights: PageWeight[] = spanish.map((path) => ({
      path,
      bytes: Buffer.byteLength(built[path] ?? ''),
      cards: countCards(built[path] ?? ''),
    }));
    console.log(`\nGenerated pages per locale: ${pageCount}`);
    for (const { path, bytes, cards } of weights) {
      console.log(
        `  ${path.padEnd(26)} ${String(bytes).padStart(8)} B  ${(bytes / 1024).toFixed(1).padStart(6)} KiB  ${cards} compact cards`,
      );
    }
    const cost = perCardCost(weights);
    console.log(
      `Marginal HTML cost per compact card: ${cost === null ? 'n/a (one page)' : `${cost.toFixed(0)} B`}`,
    );

    const problems = checkPagerLinks(built, pageCount);
    if (problems.length > 0) {
      console.error(`\nPager checks FAILED:\n  - ${problems.join('\n  - ')}`);
      process.exitCode = 1;
    } else {
      console.log(
        `Pager checks passed: ${pageCount} pages x 2 locales, links resolve, canonical/prev/next/hreflang consistent.`,
      );
    }

    if (port !== undefined && process.exitCode !== 1) {
      console.log(`\nServing the temporary build on http://127.0.0.1:${port}/ (Ctrl+C to stop)`);
      await new Promise<void>((done) => {
        preview = spawn(
          process.execPath,
          [cli, 'preview', '--ignore-lock', '--host', '127.0.0.1', '--port', port],
          {
            cwd: workspace.web,
            stdio: 'inherit',
            env: { ...process.env, SITE_INDEXABLE: 'true' },
          },
        );
        preview.once('exit', () => done());
      });
    }
  } finally {
    workspace.cleanup();
  }
}

if (import.meta.filename === process.argv[1]) await main();
