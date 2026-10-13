/**
 * The inline script of the document viewer on `/education/`, emitted by `EducationPage.astro`
 * (`<script is:inline set:html>`) only when an entry has a document image, after the shared
 * `<dialog data-ed-viewer>`. One delegated click listener: a click on a `[data-ed-open]` link
 * fills the dialog image with the link target and the thumbnail alt, then opens it modally
 * (Esc, the focus trap and the focus return to the trigger are native); a click on the dialog
 * itself, which is the backdrop, closes it. Without JavaScript, or without `showModal`, the link
 * just opens the full image.
 */
export function educationViewerScript(): string {
  return `(function(){
var d=document.querySelector('[data-ed-viewer]');
if(!d||typeof d.showModal!=='function')return;
var v=d.querySelector('img');
document.addEventListener('click',function(e){
var a=e.target.closest&&e.target.closest('[data-ed-open]');
if(a){
if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
e.preventDefault();
var t=a.querySelector('img');
v.src=a.href;
v.alt=t?t.alt:'';
d.showModal();
return;
}
if(e.target===d)d.close();
});
})();`;
}
