import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

/**
 * Built-output check for published notes, no browser needed. After a build it proves that every
 * note in `src/content/notes/` reached the output: its page (with `<h1>` and a canonical link), a
 * row in the notes index, the sitemap and, for Spanish notes, the RSS feed; that every topic that
 * should have a page has one; and that no internal link in any built page points nowhere. It is
 * what the notes-only CI lane (ADR 0016) and `pnpm publish-note` run instead of e2e, because e2e
 * and Lighthouse build from a fixture workspace that does not contain the real notes.
 * Run with `pnpm check:built-notes` after `pnpm --filter web build`. Errors print as
 * `path: reason` and the exit code is 1.
 */

/** Routes the worker serves at runtime; they have no file in `dist/client` and are not checked. */
export const DYNAMIC_ROUTES: readonly string[] = ['/api/', '/cdn-cgi/', '/version.txt'];

/** Notes are written in Spanish or English; only Spanish notes go to the feed and the topics. */
const FEED_LANG = 'es';
const TOPIC_LANG = 'es';

export type NoteFrontmatter = { lang: string; tags: string[] };

const unquote = (value: string): string => value.trim().replace(/^(["'])(.*)\1$/, '$2');

/** `lang` and `tags` of a note, from the YAML frontmatter (inline `[a, b]` or block `- a` lists). */
export function parseNoteFrontmatter(mdx: string): NoteFrontmatter {
  const match = /^---\n([\s\S]*?)\n---/.exec(mdx);
  if (!match?.[1]) throw new Error('the note has no frontmatter block');
  const head = match[1];
  const lang = /^lang:[ \t]*(.+?)[ \t]*$/m.exec(head)?.[1];
  if (!lang) throw new Error('the note frontmatter has no lang');
  const inline = /^tags:[ \t]*\[(.*)\][ \t]*$/m.exec(head)?.[1];
  if (inline !== undefined) {
    return {
      lang: unquote(lang),
      tags: inline.split(',').map(unquote).filter(Boolean),
    };
  }
  const block = /^tags:[ \t]*\n((?:[ \t]*-[ \t]*.+\n?)*)/m.exec(head)?.[1] ?? '';
  const tags = block
    .split('\n')
    .map((line) => /^[ \t]*-[ \t]*(.+?)[ \t]*$/.exec(line)?.[1])
    .filter((tag): tag is string => tag !== undefined)
    .map(unquote);
  return { lang: unquote(lang), tags };
}

/** Heading lines (`# `…`###### `) that contain a `Fix` component, ignoring fenced code blocks.
 * `Fix` carries its text in props (`wrong`/`right`), so a `Fix` inside a heading would drop its words
 * from the heading slug (a trailing dash, a broken anchor) and from the table of contents. `Ink`
 * takes a `<slot>`, so its text reaches both, and it is allowed (DESIGN.md, "Notebook ink system"). */
export function fixInHeadingLines(mdx: string): string[] {
  const lines: string[] = [];
  let inFence = false;
  for (const line of mdx.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^#{1,6}\s+/.test(line) && /<Fix\b/.test(line)) lines.push(line.trim());
  }
  return lines;
}

const pathOf = (url: string): string => {
  try {
    return new URL(url, 'https://site.invalid').pathname;
  } catch {
    return url;
  }
};

/** URL paths of every `<loc>` of a sitemap or sitemap index. */
export function parseSitemapLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => pathOf((m[1] ?? '').trim()));
}

/** URL paths of the `<item>` links of an RSS feed (the channel link is not an item). */
export function parseRssPaths(xml: string): string[] {
  return [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)]
    .map((item) => /<link>([^<]+)<\/link>/.exec(item[0])?.[1])
    .filter((link): link is string => link !== undefined)
    .map((link) => pathOf(link.trim()));
}

/**
 * Site-local targets of `href` and `src`, resolved against the built page URL without query or hash.
 * External URLs, `//host`, `#anchor`, `mailto:` and the text inside `<script>` and `<style>` are
 * ignored (the opening tag of a script still counts, for its `src`).
 */
export function extractLocalLinks(html: string, pagePath = '/'): string[] {
  const stripped = html
    .replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, '<script$1></script>')
    .replace(/<style\b([^>]*)>[\s\S]*?<\/style>/gi, '<style$1></style>');
  const links: string[] = [];
  for (const tag of stripped.matchAll(/<[a-zA-Z][^>]*>/g)) {
    for (const attr of tag[0].matchAll(/\s(?:href|src)=(?:"([^"]*)"|'([^']*)')/g)) {
      const value = (attr[1] ?? attr[2] ?? '').trim();
      if (
        !value ||
        value.startsWith('#') ||
        value.startsWith('//') ||
        /^[a-z][a-z0-9+.-]*:/i.test(value)
      )
        continue;
      links.push(new URL(value, `https://site.invalid${pagePath}`).pathname);
    }
  }
  return links;
}

