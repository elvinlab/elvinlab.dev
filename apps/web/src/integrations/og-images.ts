import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

import { formatDate, noteNumber } from '@/features/notes/lib/notes.ts';
import { site } from '@/shared/config/index.ts';
import { LOCALES, type Locale, t } from '@/shared/i18n/index.ts';

import { type CardContent, renderCardPng } from './og-card.ts';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

export type NoteCardSource = {
  slug: string;
  number: number;
  title: string;
  lang: string;
  pubDate: Date;
};

const field = (frontmatter: string, name: string): string | undefined =>
  new RegExp(`^${name}:[ \\t]*(.+?)[ \\t]*$`, 'm').exec(frontmatter)?.[1];

/** Unwraps a YAML scalar: JSON-style double quotes, single quotes (`''` is a quote) or bare. */
function scalar(value: string): string {
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    try {
      return JSON.parse(value) as string;
    } catch {
      return value.slice(1, -1);
    }
  }
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  return value;
}

/** The frontmatter fields a share card needs, or null when any is missing or invalid. */
export function parseNoteFrontmatter(raw: string): Omit<NoteCardSource, 'slug'> | null {
  const frontmatter = FRONTMATTER.exec(raw)?.[1];
  if (!frontmatter) return null;
  const number = Number(field(frontmatter, 'number'));
  const title = field(frontmatter, 'title');
  const lang = field(frontmatter, 'lang');
  const published = field(frontmatter, 'pubDate');
  if (!Number.isInteger(number) || !title || !lang || !published) return null;
  const pubDate = new Date(scalar(published));
  if (Number.isNaN(pubDate.getTime())) return null;
  return { number, title: scalar(title), lang: scalar(lang), pubDate };
}

/**
 * Published notes read straight from disk, like `readNoteDatesFromDisk`: `astro:content` is not
 * available at config time. Drafts never ship, so they get no card.
 */
export function readNoteCardSourcesFromDisk(contentDir: string): NoteCardSource[] {
  const notesDir = join(contentDir, 'notes');
  if (!existsSync(notesDir)) return [];
  const sources: NoteCardSource[] = [];
  for (const entry of readdirSync(notesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const notePath = join(notesDir, entry.name, 'index.mdx');
    if (!existsSync(notePath)) continue;
    const parsed = parseNoteFrontmatter(readFileSync(notePath, 'utf-8'));
    if (parsed) sources.push({ slug: entry.name, ...parsed });
  }
  return sources.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function cardContentFor(
  source: NoteCardSource,
  owner: { domain: string; owner: string },
): CardContent {
  const locale: Locale = (LOCALES.locales as readonly string[]).includes(source.lang)
    ? (source.lang as Locale)
    : LOCALES.defaultLocale;
  return {
    domain: owner.domain,
    eyebrow: t(locale, 'notes.entry', { number: noteNumber(source.number) }),
    title: source.title,
    footer: `${owner.owner} · ${formatDate(source.pubDate, locale)}`,
  };
}

/** Writes one share card per published note to `og/notes/<slug>.png` of the finished build. */
export function ogImages(contentDir: string): AstroIntegration {
  return {
    name: 'og-images',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const sources = readNoteCardSourcesFromDisk(contentDir);
        if (sources.length === 0) return;
        const outDir = join(fileURLToPath(dir), 'og', 'notes');
        mkdirSync(outDir, { recursive: true });
        const owner = { domain: new URL(site.url).host, owner: site.identity.name };
        for (const source of sources) {
          const png = await renderCardPng(cardContentFor(source, owner));
          writeFileSync(join(outDir, `${source.slug}.png`), png);
        }
        logger.info(`Generated ${sources.length} share card(s)`);
      },
    },
  };
}
