/** Pure helpers behind `pnpm publish-note`, kept apart from the CLI so they are testable. */

export type NoteMeta = { number: number; lang: string; title: string; description: string };

/** The frontmatter block and the rest of the file. */
function splitFrontmatter(mdx: string): { head: string; rest: string } {
  const match = /^---\n([\s\S]*?)\n---(\n[\s\S]*)?$/.exec(mdx);
  if (!match?.[1]) throw new Error('The note has no frontmatter block.');
  return { head: match[1], rest: match[2] ?? '' };
}

/** Sets `pubDate` in the frontmatter only; a pubDate-looking line in the body is left alone. */
export function setPubDate(mdx: string, date: string): string {
  const { head, rest } = splitFrontmatter(mdx);
  if (!/^pubDate:.*$/m.test(head)) throw new Error('The note frontmatter has no pubDate.');
  return `---\n${head.replace(/^pubDate:.*$/m, `pubDate: ${date}`)}\n---${rest}`;
}

function scalar(head: string, key: string): string {
  const match = new RegExp(`^${key}:[ \\t]*(.+?)[ \\t]*$`, 'm').exec(head);
  if (!match?.[1]) throw new Error(`The note frontmatter has no ${key}.`);
  const raw = match[1];
  if (raw.startsWith('"')) return JSON.parse(raw) as string;
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1).replaceAll("''", "'");
  return raw;
}

export function readNoteMeta(mdx: string): NoteMeta {
  const { head } = splitFrontmatter(mdx);
  return {
    number: Number(scalar(head, 'number')),
    lang: scalar(head, 'lang'),
    title: scalar(head, 'title'),
    description: scalar(head, 'description'),
  };
}

/** A changelog entry for a published note; English notes get a `-en` key so a translation does not collide. */
export function changelogEntry(meta: NoteMeta, today: string) {
  const number = String(meta.number).padStart(3, '0');
  return {
    key: meta.lang === 'en' ? `note-${number}-en` : `note-${number}`,
    entry: {
      date: today,
      category: 'added' as const,
      title: `New Lab Note ${number}: ${meta.title}`,
      description: meta.description,
    },
  };
}

/** The `develop: <sha>` last line is what `changelog:audit` uses to find the previous release. */
export function releaseMessage(title: string, developSha: string): string {
  return `chore(release): publish note "${title}"\n\ndevelop: ${developSha}`;
}
