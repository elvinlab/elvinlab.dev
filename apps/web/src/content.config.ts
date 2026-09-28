import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';

import { noteSchema } from '@/features/notes/index.ts';
import { experimentSchema } from '@/features/portfolio/index.ts';

// Drafts live in the git-ignored `content/drafts/` and only load in dev, so they never ship.
// Publishing a note means moving its folder into `content/notes/`.
const folders = import.meta.env.DEV ? '{notes,drafts}' : 'notes';

const notes = defineCollection({
  loader: glob({
    base: './src/content',
    pattern: `${folders}/*/index.mdx`,
    // `notes/<slug>/index.mdx` → `<slug>`, so a note keeps its URL when it leaves drafts.
    generateId: ({ entry }) => entry.split('/')[1] ?? entry,
  }),
  schema: ({ image }) => noteSchema(image),
});

// Portfolio experiments: a keyed JSON file, one entry per project (keys become ids).
const experiments = defineCollection({
  loader: file('./src/content/experiments.json'),
  schema: experimentSchema(),
});

export const collections = { notes, experiments };
