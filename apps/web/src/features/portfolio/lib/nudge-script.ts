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
 * none, the one inside `template[data-experiment-template]`), opens the copy, after the first scroll the visitor makes (never on load, so a short page cannot
 * pop it open unread), once the bottom of the viewport passes `threshold` of `target`, hides it while a static card or the page footer is on
 * screen (so it never covers the links there; the footer is looked up after the document loads), and
 * steps aside for the rest of the visit once keyboard focus lands anywhere outside it (WCAG focus not
 * obscured) and lets the visitor close it. Shown at most once per browser session
 * (`sessionStorage`) and never again after a close (`localStorage`); blocked storage is not an error.
 * Inline, not bundled, so a build with `features.experimentNudge` off ships none of it.
 */
export function nudgeScript(config: NudgeScriptConfig): string {
  const source = `(function (cfg) {
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
  var overCard = false;
  var overFoot = false;
  var dodged = false;
  var queued = false;
  function paint() {
    if (armed && !closed && !dodged && !overCard && !overFoot) {
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
  document.addEventListener('focusin', function (event) {
    if (!box.contains(event.target)) { dodged = true; paint(); }
  });
  close.addEventListener('click', function () {
    closed = true;
    remember(localStorage);
    paint();
  });
  function watch(el, set) {
    if (!el || typeof IntersectionObserver !== 'function') return;
    new IntersectionObserver(function (entries) {
      set(entries[entries.length - 1].isIntersecting);
      paint();
    }).observe(el);
  }
  watch(card, function (on) { overCard = on; });
  function watchFooter() { watch(document.querySelector('[data-site-footer]'), function (on) { overFoot = on; }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchFooter);
  else watchFooter();
  window.addEventListener('scroll', onScroll, { passive: true });
})(${JSON.stringify(config)});`;
  // Never put a `//` comment inside the script above: collapsing line breaks would make it swallow
  // the code after it. Indentation and line breaks cost bytes on every page; every statement ends in `;` or `}`, so
  // collapsing them to one space is safe (no automatic semicolon insertion to trip over).
  return source.replace(/\s*\n\s*/g, ' ');
}
