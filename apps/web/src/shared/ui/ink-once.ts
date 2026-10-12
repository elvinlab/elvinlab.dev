const claimed = new WeakMap<Request, Set<string>>();

/** True the first time a request asks for `part`, so a page inlines each `Ink` stylesheet once however many strokes it holds. */
export function claimInkCss(request: Request, part: 'underline' | 'circle'): boolean {
  const parts = claimed.get(request) ?? new Set<string>();
  claimed.set(request, parts);
  if (parts.has(part)) return false;
  parts.add(part);
  return true;
}
