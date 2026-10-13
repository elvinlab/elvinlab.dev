import { readFileSync } from 'node:fs';

import { t } from '../../../apps/web/src/shared/i18n/index.ts';
import { siteConfig } from '../../../apps/web/src/site.config';

/**
 * What the site under test says about itself, read from the same files the site is built from, so
 * a spec never copies an owner's name, domain or interface text. An adopter who replaces
 * `site.config.ts` or edits a UI text keeps a green suite (`pnpm test` has a guard that fails when
 * a spec contains one of these values literally).
 */
export { siteConfig };

/** An interface text of the site, in a locale: `text('es', 'reading.toggle')`. */
export const text = t;

/** The owner's identity and addresses, as written in `site.config.ts`. */
export const site = {
  origin: new URL(siteConfig.url).origin,
  host: new URL(siteConfig.url).host,
  title: siteConfig.title,
  name: siteConfig.identity.name,
  handle: siteConfig.identity.handle,
} as const;

/** The role and bio of the owner in a locale. */
export const identityIn = (locale: 'es' | 'en') => ({
  role: siteConfig.identity.role[locale] ?? '',
  bio: siteConfig.identity.bio[locale] ?? '',
});

type Tokens = {
  defaultTheme: string;
  themes: Record<string, { scheme: 'dark' | 'light'; colors: Record<string, string> }>;
};
const tokens = JSON.parse(
  readFileSync(new URL('../../../packages/core/src/tokens/tokens.json', import.meta.url), 'utf8'),
) as Tokens;
const themeIds = Object.keys(tokens.themes);
const themeWith = (scheme: 'dark' | 'light'): string =>
  themeIds.find((id) => tokens.themes[id]?.scheme === scheme) ?? themeIds[0] ?? '';

/**
 * The theme ids of `packages/core/src/tokens/tokens.json`: the default one, the first dark and the
 * first light one, and all of them. A palette that renames its themes keeps the specs green.
 */
export const themes = {
  default: tokens.defaultTheme,
  dark: themeWith('dark'),
  light: themeWith('light'),
  all: themeIds,
} as const;

/** Escapes the characters that mean something in a regular expression, to match a text literally. */
export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type Localized = Partial<Record<'es' | 'en', string>>;
type Experiment = {
  title: string;
  url?: string;
  repo?: string;
  order?: number;
  images: { alt: Localized; caption: Localized }[];
};
const experimentFile = JSON.parse(
  readFileSync(new URL('../../../apps/web/src/content/experiments.json', import.meta.url), 'utf8'),
) as Record<string, Experiment>;

/** The entries of `experiments.json` in display order, each with its id (the card anchor). */
export const experiments = Object.entries(experimentFile)
  .map(([id, entry]) => ({ id, ...entry }))
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

/** The first (featured) experiment and the second one. */
export const flagship = experiments[0] as (typeof experiments)[number];
export const secondExperiment = experiments[1] as (typeof experiments)[number];

/** A social profile of the owner by its icon id (`'linkedin'`). */
export const social = (icon: string): { label: string; url: string } => {
  const found = siteConfig.socials.find((entry) => entry.icon === icon);
  return { label: found?.label ?? '', url: found?.url ?? '' };
};

/** The distinct issuers of `credentials.json` (platforms and universities), as listed on `/me`. */
export const credentialIssuers: string[] = [
  ...new Set(
    Object.values(
      JSON.parse(
        readFileSync(
          new URL('../../../apps/web/src/content/credentials.json', import.meta.url),
          'utf8',
        ),
      ) as Record<string, { issuer: string }>,
    ).map((credential) => credential.issuer),
  ),
];

/** The "Now" card as written in `site.config.ts`: the dated line and the first row, in a locale. */
export const nowIn = (locale: 'es' | 'en') => {
  const now = siteConfig.now;
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${now?.updatedAt}T00:00:00Z`),
  );
  return {
    date: text(locale, 'now.updated', { date }),
    focus: now?.items?.[0]?.text[locale] ?? '',
  };
};

/**
 * A color of the palette as the browser reports it (`rgb(r, g, b)`), read from `tokens.json`:
 * `tokenRgb(themes.default, 'button')`. A spec that compares against a brand color uses this, never
 * a copied value, so a new palette keeps the comparison meaningful instead of silently empty.
 */
export function tokenRgb(theme: string, name: string): string {
  const color = tokens.themes[theme]?.colors[name];
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) {
    throw new Error(`tokens.json has no #rrggbb color "${name}" in the theme "${theme}"`);
  }
  const [red, green, blue] = [1, 3, 5].map((at) => Number.parseInt(color.slice(at, at + 2), 16));
  return `rgb(${red}, ${green}, ${blue})`;
}
