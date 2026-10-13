/**
 * Stylesheet of the `/education/` page, emitted as one string by `EducationPage.astro`
 * (`<style is:inline set:html>`, the pattern of `experiments-routes/experiment-styles.ts`): no
 * `data-astro-cid-*` attributes and each optional part only when the page renders it. Classes are
 * `ed-` prefixed, so being global cannot reach another page. The sort switch, summary and pager
 * emit their own CSS (`shared/ui/listing-styles.ts`). Colors are semantic tokens only; nothing
 * moves, so there is no motion to switch off under `prefers-reduced-motion`.
 */
import { minifyCss } from '@/shared/ui/minify-css.ts';

/** What the page renders; each flag adds the CSS of one part. */
export interface EducationCssParts {
  /** At least one entry (the timeline). */
  timeline: boolean;
  /** At least one entry has a document image. */
  image: boolean;
  /** At least one entry has no document image and shows the typographic cover instead. */
  cover: boolean;
  /** At least one entry has learnings (the details block). */
  details: boolean;
  /** The sort switch row above the timeline. */
  head: boolean;
  /** The footer row with the summary and the pager. */
  footer: boolean;
  /** The empty state, when there is no entry at all. */
  empty: boolean;
}

const BASE = `
  .ed-page {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
`;

const EMPTY = `
  .ed-empty {
    color: var(--color-text-secondary);
  }
`;

const HEAD = `
  .ed-head {
    display: flex;
    justify-content: flex-end;
  }
`;

const TIMELINE = `
  /* The vertical line is the left border of the list; each year hangs a square node on it. */
  .ed-timeline {
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
    margin: 0;
    padding: 0 0 0 1.25rem;
    list-style: none;
    border-left: 2px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
  }
  @media (min-width: 640px) {
    .ed-timeline {
      padding-left: 2rem;
    }
  }
  .ed-year {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .ed-year::before {
    content: '';
    position: absolute;
    top: 0.7rem;
    left: calc(-1.25rem - 7px);
    width: 12px;
    height: 12px;
    background: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-page);
  }
  @media (min-width: 640px) {
    .ed-year::before {
      left: calc(-2rem - 7px);
    }
  }
  .ed-year-label {
    margin: 0;
    font: 700 1.75rem / 1.2 var(--font-display);
    color: var(--color-primary);
  }
  .ed-items {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .ed-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem 0.5rem;
    border-top: 1px dashed var(--color-divider);
  }
  .ed-item:first-child {
    border-top: 0;
  }
  .ed-item:target {
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    border-radius: var(--radius-inner);
  }
  .ed-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.75rem;
    font: 500 0.8125rem / 1.3 var(--font-mono);
    color: var(--color-muted);
  }
  .ed-badge {
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-inner);
    font-weight: 700;
    background: var(--color-card);
    color: var(--color-primary);
  }
  .ed-badge[data-kind='degree'] {
    background: var(--color-button);
    color: white;
  }
  .ed-title {
    margin: 0;
    font: 700 1.125rem / 1.35 var(--font-display);
    overflow-wrap: anywhere;
  }
  .ed-issuer,
  .ed-applied {
    margin: 0;
    color: var(--color-text-secondary);
    overflow-wrap: anywhere;
  }
  .ed-verify {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    min-height: 44px;
    color: var(--color-primary);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`;

const IMAGE = `
  .ed-figure {
    margin: 0.25rem 0;
    padding: 0.5rem;
    border-radius: var(--radius-inner);
    background: var(--color-card);
  }
  .ed-figure img {
    display: block;
    width: 100%;
    max-width: 28rem;
    height: auto;
    object-fit: contain;
  }
`;

/* The stand-in for a document that is not available yet: a framed paper with the year, the type and
   the issuer in type only. Decorative (aria-hidden), same ratio as the real documents. */
const COVER = `
  .ed-cover {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
    width: 100%;
    max-width: 28rem;
    aspect-ratio: 4 / 3;
    padding: 1rem 1.25rem;
    border: 2px dashed color-mix(in srgb, var(--color-primary) 45%, transparent);
    border-radius: var(--radius-inner);
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    font-size: 0.8125rem;
  }
  .ed-cover-year {
    margin: 0;
    color: var(--color-primary);
    font-size: 3rem;
    line-height: 1;
  }
  .ed-cover-issuer {
    margin: 0;
    color: var(--color-text);
    font-size: 1rem;
    font-weight: 600;
  }
`;

const DETAILS = `
  .ed-learned summary {
    display: flex;
    align-items: center;
    min-height: 44px;
    cursor: pointer;
    font-weight: 700;
    color: var(--color-primary);
  }
  .ed-learned ul {
    margin: 0;
    padding: 0 0 0.5rem 1.25rem;
    color: var(--color-text-secondary);
  }
  .ed-learned li {
    padding: 0.125rem 0;
    overflow-wrap: anywhere;
  }
`;

const FOOT = `
  .ed-foot {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  @media (min-width: 640px) {
    .ed-foot {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }
`;

/** The CSS of the parts a page renders, minified. */
export function educationCss(parts: EducationCssParts): string {
  return minifyCss(
    [
      BASE,
      parts.empty && EMPTY,
      parts.head && HEAD,
      parts.timeline && TIMELINE,
      parts.image && IMAGE,
      parts.cover && COVER,
      parts.details && DETAILS,
      parts.footer && FOOT,
    ]
      .filter((part): part is string => typeof part === 'string')
      .join('\n'),
  );
}
