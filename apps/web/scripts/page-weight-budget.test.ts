import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  articleContentBytes,
  type Budgets,
  classifyPage,
  collectPageWeights,
  evaluatePages,
  formatReport,
  inlineStyleBytes,
  noteRowCount,
  suggestBudgets,
} from './page-weight-budget.ts';

const BUDGETS: Budgets = {
  types: {
    home: { why: 'home', styleBytes: 1000, htmlBytes: 2000 },
    note: { why: 'note', styleBytes: 500, htmlBytes: 900 },
    default: { why: 'rest', styleBytes: 300, htmlBytes: 600 },
  },
};

const temporaryDirectories: string[] = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('classifyPage', () => {
  it.each([
    ['/', 'home'],
    ['/en/', 'home'],
    ['/me/', 'me'],
    ['/en/me/', 'me'],
    ['/experiments/', 'experiments'],
    ['/en/experiments/', 'experiments'],
    ['/experiments/page/2/', 'default'],
    ['/experiments/sort/name/', 'default'],
    ['/contact/', 'contact'],
    ['/en/contact/', 'contact'],
    ['/subscribe/', 'subscribe'],
    ['/subscribe/confirm/', 'result'],
    ['/en/subscribe/unsubscribe/', 'result'],
    ['/404/', 'result'],
    ['/notes/', 'notes-index'],
    ['/en/notes/', 'notes-index'],
    ['/notes/smoke-es/', 'note'],
    ['/en/notes/some-slug/', 'note'],
    ['/notes/page/2/', 'default'],
    ['/notes/tag/agentes-de-ia/', 'topic'],
    ['/notes/tag/', 'default'],
    ['/privacy/', 'default'],
    ['/changelog/', 'changelog'],
    ['/en/changelog/', 'changelog'],
    ['/changelog/page/2/', 'changelog'],
  ])('%s is %s', (path, type) => {
    expect(classifyPage(path)).toBe(type);
  });
});

describe('inlineStyleBytes', () => {
  it('sums the text of every <style> element, attributes excluded', () => {
    const html =
      '<head><style>a{b:c}</style><style is:inline data-x="1">é{}</style></head><p>x</p>';
    expect(inlineStyleBytes(html)).toBe(Buffer.byteLength('a{b:c}') + Buffer.byteLength('é{}'));
  });

  it('is zero without styles and ignores stylesheet links', () => {
    expect(inlineStyleBytes('<link rel="stylesheet" href="/a.css"><p>x</p>')).toBe(0);
  });
});

