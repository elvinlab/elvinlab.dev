/**
 * Stylesheet of the `/changelog/` page, emitted as one string by `ChangelogPage.astro`
 * (`<style is:inline set:html>`, the pattern of `experiments-routes/experiment-styles.ts`): no
 * `data-astro-cid-*` scope attribute on every element, and the CSS ships only on the pages that
 * render it. Classes are `cl-` prefixed, so being global cannot reach another page. The summary and
 * the pager emit their own CSS (`shared/ui/listing-styles.ts`). Why bytes matter: `docs/DESIGN.md`,
 * "Page weight rule".
 */
import { minifyCss } from '@/shared/ui/minify-css.ts';

export const CHANGELOG_CSS = minifyCss(`
  .cl-page {
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
  }
  /* The pixel log before the title: the single pink accent of the page, a 9 x 9 grid with crisp edges. */
  .cl-logo {
    flex-shrink: 0;
    width: 27px;
    height: 27px;
    color: var(--color-pink);
    shape-rendering: crispEdges;
  }
  .cl-empty {
    color: var(--color-text-secondary);
  }
  .cl-list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  /* A plain hairline between two release days, with room on both sides. */
  .cl-list > li + li {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-divider);
  }
  .cl-release > summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 2.75rem;
    padding: 0.75rem 0;
    cursor: pointer;
    list-style: none;
    border-radius: var(--radius-control);
  }
  .cl-release > summary::-webkit-details-marker {
    display: none;
  }
  .cl-release > summary:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .cl-head {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
    margin: 0;
    font-weight: 400;
  }
  .cl-date {
    font: 400 0.875rem / 1.2 var(--font-mono);
    color: var(--color-muted);
  }
  .cl-name {
    font: 700 1.1875rem / 1.3 var(--font-display);
    letter-spacing: -0.01em;
    color: var(--color-text);
    text-wrap: balance;
  }
  .cl-meta {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.875rem;
  }
  .cl-counts {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.25rem 0.75rem;
    font: 400 0.8125rem / 1 var(--font-mono);
    color: var(--color-text-secondary);
  }
  .cl-count {
    display: inline-flex;
    align-items: center;
    gap: 0.3125rem;
  }
  .cl-ico {
    flex-shrink: 0;
    width: 13px;
    height: 13px;
    shape-rendering: crispEdges;
  }
  .cl-ico[data-kind='added'],
  .cl-ico[data-kind='fixed'] {
    color: var(--color-primary);
  }
  .cl-ico[data-kind='changed'],
  .cl-ico[data-kind='security'] {
    color: var(--color-cyan);
  }
  .cl-ico[data-kind='removed'],
  .cl-ico[data-kind='deprecated'] {
    color: var(--color-muted);
  }
  /* Square chevron drawn with borders: crisp, no image, turns when the day opens. */
  .cl-chevron {
    width: 0.5rem;
    height: 0.5rem;
    border-right: 2px solid var(--color-muted);
    border-bottom: 2px solid var(--color-muted);
    transform: rotate(45deg);
  }
  .cl-release[open] .cl-chevron {
    transform: rotate(-135deg);
  }
  @media (hover: hover) {
    .cl-release > summary:hover .cl-name {
      color: var(--color-primary);
    }
  }
  @media (prefers-reduced-motion: no-preference) {
    .cl-name {
      transition: color 150ms;
    }
  }
  .cl-body {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 0.5rem 0 1.5rem;
  }
  .cl-kind h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 0.5rem;
    font: 400 0.8125rem / 1.2 var(--font-mono);
    color: var(--color-text-secondary);
  }
  .cl-kind h3 .cl-ico {
    width: 18px;
    height: 18px;
  }
  .cl-items {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .cl-t {
    margin: 0;
    font-weight: 500;
    line-height: 1.45;
    color: var(--color-text);
    overflow-wrap: anywhere;
  }
  .cl-d {
    margin: 0.25rem 0 0;
    font-size: 0.9375rem;
    line-height: 1.55;
    color: var(--color-text-secondary);
    text-wrap: pretty;
  }
  .cl-foot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  @media (min-width: 640px) {
    .cl-foot {
      flex-direction: row;
      justify-content: space-between;
    }
  }
  @media (max-width: 639px) {
    .cl-release > summary {
      align-items: flex-start;
    }
    .cl-meta {
      flex-direction: column-reverse;
      align-items: flex-end;
      gap: 0.5rem;
    }
  }
`);
