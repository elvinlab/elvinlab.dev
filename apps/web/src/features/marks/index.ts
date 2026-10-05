/**
 * Public API of the marks feature. The server exports (runtime) and the page component live here;
 * client code (the island) must import only client/* and never this barrel.
 */

export { default as MarkSection } from './components/MarkSection.astro';
export type { MarksResult } from './marks.ts';
export type { NoteCatalog } from './ports.ts';
export { leaveConfiguredMarks, readConfiguredMarks } from './runtime.ts';
