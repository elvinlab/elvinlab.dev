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
});
