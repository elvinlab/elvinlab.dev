import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

import { noteSchema } from '@/features/notes/index.ts';

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

export const collections = { notes };
