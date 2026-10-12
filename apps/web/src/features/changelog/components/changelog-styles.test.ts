import { describe, expect, it } from 'vitest';

import { CHANGELOG_CSS } from './changelog-styles.ts';

describe('CHANGELOG_CSS', () => {
  it('keeps the kind headings in sentence case', () => {
    expect(CHANGELOG_CSS).not.toContain('text-transform:uppercase');
    expect(CHANGELOG_CSS).not.toContain('letter-spacing:.04em');
  });

  it('leaves the page title to the shared PageHeader', () => {
    expect(CHANGELOG_CSS).not.toContain('.cl-header');
  });

  it('caps the entry title and description at the 68ch prose measure', () => {
    expect(CHANGELOG_CSS).toMatch(/\.cl-t\{[^}]*max-width:68ch/);
    expect(CHANGELOG_CSS).toMatch(/\.cl-d\{[^}]*max-width:68ch/);
  });
});
