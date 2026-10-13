import { describe, expect, it } from 'vitest';

import { failedTests, formatReport, parseSummary, selectProfiles } from './run-profiles.ts';

describe('parseSummary', () => {
  it('reads the counts of a Playwright list reporter summary', () => {
    const output =
      'noise\n  3 failed\n    [chromium-1280] › a.spec.ts\n  13 skipped\n  568 passed (4.6m)\n';
    expect(parseSummary(output)).toEqual({ passed: 568, failed: 3, skipped: 13 });
  });

  it('counts a missing line as zero', () => {
    expect(parseSummary('  774 passed (2.3m)')).toEqual({ passed: 774, failed: 0, skipped: 0 });
    expect(parseSummary('nothing here')).toEqual({ passed: 0, failed: 0, skipped: 0 });
  });
});

describe('failedTests', () => {
  it('lists the failing tests of the summary and ignores the per-test lines', () => {
    const output = [
      '  ✓  1 [chromium-1280] › tests/browser/ok.spec.ts:3:1 › passes (1s)',
      '  2 failed',
      '    [chromium-1280] › tests/browser/a.spec.ts:10:3 › one ',
      '    [chromium-1280] › tests/browser/b.spec.ts:20:5 › two',
      '  568 passed (4.6m)',
    ].join('\n');
    expect(failedTests(output)).toEqual([
      '[chromium-1280] › tests/browser/a.spec.ts:10:3 › one',
      '[chromium-1280] › tests/browser/b.spec.ts:20:5 › two',
    ]);
  });

  it('is empty when nothing failed', () => {
    expect(failedTests('  774 passed (2.3m)')).toEqual([]);
  });
});

describe('selectProfiles', () => {
  it('runs every profile when none is named', () => {
    expect(selectProfiles([])).toEqual(['quiet', 'blog-only', 'me-only', 'bare']);
  });

  it('keeps the profiles named, in order', () => {
    expect(selectProfiles(['bare', 'quiet'])).toEqual(['bare', 'quiet']);
  });

  it('rejects an unknown name with the list of profiles', () => {
    expect(() => selectProfiles(['wild'])).toThrow(/quiet, blog-only, me-only, bare/);
  });
});

describe('formatReport', () => {
  it('prints one line per profile and a verdict', () => {
    const report = formatReport([
      { name: 'quiet', counts: { passed: 700, failed: 0, skipped: 70 }, status: 0 },
      { name: 'bare', counts: { passed: 100, failed: 4, skipped: 600 }, status: 1 },
    ]);
    expect(report).toContain('PASS  quiet');
    expect(report).toContain('700 passed, 70 skipped, 0 failed');
    expect(report).toContain('FAIL  bare');
    expect(report).toContain('1 of 2 profiles failed');
  });

  it('says so when every profile passes', () => {
    const report = formatReport([
      { name: 'quiet', counts: { passed: 1, failed: 0, skipped: 0 }, status: 0 },
    ]);
    expect(report).toContain('all 1 profiles passed');
  });

  it('treats a run that exited non-zero with no failures as failed (a crash, not a pass)', () => {
    const report = formatReport([
      { name: 'quiet', counts: { passed: 0, failed: 0, skipped: 0 }, status: 1 },
    ]);
    expect(report).toContain('FAIL  quiet');
  });
});
