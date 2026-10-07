/**
 * Stylesheets of the `/experiments/` page, emitted as one string by `ExperimentsPage.astro`
 * (`<style is:inline set:html>`, the pattern of `features/marks/components/mark-styles.ts`). Two
 * reasons: no `data-astro-cid-*` scope attribute on every selector and element, and each part is
 * included only when the page renders it, so a page of two big pieces does not carry the CSS of the
 * compact cards, the pager or the gallery. Classes are prefixed (`xp-`, `xc-`), so being global
 * cannot reach another page. The sort switch, summary and pager emit their own CSS
 * (`shared/ui/listing-styles.ts`). Why bytes matter: `docs/DESIGN.md`, "Page weight rule".
 */
import { minifyCss } from '@/shared/ui/minify-css.ts';

/** What the page renders; each flag adds the CSS of one part. */
export interface ExperimentsCssParts {
  /** At least one big piece (the exhibition list). */
  pieces: boolean;
  /** At least one big piece has an image (media frame, glow, flip). */
  media: boolean;
  /** At least one big piece has two or more images (CSS-only gallery with thumbnails). */
  gallery: boolean;
  /** The "more experiments" section with the compact cards. */
  more: boolean;
  /** Year labels above groups of compact cards. */
  years: boolean;
  /** The footer row with the summary and the pager. */
  footer: boolean;
  /** The decorative lab words next to the title (`experiments.words` configured). */
  lab: boolean;
  /** The empty state, when there is no experiment at all. */
  empty: boolean;
}

const HEADER = `
  .xp-page {
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }
  .xp-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 2rem;
  }
  /* Same size, weight and tracking as the title of the other pages (\`text-3xl font-bold tracking-tight\`). */
  .xp-header-text h1 {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    margin: 0;
    font-size: 1.875rem;
    font-weight: 700;
    line-height: 2.25rem;
    letter-spacing: -0.025em;
  }
  .xp-header-text p {
    max-width: 60ch;
    margin: 0.5rem 0 0;
    font-size: 1.0625rem;
    line-height: 1.55;
    color: var(--color-text-secondary);
  }
  /* The pixel flask before the title: the single pink accent of the header, a 9 x 9 grid with crisp edges. */
  .xp-flask {
    flex-shrink: 0;
    width: 27px;
    height: 27px;
    color: var(--color-pink);
    shape-rendering: crispEdges;
  }
`;

const LAB = `
  .xp-lab {
    display: none;
    margin: 0;
    padding: 0;
    list-style: none;
    font: 400 0.8125rem / 1.35 var(--font-mono);
    color: var(--color-muted);
    user-select: none;
  }
  .xp-lab li:nth-child(odd) {
    color: color-mix(in srgb, var(--color-muted) 70%, var(--color-primary));
  }
  @media (min-width: 768px) {
    .xp-lab {
      display: block;
      flex-shrink: 0;
      text-align: right;
    }
  }
`;

const EMPTY = `
  .xp-empty {
    color: var(--color-text-secondary);
  }
`;

const LIST = `
  .xp-list {
    display: flex;
    flex-direction: column;
    gap: 3.5rem;
  }
  /* A plain hairline between two big pieces: no label, no dashes. */
  .xp-hairline {
    height: 1px;
    background: var(--color-divider);
  }
`;

const MORE = `
  .xp-more {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .xp-more-head {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  @media (min-width: 640px) {
    .xp-more-head {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
  }
  .xp-more-head h2 {
    margin: 0;
    font: 700 1.5rem / 1.2 var(--font-display);
  }
  .xp-grid {
    display: grid;
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    list-style: none;
    grid-template-columns: 1fr;
  }
  @media (min-width: 640px) {
    .xp-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (min-width: 1024px) {
    .xp-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
`;

const YEARS = `
  .xp-year {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .xp-year-label {
    margin: 0;
    font: 400 0.9375rem / 1 var(--font-mono);
    color: var(--color-muted);
  }
`;

/** The summary and the pager close the list, aligned on one quiet row (stacked on a phone). */
const FOOTER = `
  .xp-foot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  @media (min-width: 640px) {
    .xp-foot {
      flex-direction: row;
      justify-content: space-between;
    }
  }
`;

