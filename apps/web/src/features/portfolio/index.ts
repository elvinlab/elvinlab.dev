export { default as ExperimentRow } from './components/ExperimentRow.astro';
export { default as ExperimentTile } from './components/ExperimentTile.astro';
export { default as Home } from './components/Home.astro';
export {
  caseLinkLabelKey,
  experimentTagLabel,
  tierExperiments,
  visibleExperimentTags,
} from './lib/experiments.ts';
export { introText, labWords } from './lib/header-text.ts';
export { type ExperimentEntry, loadExperiments } from './lib/load-experiments.ts';
export {
  type ExperimentsPageData,
  experimentsPagePath,
  type NumberedEntry,
  type PagerItem,
  pagerItems,
  paginateExperiments,
} from './lib/pagination.ts';
export { sortExperiments, yearsSince } from './lib/portfolio.ts';
export { experimentsSettings } from './lib/settings.ts';
export { type Experiment, experimentSchema } from './schema.ts';
