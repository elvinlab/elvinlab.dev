export { default as ExperimentTile } from './components/ExperimentTile.astro';
export { default as Home } from './components/Home.astro';
export { default as ProjectCard } from './components/ProjectCard.astro';
export { default as ProjectsPage } from './components/ProjectsPage.astro';
export { loadProjects, type Project } from './lib/load-projects.ts';
export { sortExperiments, yearsSince } from './lib/portfolio.ts';
export { type Experiment, experimentSchema } from './schema.ts';
