import { describe, expect, it } from 'vitest';

import { buildLlmsTxt } from './llms.ts';

describe('buildLlmsTxt', () => {
  it('writes the title, the summary, the facts and each section as Markdown', () => {
    const body = buildLlmsTxt({
      name: 'Jane Doe',
      summary: 'Engineer and writer.',
      facts: ['Based in Costa Rica', 'Topics: Astro, AI agents'],
      sections: [
        {
          heading: 'Notes',
          links: [
            { title: 'First', url: 'https://example.dev/notes/first/', description: 'Why.' },
            { title: 'Second', url: 'https://example.dev/notes/second/' },
          ],
        },
      ],
    });
    expect(body).toBe(
      [
        '# Jane Doe',
        '> Engineer and writer.',
        '- Based in Costa Rica\n- Topics: Astro, AI agents',
        '## Notes\n\n- [First](https://example.dev/notes/first/): Why.\n- [Second](https://example.dev/notes/second/)',
      ].join('\n\n') + '\n',
    );
  });

  it('drops a section without links and the facts block without facts', () => {
    const body = buildLlmsTxt({
      name: 'Jane Doe',
      summary: 'S.',
      facts: [],
      sections: [{ heading: 'Notes', links: [] }],
    });
    expect(body).toBe('# Jane Doe\n\n> S.\n');
  });
});
