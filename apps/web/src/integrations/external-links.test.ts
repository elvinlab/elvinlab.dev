import { describe, expect, it, vi } from 'vitest';

import {
  externalLinks,
  externalLinksPlugin,
  type LinkNode,
  type LinkVisitContext,
} from './external-links.ts';

const options = {
  siteUrl: 'https://elvinlab.dev',
  hint: (lang: string | undefined) =>
    lang === 'en' ? 'opens in a new tab' : 'se abre en una pestaña nueva',
};

const link = (properties: Record<string, unknown>): LinkNode => ({
  type: 'element',
  tagName: 'a',
  properties,
});

/** A recording stand-in for the Sätteri visitor context. */
function visit(node: LinkNode, lang?: string) {
  const ctx = {
    data: { astro: { frontmatter: lang ? { lang } : {} } },
    setProperty: vi.fn(),
    appendChild: vi.fn(),
  } satisfies LinkVisitContext;
  const plugin = externalLinksPlugin(options);
  const visitor = Array.isArray(plugin.element) ? plugin.element[0] : plugin.element;
  visitor?.visit(node, ctx);
  return ctx;
}

describe('externalLinksPlugin', () => {
  it('only subscribes to anchors', () => {
    const plugin = externalLinksPlugin(options);
    const visitor = Array.isArray(plugin.element) ? plugin.element[0] : plugin.element;
    expect(visitor?.filter).toEqual(['a']);
  });

  it('opens an external link in a new tab and appends the hint in the note language', () => {
    const ctx = visit(link({ href: 'https://giscus.app' }), 'es');
    expect(ctx.setProperty).toHaveBeenCalledWith(expect.anything(), 'target', '_blank');
    expect(ctx.setProperty).toHaveBeenCalledWith(expect.anything(), 'rel', 'noopener noreferrer');
    expect(ctx.appendChild).toHaveBeenCalledWith(expect.anything(), {
      type: 'element',
      tagName: 'span',
      properties: { className: ['sr-only'] },
      children: [{ type: 'text', value: ' (se abre en una pestaña nueva)' }],
    });
  });

  it('uses the English hint for an English note', () => {
    const ctx = visit(link({ href: 'https://github.com/x' }), 'en');
    expect(ctx.appendChild.mock.calls[0]?.[1].children[0].value).toBe(' (opens in a new tab)');
  });

  it('lets the hint pick its default when the note has no language', () => {
    const ctx = visit(link({ href: 'https://github.com/x' }));
    expect(ctx.appendChild.mock.calls[0]?.[1].children[0].value).toBe(
      ' (se abre en una pestaña nueva)',
    );
  });

  it('keeps an existing rel token, as a list or as a string', () => {
    expect(
      visit(link({ href: 'https://github.com/x', rel: ['me'] })).setProperty,
    ).toHaveBeenCalledWith(expect.anything(), 'rel', 'me noopener noreferrer');
    expect(
      visit(link({ href: 'https://github.com/x', rel: 'me' })).setProperty,
    ).toHaveBeenCalledWith(expect.anything(), 'rel', 'me noopener noreferrer');
  });

  it('leaves internal links, anchors and the site own domain untouched', () => {
    for (const href of [
      '/notes/otra/',
      '#seccion',
      'relativo/',
      'mailto:a@example.com',
      'https://elvinlab.dev/notes/x/',
      'https://www.elvinlab.dev/notes/x/',
      'https://blog.elvinlab.dev/',
    ]) {
      const ctx = visit(link({ href }), 'es');
      expect(ctx.setProperty, href).not.toHaveBeenCalled();
      expect(ctx.appendChild, href).not.toHaveBeenCalled();
    }
  });

  it('ignores an anchor without an href', () => {
    const ctx = visit(link({ id: 'ancla' }), 'es');
    expect(ctx.setProperty).not.toHaveBeenCalled();
    expect(ctx.appendChild).not.toHaveBeenCalled();
  });
});

describe('externalLinks integration', () => {
  const setup = (markdown: unknown) => {
    const integration = externalLinks(options);
    const hook = integration.hooks['astro:config:setup'];
    const warn = vi.fn();
    // biome-ignore lint/suspicious/noExplicitAny: a partial Astro hook payload is enough here
    return { run: () => hook?.({ config: { markdown }, logger: { warn } } as any), warn };
  };

  it('adds the plugin to the Sätteri processor, which runs it on .md and .mdx', () => {
    const hastPlugins: unknown[] = [];
    const { run, warn } = setup({ processor: { name: 'satteri', options: { hastPlugins } } });
    run();
    expect(hastPlugins).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns instead of silently skipping when the processor is not Sätteri', () => {
    const { run, warn } = setup({ processor: { name: 'unified', options: {} } });
    run();
    expect(warn).toHaveBeenCalledOnce();
  });
});
