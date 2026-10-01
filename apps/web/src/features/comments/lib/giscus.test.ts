import { describe, expect, it } from 'vitest';

import { buildGiscusAttributes, GISCUS_ORIGIN, giscusThemeFor } from './giscus.ts';

const config = {
  repo: 'janedoe/janedoe.dev',
  repoId: 'R_kgDOExample',
  category: 'Comments',
  categoryId: 'DIC_kwDOExample',
};

describe('buildGiscusAttributes', () => {
  it('maps the config and locale to the data attributes giscus reads', () => {
    expect(buildGiscusAttributes(config, 'en', 'dark')).toEqual({
      'data-repo': 'janedoe/janedoe.dev',
      'data-repo-id': 'R_kgDOExample',
      'data-category': 'Comments',
      'data-category-id': 'DIC_kwDOExample',
      'data-mapping': 'pathname',
      'data-strict': '1',
      'data-reactions-enabled': '1',
      'data-emit-metadata': '0',
      'data-input-position': 'bottom',
      'data-theme': 'dark',
      'data-lang': 'en',
      'data-loading': 'lazy',
    });
  });

  it('follows the page locale and theme', () => {
    const attributes = buildGiscusAttributes(config, 'es', 'light');
    expect(attributes['data-lang']).toBe('es');
    expect(attributes['data-theme']).toBe('light');
  });
});

describe('giscusThemeFor', () => {
  it('uses the light giscus theme for light site themes', () => {
    expect(giscusThemeFor('elvinlab-light')).toBe('light');
  });

  it('uses the dark giscus theme for dark and unknown site themes', () => {
    expect(giscusThemeFor('elvinlab-dark')).toBe('dark');
    expect(giscusThemeFor('something-else')).toBe('dark');
    expect(giscusThemeFor(null)).toBe('dark');
  });
});

describe('GISCUS_ORIGIN', () => {
  it('is the https origin theme messages are posted to', () => {
    expect(GISCUS_ORIGIN).toBe('https://giscus.app');
  });
});
