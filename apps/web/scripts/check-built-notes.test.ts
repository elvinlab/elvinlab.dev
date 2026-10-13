import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  checkBuiltNotes,
  checkBuiltNotesReport,
  extractLocalLinks,
  parseNoteFrontmatter,
  parseRssPaths,
  parseSitemapLocs,
  resolvesToBuiltFile,
} from './check-built-notes.ts';

describe('parseNoteFrontmatter', () => {
  it('reads lang and inline tags', () => {
    const mdx = '---\nnumber: 1\nlang: es\ntags: [a, "b-c", \'d\']\n---\nBody lang: en\n';
    expect(parseNoteFrontmatter(mdx)).toEqual({ lang: 'es', tags: ['a', 'b-c', 'd'] });
  });

  it('reads block tags and an empty list', () => {
    expect(parseNoteFrontmatter('---\nlang: en\ntags:\n  - x\n  - y\ncategory: z\n---\n')).toEqual({
      lang: 'en',
      tags: ['x', 'y'],
    });
    expect(parseNoteFrontmatter('---\nlang: es\n---\n')).toEqual({ lang: 'es', tags: [] });
  });

  it('rejects a note without frontmatter or lang', () => {
    expect(() => parseNoteFrontmatter('# no frontmatter')).toThrow(/frontmatter/);
    expect(() => parseNoteFrontmatter('---\ntitle: x\n---\n')).toThrow(/lang/);
  });
});

describe('parseSitemapLocs and parseRssPaths', () => {
  it('returns the URL paths of every loc', () => {
    const xml =
      '<urlset><url><loc>https://elvinlab.dev/notes/a/</loc></url><url><loc>https://elvinlab.dev/</loc></url></urlset>';
    expect(parseSitemapLocs(xml)).toEqual(['/notes/a/', '/']);
  });

  it('returns the item links of a feed, not the channel link', () => {
    const xml =
      '<rss><channel><link>https://x.dev/notes/</link><item><link>https://x.dev/notes/a/</link></item><item><link>https://x.dev/notes/b/</link></item></channel></rss>';
    expect(parseRssPaths(xml)).toEqual(['/notes/a/', '/notes/b/']);
  });
});

describe('extractLocalLinks', () => {
  it('keeps local href and src, drops external, anchors, mailto and protocol-relative', () => {
    const html = [
      '<a href="/notes/a/">a</a>',
      '<a href="/notes/b/?q=1#top">b</a>',
      '<a href="#top">anchor</a>',
      '<a href="mailto:x@y.z">mail</a>',
      '<a href="https://example.com/">ext</a>',
      '<a href="//cdn.example.com/x">proto</a>',
      '<img src="/og/a.png">',
      '<script>const s = \'<a href="/inside-script/">\';</script>',
      '<script src="/_astro/x.js"></script>',
    ].join('');
    expect(extractLocalLinks(html)).toEqual([
      '/notes/a/',
      '/notes/b/',
      '/og/a.png',
      '/_astro/x.js',
    ]);
  });
});

describe('relative local links', () => {
  it('resolves relative links from the built page URL', () => {
    expect(
      extractLocalLinks('<a href="../../missing/">x</a><img src="pic.png">', '/notes/uno/'),
    ).toEqual(['/missing/', '/notes/uno/pic.png']);
  });
});

describe('resolvesToBuiltFile', () => {
  const files = new Set(['index.html', 'notes/a/index.html', 'rss.xml', '404.html']);
  const exists = (rel: string): boolean => files.has(rel);

  it('resolves directories, files and extensionless pages', () => {
    expect(resolvesToBuiltFile('/', exists)).toBe(true);
    expect(resolvesToBuiltFile('/notes/a/', exists)).toBe(true);
    expect(resolvesToBuiltFile('/notes/a', exists)).toBe(true);
    expect(resolvesToBuiltFile('/rss.xml', exists)).toBe(true);
    expect(resolvesToBuiltFile('/404', exists)).toBe(true);
  });

  it('rejects a missing page', () => {
    expect(resolvesToBuiltFile('/notes/gone/', exists)).toBe(false);
  });

  it('allows the worker-served routes without a file', () => {
    expect(resolvesToBuiltFile('/api/contact', exists)).toBe(true);
    expect(resolvesToBuiltFile('/version.txt', exists)).toBe(true);
  });

  it('does not treat a static worker route as a prefix exemption', () => {
    expect(resolvesToBuiltFile('/version.txt-missing', exists)).toBe(false);
  });
});

