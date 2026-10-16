/**
 * Stylesheet of the `/education/` page, emitted as one string by `EducationPage.astro`
 * (`<style is:inline set:html>`, the pattern of `experiments-routes/experiment-styles.ts`): no
 * `data-astro-cid-*` attributes and each optional part only when the page renders it. Classes are
 * `ed-` prefixed, so being global cannot reach another page. The sort switch, summary and pager
 * emit their own CSS (`shared/ui/listing-styles.ts`; the sort switch is restyled here, scoped to
 * `.ed-page`). Colors are semantic tokens only. The pixel details (stepped corners, glyphs, brackets)
 * are static shapes; every `animation`/`transition` and every `steps()` lives inside a
 * `prefers-reduced-motion: no-preference` block, so with reduced motion nothing moves and the states
 * stay visible through color and outline.
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

/* A 4 px two-step notch on each corner: crisp pixel corners instead of a rounded rectangle. It is written
   once, as the custom property `--ed-notch` of `.ed-page` (the dialog is inside it). Clipping also clips
   the outline, so every clipped control drops the notch (`clip-path: none`) while it has focus. */
const NOTCH = `polygon(
    0 4px, 2px 4px, 2px 2px, 4px 2px, 4px 0,
    calc(100% - 4px) 0, calc(100% - 4px) 2px, calc(100% - 2px) 2px, calc(100% - 2px) 4px, 100% 4px,
    100% calc(100% - 4px), calc(100% - 2px) calc(100% - 4px), calc(100% - 2px) calc(100% - 2px),
    calc(100% - 4px) calc(100% - 2px), calc(100% - 4px) 100%,
    4px 100%, 4px calc(100% - 2px), 2px calc(100% - 2px), 2px calc(100% - 4px), 0 calc(100% - 4px)
  )`;

/* A right-pointing chevron on an 8x10 grid of 2 px cells (two cells thick). */
const CHEVRON = `polygon(
    4px 0, 4px 2px, 6px 2px, 6px 4px, 8px 4px, 8px 6px, 6px 6px, 6px 8px, 4px 8px, 4px 10px,
    0 10px, 0 8px, 2px 8px, 2px 6px, 4px 6px, 4px 4px, 2px 4px, 2px 2px, 0 2px, 0 0
  )`;

/* The 12 px corner brackets of the experiments media frame (3 px bars, 12 px arms). */
const BRACKETS = `
      linear-gradient(currentColor, currentColor) top left / 12px 3px no-repeat,
      linear-gradient(currentColor, currentColor) top left / 3px 12px no-repeat,
      linear-gradient(currentColor, currentColor) top right / 12px 3px no-repeat,
      linear-gradient(currentColor, currentColor) top right / 3px 12px no-repeat,
      linear-gradient(currentColor, currentColor) bottom left / 12px 3px no-repeat,
      linear-gradient(currentColor, currentColor) bottom left / 3px 12px no-repeat,
      linear-gradient(currentColor, currentColor) bottom right / 12px 3px no-repeat,
      linear-gradient(currentColor, currentColor) bottom right / 3px 12px no-repeat`;

