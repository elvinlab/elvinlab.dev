import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';
import sharp from 'sharp';

import { site } from '@/shared/config/index.ts';
import type { SeoPage, SiteConfig } from '@/shared/config/schema.ts';
import { LOCALES, type Locale, t } from '@/shared/i18n/index.ts';
import { pageCopy } from '@/shared/seo/page-copy.ts';

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

export type ExperimentCardSource = { slug: string; title: string; year: number };

/** The experiments read from `experiments.json` (keyed by the slug), one card source per entry. */
export function readExperimentCardSourcesFromDisk(contentDir: string): ExperimentCardSource[] {
  const file = join(contentDir, 'experiments.json');
  if (!existsSync(file)) return [];
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as Record<
    string,
    { title?: unknown; year?: unknown }
  >;
  const sources: ExperimentCardSource[] = [];
  for (const [slug, data] of Object.entries(parsed)) {
    if (typeof data.title === 'string' && typeof data.year === 'number') {
      sources.push({ slug, title: data.title, year: data.year });
    }
  }
  return sources.sort((a, b) => a.slug.localeCompare(b.slug));
}

/** The card of a case page: the experiment year as the eyebrow, the title and the owner. */
export function caseCardContent(
  source: ExperimentCardSource,
  owner: { domain: string; owner: string },
): CardContent {
  return {
    domain: `${owner.domain}/experiments`,
    eyebrow: String(source.year),
    title: source.title,
    footer: owner.owner,
  };
}

/** The listing and legal pages that get a card (`/me` has its own), with the route and the feature that gates them. */
const HUB_PAGES = [
  { page: 'notes', path: '/notes/', feature: 'blog', label: 'notes.title' },
  {
    page: 'experiments',
    path: '/experiments/',
    feature: 'experiments',
    label: 'experiments.title',
  },
  { page: 'education', path: '/education/', feature: 'education', label: 'education.title' },
  { page: 'contact', path: '/contact/', feature: 'contact', label: 'nav.contact' },
  { page: 'changelog', path: '/changelog/', feature: 'changelog', label: 'changelog.title' },
  { page: 'subscribe', path: '/subscribe/', feature: 'subscribe', label: 'footer.subscribe' },
  { page: 'privacy', path: '/privacy/', feature: undefined, label: 'footer.privacy' },
  { page: 'terms', path: '/terms/', feature: undefined, label: 'footer.terms' },
] as const satisfies readonly {
  page: SeoPage;
  path: string;
  feature: string | undefined;
  label: Parameters<typeof t>[1];
}[];

/** The card of a listing or legal page: the section as the eyebrow, the page title and the owner. */
export function hubCardContent(
  hub: (typeof HUB_PAGES)[number],
  locale: Locale,
  owner: { domain: string; owner: string; overrides: SiteConfig['seo']['pages'] },
): CardContent {
  const copy = pageCopy({
    page: hub.page,
    locale,
    defaultLocale: LOCALES.defaultLocale,
    name: owner.owner,
    domain: owner.domain,
    overrides: owner.overrides,
  });
  return {
    domain: `${owner.domain}${hub.path.replace(/\/$/, '')}`,
    eyebrow: t(locale, hub.label),
    title: copy.title,
    footer: owner.owner,
  };
}

export type TopicCardSource = { slug: string; title: string };

/** The notes topics read from `topics.json` (keyed by the slug), one card source per entry. */
export function readTopicCardSourcesFromDisk(contentDir: string): TopicCardSource[] {
  const file = join(contentDir, 'topics.json');
  if (!existsSync(file)) return [];
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as Record<string, { title?: unknown }>;
  return Object.entries(parsed)
    .flatMap(([slug, data]) =>
      typeof data.title === 'string' ? [{ slug, title: data.title }] : [],
    )
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export type OgSite = ProfileSite & {
  identity: { avatar?: string | undefined; photo?: string | undefined };
  features: { me: boolean; experiments: boolean } & Partial<Record<string, boolean>>;
  seo?: { pages: SiteConfig['seo']['pages'] };
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

        if (config.features.experiments) {
          const experiments = readExperimentCardSourcesFromDisk(contentDir);
          if (experiments.length > 0) {
            mkdirSync(join(root, 'experiments'), { recursive: true });
            const owner = { domain: new URL(config.url).host, owner: config.identity.name };
            for (const experiment of experiments) {
              const png = await renderCardPng(caseCardContent(experiment, owner));
              writeFileSync(join(root, 'experiments', `${experiment.slug}.png`), png);
              written += 1;
            }
          }
        }

        const owner = {
          domain: new URL(config.url).host,
          owner: config.identity.name,
          overrides: config.seo?.pages ?? {},
        };
        const pagesDir = join(root, 'pages');
        for (const hub of HUB_PAGES) {
          if (hub.feature && config.features[hub.feature] === false) continue;
          mkdirSync(pagesDir, { recursive: true });
          for (const locale of LOCALES.locales) {
            const png = await renderCardPng(hubCardContent(hub, locale, owner));
            writeFileSync(join(pagesDir, `${hub.page}-${locale}.png`), png);
            written += 1;
          }
        }

        if (config.features['blog'] !== false) {
          const topics = readTopicCardSourcesFromDisk(contentDir);
          if (topics.length > 0) {
            mkdirSync(join(root, 'topics'), { recursive: true });
            for (const topic of topics) {
              const png = await renderCardPng({
                domain: `${owner.domain}/notes/tag/${topic.slug}`,
                eyebrow: t(LOCALES.defaultLocale, 'notes.topics'),
                title: topic.title,
                footer: owner.owner,
              });
              writeFileSync(join(root, 'topics', `${topic.slug}.png`), png);
              written += 1;
            }
          }
        }

        if (written > 0) logger.info(`Generated ${written} share card(s)`);
      },
    },
  };
}
