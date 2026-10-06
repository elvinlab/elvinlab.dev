import { describe, expect, it } from 'vitest';

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

  it('treats global CSS as a wide change that selects every check', () => {
    const plan = planChecks({ mode: 'changed', changed: ['apps/web/src/styles/global.css'] });
    expect(plan.wide).toBe(true);
    expect(plan.items.map((item) => item.id)).toContain('lighthouse:/en/contact/');
    expect(plan.items.map((item) => item.id)).toContain('e2e:smoke.spec.ts');
    expect(plan.items.map((item) => item.id)).toContain('cold-start');
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

  it('plans everything with --all', () => {
    const plan = planChecks({ mode: 'all', changed: [] });
    expect(plan.items.length).toBeGreaterThan(30);
  });

  it('groups specs: quick viewport by default, all viewports for responsive ones', () => {
    const plan = planChecks({
      mode: 'changed',
      changed: ['tests/browser/contact.spec.ts', 'tests/browser/marks.spec.ts'],
    });
    const e2eCommands = plan.commands.filter(
      (command) => command.argv.includes('playwright') || command.argv[1]?.startsWith('test:e2e'),
    );
    expect(e2eCommands.map((command) => command.argv.slice(0, 2))).toEqual([
      ['pnpm', 'test:e2e:quick'],
      ['pnpm', 'test:e2e'],
    ]);
    expect(e2eCommands[0]?.argv).toContain('tests/browser/contact.spec.ts');
    expect(e2eCommands[1]?.argv).toContain('tests/browser/marks.spec.ts');
    const all = planChecks({
      mode: 'changed',
      changed: ['tests/browser/contact.spec.ts'],
      viewports: 'all',
    });
    expect(all.commands.find((command) => command.argv[1]?.startsWith('test:e2e'))?.argv[1]).toBe(
      'test:e2e',
    );
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
