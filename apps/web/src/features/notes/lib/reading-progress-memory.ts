export const PROGRESS_KEY_PREFIX = 'progress:';
/** From this fraction of the article on, a note counts as read (and is stored as 1). */
export const READ_THRESHOLD = 0.9;
/** Below this fraction nothing is stored and nothing is restored: the reader barely started. */
export const RESTORE_MIN = 0.05;

const claimed = new WeakSet<Request>();

/** True the first time a request asks for the labels script, so a page inlines it once however many rows it holds. */
export function claimProgressScript(request: Request): boolean {
  if (claimed.has(request)) return false;
  claimed.add(request);
  return true;
}

/** Squeezes indentation and line breaks out of an inline script (it ships in the HTML of every page that has it; no `//` comments inside). */
const compact = (source: string): string => source.replace(/\s*\n\s*/g, ' ');

/** Embeds a value in an inline script without ever closing the `<script>` element. */
const literal = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c');

/** Reads `progress:<slug>` and returns the stored fraction, or null for anything missing, corrupt or out of range. */
const READ_PROGRESS = `function readProgress(slug) {
    try {
      var entry = JSON.parse(localStorage.getItem(${literal(PROGRESS_KEY_PREFIX)} + slug));
      return entry && typeof entry.p === 'number' && entry.p >= 0 && entry.p <= 1 ? entry.p : null;
    } catch (e) { return null; }
  }`;

/**
 * Inline script for a note page. It restores the reader to the stored fraction of the article (same
 * maths as the progress bar, so it also works in reading mode) and stores the progress it hears from
 * the `reading-progress` event. Inline, not bundled, so it ships only while `features.readingProgress`
 * is on. Storage can be blocked; that is never an error. Fonts and images settle after the script
 * and move the article, so while the reader has not taken over (wheel, touch, key, pointer) the
 * position is re-applied on load and for 3 s while the article resizes.
 */
export function progressNoteScript(slug: string): string {
  return compact(`(function () {
  var article = document.querySelector('[data-article]');
  if (!article) return;
  var key = ${literal(PROGRESS_KEY_PREFIX)} + ${literal(slug)};
  ${READ_PROGRESS}
  var previous = readProgress(${literal(slug)});
  function topOf(p) {
    return article.offsetTop + p * Math.max(article.offsetHeight - window.innerHeight, 0);
  }
  if (previous !== null && previous > ${RESTORE_MIN} && previous < ${READ_THRESHOLD} && !location.hash && window.scrollY < 8) {
    var restoreAt = previous;
    window.scrollTo({ top: topOf(restoreAt), behavior: 'instant' });
    var touched = false;
    var took = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
    for (var i = 0; i < took.length; i++) window.addEventListener(took[i], function () { touched = true; });
    function again() {
      if (!touched) window.scrollTo({ top: topOf(restoreAt), behavior: 'instant' });
    }
    window.addEventListener('load', again);
    if (window.ResizeObserver) {
      var watcher = new ResizeObserver(again);
      watcher.observe(article);
      setTimeout(function () { watcher.disconnect(); }, 3000);
    }
  }
  var latest = null;
  var waiting = false;
  var finished = previous !== null && previous >= ${READ_THRESHOLD};
  function flush() {
    waiting = false;
    if (latest === null || finished) return;
    var p = latest;
    latest = null;
    if (p >= ${READ_THRESHOLD}) { p = 1; finished = true; }
    else if (p < ${RESTORE_MIN}) return;
    else p = Math.round(p * 1000) / 1000;
    if (p === previous) return;
    previous = p;
    try { localStorage.setItem(key, JSON.stringify({ p: p, t: Date.now() })); } catch (e) {}
  }
  document.addEventListener('reading-progress', function (event) {
    latest = event.detail;
    if (!waiting) { waiting = true; setTimeout(flush, 500); }
  });
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });
})();`);
}

export type ProgressLabels = { read: string; continue: string };

/**
 * Inline script for any list of notes: for every `[data-slug]` row that holds a hidden
 * `[data-progress-label]`, it fills in "read" or "continue reading" from the stored progress.
 */
export function progressLabelsScript(labels: ProgressLabels): string {
  return compact(`(function () {
  var text = ${literal(labels)};
  ${READ_PROGRESS}
  function run() {
    var rows = document.querySelectorAll('[data-slug]');
    for (var i = 0; i < rows.length; i++) {
      var label = rows[i].querySelector('[data-progress-label]');
      if (!label) continue;
      var p = readProgress(rows[i].getAttribute('data-slug'));
      var state = p === null ? null : p >= ${READ_THRESHOLD} ? 'read' : p > ${RESTORE_MIN} ? 'continue' : null;
      if (!state) continue;
      label.textContent = text[state];
      label.setAttribute('data-state', state);
      label.hidden = false;
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  window.addEventListener('pageshow', function (event) { if (event.persisted) run(); });
})();`);
}
