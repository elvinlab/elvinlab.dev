/**
 * Architecture boundaries (docs/CONVENTIONS.md), checked in CI with `pnpm depcruise`.
 * The web app is cruised through its `.astro` mirror (apps/web/scripts/mirror-astro.ts).
 */
const { join } = require('node:path');

const WEB = '^apps/web/boundaries-mirror/src/';
const FEATURE_API = `${WEB}features/[^/]+/index\\.ts$`;

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Cycles make modules impossible to understand or move on their own.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-unresolvable',
      severity: 'error',
      comment: 'Every import must resolve (Astro virtual modules excepted).',
      from: {},
      to: { couldNotResolve: true, pathNot: '^astro:' },
    },
    {
      name: 'core-is-standalone',
      severity: 'error',
      comment: '@elvinlab/core will move to its own repo: it never imports the apps.',
      from: { path: '^packages/core/' },
      to: { path: '^apps/' },
    },
    {
      name: 'shared-below-features',
      severity: 'error',
      comment: 'shared/ is the base layer; features build on it, never the reverse.',
      from: { path: `${WEB}shared/` },
      to: { path: `${WEB}features/` },
    },
    {
      name: 'feature-public-api',
      severity: 'error',
      comment: 'Outside a feature, import it only through its index.ts.',
      from: { pathNot: `${WEB}features/` },
      to: { path: `${WEB}features/`, pathNot: FEATURE_API },
    },
    {
      name: 'no-cross-feature-internals',
      severity: 'error',
      comment: 'A feature reaches another feature only through its index.ts.',
      from: { path: `${WEB}features/([^/]+)/` },
      to: { path: `${WEB}features/`, pathNot: [`${WEB}features/$1/`, FEATURE_API] },
    },
    {
      name: 'pages-are-thin',
      severity: 'error',
      comment:
        'Pages only compose feature entry points, shared/ and core; logic lives in features.',
      from: { path: `${WEB}pages/` },
      to: {
        dependencyTypesNot: ['unknown'],
        pathNot: [FEATURE_API, `${WEB}shared/`, '^packages/core/src/index\\.ts$'],
      },
    },
    {
      name: 'pages-are-leaves',
      severity: 'error',
      comment: 'Nothing imports a page; share code through features/ or shared/.',
      from: {},
      to: { path: `${WEB}pages/` },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.test\\.ts$' },
    // Absolute on purpose: TypeScript finds no inputs when given a relative config path.
    tsConfig: { fileName: join(__dirname, 'apps/web/boundaries-mirror/tsconfig.json') },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'default'],
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.json'],
    },
  },
};
