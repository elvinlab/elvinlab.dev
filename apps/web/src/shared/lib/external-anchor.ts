import { type Locale, t } from '@/shared/i18n/index.ts';

/**
 * An `<a>` to another site as an HTML string, for the legal pages whose copy is built as HTML:
 * opens in a new tab, cannot reach the opener, and announces the tab to assistive technology.
 * Use it only for links that are always external; component markup uses `externalLinkAttrs`.
 */
export function externalAnchorHtml(locale: Locale, href: string, label: string): string {
  const hint = `<span class="sr-only"> (${t(locale, 'link.newTab')})</span>`;
  return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}${hint}</a>`;
}
