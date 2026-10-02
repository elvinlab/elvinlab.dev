import type { SiteConfig } from './schema.ts';

/** Visual preset of the site: `minimal` is the calm look, `full` the original look (the default). */
export type Appearance = SiteConfig['appearance'];

/** The per-section overrides of `home` in the site config (each key is optional). */
export type HomeConfig = SiteConfig['home'];

/** Every switchable section of the home page. */
export type HomeSection = keyof Required<HomeConfig>;

/** Final on/off value of every home section. */
export type ResolvedHome = Record<HomeSection, boolean>;

/** What each preset shows before the `home` overrides apply. */
const HOME_PRESETS: Record<Appearance, ResolvedHome> = {
  minimal: {
    heroPills: false,
    authorCard: true,
    hiringCard: true,
    now: true,
    pillars: false,
    notebookIndex: true,
    experiments: true,
  },
  full: {
    heroPills: true,
    authorCard: true,
    hiringCard: true,
    now: true,
    pillars: true,
    notebookIndex: true,
    experiments: true,
  },
};

/**
 * Resolves which home sections render: the preset picks the defaults and each `home` key wins over
 * it. The experiments section also needs the `experiments` feature flag, so a section whose pages
 * do not exist is never shown. Pages and components read this result and never test the preset.
 */
export function resolveHome(
  config: Pick<SiteConfig, 'appearance' | 'home'> & { features: { experiments: boolean } },
): ResolvedHome {
  const resolved = { ...HOME_PRESETS[config.appearance] };
  for (const section of Object.keys(resolved) as HomeSection[]) {
    resolved[section] = config.home[section] ?? resolved[section];
  }
  resolved.experiments &&= config.features.experiments;
  return resolved;
}
