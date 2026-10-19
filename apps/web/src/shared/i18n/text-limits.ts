/**
 * Length limits, in characters, for the interface strings in `index.ts`, by key group (the part of
 * the key before the first dot, or a longer prefix for a stricter rule). They apply to Spanish
 * AND English: Spanish runs about 16% longer than English on average, so write to the limit in
 * Spanish and the English fits. A limit is a budget, not a guarantee: it keeps a text inside the
 * box its layout was drawn for (a menu entry on one line at 360 px, a button without wrapping,
 * a stamp inside its frame). They were set from the longest text of each group on 2026-10-12,
 * plus about 20% of room. To need more space, check the layout first (`pnpm test:e2e`, the
 * no-horizontal-overflow spec at 360 px) and then raise the limit here with the reason.
 * A `{name}` placeholder counts by its written length, not by the text that replaces it.
 */
export const TEXT_LIMITS: Readonly<Record<string, number>> = {
  subscribe: 200,
  'notes.description': 160,
  experiments: 140,
  education: 140,
  author: 130,
  me: 110,
  privacy: 100,
  notes: 100,
  changelog: 90,
  comments: 90,
  home: 90,
  placeholder: 80,
  recruiter: 64,
  marks: 48,
  notFound: 48,
  listing: 44,
  language: 44,
  link: 36,
  experiment: 32,
  reading: 28,
  now: 28,
  note: 28,
  skip: 28,
  nudge: 28,
  banner: 28,
  background: 24,
  aside: 20,
  backtotop: 20,
  theme: 20,
  nav: 16,
  footer: 16,
  exp: 14,
  stamp: 12,
};

/** Where the texts of each group appear, which is what the limit protects (used by the docs). */
export const TEXT_LIMIT_NOTES: Readonly<Record<string, string>> = {
  subscribe: 'The subscription form, its messages and the confirmation pages',
  'notes.description': 'Meta description of the notes index (search results and link previews, up to 160)',
  experiments: 'Intro and sort descriptions of `/experiments/`',
  education: 'Intro, labels and sort descriptions of `/education/`',
  author: 'The author card on the home',
  me: 'The `/me` page: headings, hints and labels',
  privacy: 'Short fragments of the privacy page',
  notes: 'The notes index, filters, topics and start-here block',
  changelog: 'The changelog page',
  comments: 'The comments block under a note',
  home: 'Sections of the home',
  placeholder: 'The placeholder page',
  recruiter: 'The hiring card and availability line',
  marks: 'The footprint button and its messages',
  notFound: 'The 404 page',
  listing: 'Pager and sort controls of every list',
  language: 'The language switch and the language hint banner',
  link: 'External link hints',
  experiment: 'Labels on an experiment card',
  reading: 'The reading mode button and the read / continue reading labels (one line)',
  now: 'The "Now" card',
  note: 'Labels inside a note (reading time, license, translations)',
  skip: 'The skip-to-content link',
  nudge: 'The latest-experiment card: label, link and close button',
  banner: 'Banner buttons',
  background: 'The background picker button',
  aside: 'The notes sidebar',
  backtotop: 'The back-to-top button',
  theme: 'The theme button',
  nav: 'The navigation menu: one line at 360 px',
  footer: 'Footer links',
  exp: 'Experiment status pills',
  stamp: 'Notebook stamps: at most two words and 12 characters',
};

/** The limit of a key: the longest group prefix that matches it, or undefined when it has none. */
export function limitFor(key: string): number | undefined {
  const parts = key.split('.');
  for (let length = parts.length; length > 0; length--) {
    const limit = TEXT_LIMITS[parts.slice(0, length).join('.')];
    if (limit !== undefined) return limit;
  }
  return undefined;
}
