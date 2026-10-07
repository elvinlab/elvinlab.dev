import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  type Budgets,
  classifyPage,
  collectPageWeights,
  evaluatePages,
  formatReport,
  inlineStyleBytes,
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
    ['/subscribe/confirm/', 'default'],
    ['/notes/', 'notes-index'],
    ['/en/notes/', 'notes-index'],
    ['/notes/smoke-es/', 'note'],
    ['/en/notes/some-slug/', 'note'],
    ['/notes/page/2/', 'default'],
    ['/privacy/', 'default'],
    ['/changelog/', 'default'],
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
  it('reads every index.html of a build and measures it', () => {
    const root = mkdtempSync(join(tmpdir(), 'page-weight-'));
    temporaryDirectories.push(root);
    const write = (relative: string, html: string): void => {
      const file = join(root, relative);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, html);
    };
    write('index.html', '<style>abc</style>');
    write('en/me/index.html', '<style>de</style><style>f</style>');
    write('404.html', '<style>ignored</style>');
    const pages = collectPageWeights(root);
    expect(pages).toEqual([
      { path: '/', styleBytes: 3, htmlBytes: 18 },
      { path: '/en/me/', styleBytes: 3, htmlBytes: 33 },
    ]);
  });
});

describe('suggestBudgets', () => {
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