describe('evaluatePages', () => {
  const contentBudgets: Budgets = {
    types: {
      note: {
        why: 'bounded shell and article',
        styleBytes: 500,
        htmlBytes: 900,
        articleBytes: 2000,
      },
      'notes-index': {
        why: 'bounded listing',
        styleBytes: 500,
        htmlBytes: 900,
        htmlBytesPerNote: 100,
        maxHtmlBytes: 3000,
      },
    },
  };

  it('allows a longer article while the fixed HTML shell stays the same', () => {
    expect(
      evaluatePages(
        [
          { path: '/notes/a/', styleBytes: 500, htmlBytes: 1000, articleHtmlBytes: 100 },
          { path: '/notes/b/', styleBytes: 500, htmlBytes: 2900, articleHtmlBytes: 2000 },
        ],
        contentBudgets,
      ).failures,
    ).toEqual([]);
  });

  it('still rejects shell, CSS and oversized article regressions', () => {
    const result = evaluatePages(
      [
        { path: '/notes/shell/', styleBytes: 500, htmlBytes: 1001, articleHtmlBytes: 100 },
        { path: '/notes/css/', styleBytes: 501, htmlBytes: 1000, articleHtmlBytes: 100 },
        { path: '/notes/body/', styleBytes: 500, htmlBytes: 2100, articleHtmlBytes: 2001 },
      ],
      contentBudgets,
    );
    expect(result.failures).toHaveLength(3);
    expect(formatReport(result)).toContain('article 2001 / 2000 B (+1 B)');
  });

  it('scales a topic page allowance with its listed notes but retains an absolute ceiling', () => {
    const topicBudgets: Budgets = {
      types: {
        topic: {
          why: 'bounded topic page',
          styleBytes: 500,
          htmlBytes: 900,
          htmlBytesPerNote: 100,
          maxHtmlBytes: 3000,
        },
      },
    };
    expect(
      evaluatePages(
        [
          { path: '/notes/tag/a/', styleBytes: 500, htmlBytes: 1000, notesCount: 1 },
          { path: '/notes/tag/b/', styleBytes: 500, htmlBytes: 2900, notesCount: 20 },
        ],
        topicBudgets,
      ).failures,
    ).toEqual([]);
    expect(
      evaluatePages(
        [
          { path: '/notes/tag/a/', styleBytes: 500, htmlBytes: 1001, notesCount: 1 },
          { path: '/notes/tag/b/', styleBytes: 500, htmlBytes: 3001, notesCount: 100 },
        ],
        topicBudgets,
      ).failures,
    ).toHaveLength(2);
    expect(() =>
      evaluatePages([{ path: '/notes/tag/a/', styleBytes: 500, htmlBytes: 900 }], topicBudgets),
    ).toThrow(/Missing note row count/);
  });

  it('scales the index allowance with new notes but retains an absolute ceiling', () => {
    expect(
      evaluatePages(
        [
          { path: '/notes/', styleBytes: 500, htmlBytes: 1000, notesCount: 1 },
          { path: '/notes/', styleBytes: 500, htmlBytes: 2900, notesCount: 20 },
        ],
        contentBudgets,
      ).failures,
    ).toEqual([]);
    expect(
      evaluatePages(
        [
          { path: '/notes/', styleBytes: 500, htmlBytes: 1001, notesCount: 1 },
          { path: '/notes/', styleBytes: 500, htmlBytes: 3001, notesCount: 100 },
        ],
        contentBudgets,
      ).failures,
    ).toHaveLength(2);
  });

  it('fails closed if a build is missing the content measurements', () => {
    expect(() =>
      evaluatePages([{ path: '/notes/a/', styleBytes: 1, htmlBytes: 1 }], contentBudgets),
    ).toThrow(/markers/);
    expect(() =>
      evaluatePages([{ path: '/notes/', styleBytes: 1, htmlBytes: 1 }], contentBudgets),
    ).toThrow(/row count/);
  });
  it('passes a page within both budgets and reports the numbers', () => {
    const result = evaluatePages([{ path: '/', styleBytes: 1000, htmlBytes: 2000 }], BUDGETS);
    expect(result.failures).toEqual([]);
    expect(result.rows).toEqual([
      {
        path: '/',
        type: 'home',
        styleBytes: 1000,
        htmlBytes: 2000,
        styleBudget: 1000,
        htmlBudget: 2000,
        ok: true,
      },
    ]);
  });

  it('fails when the inline CSS or the HTML exceeds its budget', () => {
    const result = evaluatePages(
      [
        { path: '/', styleBytes: 1001, htmlBytes: 100 },
        { path: '/en/', styleBytes: 10, htmlBytes: 2001 },
      ],
      BUDGETS,
    );
    expect(result.failures.map((row) => row.path)).toEqual(['/', '/en/']);
  });

  it('applies the default type to pages of an unlisted type', () => {
    const result = evaluatePages([{ path: '/privacy/', styleBytes: 301, htmlBytes: 10 }], BUDGETS);
    expect(result.rows[0]?.type).toBe('default');
    expect(result.failures).toHaveLength(1);
  });

  it('throws when a type has no budget and there is no default', () => {
    expect(() =>
      evaluatePages([{ path: '/me/', styleBytes: 1, htmlBytes: 1 }], {
        types: { home: { why: 'home', styleBytes: 1, htmlBytes: 1 } },
      }),
    ).toThrow(/default/);
  });
});

describe('article content measurements', () => {
  it('counts UTF-8 bytes of the body without exempting surrounding markup', () => {
    expect(
      articleContentBytes(
        '<style>x</style><template data-page-weight-start></template><p>á</p><template data-page-weight-end></template><footer>y</footer>',
      ),
    ).toBe(Buffer.byteLength('<p>á</p>'));
    expect(
      articleContentBytes(
        '<template data-page-weight-start=""></template><template data-page-weight-end=""></template>',
      ),
    ).toBe(0);
    expect(articleContentBytes('<p>no article</p>')).toBeUndefined();
  });

  it.each([
    '<template data-page-weight-start></template>',
    '<template data-page-weight-end></template>',
    '<template data-page-weight-end></template><template data-page-weight-start></template>',
    '<template data-page-weight-start></template><template data-page-weight-start></template><template data-page-weight-end></template>',
  ])('rejects malformed or duplicate boundaries: %s', (html) => {
    expect(() => articleContentBytes(html)).toThrow(/Invalid/);
  });

  it('counts actual index rows rather than labels and filter selectors', () => {
    expect(
      noteRowCount(
        '<p>data-note-row</p><article data-note-row class="x"></article><article data-note-row=""></article><div data-note-row></div>',
      ),
    ).toBe(2);
  });
});

describe('formatReport', () => {
  it('prints every page, marks failures and names the overshoot', () => {
    const result = evaluatePages(
      [
        { path: '/', styleBytes: 900, htmlBytes: 1500 },
        { path: '/notes/a/', styleBytes: 620, htmlBytes: 800 },
      ],
      BUDGETS,
    );
    const text = formatReport(result);
    expect(text).toContain('PASS  /');
    expect(text).toContain('FAIL  /notes/a/');
    expect(text).toContain('note');
    expect(text).toMatch(/style 620 \/ 500 B \(\+120 B\)/);
    expect(text).toMatch(/1 of 2 pages over budget/);
  });
});

