/**
 * Owner-specific strings that a fork's or the demo's build must not contain. Shared by the
 * white-label check and the demo deploy so both reject the same things.
 */

/** Identity strings found in the owner's `site.config.ts`. */
export const OWNER = [/elvin/i, /gonz[aá]lez/i, /costa rica/i];

/** Employers and schools found in the owner's `experience.json` and `credentials.json`. */
export const OWNER_CONTENT = [
  /\bbuo\b/i,
  /blue zone/i,
  /\bcnet\b/i,
  /orosi/i,
  /universidad nacional/i,
];

// Design-system identifiers are intentionally kept: `@elvinlab/core` is the shared design base
// others adopt (like a framework name), and the theme names come from its tokens.
export const DESIGN_SYSTEM = [/@elvinlab\/core/g, /elvinlab-(?:dark|light)/g];
