import { describe, expect, it } from 'vitest';

import { CHECKS } from './verification-map.ts';
import { additionsOnly, planChecks, refineChanged } from './verify-plan.ts';

const ids = (changed: string[], extra: Partial<Parameters<typeof planChecks>[0]> = {}) =>
  planChecks({ mode: 'changed', changed, ...extra }).items.map((item) => item.id);

describe('planChecks', () => {
  it('plans only lint for a documentation change', () => {
    expect(ids(['docs/TESTING.md'])).toEqual(['lint']);
  });

  it('ignores the registry file itself', () => {
    expect(ids(['odd/verification-state.json'])).toEqual([]);
  });

  it('plans nothing when no checked file changed', () => {
    expect(ids(['docs/diagram.png'])).toEqual([]);
  });

  it('plans the contact area for ContactForm and nothing from notes', () => {
    const planned = ids(['apps/web/src/features/contact/components/ContactForm.tsx']);
    for (const id of [
      'e2e:contact.spec.ts',
      'unit',
      'typecheck',
      'lint',
      'js-budget',
      'build',
      'lighthouse:/contact/',
    ]) {
      expect(planned).toContain(id);
    }
    expect(planned).not.toContain('e2e:note-share.spec.ts');
    expect(planned).not.toContain('e2e:notes-layout.spec.ts');
    expect(planned).not.toContain('lighthouse:/notes/smoke-es/');
  });

  it('plans the notes specs and the notes Lighthouse URL for ShareCard', () => {
    const planned = ids(['apps/web/src/features/notes/components/ShareCard.astro']);
    for (const id of [
      'e2e:note-share.spec.ts',
      'e2e:a11y.spec.ts',
      'lighthouse:/notes/smoke-es/',
    ]) {
      expect(planned).toContain(id);
    }
    expect(planned).not.toContain('e2e:contact.spec.ts');
  });

  it('treats a toolchain or dependency change as FULL-wide: every check is selected', () => {
    for (const file of [
      'package.json',
      'playwright.config.ts',
      'apps/web/scripts/verify-plan.ts',
    ]) {
      const plan = planChecks({ mode: 'changed', changed: [file] });
      expect(plan.wide).toBe(true);
      expect(plan.layoutWide).toBe(false);
      const planned = plan.items.map((item) => item.id);
      expect(planned).toContain('lighthouse:/en/contact/');
      expect(planned).toContain('e2e:smoke.spec.ts');
      expect(planned).toContain('cold-start');
    }
  });

  describe('layout-wide change', () => {
    const navbar = ['apps/web/src/shared/layout/Navbar.astro'];

    it('selects cheap families, every e2e spec and two Lighthouse URLs only', () => {
      const plan = planChecks({ mode: 'changed', changed: navbar });
      const planned = plan.items.map((item) => item.id);
      expect(plan.wide).toBe(false);
      expect(plan.layoutWide).toBe(true);
      for (const id of ['lint', 'typecheck', 'unit', 'build', 'js-budget', 'white-label']) {
        expect(planned).toContain(id);
      }
      for (const id of ['cold-start', 'depcruise', 'docs-config']) {
        expect(planned).not.toContain(id);
      }
      expect(planned.filter((id) => id.startsWith('lighthouse:'))).toEqual([
        'lighthouse:/',
        'lighthouse:/notes/smoke-es/',
      ]);
      expect(planned.filter((id) => id.startsWith('e2e:')).length).toBe(
        CHECKS.filter((check) => check.kind === 'e2e').length,
      );
    });

    it('treats global CSS and the BaseLayout the same way', () => {
      for (const file of [
        'apps/web/src/styles/global.css',
        'apps/web/src/shared/layout/BaseLayout.astro',
      ]) {
        const plan = planChecks({ mode: 'changed', changed: [file] });
        expect(plan.layoutWide).toBe(true);
        expect(plan.items.map((item) => item.id)).not.toContain('cold-start');
      }
    });

    it('runs every spec in one 1280 px invocation, without the 3-viewport rerun', () => {
      const plan = planChecks({ mode: 'changed', changed: navbar });
      const e2eCommands = plan.commands.filter((command) => command.argv[1] === 'test:e2e');
      expect(e2eCommands).toHaveLength(1);
      expect(e2eCommands[0]?.env?.['E2E_WIDE_SPECS']).toBe('');
      const lighthouse = plan.commands.find((command) =>
        command.covers[0]?.startsWith('lighthouse:'),
      );
      expect(lighthouse?.argv).toEqual([
        'node',
        'apps/web/scripts/run-lighthouse-ci.ts',
        '--runs',
        '1',
        '--url',
        '/',
        '--url',
        '/notes/smoke-es/',
      ]);
    });

    it('keeps a responsive spec at three viewports when another changed file selects it', () => {
      const plan = planChecks({
        mode: 'changed',
        changed: [...navbar, 'tests/browser/marks.spec.ts'],
      });
      const command = plan.commands.find((c) => c.argv[1] === 'test:e2e');
      expect(command?.env?.['E2E_WIDE_SPECS']).toBe('tests/browser/marks.spec.ts');
    });

    it('does not widen to everything with --all', () => {
      const plan = planChecks({ mode: 'all', changed: navbar });
      expect(plan.layoutWide).toBe(false);
      expect(plan.items.map((item) => item.id)).toContain('cold-start');
    });
  });

  it('plans only the changed spec for a spec edit', () => {
    expect(ids(['tests/browser/contact.spec.ts'])).toEqual([
      'lint',
      'typecheck',
      'e2e:contact.spec.ts',
    ]);
  });

  it('adds build before js-budget when no build is planned', () => {
    const plan = planChecks({
      mode: 'changed',
      changed: ['apps/web/scripts/performance-budget.ts'],
    });
    const planned = plan.items.map((item) => item.id);
    expect(planned.indexOf('build')).toBeGreaterThan(-1);
    expect(planned.indexOf('build')).toBeLessThan(planned.indexOf('js-budget'));
    const build = plan.items.find((item) => item.id === 'build');
    expect(build?.reasons[0]).toContain('js-budget');
  });

  it('orders the plan: static checks, build family, e2e, Lighthouse', () => {
    const planned = ids(['apps/web/src/features/contact/contact.ts']);
    const order = ['lint', 'typecheck', 'unit', 'build', 'js-budget', 'e2e:contact.spec.ts'];
    expect(order.map((id) => planned.indexOf(id))).toEqual(
      [...order.map((id) => planned.indexOf(id))].sort((a, b) => a - b),
    );
    expect(planned.at(-1)).toBe('lighthouse:/en/contact/');
  });

  it('selects by stale ids and ignores the diff in stale mode', () => {
    const plan = planChecks({
      mode: 'stale',
      changed: [],
      staleIds: new Set(['depcruise', 'e2e:legal.spec.ts']),
    });
    expect(plan.items.map((item) => item.id)).toEqual(['depcruise', 'e2e:legal.spec.ts']);
    expect(plan.items[0]?.reasons[0]).toContain('registry');
  });

  it('skips a check whose scope is fresh in the registry', () => {
    const plan = planChecks({
      mode: 'changed',
      changed: ['apps/web/src/features/contact/components/ContactForm.tsx'],
      staleIds: new Set(['lint']),
    });
    expect(plan.items.map((item) => item.id)).toEqual(['lint']);
    expect(plan.skippedFresh).toContain('e2e:contact.spec.ts');
  });

  it('does not let registry freshness hide a FULL-wide change: it belongs to no check scope', () => {
    // A fingerprint only covers the files of a check's own scope, so a toolchain file (the Lighthouse
    // script, the Playwright config) leaves every fingerprint unchanged. The wide class must win.
    const wideFile = 'apps/web/scripts/run-lighthouse-ci.ts';
    const plan = planChecks({
      mode: 'changed',
      changed: [wideFile],
      staleIds: new Set(['lint']),
    });
    const planned = plan.items.map((item) => item.id);
    expect(plan.wide).toBe(true);
    expect(plan.skippedFresh).toEqual([]);
    expect(planned).toContain('lighthouse:/');
    expect(planned).toContain('e2e:smoke.spec.ts');
    expect(planned).toContain('typecheck');
  });

  it('plans everything with --all', () => {
    const plan = planChecks({ mode: 'all', changed: [] });
    expect(plan.items.length).toBeGreaterThan(30);
  });

  it('runs all selected specs in ONE invocation; only responsive ones get three viewports', () => {
    const plan = planChecks({
      mode: 'changed',
      changed: ['tests/browser/contact.spec.ts', 'tests/browser/marks.spec.ts'],
    });
    const e2eCommands = plan.commands.filter((command) => command.argv[1] === 'test:e2e');
    expect(e2eCommands).toHaveLength(1);
    expect(e2eCommands[0]?.argv).toContain('tests/browser/contact.spec.ts');
    expect(e2eCommands[0]?.argv).toContain('tests/browser/marks.spec.ts');
    expect(e2eCommands[0]?.env?.['E2E_WIDE_SPECS']).toBe('tests/browser/marks.spec.ts');
    const all = planChecks({
      mode: 'changed',
      changed: ['tests/browser/contact.spec.ts'],
      viewports: 'all',
    });
    const command = all.commands.find((c) => c.argv[1] === 'test:e2e');
    expect(command?.env).toBeUndefined();
  });

  it('scopes lint and unit commands to the changed files', () => {
    const plan = planChecks({
      mode: 'changed',
      changed: ['apps/web/src/features/contact/contact.ts', 'docs/TESTING.md'],
    });
    const lint = plan.commands.find((command) => command.covers.includes('lint'));
    expect(lint?.argv).toContain('apps/web/src/features/contact/contact.ts');
    expect(lint?.argv).not.toContain('docs/TESTING.md');
    const unit = plan.commands.find((command) => command.covers.includes('unit'));
    expect(unit?.argv).toContain('related');
    expect(unit?.argv).toContain('src/features/contact/contact.ts');
  });

  it('runs the core tests when packages/core changed and a lighthouse filter for the planned urls', () => {
    const core = planChecks({
      mode: 'changed',
      changed: ['packages/core/src/i18n/translate.ts'],
    });
    expect(core.commands.some((command) => command.argv.includes('@elvinlab/core'))).toBe(true);
    const page = planChecks({
      mode: 'changed',
      changed: ['apps/web/src/features/contact/components/ContactForm.tsx'],
    });
    const lighthouse = page.commands.find((command) =>
      command.covers[0]?.startsWith('lighthouse:'),
    );
    expect(lighthouse?.argv).toEqual([
      'node',
      'apps/web/scripts/run-lighthouse-ci.ts',
      '--runs',
      '1',
      '--url',
      '/contact/',
      '--url',
      '/en/contact/',
    ]);
  });
});

describe('i18n additions-only rule', () => {
  const file = 'apps/web/src/shared/i18n/index.ts';

  it('detects added-only diffs', () => {
    expect(additionsOnly('@@ -1,0 +2,2 @@\n+a: 1,\n+b: 2,\n')).toBe(true);
    expect(additionsOnly('--- a/x\n+++ b/x\n@@ -3 +3 @@\n-a: 1,\n+a: 2,\n')).toBe(false);
    expect(additionsOnly('')).toBe(false);
  });

  it('drops the dictionary from the changed set only when it only gained lines', () => {
    expect(refineChanged([file, 'docs/a.md'], () => '@@ -1,0 +2 @@\n+x: 1,\n')).toEqual([
      'docs/a.md',
    ]);
    expect(refineChanged([file], () => '@@ -1 +1 @@\n-x: 1,\n+x: 2,\n')).toEqual([file]);
  });
});
