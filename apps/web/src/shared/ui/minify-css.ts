/**
 * Minimal CSS minifier for the stylesheets that components emit as strings (`<style is:inline
 * set:html={...}>`), the way `features/marks/components/mark-styles.ts` does. Source stays readable
 * (comments, indentation), the page only receives the compact text. It handles the plain CSS of this
 * repo (no strings that contain `;`, `{` or `:` followed by a space); it is not a general minifier.
 */
export function minifyCss(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,])\s*/g, '$1')
    .replace(/:\s+/g, ':')
    .replace(/;}/g, '}')
    .trim();
}