/** True when a root-relative path is a worker route or maps to a built file. */
export function resolvesToBuiltFile(path: string, exists: (relative: string) => boolean): boolean {
  if (
    DYNAMIC_ROUTES.some(
      (route) => path === route || (route.endsWith('/') && path.startsWith(route)),
    )
  )
    return true;
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    // keep the raw path: it will simply not resolve
  }
  const rel = decoded.slice(1);
  if (rel === '') return exists('index.html');
  if (rel.endsWith('/')) return exists(`${rel}index.html`);
  return exists(rel) || exists(`${rel}/index.html`) || exists(`${rel}.html`);
}

export type CheckInput = {
  /** `apps/web/src/content` (holds `notes/<slug>/index.mdx` and `topics.json`). */
  contentDir: string;
  /** `apps/web/dist/client`. */
  distDir: string;
  /** `site.notes.topicMinNotes`: fewest notes a topic needs to get a page. */
  topicMinNotes: number;
  /** False when the candidate configuration intentionally omits blog routes. Defaults to true. */
  blogEnabled?: boolean;
  /** Broken links already known and accepted, keyed `page|link` (see `KNOWN_BROKEN_LINKS`). */
  knownBrokenLinks?: Readonly<Record<string, string>>;
};

export type CheckReport = {
  errors: string[];
  /** Broken links that matched `knownBrokenLinks`: still printed, never silently dropped. */
  known: string[];
};

/**
 * Broken links the current build already has and that this check does not own. Each is printed
 * as a warning on every run so it stays visible; delete the entry when the page is fixed.
 */
export const KNOWN_BROKEN_LINKS: Readonly<Record<string, string>> = {
  '404.html|/en/404/':
    'the language switch of the 404 page targets /en/404/, which is not a built page',
  'en/subscribe/confirm/index.html|/en/notes/':
    'there is no English notes index (/en/notes/); SubscribeResultPage localizes /notes/',
  'en/subscribe/unsubscribe/index.html|/en/notes/':
    'there is no English notes index (/en/notes/); SubscribeResultPage localizes /notes/',
};

type PublishedNote = { slug: string; lang: string; tags: string[]; path: string };

const notePath = (slug: string, lang: string): string =>
  lang === 'en' ? `/en/notes/${slug}/` : `/notes/${slug}/`;

function readPublishedNotes(contentDir: string): PublishedNote[] {
  const notesDir = join(contentDir, 'notes');
  if (!existsSync(notesDir)) return [];
  return readdirSync(notesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(notesDir, entry.name, 'index.mdx')))
    .map((entry) => {
      const meta = parseNoteFrontmatter(
        readFileSync(join(notesDir, entry.name, 'index.mdx'), 'utf8'),
      );
      return { slug: entry.name, ...meta, path: notePath(entry.name, meta.lang) };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

type Topic = { intro?: string; tags: string[] };

function readTopics(contentDir: string): Record<string, Topic> {
  const file = join(contentDir, 'topics.json');
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Record<string, Topic>) : {};
}

function listHtml(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listHtml(path);
    return entry.isFile() && entry.name.endsWith('.html') ? [path] : [];
  });
}

/** Every problem found, as `path: reason` lines (paths relative to `dist/client`); empty means sound. */
export function checkBuiltNotes(input: CheckInput): string[] {
  return checkBuiltNotesReport(input).errors;
}