describe('checkBuiltNotes', () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  function write(root: string, rel: string, text: string): void {
    const path = join(root, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }

  const page = (title: string, body = ''): string =>
    `<html><head><link rel="canonical" href="https://x.dev/${title}/"></head><body><h1>${title}</h1>${body}</body></html>`;

  /** A tiny site: notes `uno` and `dos` (es), `three` (en), one topic `tema` covering `uno` and `dos`. */
  function fixture(): { content: string; dist: string } {
    const base = mkdtempSync(join(tmpdir(), 'built-notes-'));
    roots.push(base);
    const content = join(base, 'content');
    const dist = join(base, 'dist');
    write(content, 'notes/uno/index.mdx', '---\nlang: es\ntags: [t1]\n---\n');
    write(content, 'notes/dos/index.mdx', '---\nlang: es\ntags: [t1]\n---\n');
    write(content, 'notes/three/index.mdx', '---\nlang: en\ntags: [t9]\n---\n');
    write(content, 'topics.json', JSON.stringify({ tema: { intro: 'hola', tags: ['t1'] } }));
    write(dist, 'notes/uno/index.html', page('uno', '<a href="/notes/dos/">dos</a>'));
    write(dist, 'notes/dos/index.html', page('dos'));
    write(dist, 'en/notes/three/index.html', page('three'));
    write(
      dist,
      'notes/index.html',
      page(
        'notes',
        ['uno', 'dos', 'three']
          .map((slug) => `<article data-note-row data-slug="${slug}"></article>`)
          .join(''),
      ),
    );
    write(dist, 'notes/tag/tema/index.html', page('tema', '<div data-topic-notes="2"></div>'));
    write(
      dist,
      'sitemap-index.xml',
      '<sitemapindex><sitemap><loc>https://x.dev/sitemap-0.xml</loc></sitemap></sitemapindex>',
    );
    write(
      dist,
      'sitemap-0.xml',
      `<urlset>${['/notes/uno/', '/notes/dos/', '/en/notes/three/']
        .map((p) => `<url><loc>https://x.dev${p}</loc></url>`)
        .join('')}</urlset>`,
    );
    write(
      dist,
      'rss.xml',
      '<rss><channel><link>https://x.dev/notes/</link><item><link>https://x.dev/notes/uno/</link></item><item><link>https://x.dev/notes/dos/</link></item></channel></rss>',
    );
    return { content, dist };
  }

  const run = (f: { content: string; dist: string }) =>
    checkBuiltNotes({ contentDir: f.content, distDir: f.dist, topicMinNotes: 2 });

  it('passes on a consistent site', () => {
    expect(run(fixture())).toEqual([]);
  });

  it('reports a note without its page', () => {
    const f = fixture();
    rmSync(join(f.dist, 'notes/dos'), { recursive: true });
    const errors = run(f);
    expect(errors).toContain('notes/dos/index.html: published note "dos" has no built page');
    // the link from `uno` now dangles too
    expect(errors.some((e) => e.startsWith('notes/uno/index.html: broken link /notes/dos/'))).toBe(
      true,
    );
  });

  it('allows intentionally absent note routes when the blog is disabled', () => {
    const f = fixture();
    rmSync(join(f.dist, 'notes'), { recursive: true });
    rmSync(join(f.dist, 'en'), { recursive: true });
    rmSync(join(f.dist, 'rss.xml'));
    expect(
      checkBuiltNotes({
        contentDir: f.content,
        distDir: f.dist,
        topicMinNotes: 2,
        blogEnabled: false,
      }),
    ).toEqual([]);
  });

  it('still checks links when the blog is disabled', () => {
    const f = fixture();
    write(f.dist, 'privacy/index.html', page('p', '<a href="../missing/">x</a>'));
    expect(
      checkBuiltNotes({
        contentDir: f.content,
        distDir: f.dist,
        topicMinNotes: 2,
        blogEnabled: false,
      }),
    ).toContain('privacy/index.html: broken link /missing/');
  });

  it('accepts an empty collection without requiring individual note routes', () => {
    const f = fixture();
    rmSync(join(f.content, 'notes'), { recursive: true });
    write(f.dist, 'notes/index.html', page('notes'));
    write(f.dist, 'rss.xml', '<rss><channel></channel></rss>');
    expect(run(f)).toEqual([]);
  });

  it('reports a page without h1 or canonical', () => {
    const f = fixture();
    write(f.dist, 'notes/dos/index.html', '<html><body>nothing</body></html>');
    const errors = run(f);
    expect(errors).toContain('notes/dos/index.html: no <h1>');
    expect(errors).toContain('notes/dos/index.html: no canonical link');
  });

  it('reports a note missing from the index, sitemap and feed', () => {
    const f = fixture();
    write(
      f.dist,
      'notes/index.html',
      page('notes', '<article data-note-row data-slug="uno"></article>'),
    );
    write(
      f.dist,
      'sitemap-0.xml',
      '<urlset><url><loc>https://x.dev/notes/uno/</loc></url></urlset>',
    );
    write(
      f.dist,
      'rss.xml',
      '<rss><channel><item><link>https://x.dev/notes/uno/</link></item></channel></rss>',
    );
    const errors = run(f);
    expect(errors).toContain('notes/index.html: 1 rows listed, 3 published notes');
    expect(errors).toContain('notes/index.html: no row for note "dos"');
    expect(errors).toContain('sitemap-0.xml: missing /notes/dos/');
    expect(errors).toContain('sitemap-0.xml: missing /en/notes/three/');
    expect(errors).toContain('rss.xml: missing /notes/dos/');
  });

  it('does not expect English notes in the Spanish feed', () => {
    const errors = run(fixture());
    expect(errors.filter((e) => e.startsWith('rss.xml'))).toEqual([]);
  });

  it('reports a missing topic page and a wrong topic count', () => {
    const f = fixture();
    rmSync(join(f.dist, 'notes/tag'), { recursive: true });
    expect(run(f)).toContain('notes/tag/tema/index.html: topic "tema" has 2 notes but no page');
    write(f.dist, 'notes/tag/tema/index.html', page('tema', '<div data-topic-notes="1"></div>'));
    expect(run(f)).toContain('notes/tag/tema/index.html: lists 1 notes, expected 2');
  });

  it('requires a topic count marker', () => {
    const f = fixture();
    write(f.dist, 'notes/tag/tema/index.html', page('tema'));
    expect(run(f)).toContain('notes/tag/tema/index.html: missing data-topic-notes count');
  });

  it('rejects a directory as a resolved asset', () => {
    const f = fixture();
    mkdirSync(join(f.dist, 'empty'), { recursive: true });
    write(f.dist, 'privacy/index.html', page('p', '<img src="/empty">'));
    expect(run(f)).toContain('privacy/index.html: broken link /empty');
  });

  it('ignores a topic below the minimum or without intro', () => {
    const f = fixture();
    write(
      f.content,
      'topics.json',
      JSON.stringify({ tema: { tags: ['t1'] }, solo: { intro: 'x', tags: ['t9'] } }),
    );
    rmSync(join(f.dist, 'notes/tag'), { recursive: true });
    expect(run(f)).toEqual([]);
  });

  it('reports broken links in any built page, not only notes', () => {
    const f = fixture();
    write(f.dist, 'privacy/index.html', page('p', '<a href="/gone/">x</a><a href="/api/x">ok</a>'));
    const errors = run(f);
    expect(errors).toContain('privacy/index.html: broken link /gone/');
    expect(errors.some((e) => e.includes('/api/x'))).toBe(false);
  });

  it('tolerates a listed known broken link but still reports it', () => {
    const f = fixture();
    write(f.dist, 'privacy/index.html', page('p', '<a href="/gone/">x</a>'));
    const report = checkBuiltNotesReport({
      contentDir: f.content,
      distDir: f.dist,
      topicMinNotes: 2,
      knownBrokenLinks: { 'privacy/index.html|/gone/': 'on purpose' },
    });
    expect(report.errors).toEqual([]);
    expect(report.known).toEqual(['privacy/index.html: known broken link /gone/ (on purpose)']);
  });
});