const PIECE = `
  .xp-piece {
    position: relative;
    display: grid;
    gap: 1.75rem;
    /* Room for the brackets and glow that hang outside the media: content-visibility clips to the box. */
    padding: 0.75rem;
    margin: -0.75rem;
    scroll-margin-top: 5.25rem;
  }
  @supports (content-visibility: auto) {
    .xp-piece:not([data-first]) {
      content-visibility: auto;
      contain-intrinsic-size: auto 46rem;
    }
  }
  @media (min-width: 1024px) {
    .xp-piece {
      grid-template-columns: minmax(0, 58fr) minmax(0, 42fr);
      align-items: center;
      gap: 3rem;
    }
    .xp-piece[data-flip] {
      grid-template-columns: minmax(0, 42fr) minmax(0, 58fr);
    }
    .xp-piece[data-solo] {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .xp-panel {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    min-width: 0;
    padding: 1.5rem;
    border-radius: var(--radius-card);
    background: var(--color-card);
  }
  /* No media column: the panel is the whole piece, in a readable width. */
  .xp-piece[data-solo] .xp-panel {
    max-width: 52rem;
  }
  .xp-top {
    display: flex;
  }
  .xp-status {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.125rem 0.5rem;
    border-radius: var(--radius-pill);
    background: var(--color-chip);
    font: 400 0.8125rem / 1.125rem var(--font-mono);
    color: var(--color-text-secondary);
  }
  /* Square 8 x 8 status dot: no radius, like the other pixel details. */
  .xp-dot {
    width: 0.5rem;
    height: 0.5rem;
    background: var(--color-primary);
  }
  .xp-dot[data-status='running'] {
    background: var(--color-ok);
  }
  .xp-dot[data-status='archived'] {
    background: var(--color-muted);
  }
  .xp-heading h2 {
    margin: 0;
    font: 700 1.75rem / 1.15 var(--font-display);
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
  }
  .xp-heading p {
    margin: 0.375rem 0 0;
    color: var(--color-muted);
  }
  .xp-facts {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin: 0;
  }
  .xp-facts dt {
    font: 400 0.8125rem / 1.125rem var(--font-mono);
    color: var(--color-muted);
  }
  .xp-facts dd {
    margin: 0.25rem 0 0;
    line-height: 1.55;
    color: var(--color-text-secondary);
    text-wrap: pretty;
  }
  .xp-description {
    margin: 0;
    line-height: 1.55;
    color: var(--color-text-secondary);
  }
  .xp-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .xp-tags li {
    padding: 0.125rem 0.625rem;
    border-radius: var(--radius-pill);
    background: var(--color-chip);
    font: 400 0.8125rem / 1.125rem var(--font-mono);
    color: var(--color-text-secondary);
  }
  .xp-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.75rem;
    margin-top: auto;
  }
  .xp-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 2.75rem;
    padding-inline: 1.25rem;
    border-radius: var(--radius-control);
    background: var(--color-button);
    color: white;
    font-weight: 500;
    text-decoration: none;
  }
  .xp-link {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    padding-inline: 0.75rem;
    border-radius: var(--radius-control);
    color: var(--color-primary);
    font-size: 0.875rem;
    text-decoration: underline dashed;
    text-underline-offset: 4px;
  }
  .xp-link:hover {
    background: var(--color-card-hover);
  }
  @media (prefers-reduced-motion: no-preference) {
    .xp-btn {
      transition: transform 150ms ease-out, opacity 150ms ease-out;
    }
    .xp-btn:active {
      transform: scale(0.96);
    }
    .xp-link {
      transition: background-color 150ms ease-out;
    }
  }
  .xp-btn:hover {
    opacity: 0.9;
  }
  /*
   * Scroll reveal for the pieces after the first one: progressive enhancement only. Without
   * scroll-driven animation or with reduced motion nothing runs and the piece is simply there. It
   * only moves (transform, never opacity: a dimmed piece fails contrast checks and screenshots), so
   * a stalled animation leaves fully readable content.
   */
  @supports (animation-timeline: view()) {
    @media (prefers-reduced-motion: no-preference) {
      .xp-piece:not([data-first]) {
        animation: xp-rise linear both;
        animation-timeline: view();
        animation-range: entry 0% entry 30%;
      }
    }
  }
  @keyframes xp-rise {
    from {
      transform: translateY(24px);
    }
    to {
      transform: none;
    }
  }
`;

