/**
 * Stylesheet of the footprint button, shipped as a hand-minified string and emitted by the header
 * instance only (`MarkSection.astro`), so it exists only on pages that render the button and never
 * travels through the page CSS of other pages. Readable source of truth:
 *
 * - `.mk` is an instance: a wrapping row, 44 px tall at least. `data-v` is `h` (header, under the
 *   title) or `e` (end of the article, with a dashed divider once revealed). `data-r` means revealed.
 * - `.mb` is the pill button: text color with a pink border and a pink icon (white on the dark-theme
 *   pink would miss AA). `.mi` is the pixel footprint (an SVG `<use>`), `.mn` the count or hint.
 * - `.mf` is a zero-size effects box centered on the icon, `.mr` the ring, `.mp` one burst pixel;
 *   they never take pointer events and never add width.
 * - `data-a` picks the animation: stamp (icon pressed from 1.8x with a ring), burst (8 pixels fly
 *   28 px with stepped easing), pulse (a soft ring). `.go` restarts the stamp on the icon.
 * - `data-n` is the first-visit nudge: two pink rings around the header button.
 * - `.mt` wraps a button and its privacy tooltip `.mx` (role=tooltip, `aria-describedby`), shown on hover
 *   and on focus within, with an invisible bridge so the pointer can reach the link inside. The
 *   header one opens upward: the banner is its own stacking context and the article paints over
 *   anything that hangs below it.
 * - The tooltip link has no transition (`!important` beats the global reduced-motion rule, which
 *   makes every element `transition: all 0.01ms`): its visibility must follow its parent in the same
 *   frame, or a quick Tab would skip it.
 * - Every animation is off under prefers-reduced-motion.
 */
export const MARKS_CSS =
  '.mk{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem .75rem;min-height:44px}' +
  '.mk[hidden],.mk [hidden]{display:none}' +
  '.mk[data-v=h]{margin-top:1rem}' +
  '.mk[data-v=e]{min-height:6rem;align-content:flex-start}' +
  '.mk[data-r][data-v=e]{border-top:1px dashed var(--color-divider);padding-top:1.5rem}' +
  '.mv{flex-basis:100%;margin:0;font:700 1rem var(--font-display)}' +
  '.mb{position:relative;display:inline-flex;align-items:center;gap:.5rem;min-width:44px;min-height:44px;padding:.5rem 1rem;border:1.5px solid var(--color-pink);border-radius:var(--radius-pill);background:var(--color-card);color:var(--color-text);font:.875rem var(--font-mono);text-align:left;cursor:pointer;transition:background-color .15s}' +
  '.mb:hover{background:var(--color-chip)}' +
  '.mt{position:relative;display:inline-flex}' +
  '.mx{position:absolute;left:0;top:calc(100% + .5rem);z-index:5;width:max-content;max-width:min(18rem,calc(100vw - 2rem));padding:.5rem .75rem;border:1px solid var(--color-divider);border-radius:var(--radius-inner);background:var(--color-card);color:var(--color-text-secondary);font:.8125rem/1.4 var(--font-mono);visibility:hidden}' +
  '.mx:before{content:"";position:absolute;inset:-.6rem 0 auto;height:.6rem}' +
  '.mk[data-v=h] .mx{top:auto;bottom:calc(100% + .5rem)}' +
  '.mk[data-v=h] .mx:before{inset:auto 0 -.6rem}' +
  '.mx a{color:var(--color-primary);border-bottom:1px dashed;transition:none!important}' +
  '.mt:hover .mx,.mt:focus-within .mx{visibility:visible}' +
  '.mi{width:14px;height:22px;color:var(--color-pink);fill:currentColor}' +
  '.mn{font:.75rem var(--font-mono);color:var(--color-text-secondary)}' +
  '.mf{position:absolute;top:50%;left:calc(1rem + 7px);width:0;height:0;pointer-events:none}' +
  '.mr{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border:2px solid var(--color-pink);border-radius:50%;opacity:0}' +
  '.mp{position:absolute;width:4px;height:4px;margin:-2px 0 0 -2px;background:var(--color-primary);opacity:0}' +
  '.mp:nth-child(3n+2){background:var(--color-cyan)}' +
  '.mp:nth-child(3n){background:var(--color-pink)}' +
  '[data-a=stamp] .mi.go{animation:marks-stamp .3s cubic-bezier(.2,.9,.3,1.2)}' +
  '[data-a=stamp] .mr{animation:marks-pulse .35s cubic-bezier(0,0,.2,1) .1s backwards}' +
  '[data-a=pulse] .mr{animation:marks-pulse .5s cubic-bezier(0,0,.2,1)}' +
  '[data-a=burst] .mp{animation:marks-burst .45s steps(5,end)}' +
  '.mk[data-n] .mb:after{content:"";position:absolute;inset:-3px;border:2px solid var(--color-pink);border-radius:inherit;opacity:0;pointer-events:none;animation:marks-nudge 1.1s cubic-bezier(0,0,.2,1) .8s 2}' +
  '@keyframes marks-stamp{from{opacity:.4;transform:scale(1.8) rotate(-14deg)}to{opacity:1;transform:none}}' +
  '@keyframes marks-pulse{from{opacity:.9;transform:scale(.6)}to{opacity:0;transform:scale(2.6)}}' +
  '@keyframes marks-burst{to{opacity:0;transform:translate(var(--x),var(--y))}}' +
  '@keyframes marks-nudge{from{opacity:.8}to{opacity:0;transform:scale(1.1,1.45)}}' +
  '@media(prefers-reduced-motion:reduce){.mb{transition:none}.mk[data-n] .mb:after,[data-a] .mi.go,[data-a] .mr,[data-a] .mp{animation:none}}';
