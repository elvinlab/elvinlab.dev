/** Pure helpers behind `pnpm new-post`, kept apart from the CLI so they are testable. */

export type ScaffoldInput = {
  title: string;
  lang: string;
  number: number;
  /** ISO date (`YYYY-MM-DD`) used as the publication date. */
  today: string;
};

export function slugify(title: string): string {
  return title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function nextNumber(existing: readonly number[]): number {
  return existing.length === 0 ? 1 : Math.max(...existing) + 1;
}

/** Frontmatter placeholders are valid on purpose, so a fresh draft renders in dev right away. */
export function scaffoldNote(input: ScaffoldInput): { data: Record<string, unknown>; mdx: string } {
  const data = {
    number: input.number,
    title: input.title,
    description: 'One sentence: what was decided and why it matters.',
    pubDate: input.today,
    lang: input.lang,
    category: 'decisions',
    tags: [],
    decision: {
      context: 'What forced a decision.',
      decision: 'What I chose, and what I ruled out.',
      outcome: 'What happened next.',
    },
  };
  // JSON strings are valid YAML scalars, so values are quoted safely; the date stays bare so YAML
  // parses it as a date.
  const yaml = [
    `number: ${data.number}`,
    `title: ${JSON.stringify(data.title)}`,
    `description: ${JSON.stringify(data.description)}`,
    `pubDate: ${data.pubDate}`,
    `lang: ${data.lang}`,
    `category: ${data.category}`,
    'tags: []',
    'decision:',
    `  context: ${JSON.stringify(data.decision.context)}`,
    `  decision: ${JSON.stringify(data.decision.decision)}`,
    `  outcome: ${JSON.stringify(data.decision.outcome)}`,
  ].join('\n');
  const body = 'Write around 500 words about one concrete decision. Start with the problem.\n';
  return { data, mdx: `---\n${yaml}\n---\n\n${body}` };
}
