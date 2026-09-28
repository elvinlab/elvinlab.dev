/**
 * Scaffolds a Lab Note draft: `pnpm new-post "Title" [--lang en] [--number 3]`.
 * Drafts go to the git-ignored `src/content/drafts/<slug>/index.mdx` and only render in dev.
 * `--number` reuses an entry number, for translating an existing note.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';

import { nextNumber, scaffoldNote, slugify } from './scaffold-note.ts';

const LANGS = ['es', 'en'];
const content = join(import.meta.dirname, '../src/content');

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { lang: { type: 'string', default: 'es' }, number: { type: 'string' } },
});

const title = positionals.join(' ').trim();
if (!title || !LANGS.includes(values.lang)) {
  console.error('Usage: pnpm new-post "Title" [--lang es|en] [--number N]');
  process.exit(1);
}

/** Entry numbers already used by published notes and drafts. */
function existingNumbers(): number[] {
  return ['notes', 'drafts'].flatMap((folder) => {
    const dir = join(content, folder);
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((slug) => {
      const file = join(dir, slug, 'index.mdx');
      if (!existsSync(file)) return [];
      const match = /^number:\s*(\d+)/m.exec(readFileSync(file, 'utf8'));
      return match?.[1] ? [Number(match[1])] : [];
    });
  });
}

const slug = slugify(title);
const target = join(content, 'drafts', slug, 'index.mdx');
if (existsSync(target) || existsSync(join(content, 'notes', slug))) {
  console.error(`A note with the slug "${slug}" already exists.`);
  process.exit(1);
}

const number = values.number ? Number(values.number) : nextNumber(existingNumbers());
// Local calendar date: the UTC date is already tomorrow in the evening in the Americas.
const today = new Date().toLocaleDateString('en-CA');
const { mdx } = scaffoldNote({ title, lang: values.lang, number, today });

mkdirSync(join(content, 'drafts', slug), { recursive: true });
writeFileSync(target, mdx);
console.log(
  `Draft Note ${String(number).padStart(3, '0')} created: ${relative(process.cwd(), target)}`,
);
