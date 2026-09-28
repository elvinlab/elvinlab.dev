/**
 * dependency-cruiser cannot parse `.astro` files, so it would be blind to pages and components.
 * This mirrors `src/` into `boundaries-mirror/` (git-ignored), turning each `Foo.astro` into
 * `Foo.astro.ts` with its frontmatter and bundled `<script>` code. An `import './Foo.astro'` then
 * resolves to the mirror file (the resolver appends `.ts`), so the graph covers every file.
 * Tests are skipped: they may reach into internals on purpose.
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const root = join(import.meta.dirname, '..');
const source = join(root, 'src');
const mirror = join(root, 'boundaries-mirror');

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
// `is:inline` scripts are not bundled, so their imports never enter the module graph.
const BUNDLED_SCRIPT = /<script(?![^>]*\bis:inline\b)[^>]*>([\s\S]*?)<\/script>/g;

function astroToTs(code: string): string {
  const frontmatter = FRONTMATTER.exec(code)?.[1] ?? '';
  const scripts = [...code.matchAll(BUNDLED_SCRIPT)].map((match) => match[1] ?? '');
  return [frontmatter, ...scripts].join('\n');
}

function mirrorDir(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    const target = join(mirror, 'src', relative(source, path));
    if (entry.isDirectory()) {
      mirrorDir(path);
      continue;
    }
    if (/\.test\.tsx?$/.test(entry.name)) continue;
    mkdirSync(dirname(target), { recursive: true });
    if (entry.name.endsWith('.astro')) {
      writeFileSync(`${target}.ts`, astroToTs(readFileSync(path, 'utf8')));
    } else {
      copyFileSync(path, target);
    }
  }
}

rmSync(mirror, { recursive: true, force: true });
mirrorDir(source);
// Same aliases as apps/web/tsconfig.json, pointing at the mirror.
writeFileSync(
  join(mirror, 'tsconfig.json'),
  JSON.stringify({
    include: ['src'],
    compilerOptions: {
      baseUrl: '.',
      paths: { '@/*': ['./src/*'] },
    },
  }),
);