/** Like `checkBuiltNotes`, but also returns the known broken links that were tolerated. */
export function checkBuiltNotesReport(input: CheckInput): CheckReport {
  const { contentDir, distDir, topicMinNotes, blogEnabled = true, knownBrokenLinks = {} } = input;
  const errors: string[] = [];
  const known: string[] = [];
  const exists = (rel: string): boolean =>
    existsSync(join(distDir, rel)) && statSync(join(distDir, rel)).isFile();
  const read = (rel: string): string | undefined =>
    exists(rel) ? readFileSync(join(distDir, rel), 'utf8') : undefined;
  const notes = blogEnabled ? readPublishedNotes(contentDir) : [];

  // 1. Every published note has its page, with a heading and a canonical link.
  for (const note of notes) {
    const rel = `${note.path.slice(1)}index.html`;
    const html = read(rel);
    if (html === undefined) {
      errors.push(`${rel}: published note "${note.slug}" has no built page`);
      continue;
    }
    if (!/<h1[\s>]/i.test(html)) errors.push(`${rel}: no <h1>`);
    if (!/<link\b[^>]*\brel=["']canonical["']/i.test(html))
      errors.push(`${rel}: no canonical link`);
  }

  // 1b. No note puts a `Fix` component inside a heading: its text lives in props, so the heading
  // slug and the table of contents would drop it (DESIGN.md, "Notebook ink system").
  for (const note of notes) {
    const mdx = readFileSync(join(contentDir, 'notes', note.slug, 'index.mdx'), 'utf8');
    for (const line of fixInHeadingLines(mdx)) {
      errors.push(`notes/${note.slug}/index.mdx: Fix inside a heading — "${line}"`);
    }
  }

  // 2. The notes index lists every published note (all languages).
  if (notes.length > 0) {
    const index = read('notes/index.html');
    if (index === undefined) {
      errors.push('notes/index.html: missing although notes are published');
    } else {
      const rows = [
        ...index.matchAll(/<article\b[^>]*\bdata-note-row(?:="")?(?=\s|>)[^>]*>/gi),
      ].map((m) => /\bdata-slug="([^"]*)"/.exec(m[0])?.[1]);
      if (rows.length !== notes.length) {
        errors.push(
          `notes/index.html: ${rows.length} rows listed, ${notes.length} published notes`,
        );
      }
      for (const note of notes) {
        if (!rows.includes(note.slug))
          errors.push(`notes/index.html: no row for note "${note.slug}"`);
      }
    }
  }

  // 3. The sitemap (index and shards) lists every note page.
  const sitemapIndex = read('sitemap-index.xml');
  if (sitemapIndex === undefined) {
    errors.push('sitemap-index.xml: missing');
  } else {
    const shards = parseSitemapLocs(sitemapIndex).map((path) => path.split('/').pop() ?? path);
    const listed = new Set<string>();
    for (const shard of shards) {
      const xml = read(shard);
      if (xml === undefined) errors.push(`${shard}: listed in sitemap-index.xml but missing`);
      else for (const path of parseSitemapLocs(xml)) listed.add(path);
    }
    const label = shards.join(', ') || 'sitemap-index.xml';
    for (const note of notes) {
      if (!listed.has(note.path)) errors.push(`${label}: missing ${note.path}`);
    }
  }

  // 4. The Spanish feed lists every Spanish note.
  const feedNotes = notes.filter((note) => note.lang === FEED_LANG);
  if (feedNotes.length > 0) {
    const rss = read('rss.xml');
    if (rss === undefined) {
      errors.push('rss.xml: missing although Spanish notes are published');
    } else {
      const items = new Set(parseRssPaths(rss));
      for (const note of feedNotes) {
        if (!items.has(note.path)) errors.push(`rss.xml: missing ${note.path}`);
      }
    }
  }

  // 5. Every topic that should have a page has one, listing the right number of notes.
  for (const [slug, topic] of Object.entries(readTopics(contentDir))) {
    if ((topic.intro ?? '').trim() === '') continue;
    const tags = new Set(topic.tags);
    const count = notes.filter(
      (note) => note.lang === TOPIC_LANG && note.tags.some((tag) => tags.has(tag)),
    ).length;
    if (count < topicMinNotes) continue;
    const rel = `notes/tag/${slug}/index.html`;
    const html = read(rel);
    if (html === undefined) {
      errors.push(`${rel}: topic "${slug}" has ${count} notes but no page`);
      continue;
    }
    const listedCount = /\bdata-topic-notes="(\d+)"/.exec(html)?.[1];
    if (listedCount === undefined) {
      errors.push(`${rel}: missing data-topic-notes count`);
    } else if (Number(listedCount) !== count) {
      errors.push(`${rel}: lists ${listedCount} notes, expected ${count}`);
    }
  }

  // 6. Every internal link of every built page resolves.
  for (const file of listHtml(distDir)) {
    const rel = relative(distDir, file).split(sep).join('/');
    const missing = new Set<string>();
    const pagePath = `/${rel.replace(/index\.html$/, '')}`;
    for (const link of extractLocalLinks(readFileSync(file, 'utf8'), pagePath)) {
      if (!resolvesToBuiltFile(link, exists)) missing.add(link);
    }
    for (const link of [...missing].sort()) {
      const reason = knownBrokenLinks[`${rel}|${link}`];
      if (reason === undefined) errors.push(`${rel}: broken link ${link}`);
      else known.push(`${rel}: known broken link ${link} (${reason})`);
    }
  }

  return { errors, known };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const { values } = parseArgs({
    options: { dist: { type: 'string' }, content: { type: 'string' } },
  });
  const distDir = resolve(values.dist ?? join(import.meta.dirname, '../dist/client'));
  const contentDir = resolve(values.content ?? join(import.meta.dirname, '../src/content'));
  if (!existsSync(distDir)) throw new Error(`No built output at ${distDir}: build first`);

  // Loaded here, not at the top: the pure checks above stay importable without the app alias.
  const { siteConfig } = await import('@/site.config.ts');
  const { parseSiteConfig } = await import('@/shared/config/schema.ts');
  const config = parseSiteConfig(siteConfig);
  const topicMinNotes = config.notes.topicMinNotes;

  const { errors, known } = checkBuiltNotesReport({
    contentDir,
    distDir,
    topicMinNotes,
    blogEnabled: config.features.blog,
    knownBrokenLinks: KNOWN_BROKEN_LINKS,
  });
  for (const warning of known) console.warn(`warning: ${warning}`);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    console.error(`${errors.length} problem(s) in the built notes output.`);
    process.exitCode = 1;
  } else {
    const count = config.features.blog ? readPublishedNotes(contentDir).length : 0;
    console.log(
      `Built notes output is sound: ${count} enabled notes; sitemap and local links checked.`,
    );
  }
}