/** The media frame (a single figure or the stage of a gallery), the glow and the flipped side. */
const MEDIA = `
  @media (min-width: 1024px) {
    .xp-piece[data-flip] > .xp-media {
      order: 2;
    }
  }
  /* Soft glow behind the featured media: violet and cyan tokens, no blur filter, so it costs one paint. */
  .xp-piece[data-featured] > .xp-media::before {
    content: '';
    position: absolute;
    inset: -10% 0;
    z-index: -1;
    pointer-events: none;
    opacity: 0.7;
    background:
      radial-gradient(60% 65% at 25% 35%, var(--color-glow-violet), transparent 70%),
      radial-gradient(55% 60% at 80% 75%, var(--color-glow-cyan), transparent 70%);
    /* Fades to nothing before the layer's own edge, so no rectangle is ever visible. */
    mask-image: radial-gradient(closest-side at 50% 50%, black 45%, transparent 100%);
  }
  .xp-media {
    position: relative;
    isolation: isolate;
    min-width: 0;
  }
  .xp-slide {
    margin: 0;
  }
  /* The image box: hairline outline, clipped zoom, square-capped pixel corner brackets (3 px bars, 14 px arms) on the frame. */
  .xp-shot {
    position: relative;
    color: color-mix(in srgb, var(--color-text) 38%, transparent);
  }
  .xp-shot::after {
    content: '';
    position: absolute;
    inset: -6px;
    pointer-events: none;
    background:
      linear-gradient(currentColor, currentColor) top left / 14px 3px no-repeat,
      linear-gradient(currentColor, currentColor) top left / 3px 14px no-repeat,
      linear-gradient(currentColor, currentColor) top right / 14px 3px no-repeat,
      linear-gradient(currentColor, currentColor) top right / 3px 14px no-repeat,
      linear-gradient(currentColor, currentColor) bottom left / 14px 3px no-repeat,
      linear-gradient(currentColor, currentColor) bottom left / 3px 14px no-repeat,
      linear-gradient(currentColor, currentColor) bottom right / 14px 3px no-repeat,
      linear-gradient(currentColor, currentColor) bottom right / 3px 14px no-repeat;
  }
  .xp-clip {
    position: relative;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    border-radius: var(--radius-card);
    background: var(--color-chip);
    outline: 1px solid var(--color-divider);
    outline-offset: -1px;
  }
  .xp-clip img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
  }
  .xp-cap {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 0.625rem;
    padding-inline: 0.25rem;
    font: 400 0.75rem / 1.4 var(--font-mono);
    color: var(--color-muted);
  }
  .xp-cap-text {
    min-width: 0;
    text-wrap: pretty;
  }
  /* Hover and focus: the image grows slightly inside its frame and the brackets turn violet. */
  @media (prefers-reduced-motion: no-preference) {
    .xp-clip img {
      transition: transform 400ms ease-out;
    }
    .xp-shot {
      transition: color 250ms ease-out;
    }
  }
  @media (hover: hover) {
    .xp-media:hover .xp-shot {
      color: var(--color-primary);
    }
  }
  .xp-media:focus-within .xp-shot {
    color: var(--color-primary);
  }
  @media (prefers-reduced-motion: no-preference) {
    @media (hover: hover) {
      .xp-media:hover .xp-clip img {
        transform: scale(1.03);
      }
    }
    .xp-media:focus-within .xp-clip img {
      transform: scale(1.03);
    }
  }
`;

