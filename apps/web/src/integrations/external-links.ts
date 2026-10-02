import type { AstroIntegration } from 'astro';

import { externalLinkAttrs, isExternalHref } from '@/shared/lib/external-link.ts';

/** The slice of a hast element this plugin reads. */
export type LinkNode = {
  type: string;
  tagName: string;
  properties?: Record<string, unknown>;
};

/** The slice of the Sätteri visitor context this plugin uses (`@astrojs/markdown-satteri`). */
export type LinkVisitContext = {
  data: { astro?: { frontmatter?: { lang?: unknown } } };
  setProperty(node: LinkNode, key: string, value: unknown): void;
  appendChild(node: LinkNode, child: unknown): void;
};

export type ExternalLinksOptions = {
  siteUrl: string;
  /** Text announced after an external link name, per language (`undefined` when the note has none). */
  hint: (lang: string | undefined) => string;
};

const relTokens = (rel: unknown): string =>
  Array.isArray(rel) ? rel.map(String).join(' ') : typeof rel === 'string' ? rel : '';

/**
 * Sätteri (hast) plugin for rendered markdown: every link that leaves the site opens in a new tab
 * with `noopener noreferrer` and gets a visually hidden hint in the note's language (`lang` in the
 * frontmatter) so screen readers announce the new tab. Internal links are left alone. Only
 * markdown links are handled; an `<a>` written as JSX or raw HTML inside a note is not.
 */
export function externalLinksPlugin({ siteUrl, hint }: ExternalLinksOptions) {
  return {
    name: 'external-links',
    element: {
      filter: ['a'],
      visit(node: LinkNode, ctx: LinkVisitContext): void {
        const href = node.properties?.['href'];
        if (typeof href !== 'string' || !isExternalHref(href, siteUrl)) return;
        const attrs = externalLinkAttrs(href, siteUrl, relTokens(node.properties?.['rel']));
        for (const [key, value] of Object.entries(attrs)) ctx.setProperty(node, key, value);
        const lang = ctx.data.astro?.frontmatter?.lang;
        ctx.appendChild(node, {
          type: 'element',
          tagName: 'span',
          properties: { className: ['sr-only'] },
          children: [
            { type: 'text', value: ` (${hint(typeof lang === 'string' ? lang : undefined)})` },
          ],
        });
      },
    },
  };
}

type SatteriProcessor = { name: string; options: { hastPlugins: unknown[] } };

const isSatteriProcessor = (processor: unknown): processor is SatteriProcessor => {
  const candidate = processor as Partial<SatteriProcessor> | undefined;
  return candidate?.name === 'satteri' && Array.isArray(candidate.options?.hastPlugins);
};

/**
 * Registers {@link externalLinksPlugin} on Astro's Markdown processor (Sätteri, which also renders
 * `.mdx`). Astro 7 only runs `markdown.rehypePlugins` through `@astrojs/markdown-remark`, which this
 * site does not install; pushing onto the processor's `hastPlugins` is the same thing
 * astro-expressive-code does and needs no extra dependency.
 */
export function externalLinks(options: ExternalLinksOptions): AstroIntegration {
  return {
    name: 'external-links',
    hooks: {
      'astro:config:setup': ({ config, logger }) => {
        const processor: unknown = config.markdown.processor;
        if (!isSatteriProcessor(processor)) {
          logger.warn(
            'The Markdown processor is not Sätteri: links in notes keep opening in the same tab.',
          );
          return;
        }
        processor.options.hastPlugins.push(externalLinksPlugin(options));
      },
    },
  };
}