describe('collectPageWeights', () => {
  it('collects article boundaries and actual index rows from built files', () => {
    const root = mkdtempSync(join(tmpdir(), 'page-weight-content-'));
    temporaryDirectories.push(root);
    const noteDirectory = join(root, 'notes/a');
    mkdirSync(noteDirectory, { recursive: true });
    writeFileSync(
      join(noteDirectory, 'index.html'),
      '<template data-page-weight-start></template><div class="prose"><p>á</p></div><template data-page-weight-end></template>',
    );
    writeFileSync(
      join(root, 'notes/index.html'),
      '<article data-note-row></article><article data-note-row></article>',
    );
    const pages = collectPageWeights(root);
    expect(pages.find((page) => page.path === '/notes/a/')?.articleHtmlBytes).toBe(
      Buffer.byteLength('<div class="prose"><p>á</p></div>'),
    );
    expect(pages.find((page) => page.path === '/notes/')?.notesCount).toBe(2);
  });
  it('reads the number of listed notes of a topic page from its marker', () => {
    const root = mkdtempSync(join(tmpdir(), 'page-weight-topic-'));
    temporaryDirectories.push(root);
    const topicDirectory = join(root, 'notes/tag/rendimiento');
    mkdirSync(topicDirectory, { recursive: true });
    writeFileSync(
      join(topicDirectory, 'index.html'),
      '<div class="mt-2" data-topic-notes="4"><a></a></div>',
    );
    const topic = collectPageWeights(root).find((page) => page.path === '/notes/tag/rendimiento/');
    expect(topic?.notesCount).toBe(4);
  });
  it('leaves the count undefined when a topic page has no marker, so evaluation can refuse it', () => {
    const root = mkdtempSync(join(tmpdir(), 'page-weight-topic-'));
    temporaryDirectories.push(root);
    const topicDirectory = join(root, 'notes/tag/rendimiento');
    mkdirSync(topicDirectory, { recursive: true });
    writeFileSync(join(topicDirectory, 'index.html'), '<div class="mt-2"></div>');
    const topic = collectPageWeights(root).find((page) => page.path === '/notes/tag/rendimiento/');
    expect(topic?.notesCount).toBeUndefined();
  });
  it('reads every index.html and the root 404.html of a build and measures them', () => {
    const root = mkdtempSync(join(tmpdir(), 'page-weight-'));
    temporaryDirectories.push(root);
    const write = (relative: string, html: string): void => {
      const file = join(root, relative);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, html);
    };
    write('index.html', '<style>abc</style>');
    write('en/me/index.html', '<style>de</style><style>f</style>');
    write('404.html', '<style>xy</style>');
    write('notes/404.html', '<style>ignored</style>');
    const pages = collectPageWeights(root);
    expect(pages).toEqual([
      { path: '/', styleBytes: 3, htmlBytes: 18 },
      { path: '/404/', styleBytes: 2, htmlBytes: 17 },
      { path: '/en/me/', styleBytes: 3, htmlBytes: 33 },
    ]);
  });
});

describe('suggestBudgets', () => {
  it('suggests the fixed shell rather than absorbing article or listing growth', () => {
    expect(
      suggestBudgets(
        [
          { path: '/notes/a/', styleBytes: 100, htmlBytes: 1500, articleHtmlBytes: 1000 },
          { path: '/notes/', styleBytes: 100, htmlBytes: 1500, notesCount: 10 },
        ],
        0.04,
        {
          types: {
            note: { why: 'article', styleBytes: 100, htmlBytes: 500, articleBytes: 2000 },
            'notes-index': {
              why: 'listing',
              styleBytes: 100,
              htmlBytes: 500,
              htmlBytesPerNote: 100,
            },
          },
        },
      ),
    ).toEqual({
      note: { styleBytes: 200, htmlBytes: 600 },
      'notes-index': { styleBytes: 200, htmlBytes: 600 },
    });
  });
  it('takes the largest page of each type plus the headroom, rounded up to 100 B', () => {
    const suggested = suggestBudgets(
      [
        { path: '/notes/a/', styleBytes: 1000, htmlBytes: 5000 },
        { path: '/notes/b/', styleBytes: 2000, htmlBytes: 4000 },
        { path: '/', styleBytes: 100, htmlBytes: 100 },
      ],
      0.04,
    );
    expect(suggested.note).toEqual({ styleBytes: 2100, htmlBytes: 5200 });
    expect(suggested.home).toEqual({ styleBytes: 200, htmlBytes: 200 });
  });
});
