import { describe, expect, it } from 'vitest';

import { secondaryMetaPlacement } from './note-meta.ts';

describe('secondaryMetaPlacement', () => {
  it('moves the language badge to the foot in the minimal preset', () => {
    expect(secondaryMetaPlacement('minimal')).toBe('foot');
  });

  it('keeps the language badge in the header in the full preset (today)', () => {
    expect(secondaryMetaPlacement('full')).toBe('header');
  });
});