/** The CSS-only gallery: radios, stage, counter and thumbnail strip. */
const GALLERY = `
  .xp-sr {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .xp-gallery {
    position: relative;
    min-inline-size: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }
  .xp-radio {
    position: absolute;
    top: 0;
    left: 0;
    width: 1px;
    height: 1px;
    margin: 0;
    opacity: 0;
    pointer-events: none;
  }
  .xp-gallery .xp-slide {
    display: none;
  }
  /* The checked radio shows its own slide and marks its own thumbnail. */
  .xp-radio:nth-of-type(1):checked ~ .xp-stage > .xp-slide:nth-child(1),
  .xp-radio:nth-of-type(2):checked ~ .xp-stage > .xp-slide:nth-child(2),
  .xp-radio:nth-of-type(3):checked ~ .xp-stage > .xp-slide:nth-child(3),
  .xp-radio:nth-of-type(4):checked ~ .xp-stage > .xp-slide:nth-child(4) {
    display: block;
  }
  .xp-radio:nth-of-type(1):checked ~ .xp-thumbs > .xp-thumb:nth-child(1),
  .xp-radio:nth-of-type(2):checked ~ .xp-thumbs > .xp-thumb:nth-child(2),
  .xp-radio:nth-of-type(3):checked ~ .xp-thumbs > .xp-thumb:nth-child(3),
  .xp-radio:nth-of-type(4):checked ~ .xp-thumbs > .xp-thumb:nth-child(4) {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
    opacity: 1;
  }
  .xp-radio:nth-of-type(1):focus-visible ~ .xp-thumbs > .xp-thumb:nth-child(1),
  .xp-radio:nth-of-type(2):focus-visible ~ .xp-thumbs > .xp-thumb:nth-child(2),
  .xp-radio:nth-of-type(3):focus-visible ~ .xp-thumbs > .xp-thumb:nth-child(3),
  .xp-radio:nth-of-type(4):focus-visible ~ .xp-thumbs > .xp-thumb:nth-child(4) {
    box-shadow:
      0 0 0 2px var(--color-page),
      0 0 0 4px var(--color-cyan);
  }
  .xp-cap-count {
    flex-shrink: 0;
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
  }
  /* Small fixed thumbnails (80 x 50): four of them plus gaps fit a 390 px phone, so they never wrap. */
  .xp-thumbs {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  .xp-thumb {
    position: relative;
    display: block;
    flex: 0 0 5rem;
    min-width: 0;
    aspect-ratio: 8 / 5;
    border-radius: var(--radius-inner);
    opacity: 0.6;
    cursor: pointer;
  }
  .xp-thumb img {
    display: block;
    border-radius: inherit;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
  }
  @media (hover: hover) {
    .xp-thumb:hover {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: no-preference) {
    .xp-thumb {
      transition: opacity 150ms ease-out;
    }
    .xp-gallery .xp-slide {
      animation: xp-fade 280ms steps(4, end);
    }
    /* The first slide is the LCP candidate: it never fades in on load, only when chosen again. */
    .xp-radio:nth-of-type(1):checked ~ .xp-stage > .xp-slide:nth-child(1) {
      animation: none;
    }
  }
  @keyframes xp-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

/**
 * The compact card of the "more experiments" list (`xc-` prefixed).
 */
const COMPACT = `
  .xc {
    display: flex;
    min-width: 0;
    scroll-margin-top: 6rem;
  }
  .xc-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 0.625rem;
    min-width: 0;
    padding: 1rem;
    border-radius: var(--radius-card);
    background: var(--color-card);
    outline: 1px solid transparent;
    outline-offset: -1px;
    color: inherit;
    text-decoration: none;
  }
  a.xc-body:hover {
    background: var(--color-card-hover);
    outline-color: var(--color-divider);
  }
  a.xc-body:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  .xc-head {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }
  /* A small 16:10 cover, only for an entry with a real image. */
  .xc-cover {
    flex: 0 0 5rem;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    border-radius: var(--radius-inner);
    background: var(--color-chip);
  }
  .xc-cover img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
  }
  .xc-title {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.375rem;
    min-width: 0;
  }
  .xc-body h3 {
    margin: 0;
    font: 700 1.125rem / 1.2 var(--font-display);
    overflow-wrap: anywhere;
  }
  .xc-status {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.125rem 0.5rem;
    border-radius: var(--radius-pill);
    background: var(--color-chip);
    font: 400 0.8125rem / 1.125rem var(--font-mono);
    color: var(--color-text-secondary);
  }
  .xc-dot {
    width: 0.5rem;
    height: 0.5rem;
    background: var(--color-primary);
  }
  .xc-dot[data-status='running'] {
    background: var(--color-ok);
  }
  .xc-dot[data-status='archived'] {
    background: var(--color-muted);
  }
  .xc-body p {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--color-text-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .xc-foot {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: auto;
  }
  .xc-foot ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .xc-foot li {
    padding: 0.125rem 0.625rem;
    border-radius: var(--radius-pill);
    background: var(--color-chip);
    font: 400 0.8125rem / 1.125rem var(--font-mono);
    color: var(--color-text-secondary);
  }
  .xc-arrow {
    flex-shrink: 0;
    margin-left: auto;
    color: var(--color-muted);
  }
  a.xc-body:hover .xc-arrow,
  a.xc-body:focus-visible .xc-arrow {
    color: var(--color-primary);
  }
  @media (prefers-reduced-motion: no-preference) {
    .xc-body {
      transition: background-color 150ms ease-out, outline-color 150ms ease-out;
    }
    .xc-arrow {
      transition: transform 150ms steps(2, end), color 150ms ease-out;
    }
    a.xc-body:hover .xc-arrow {
      transform: translateX(3px);
    }
  }
  @supports (content-visibility: auto) {
    .xc {
      content-visibility: auto;
      contain-intrinsic-size: auto 9.5rem;
    }
  }
`;

/** The stylesheet for exactly the parts this page renders (minified, in cascade order). */
export function experimentsCss(parts: ExperimentsCssParts): string {
  const chunks = [
    HEADER,
    parts.lab && LAB,
    parts.empty && EMPTY,
    parts.pieces && LIST,
    parts.pieces && PIECE,
    parts.media && MEDIA,
    parts.gallery && GALLERY,
    parts.more && MORE,
    parts.more && COMPACT,
    parts.years && YEARS,
    parts.footer && FOOTER,
  ];
  return minifyCss(chunks.filter((chunk): chunk is string => typeof chunk === 'string').join('\n'));
}
