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
  /* Phones: the body wrapper vanishes and explicit orders keep meta, title, issuer, applied, document,
     verify, learnings. From tablet up the text block sits beside a 20rem document, centered against it. */
  .ed-body {
    display: contents;
  }
  .ed-meta { order: 1; }
  .ed-title { order: 2; }
  .ed-issuer { order: 3; }
  .ed-applied { order: 4; }
  .ed-figure,
  .ed-cover { order: 5; }
  .ed-verify { order: 6; }
  .ed-learned { order: 7; }
  @media (min-width: 768px) {
    .ed-item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 20rem;
      column-gap: 2.5rem;
      align-items: center;
    }
    .ed-body {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .ed-title {
      font-size: 1.375rem;
    }
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
    font-weight: 700;
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
  .ed-doc {
    display: block;
    cursor: zoom-in;
  }
  .ed-figure img {
    display: block;
    width: 100%;
    max-width: 28rem;
    height: auto;
    object-fit: contain;
  }
  @media (min-width: 768px) {
    .ed-figure {
      max-width: 20rem;
      margin: 0;
    }
  }
  /* The shared viewer: a native modal dialog; padding lives on the form so a click on the dialog itself
     is always the backdrop. */
  .ed-viewer {
    margin: auto;
    padding: 0;
    border: 0;
    border-radius: var(--radius-inner);
    background: var(--color-card);
    color: var(--color-text);
    max-width: min(96vw, 1100px);
  }
  .ed-viewer::backdrop {
    background: color-mix(in srgb, black 70%, transparent);
  }
  .ed-viewer form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0;
    padding: 0.75rem;
  }
  .ed-viewer button {
    align-self: flex-end;
    min-width: 44px;
    min-height: 44px;
    padding: 0 1rem;
    border: 0;
    border-radius: var(--radius-inner);
    background: var(--color-button);
    color: white;
    font-weight: 700;
    cursor: pointer;
  }
  .ed-viewer img {
    display: block;
    max-width: 100%;
    max-height: calc(94vh - 5rem);
    margin: 0 auto;
    object-fit: contain;
  }
`;

/* The stand-in for a document that is not available yet: ruled notebook paper in a dashed frame with
   a pixel glyph, the year, the type and the issuer. Decorative (aria-hidden), same ratio as the real
   documents. */
const COVER = `
  .ed-cover {
    position: relative;
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto 1fr auto auto auto;
    align-items: start;
    box-sizing: border-box;
    width: 100%;
    max-width: 28rem;
    aspect-ratio: 4 / 3;
    padding: 1.25rem 1.5rem;
    border: 2px dashed color-mix(in srgb, var(--color-primary) 45%, transparent);
    border-radius: var(--radius-inner);
    background-color: var(--color-card);
    background-image: repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent 1.75rem,
      color-mix(in srgb, var(--color-divider) 80%, transparent) 1.75rem,
      color-mix(in srgb, var(--color-divider) 80%, transparent) calc(1.75rem + 1px)
    );
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    font-size: 0.8125rem;
  }
  @media (min-width: 768px) {
    .ed-cover {
      max-width: 20rem;
    }
  }
  .ed-cover > * {
    margin: 0;
  }
  .ed-cover-icon {
    grid-column: 1;
    grid-row: 1;
    color: var(--color-primary);
  }
  .ed-cover-year {
    grid-column: 2;
    grid-row: 1;
    color: var(--color-primary);
    font-size: 2.5rem;
    line-height: 1;
  }
  .ed-cover-kind {
    grid-column: 1 / -1;
    grid-row: 3;
    font-weight: 700;
    color: var(--color-primary);
  }
  .ed-cover-issuer {
    grid-column: 1 / -1;
    grid-row: 4;
    color: var(--color-text);
    font-size: 1rem;
    font-weight: 600;
  }
  .ed-cover-note {
    grid-column: 1 / -1;
    grid-row: 5;
    margin-top: 0.5rem;
    color: var(--color-muted);
  }
`;

const DETAILS = `
  .ed-learned summary {
    display: flex;
    align-items: center;
    min-height: 44px;
    gap: 0.5rem;
    cursor: pointer;
    list-style: none;
    font-weight: 700;
    color: var(--color-primary);
  }
  .ed-learned summary::-webkit-details-marker {
    display: none;
  }
  /* A chevron drawn with two borders; it turns when the block opens (a static state, no motion). */
  .ed-learned summary::before {
    content: '';
    flex: none;
    width: 0.5rem;
    height: 0.5rem;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(-45deg);
  }
  .ed-learned[open] summary::before {
    transform: rotate(45deg);
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
