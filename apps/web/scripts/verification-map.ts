/**
 * The single source of truth for `pnpm verify`: which checks exist and which files each one
 * depends on. A check is planned when a changed file matches its `scope`; `WIDE` files select
 * every check. The hand-written part is the page-level coverage (e2e, Lighthouse), because the
 * import graph cannot see which page a spec loads. `verification-map.test.ts` keeps it honest.
 */
import { matchesGlob } from 'node:path';

export type CheckKind = 'family' | 'e2e' | 'lighthouse';

export interface CheckDef {
  readonly id: string;
  readonly kind: CheckKind;
  readonly label: string;
  /** Globs relative to the repository root; tracked or untracked files. */
  readonly scope: readonly string[];
  /** Globs removed from the scope (unit test files never change page bytes). */
  readonly exclude: readonly string[];
  /** Width dependent: the e2e spec runs on every viewport, not only 1280 px. */
  readonly responsive: boolean;
  /** e2e only: the spec path relative to the repository root. */
  readonly spec?: string;
  /** Lighthouse only: the URL path, as listed in `lighthouserc.json`. */
  readonly urlPath?: string;
}

/**
 * FULL-wide files: dependencies, lockfile, toolchain and config, and this tool itself. They
 * select every check, exactly as `--all` does.
 */
export const FULL_WIDE: readonly string[] = [
  'package.json',
  'apps/web/package.json',
  'packages/core/package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  '.mise.toml',
  'tsconfig*.json',
  'apps/web/tsconfig.json',
  'packages/core/tsconfig.json',
  'biome.json',
  'playwright.config.*',
  'lighthouserc.json',
  'apps/web/astro.config.ts',
  'apps/web/wrangler.jsonc',
  'apps/web/scripts/fixture-workspace.ts',
  '.dependency-cruiser.cjs',
  // The verification tool itself: a bug in it invalidates what it recorded.
  'apps/web/scripts/verification-map.ts',
  'apps/web/scripts/verify-plan.ts',
  'apps/web/scripts/verify-state.ts',
  'apps/web/scripts/verify-scope.ts',
  'apps/web/scripts/run-lighthouse-ci.ts',
];

/**
 * LAYOUT-wide files: they can change every page's bytes but not the toolchain. They select the
 * cheap families, every e2e spec at 1280 px and `LAYOUT_LIGHTHOUSE`; not the three-viewport
 * re-run of the responsive specs, not the other Lighthouse URLs, not the dev cold start.
 * `--viewports all` and `--all` stay the explicit way to run those.
 */
export const LAYOUT_WIDE: readonly string[] = [
  'apps/web/src/styles/**',
  'packages/core/src/tokens/**',
  'apps/web/src/shared/layout/**',
  'apps/web/src/shared/i18n/**',
];

/** Families a layout-wide change selects (the rest of the families stay scope driven). */
export const LAYOUT_FAMILIES: readonly string[] = [
  'lint',
  'typecheck',
  'unit',
  'build',
  'js-budget',
  'page-weight',
  'white-label',
];

/** Lighthouse URLs a layout-wide change selects: the home and one note cover the shared chrome. */
export const LAYOUT_LIGHTHOUSE: readonly string[] = ['/', '/notes/smoke-es/'];

/** Every file that is wide in either class (used by the drift guard for empty globs). */
export const WIDE: readonly string[] = [...FULL_WIDE, ...LAYOUT_WIDE];

/** Specs under `tests/browser/` deliberately without an e2e check. None today. */
export const UNMAPPED_OK: readonly string[] = [];

/**
 * Scope globs that legitimately match no file yet (a renamed folder must not silently empty a
 * scope, so every exemption needs a reason). None today.
 */
export const EMPTY_SCOPE_OK: readonly string[] = [];

const TESTS = ['**/*.test.ts', '**/*.test.tsx'];
const SRC = 'apps/web/src';

function area(...globs: string[]): string[] {
  return globs;
}

