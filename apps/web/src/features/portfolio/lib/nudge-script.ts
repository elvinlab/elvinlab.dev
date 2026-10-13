export const NUDGE_STORAGE_KEY = 'experiment-nudge';

export type NudgeScriptConfig = {
  /** Share of the note (0 to 1) the visitor must have scrolled to before the card appears. */
  threshold: number;
  /** Accessible name of the close button, already in the page language. */
  closeLabel: string;
  /** CSS selector of the element the scroll share is measured against (the note, or the page). */
  target: string;
};

/**
 * Inline script that floats the experiment card. It clones the static card (or, on a page that has
 * none, the one inside `template[data-experiment-template]`), opens the copy once the bottom of the
 * viewport passes `threshold` of `target`, hides it while a static card is on screen and lets the
 * visitor close it. Shown at most once per browser session
 * (`sessionStorage`) and never again after a close (`localStorage`); blocked storage is not an error.
 * Inline, not bundled, so a build with `features.experimentNudge` off ships none of it.
 */
export function nudgeScript(config: NudgeScriptConfig): string {
  return `(function (cfg) {
  var card = document.querySelector('[data-experiment-card]');
  var template = card ? null : document.querySelector('template[data-experiment-template]');
  var source = card || (template && template.content.firstElementChild);
  var article = document.querySelector(cfg.target);
  if (!source || !article) return;
  function seen(store) { try { return store.getItem(${JSON.stringify(NUDGE_STORAGE_KEY)}) === '1'; } catch (e) { return false; } }
  function remember(store) { try { store.setItem(${JSON.stringify(NUDGE_STORAGE_KEY)}, '1'); } catch (e) {} }
  if (seen(localStorage) || seen(sessionStorage)) return;
  var box = source.cloneNode(true);
  box.removeAttribute('data-experiment-card');
  box.setAttribute('data-nudge-floating', '');
  box.setAttribute('inert', '');
  box.classList.add('nudge-float');
  var ids = box.querySelectorAll('[id]');
  for (var i = 0; i < ids.length; i++) ids[i].removeAttribute('id');
  var named = box.querySelectorAll('[aria-labelledby]');
  for (var j = 0; j < named.length; j++) named[j].removeAttribute('aria-labelledby');
  var close = document.createElement('button');
  close.setAttribute('type', 'button');
  close.setAttribute('aria-label', cfg.closeLabel);
  close.className = 'nudge-close';
  close.textContent = '\\u00d7';
  box.appendChild(close);
  document.body.appendChild(box);
  var armed = false;
  var closed = false;
  var covered = false;
  var queued = false;
  function paint() {
    if (armed && !closed && !covered) {
      box.removeAttribute('inert');
      box.setAttribute('data-open', '');
    } else {
      box.setAttribute('inert', '');
      box.removeAttribute('data-open');
    }
  }
  function check() {
    queued = false;
    if (closed) return;
    var rect = article.getBoundingClientRect();
    if (!armed && rect.height > 0 && (window.innerHeight - rect.top) / rect.height >= cfg.threshold) {
      armed = true;
      remember(sessionStorage);
      window.removeEventListener('scroll', onScroll);
    }
    paint();
  }
  function onScroll() {
    if (!queued) { queued = true; requestAnimationFrame(check); }
  }
  close.addEventListener('click', function () {
    closed = true;
    remember(localStorage);
    paint();
  });
  if (card && typeof IntersectionObserver === 'function') {
    new IntersectionObserver(function (entries) {
      covered = entries[entries.length - 1].isIntersecting;
      paint();
    }).observe(card);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  check();
})(${JSON.stringify(config)});`;
}
