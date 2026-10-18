// The helpers of the site that the scanner (js/scan.js) and the painter (js/paint.js) expect from
// js/app.js, which the lab does not load: the two query shorthands, esc for text in HTML, and the
// puzzle size, always the 3x3 here. lab.js uses the first two as well.
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function puzzleN(){return 3;}
