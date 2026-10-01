export const READING_STORAGE_KEY = 'reading-mode';
export const READING_ATTRIBUTE = 'data-reading';

/**
 * Inline `<head>` script: restores the visitor's choice before first paint so a returning reader
 * never sees the full layout flash and then collapse. Storage can be blocked; that is not an error.
 */
export function readingBootScript(): string {
  return `try{if(localStorage.getItem('${READING_STORAGE_KEY}')==='1')document.documentElement.setAttribute('${READING_ATTRIBUTE}','')}catch(e){}`;
}

/**
 * Inline script for the toggle and the floating exit button. Inline (not a bundled `<script>`) so
 * it is emitted only while `features.readingMode` is on: with the flag off nothing of this ships.
 */
export function readingControlsScript(): string {
  return `(function () {
  var root = document.documentElement;
  var attribute = ${JSON.stringify(READING_ATTRIBUTE)};
  var toggles = document.querySelectorAll('[data-reading-toggle]');
  var exits = document.querySelectorAll('[data-reading-exit]');
  function sync() {
    var on = root.hasAttribute(attribute);
    for (var i = 0; i < toggles.length; i++) toggles[i].setAttribute('aria-pressed', String(on));
  }
  function set(on) {
    root.toggleAttribute(attribute, on);
    try { localStorage.setItem(${JSON.stringify(READING_STORAGE_KEY)}, on ? '1' : '0'); } catch (e) {}
    sync();
    document.dispatchEvent(new CustomEvent('reading-mode-change'));
  }
  for (var i = 0; i < toggles.length; i++) {
    toggles[i].addEventListener('click', function () { set(!root.hasAttribute(attribute)); });
  }
  for (var j = 0; j < exits.length; j++) exits[j].addEventListener('click', function () { set(false); });
  sync();
})();`;
}
