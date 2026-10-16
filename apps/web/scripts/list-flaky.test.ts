import { describe, expect, it } from 'vitest';

import { type FlakyReport, flakyMarkdown, flakyTests } from './list-flaky.ts';

describe('flakyTests', () => {
  it('finds flaky tests across nested suites with their projects', () => {
    const report: FlakyReport = {
      suites: [
        {
          specs: [
            {
              title: 'notes index lists the published notes',
              file: 'tests/browser/notes-index-ruled.spec.ts',
              tests: [
                { status: 'flaky', projectName: 'chromium-360' },
                { status: 'expected', projectName: 'chromium-1280' },
              ],
            },
          ],
          suites: [
            {
              specs: [
                {
                  title: 'contact form sends a message',
                  file: 'tests/browser/contact.spec.ts',
                  tests: [{ status: 'flaky', projectName: 'chromium-768' }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(flakyTests(report)).toEqual([
      {
        title: 'notes index lists the published notes',
        file: 'tests/browser/notes-index-ruled.spec.ts',
        projects: ['chromium-360'],
      },
      {
        title: 'contact form sends a message',
        file: 'tests/browser/contact.spec.ts',
        projects: ['chromium-768'],
      },
    ]);
  });

  it('ignores expected, unexpected and skipped outcomes', () => {
    const report: FlakyReport = {
      suites: [
        {
          specs: [
            {
              title: 'a passing test',
              file: 'tests/browser/a.spec.ts',
              tests: [{ status: 'expected', projectName: 'chromium-1280' }],
            },
            {
              title: 'a failing test',
              file: 'tests/browser/b.spec.ts',
              tests: [{ status: 'unexpected', projectName: 'chromium-1280' }],
            },
            {
              title: 'a skipped test',
              file: 'tests/browser/c.spec.ts',
              tests: [{ status: 'skipped', projectName: 'chromium-1280' }],
            },
          ],
        },
      ],
    };
    expect(flakyTests(report)).toEqual([]);
  });

  it('is empty for a report without suites', () => {
    expect(flakyTests({})).toEqual([]);
  });

  it('lists only the projects that were flaky for a multi-project spec', () => {
    const report: FlakyReport = {
      suites: [
        {
          specs: [
            {
              title: 'home renders the hero',
              file: 'tests/browser/home.spec.ts',
              tests: [
                { status: 'expected', projectName: 'chromium-360' },
                { status: 'flaky', projectName: 'chromium-768' },
                { status: 'flaky', projectName: 'chromium-1280' },
              ],
            },
          ],
        },
      ],
    };
    expect(flakyTests(report)).toEqual([
      {
        title: 'home renders the hero',
        file: 'tests/browser/home.spec.ts',
        projects: ['chromium-768', 'chromium-1280'],
      },
    ]);
  });
});

describe('flakyMarkdown', () => {
  it('renders one line per flaky test with its file and projects', () => {
    expect(
      flakyMarkdown([
        {
          title: 'home renders the hero',
          file: 'tests/browser/home.spec.ts',
          projects: ['chromium-768', 'chromium-1280'],
        },
        {
          title: 'contact form sends a message',
          file: 'tests/browser/contact.spec.ts',
          projects: ['chromium-360'],
        },
      ]),
    ).toBe(
      '- home renders the hero `tests/browser/home.spec.ts` [chromium-768, chromium-1280]\n' +
        '- contact form sends a message `tests/browser/contact.spec.ts` [chromium-360]',
    );
  });

  it('is empty for no flaky tests', () => {
    expect(flakyMarkdown([])).toBe('');
  });
});
