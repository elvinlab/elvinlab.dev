import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';
import sharp from 'sharp';

import { site } from '@/shared/config/index.ts';
import { LOCALES, type Locale, t } from '@/shared/i18n/index.ts';

import { type CardContent, renderCardPng } from './og-card.ts';
import {
  type ProfileSite,
  profileCardContentFor,
  renderProfileCardPng,
} from './og-profile-card.ts';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

// Integrations are evaluated with `astro.config.ts`, which cannot load a feature barrel (it pulls
// `.astro` components) and may not deep-import a feature. These mirror `noteNumber` and
// `formatDate` of the notes feature; the label tests pin the exact output.
const padNumber = (value: number): string => String(value).padStart(3, '0');
const longDate = (date: Date, locale: Locale): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(date);

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
    eyebrow: t(locale, 'notes.entry', { number: padNumber(source.number) }),
    title: source.title,
    footer: `${owner.owner} · ${longDate(source.pubDate, locale)}`,
  };
}

export type OgSite = ProfileSite & {
  identity: { avatar?: string | undefined; photo?: string | undefined };
  features: { me: boolean };
};
/** `assetsDir` is `apps/web/src/assets`, where `identity.photo` and `identity.avatar` name files. */
export type OgOptions = { assetsDir?: string; site?: OgSite };

/**
 * The profile image as a square `data:` URI, or undefined when it is not configured or missing.
 * A portrait is cover-cropped from the top, like `object-top` on the `/me` hero, to keep the face.
 */
async function loadAvatar(assetsDir: string | undefined, avatar: string | undefined) {
  if (!assetsDir || !avatar) return undefined;
  const file = join(assetsDir, avatar);
  if (!existsSync(file)) return undefined;
  const png = await sharp(file)
    .resize(300, 300, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

/**
 * Writes the share cards of the finished build under `og/`: one per published note
 * (`notes/<slug>.png`) and, when the `/me` feature is on, one per locale (`me-<locale>.png`).
 */
export function ogImages(contentDir: string, options: OgOptions = {}): AstroIntegration {
  const config: OgSite = options.site ?? site;
  return {
    name: 'og-images',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = join(fileURLToPath(dir), 'og');
        let written = 0;

        const sources = readNoteCardSourcesFromDisk(contentDir);
        if (sources.length > 0) {
          mkdirSync(join(root, 'notes'), { recursive: true });
          const owner = { domain: new URL(config.url).host, owner: config.identity.name };
          for (const source of sources) {
            const png = await renderCardPng(cardContentFor(source, owner));
            writeFileSync(join(root, 'notes', `${source.slug}.png`), png);
            written += 1;
          }
        }

        if (config.features.me) {
          mkdirSync(root, { recursive: true });
          // The card represents /me, so it shows the portrait; the home keeps the avatar.
          const avatar = await loadAvatar(
            options.assetsDir,
            config.identity.photo ?? config.identity.avatar,
          );
          for (const locale of LOCALES.locales) {
            const png = await renderProfileCardPng({
              ...profileCardContentFor(config, locale),
              ...(avatar ? { avatar } : {}),
            });
            writeFileSync(join(root, `me-${locale}.png`), png);
            written += 1;
          }
        }

        if (written > 0) logger.info(`Generated ${written} share card(s)`);
      },
    },
  };
}