// Source areas. Each lists what the pages of that area render.
const GLOBAL = area(
  `${SRC}/shared/**`,
  `${SRC}/site.config.ts`,
  `${SRC}/pages/404.astro`,
  `${SRC}/integrations/**`,
  `${SRC}/content.config.ts`,
  'apps/web/public/**',
  'packages/core/src/**',
);
const NOTES = area(`${SRC}/features/notes/**`, `${SRC}/blog-routes/**`, 'tests/fixtures/**');
const SUBSCRIBE = area(
  `${SRC}/features/subscribe/**`,
  `${SRC}/shared/subscribe/**`,
  `${SRC}/subscribe-routes/**`,
);
const MARKS = area(`${SRC}/features/marks/**`, `${SRC}/actions/**`, 'apps/web/migrations/**');
const COMMENTS = area(`${SRC}/features/comments/**`);
const NOTE_PAGE = [...NOTES, ...MARKS, ...COMMENTS, ...SUBSCRIBE];
const HOME = area(
  `${SRC}/pages/index.astro`,
  `${SRC}/pages/en/index.astro`,
  `${SRC}/features/portfolio/**`,
  `${SRC}/features/backgrounds/**`,
  `${SRC}/content/experiments.json`,
);
const ME = area(
  `${SRC}/pages/me.astro`,
  `${SRC}/pages/en/me.astro`,
  `${SRC}/features/me/**`,
  // The `/me` experiments block renders the compact portfolio rows.
  `${SRC}/features/portfolio/components/ExperimentRow.astro`,
  `${SRC}/content/experiments.json`,
  `${SRC}/assets/experiments/**`,
  `${SRC}/features/credentials/**`,
  `${SRC}/content/experience.json`,
  `${SRC}/content/credentials.json`,
);
const CONTACT = area(`${SRC}/features/contact/**`, `${SRC}/contact-routes/**`, `${SRC}/actions/**`);
const LEGAL = area(
  `${SRC}/features/privacy/**`,
  `${SRC}/features/terms/**`,
  `${SRC}/pages/privacy/**`,
  `${SRC}/pages/terms/**`,
  `${SRC}/pages/en/privacy/**`,
  `${SRC}/pages/en/terms/**`,
);
const CHANGELOG = area(
  `${SRC}/features/changelog/**`,
  `${SRC}/content/changelog.json`,
  `${SRC}/content/releases.json`,
  `${SRC}/changelog-routes/**`,
  // The changelog pages its release days with the same listing kit as the experiments list.
  `${SRC}/shared/lib/listing.ts`,
  `${SRC}/shared/ui/Pager.astro`,
  `${SRC}/shared/ui/ListingSummary.astro`,
  `${SRC}/shared/ui/listing-styles.ts`,
);
// The experiments feature feeds `/experiments/`, the `/me` block and (when its home section is on) the home.
const EXPERIMENTS = area(
  `${SRC}/experiments-routes/**`,
  `${SRC}/features/portfolio/**`,
  `${SRC}/content/experiments.json`,
  `${SRC}/assets/experiments/**`,
  `${SRC}/shared/lib/experiment-image.ts`,
  // The listing kit (sorting, paging, pager, sort switch, summary) only the experiments list uses for now.
  `${SRC}/shared/lib/listing.ts`,
  `${SRC}/shared/ui/Pager.astro`,
  `${SRC}/shared/ui/SortSwitch.astro`,
  `${SRC}/shared/ui/ListingSummary.astro`,
);
const EVERY_PAGE = [
  ...NOTE_PAGE,
  ...HOME,
  ...ME,
  ...EXPERIMENTS,
  ...CONTACT,
  ...LEGAL,
  ...CHANGELOG,
];

const E2E_BASE = area('playwright.config.*', 'apps/web/scripts/fixture-preview.ts');
const HELPERS = 'tests/browser/helpers/**';

function family(id: string, label: string, scope: string[], exclude: string[] = TESTS): CheckDef {
  return { id, kind: 'family', label, scope, exclude, responsive: false };
}

interface SpecDef {
  readonly file: string;
  readonly covers: string[];
  readonly helpers?: boolean;
  readonly responsive?: boolean;
}

