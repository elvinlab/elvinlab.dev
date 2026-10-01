import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');

/** Spanish (default) guide and its English twin. */
const PAIRS: [string, string][] = [
  ['README.md', 'README.en.md'],
  ['docs/CONFIGURATION.md', 'docs/CONFIGURATION.en.md'],
  ['docs/NOTES.md', 'docs/NOTES.en.md'],
];
const ALL = PAIRS.flat();

const read = (file: string): string => readFileSync(resolve(root, file), 'utf8');

/** Markdown without fenced code, so `#` comments in bash blocks are not read as headings. */
const withoutFences = (markdown: string): string => markdown.replace(/^```[\s\S]*?^```/gm, '');

const headings = (markdown: string): { level: number; text: string }[] =>
  [...withoutFences(markdown).matchAll(/^(#{1,6}) +(.+?) *$/gm)].map((match) => ({
    level: (match[1] ?? '').length,
    text: match[2] ?? '',
  }));

/** GitHub's anchor for a heading: lowercase, punctuation dropped, spaces to hyphens. */
const anchor = (text: string): string =>
  text
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s/g, '-');

const links = (markdown: string): string[] =>
  [...withoutFences(markdown).matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1] ?? '');

const isLocal = (target: string): boolean => !/^(https?:|mailto:|#)/.test(target);

describe('documentation files', () => {
  it('all exist', () => {
    for (const file of ALL)
      expect(existsSync(resolve(root, file)), `${file} is missing`).toBe(true);
  });

  for (const file of ALL) {
    describe(file, () => {
      it('has only links that resolve, files and anchors included', () => {
        if (!existsSync(resolve(root, file))) return;
        const markdown = read(file);
        const broken: string[] = [];
        for (const target of links(markdown)) {
          if (target.startsWith('#')) {
            const wanted = target.slice(1);
            if (!headings(markdown).some((heading) => anchor(heading.text) === wanted)) {
              broken.push(target);
            }
            continue;
          }
          if (!isLocal(target)) continue;
          const [path = '', fragment] = target.split('#');
          const full = resolve(root, dirname(file), path);
          if (!existsSync(full)) {
            broken.push(target);
            continue;
          }
          if (fragment && path.endsWith('.md')) {
            const other = readFileSync(full, 'utf8');
            if (!headings(other).some((heading) => anchor(heading.text) === fragment)) {
              broken.push(target);
            }
          }
        }
        expect(broken, `broken links in ${file}`).toEqual([]);
      });
    });
  }
});

describe('Spanish and English versions', () => {
  for (const [es, en] of PAIRS) {
    describe(`${es} and ${en}`, () => {
      it('have the same structure: headings, code blocks, tables and generated blocks', () => {
        if (!existsSync(resolve(root, es)) || !existsSync(resolve(root, en))) {
          expect(existsSync(resolve(root, en)), `${en} is missing`).toBe(true);
          return;
        }
        const a = read(es);
        const b = read(en);
        expect(headings(b).map((heading) => heading.level)).toEqual(
          headings(a).map((heading) => heading.level),
        );
        const count = (text: string, pattern: RegExp): number => (text.match(pattern) ?? []).length;
        expect(count(b, /^```/gm)).toBe(count(a, /^```/gm));
        expect(count(b, /^\| --- /gm)).toBe(count(a, /^\| --- /gm));
        expect(count(b, /<!-- docs:start /g)).toBe(count(a, /<!-- docs:start /g));
      });

      it('link to the same places (the English one points at the English twins)', () => {
        if (!existsSync(resolve(root, es)) || !existsSync(resolve(root, en))) return;
        const normalize = (target: string): string =>
          target.replace(/\.en\.md/g, '.md').replace(/#.*/, '');
        const targets = (file: string): string[] =>
          [...new Set(links(read(file)).filter(isLocal).map(normalize))].sort();
        expect(targets(en)).toEqual(targets(es));
      });

      it('point at each other from the first lines', () => {
        if (!existsSync(resolve(root, es)) || !existsSync(resolve(root, en))) return;
        const name = (file: string): string => file.split('/').pop() ?? file;
        expect(read(es).slice(0, 400)).toContain(`](${name(en)})`);
        expect(read(en).slice(0, 400)).toContain(`](${name(es)})`);
      });
    });
  }
});
