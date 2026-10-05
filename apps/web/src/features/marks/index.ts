/**
 * Public API of the marks feature (server side).
 * Client code must not import this barrel.
 */

export type { MarksResult } from './marks.ts';
export type { NoteCatalog } from './ports.ts';
export { leaveConfiguredMarks, readConfiguredMarks } from './runtime.ts';
