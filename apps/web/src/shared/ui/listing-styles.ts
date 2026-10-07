/**
 * Stylesheets of the generic listing kit (`Pager`, `SortSwitch`, `ListingSummary`), emitted as
 * strings by the component that renders each part, so a page that does not render the part never
 * ships its CSS and no scope attribute is added to the markup. Every class is `lk-` prefixed.
 */
import { minifyCss } from './minify-css.ts';

export const PAGER_CSS = minifyCss(`
  .lk-pager {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.25rem 0.5rem;
  }
  .lk-pages {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.125rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .lk-num,
  .lk-step {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.75rem;
    font: 400 0.9375rem / 1 var(--font-mono);
    color: var(--color-text-secondary);
    text-decoration: none;
  }
  .lk-num {
    min-width: 2.75rem;
    padding: 0 0.5rem;
    border-radius: var(--radius-control);
  }
  .lk-step {
    gap: 0.5rem;
    padding: 0 0.75rem;
    border-radius: var(--radius-control);
  }
  .lk-gap {
    color: var(--color-muted);
  }
  .lk-prev .lk-arrow {
    transform: scaleX(-1);
  }
  /* The current page is a quiet chip, not a link: no outline, no pink. */
  .lk-current {
    background: var(--color-chip);
    font-weight: 700;
    color: var(--color-text);
  }
  a.lk-num,
  a.lk-step {
    transition: color 150ms, background-color 150ms;
  }
  @media (hover: hover) {
    a.lk-num:hover,
    a.lk-step:hover {
      color: var(--color-primary);
      background: var(--color-card-hover);
    }
  }
  a.lk-num:focus-visible,
  a.lk-step:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  /* Keeps the numbers centered when only one of Previous and Next exists (wide screens). */
  .lk-step-gap {
    display: none;
  }
  @media (min-width: 640px) {
    .lk-pager {
      flex-wrap: nowrap;
      gap: 0.5rem;
    }
    .lk-step-gap {
      display: block;
      width: 6.5rem;
    }
    .lk-step {
      min-width: 6.5rem;
    }
  }
`);

export const SORT_CSS = minifyCss(`
  .lk-sort {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.75rem;
    max-width: 100%;
  }
  .lk-sort-label {
    font: 400 0.8125rem / 1 var(--font-mono);
    color: var(--color-muted);
  }
  .lk-sort-options {
    display: flex;
    max-width: 100%;
    gap: 0.125rem;
    margin: 0;
    padding: 0.125rem;
    list-style: none;
    border-radius: var(--radius-control);
    background: var(--color-chip);
  }
  .lk-sort-option {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.75rem;
    padding: 0 0.75rem;
    border-radius: calc(var(--radius-control) - 0.125rem);
    font: 400 0.8125rem / 1 var(--font-mono);
    white-space: nowrap;
    color: var(--color-text-secondary);
    text-decoration: none;
    transition: color 150ms, background-color 150ms;
  }
  .lk-sort-option[aria-current='true'] {
    background: var(--color-card);
    font-weight: 700;
    color: var(--color-text);
  }
  @media (hover: hover) {
    .lk-sort-option:not([aria-current='true']):hover {
      color: var(--color-primary);
    }
  }
  .lk-sort-option:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
`);

export const SUMMARY_CSS = minifyCss(`
  .lk-summary {
    margin: 0;
    font: 400 0.875rem / 1.4 var(--font-mono);
    color: var(--color-muted);
  }
`);
