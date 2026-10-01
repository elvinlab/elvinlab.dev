import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
const PUB_DATE = /^pubDate:\s*(.+)$/m;
const UPDATED_DATE = /^updatedDate:\s*(.+)$/m;

/**
 * Reads `pubDate`/`updatedDate` straight from each note's frontmatter on disk, keyed by canonical
 * path (`/notes/<slug>/`). Used at config time for the sitemap's `lastmod`, where `astro:content`
 * is not available (same constraint as `hasPublishedNotesOnDisk`).
 */
export function readNoteDatesFromDisk(contentDir: string): Map<string, Date> {
  const dates = new Map<string, Date>();
  const notesDir = join(contentDir, 'notes');
  if (!existsSync(notesDir)) return dates;

  for (const entry of readdirSync(notesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const notePath = join(notesDir, entry.name, 'index.mdx');
    if (!existsSync(notePath)) continue;

    const frontmatter = FRONTMATTER.exec(readFileSync(notePath, 'utf-8'))?.[1] ?? '';
    const updated = UPDATED_DATE.exec(frontmatter)?.[1]?.trim();
    const published = PUB_DATE.exec(frontmatter)?.[1]?.trim();
    const raw = updated ?? published;
    if (raw) dates.set(`/notes/${entry.name}/`, new Date(raw));
  }

  return dates;
}