const BASE = `
  .ed-page {
    --ed-notch: ${NOTCH};
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

/* The shared sort switch, restyled for this page only: stepped corners, the active option filled. */
const HEAD = `
  .ed-head {
    display: flex;
    justify-content: flex-end;
  }
  .ed-page .lk-sort-options {
    border-radius: 0;
  }
  .ed-page .lk-sort-option {
    border-radius: 0;
    clip-path: var(--ed-notch);
    transition: none;
  }
  .ed-page .lk-sort-option[aria-current='true'] {
    background: var(--color-button);
    color: white;
  }
  @media (hover: hover) {
    .ed-page .lk-sort-option:not([aria-current='true']):hover {
      background: color-mix(in srgb, var(--color-primary) 14%, transparent);
      color: var(--color-primary);
    }
  }
  .ed-page .lk-sort-option:focus-visible {
    clip-path: none;
  }
  @media (prefers-reduced-motion: no-preference) {
    .ed-page .lk-sort-option {
      transition:
        transform 120ms steps(2, end),
        color 120ms steps(2, end),
        background-color 120ms steps(2, end);
    }
    @media (hover: hover) {
      .ed-page .lk-sort-option:not([aria-current='true']):hover {
        transform: translateY(-1px);
      }
    }
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
  .ed-progress {
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-inner);
    font-weight: 700;
    background: var(--color-chip);
    color: var(--color-text-secondary);
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
    gap: 0.375rem;
    min-height: 44px;
    font-weight: 700;
    color: var(--color-primary);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .ed-verify:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  /* The pixel up-right arrow (7x7 grid, 2 px cells) after the label; the "opens in a new tab" note is
     visually hidden text, so the page shows exactly one arrow. */
  .ed-verify svg {
    display: block;
    flex: none;
    overflow: visible;
  }
  @media (prefers-reduced-motion: no-preference) {
    .ed-verify svg {
      transition: transform 120ms steps(2, end);
    }
    @media (hover: hover) {
      .ed-verify:hover svg {
        transform: translate(2px, -2px);
      }
    }
    .ed-verify:focus-visible svg {
      transform: translate(2px, -2px);
    }
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
    position: relative;
    display: block;
    cursor: zoom-in;
  }
  .ed-doc:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 6px;
  }
  /* Hover and focus: pixel corner brackets on the frame and a small pixel plus in the corner. Decoration
     only (no pointer events, no layout), hidden at rest. */
  .ed-doc::before,
  .ed-doc::after {
    content: '';
    position: absolute;
    pointer-events: none;
    opacity: 0;
  }
  .ed-doc::after {
    inset: -4px;
    color: var(--color-primary);
    background:${BRACKETS};
  }
  .ed-doc::before {
    top: 6px;
    right: 6px;
    z-index: 1;
    width: 22px;
    height: 22px;
    clip-path: var(--ed-notch);
    background:
      linear-gradient(white, white) center / 10px 2px no-repeat,
      linear-gradient(white, white) center / 2px 10px no-repeat,
      var(--color-button);
  }
  .ed-doc:focus-visible::before,
  .ed-doc:focus-visible::after {
    opacity: 1;
  }
  @media (hover: hover) {
    .ed-doc:hover::before,
    .ed-doc:hover::after {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: no-preference) {
    .ed-doc::before,
    .ed-doc::after {
      transition: opacity 120ms steps(2, end);
    }
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
  .ed-viewer-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    align-self: flex-end;
    min-width: 44px;
    min-height: 44px;
    padding: 0 1rem 0 0.875rem;
    border: 0;
    border-radius: 0;
    background: var(--color-button);
    color: white;
    font-weight: 700;
    cursor: pointer;
    clip-path: var(--ed-notch);
  }
  .ed-viewer-close svg {
    display: block;
    flex: none;
  }
  @media (hover: hover) {
    .ed-viewer-close:hover {
      background: color-mix(in srgb, var(--color-button) 80%, black);
    }
  }
  .ed-viewer-close:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 3px;
    clip-path: none;
  }
  /* Motion is only for people who allow it: the pixel X turns a quarter in three steps and the button
     nudges 1 px; the dialog and its backdrop dissolve in four steps. */
  @media (prefers-reduced-motion: no-preference) {
    .ed-viewer-close {
      transition: transform 120ms steps(2, end);
    }
    .ed-viewer-close svg {
      transition: transform 160ms steps(3, end);
    }
    @media (hover: hover) {
      .ed-viewer-close:hover {
        transform: translateY(-1px);
      }
      .ed-viewer-close:hover svg {
        transform: rotate(90deg);
      }
    }
    .ed-viewer-close:focus-visible {
      transform: translateY(-1px);
    }
    .ed-viewer-close:focus-visible svg {
      transform: rotate(90deg);
    }
    .ed-viewer-close:active {
      transform: translateY(1px);
    }
    @keyframes ed-pop {
      from {
        opacity: 0;
        transform: scale(0.96);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    @keyframes ed-fade {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    .ed-viewer[open] {
      animation: ed-pop 240ms steps(4, end);
    }
    .ed-viewer[open]::backdrop {
      animation: ed-fade 240ms steps(4, end);
    }
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
    width: fit-content;
    min-height: 44px;
    gap: 0.5rem;
    margin-inline: -0.5rem;
    padding-inline: 0.5rem;
    cursor: pointer;
    list-style: none;
    font-weight: 700;
    color: var(--color-primary);
  }
  .ed-learned summary::-webkit-details-marker {
    display: none;
  }
  /* A pixel chevron (a stepped polygon, two cells thick); it turns a quarter when the block opens. */
  .ed-learned summary::before {
    content: '';
    flex: none;
    width: 8px;
    height: 10px;
    background: currentColor;
    clip-path: ${CHEVRON};
  }
  .ed-learned[open] summary::before {
    transform: rotate(90deg);
  }
  /* Hover: a tinted pill with stepped corners; with focus the notch goes so the outline shows whole. */
  @media (hover: hover) {
    .ed-learned summary:hover {
      background: color-mix(in srgb, var(--color-primary) 12%, transparent);
      clip-path: var(--ed-notch);
    }
  }
  .ed-learned summary:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    clip-path: none;
  }
  @media (prefers-reduced-motion: no-preference) {
    .ed-learned summary {
      transition: background-color 120ms steps(2, end);
    }
    .ed-learned summary::before {
      transition: transform 120ms steps(2, end);
    }
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
