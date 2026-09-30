import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * True when at least one published note exists on disk (`<contentDir>/notes/<slug>/index.mdx`).
 * Drafts never ship, so they are ignored. Used at config time, where `getCollection` is not available,
 * to keep `/notes/` out of the sitemap until the first post is published.
 */
export function hasPublishedNotesOnDisk(contentDir: string): boolean {
  const notesDir = join(contentDir, 'notes');
  if (!existsSync(notesDir)) return false;
  return readdirSync(notesDir, { withFileTypes: true }).some(
    (entry) => entry.isDirectory() && existsSync(join(notesDir, entry.name, 'index.mdx')),
  );
}