function e2e({ file, covers, helpers = false, responsive = false }: SpecDef): CheckDef {
  const spec = `tests/browser/${file}`;
  return {
    id: `e2e:${file}`,
    kind: 'e2e',
    label: file,
    scope: [spec, ...(helpers ? [HELPERS] : []), ...E2E_BASE, ...GLOBAL, ...covers],
    exclude: TESTS,
    responsive,
    spec,
  };
}

function lighthouse(urlPath: string, covers: string[]): CheckDef {
  return {
    id: `lighthouse:${urlPath}`,
    kind: 'lighthouse',
    label: urlPath,
    scope: [...E2E_BASE, ...GLOBAL, ...covers],
    exclude: TESTS,
    responsive: false,
    urlPath,
  };
}

const BUILD_SCOPE = [
  `${SRC}/**`,
  'apps/web/public/**',
  'packages/core/src/**',
  'tests/fixtures/**',
];

export const CHECKS: readonly CheckDef[] = [
  family(
    'lint',
    'lint (Biome)',
    ['**/*.{ts,tsx,js,mjs,cjs,mts,cts,json,jsonc,css,astro,html,md,mdx,yml,yaml}'],
    // The registry is rewritten by every recorded run; it must not make lint stale by itself.
    ['odd/verification-state.json'],
  ),
  family(
    'typecheck',
    'typecheck',
    [
      'apps/web/**/*.{ts,tsx,astro}',
      'packages/core/**/*.{ts,json}',
      'tests/**/*.ts',
      `${SRC}/content/*.json`,
    ],
    [],
  ),
  family('depcruise', 'depcruise', [
    `${SRC}/**/*.{ts,tsx,astro,js}`,
    'packages/core/src/**/*.ts',
    'apps/web/scripts/mirror-astro.ts',
  ]),
  family(
    'docs-config',
    'docs:config',
    [
      `${SRC}/shared/config/**`,
      `${SRC}/site.config.ts`,
      `${SRC}/content.config.ts`,
      `${SRC}/features/*/schema.ts`,
      `${SRC}/features/*/config.ts`,
      'apps/web/scripts/config-docs.ts',
      'apps/web/scripts/docs-config.ts',
      'apps/web/scripts/generate-config-docs.ts',
      'docs/CONFIGURATION*.md',
      'docs/NOTES*.md',
      'apps/web/.env.example',
      'apps/web/.dev.vars.example',
    ],
    [],
  ),
  family(
    'unit',
    'unit tests',
    [
      `${SRC}/**`,
      'apps/web/scripts/**',
      'apps/web/vitest.config.ts',
      'packages/core/src/**',
      'packages/core/scripts/**',
    ],
    [],
  ),
  family('build', 'build', BUILD_SCOPE),
  family('js-budget', 'JavaScript budget', [
    ...BUILD_SCOPE,
    'apps/web/scripts/performance-budget.ts',
  ]),
  // Inline CSS and HTML bytes per page type: any page or style change can move them.
  family('page-weight', 'page weight budget', [
    ...BUILD_SCOPE,
    'apps/web/scripts/page-weight-budget.ts',
    'apps/web/scripts/page-weight-budget.json',
  ]),
  family('white-label', 'white-label build', [
    ...BUILD_SCOPE,
    'apps/web/scripts/white-label-check.ts',
  ]),
  family('cold-start', 'dev cold start', [
    'apps/web/scripts/dev-cold-start-check.ts',
    `${SRC}/integrations/**`,
    `${SRC}/content.config.ts`,
    `${SRC}/env.d.ts`,
    'packages/core/src/**',
  ]),

  e2e({ file: 'a11y.spec.ts', covers: EVERY_PAGE, helpers: true }),
  e2e({ file: 'back-to-top.spec.ts', covers: EVERY_PAGE, helpers: true }),
  e2e({ file: 'background.spec.ts', covers: HOME }),
  e2e({ file: 'calm-pages.spec.ts', covers: [...NOTE_PAGE, ...HOME], responsive: true }),
  e2e({ file: 'card-links.spec.ts', covers: EVERY_PAGE }),
  e2e({ file: 'comments.spec.ts', covers: NOTE_PAGE }),
  e2e({ file: 'contact.spec.ts', covers: CONTACT }),
  e2e({ file: 'cookies.spec.ts', covers: EVERY_PAGE }),
  e2e({ file: 'cv-and-credentials.spec.ts', covers: ME }),
  e2e({ file: 'external-links.spec.ts', covers: EVERY_PAGE }),
  e2e({ file: 'brand-mark.spec.ts', covers: EVERY_PAGE, responsive: true }),
  e2e({ file: 'favicon.spec.ts', covers: EVERY_PAGE }),
  e2e({ file: 'focus-not-obscured.spec.ts', covers: EVERY_PAGE, responsive: true }),
  e2e({ file: 'home-sections.spec.ts', covers: HOME }),
  e2e({
    file: 'interaction-polish.spec.ts',
    covers: [...NOTE_PAGE, ...LEGAL],
    helpers: true,
    responsive: true,
  }),
  e2e({ file: 'internal-links.spec.ts', covers: EVERY_PAGE }),
  e2e({ file: 'legal.spec.ts', covers: LEGAL }),
  e2e({ file: 'link-previews.spec.ts', covers: EVERY_PAGE }),
  e2e({ file: 'home-marks.spec.ts', covers: [...HOME, ...MARKS], helpers: true, responsive: true }),
  e2e({ file: 'marks.spec.ts', covers: [...NOTE_PAGE, ...HOME], helpers: true, responsive: true }),
  e2e({ file: 'me-experience-locale.spec.ts', covers: ME }),
  e2e({ file: 'me-hero-tips.spec.ts', covers: ME }),
  e2e({ file: 'me-photo.spec.ts', covers: ME }),
  e2e({ file: 'mobile-ux.spec.ts', covers: EVERY_PAGE, responsive: true }),
  e2e({ file: 'note-share.spec.ts', covers: NOTE_PAGE }),
  e2e({ file: 'note-translations.spec.ts', covers: NOTE_PAGE }),
  e2e({ file: 'notes-layout.spec.ts', covers: NOTE_PAGE, responsive: true }),
  e2e({ file: 'performance.spec.ts', covers: EVERY_PAGE }),
  e2e({ file: 'experiments.spec.ts', covers: [...EXPERIMENTS, ...ME] }),
  e2e({ file: 'changelog.spec.ts', covers: CHANGELOG }),
  e2e({ file: 'pixel-display.spec.ts', covers: [...NOTE_PAGE, ...HOME], responsive: true }),
  e2e({ file: 'reading-mode.spec.ts', covers: NOTE_PAGE, helpers: true, responsive: true }),
  e2e({ file: 'smoke.spec.ts', covers: EVERY_PAGE }),
  e2e({ file: 'subscribe.spec.ts', covers: NOTE_PAGE, helpers: true, responsive: true }),
  e2e({ file: 'theme.spec.ts', covers: EVERY_PAGE }),
  e2e({ file: 'type-scale.spec.ts', covers: [...NOTE_PAGE, ...HOME], responsive: true }),

  lighthouse('/', HOME),
  lighthouse('/en/', HOME),
  lighthouse('/me/', ME),
  lighthouse('/en/me/', ME),
  lighthouse('/experiments/', EXPERIMENTS),
  lighthouse('/notes/', [...NOTES, ...SUBSCRIBE]),
  lighthouse('/notes/smoke-es/', NOTE_PAGE),
  lighthouse('/contact/', CONTACT),
  lighthouse('/en/contact/', CONTACT),
  lighthouse('/subscribe/', SUBSCRIBE),
];

/** True when `path` matches any glob. */
export function matchesAny(path: string, globs: readonly string[]): boolean {
  return globs.some((glob) => matchesGlob(path, glob));
}

/** True when `path` belongs to the check's scope (matches a scope glob, no exclude glob). */
export function inScope(check: CheckDef, path: string): boolean {
  return matchesAny(path, check.scope) && !matchesAny(path, check.exclude);
}
