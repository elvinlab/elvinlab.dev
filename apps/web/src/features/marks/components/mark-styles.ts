/**
 * Stylesheet of the footprint button, shipped as a hand-minified string and emitted by the header
 * instance only (`MarkSection.astro`), so it exists only on pages that render the button and never
 * travels through the page CSS of other pages. Readable source of truth:
 *
 * - `.mk` is an instance: a wrapping row, 44 px tall at least. `data-v` is `h` (header, under the
 *   title), `c` (the home sidebar card: like `h` without the top margin) or `e` (end of the article, with a dashed divider once revealed). `data-r` means revealed.
 * - `[data-marks-card]` wraps a card instance (home): it stays out of the layout until the instance
 *   is revealed, and the script removes the whole wrapper when the store is unavailable.
 * - `.mb` is the pill button: text color with a pink border and a pink icon (white on the dark-theme
 *   pink would miss AA). `.mi` is the 8-bit pink heart (an SVG `<use>`), `.mn` the count or hint.
 * - `.mf` is a zero-size effects box centered on the icon, `.mr` the ring, `.mp` one burst pixel;
 *   they never take pointer events and never add width.
 * - `data-a` picks the animation: stamp (icon pressed from 1.8x with a ring), burst (8 pixels fly
 *   28 px with stepped easing), pulse (a soft ring). `.go` restarts the stamp on the icon.
 * - `data-n` is the first-visit nudge: two pink rings around the header button.
 * - `.mt` wraps a button and its privacy tooltip `.mx` (role=tooltip, `aria-describedby`). It shows on
 *   real hover (`hover:hover` only: on a touch screen `:hover` sticks after a tap), on keyboard focus
 *   (`:focus-visible`, not the focus a mouse click leaves behind) and, on touch, for a few seconds
 *   after a tap (`data-t`, cleared by the script); Escape hides it (`data-x`). An invisible bridge
 *   lets the pointer reach the link inside. The
 *   header one opens upward: the banner is its own stacking context and the article paints over
 *   anything that hangs below it.
 * - The tooltip link has no transition (`!important` beats the global reduced-motion rule, which
 *   makes every element `transition: all 0.01ms`): its visibility must follow its parent in the same
 *   frame, or a quick Tab would skip it.
 * - The heart beats twice in two steps on hover or keyboard focus and once when the button first
 *   scrolls into view (`.bt`, set by the script); it never loops, and it is off under reduced motion.
 * - Every animation is off under prefers-reduced-motion.
 */
export const MARKS_CSS =
  '.mk{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem .75rem;min-height:44px}' +
  '.mk[hidden],.mk [hidden]{display:none}' +
  '.mk[data-v=h]{margin-top:1rem}' +
  '.mk[data-v=e]{min-height:6rem;align-content:flex-start}' +
  '.mk[data-r][data-v=e]{border-top:1px dashed var(--color-divider);padding-top:1.5rem}' +
  '.mv{flex-basis:100%;margin:0;font:700 .9375rem var(--font-display)}' +
  '.mb{position:relative;display:inline-flex;align-items:center;gap:.5rem;min-width:44px;min-height:44px;padding:.5rem .875rem;border:1.5px solid var(--color-pink);border-radius:var(--radius-pill);background:var(--color-card);color:var(--color-text);font:.8125rem var(--font-mono);text-align:left;cursor:pointer;transition:background-color .15s}' +
  '.mb:hover{background:var(--color-chip)}' +
  '.mt{position:relative;display:inline-flex}' +
  '.mx{position:absolute;left:0;top:calc(100% + .5rem);z-index:5;width:max-content;max-width:min(15rem,calc(100vw - 3rem));padding:.5rem .75rem;border:1px solid var(--color-divider);border-radius:var(--radius-inner);background:var(--color-card);color:var(--color-text-secondary);font:.8125rem/1.4 var(--font-mono);visibility:hidden}' +
  '.mx:before{content:"";position:absolute;inset:-.6rem 0 auto;height:.6rem}' +
  '[data-marks-card]:not(:has([data-r])){display:none}' +
  '.mk[data-v=h] .mx,.mk[data-v=c] .mx{top:auto;bottom:calc(100% + .5rem)}' +
  '.mk[data-v=h] .mx:before,.mk[data-v=c] .mx:before{inset:auto 0 -.6rem}' +
  '.mx a{color:var(--color-primary);border-bottom:1px dashed;transition:none!important}' +
  '@media(hover:hover){.mt:hover .mx{visibility:visible}}' +
  '.mt:has(:focus-visible) .mx,.mt[data-t] .mx{visibility:visible}' +
  '.mt[data-x] .mx{visibility:hidden}' +
  '.mi{width:21px;height:18px;shape-rendering:crispEdges;color:var(--color-pink);fill:currentColor}' +
  '.mn{font:.75rem var(--font-mono);color:var(--color-text-secondary)}' +
  '.mf{position:absolute;top:50%;left:calc(.875rem + 10px);width:0;height:0;pointer-events:none}' +
  '.mr{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border:2px solid var(--color-pink);opacity:0}' +
  '.mp{position:absolute;width:4px;height:4px;margin:-2px 0 0 -2px;background:var(--color-primary);opacity:0}' +
  '.mp:nth-child(3n+2){background:var(--color-cyan)}' +
  '.mp:nth-child(3n){background:var(--color-pink)}' +
  '.mb:hover .mi,.mb:focus-visible .mi,.mi.bt{animation:marks-beat .6s steps(1,end)}' +
  '[data-a=stamp] .mi.go{animation:marks-stamp .36s steps(4,end)}' +
  '[data-a=stamp] .mr{animation:marks-pulse .35s steps(5,end) .1s backwards}' +
  '[data-a=pulse] .mr{animation:marks-pulse .5s steps(6,end)}' +
  '[data-a=burst] .mp{animation:marks-burst .45s steps(5,end)}' +
  '.mk[data-n] .mb:after{content:"";position:absolute;inset:-3px;border:2px solid var(--color-pink);border-radius:inherit;opacity:0;pointer-events:none;animation:marks-nudge 1.1s cubic-bezier(0,0,.2,1) .8s 2}' +
  '[data-a=none] .mi{animation:none!important}' +
  '@keyframes marks-beat{20%,60%{transform:scale(1.2)}40%,80%{transform:none}}' +
  '@keyframes marks-stamp{from{opacity:.4;transform:scale(1.8) rotate(-14deg)}to{opacity:1;transform:none}}' +
  '@keyframes marks-pulse{from{opacity:.9;transform:scale(.6)}to{opacity:0;transform:scale(2.6)}}' +
  '@keyframes marks-burst{to{opacity:0;transform:translate(var(--x),var(--y))}}' +
  '@keyframes marks-nudge{from{opacity:.8}to{opacity:0;transform:scale(1.1,1.45)}}' +
  '@media(prefers-reduced-motion:reduce){.mb{transition:none}.mk[data-n] .mb:after,[data-a] .mi.go,[data-a] .mr,[data-a] .mp{animation:none}}';
