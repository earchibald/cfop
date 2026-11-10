// ===== The phone stage =====
// The stage view (js/stageview.js) is for a computer. This is its twin on a phone, for CFOP: the
// cube stays in view under the top bar while the page moves under it, and the panels are three
// sheets, one in view at a time, picked on a switch under the cube (#phSeg): the section (Cross,
// F2L, OLL · PLL, Lab), Moves · Timer (the player's moves, then the timer) and More (#everyMore:
// the smart cube sheet, Patterns, the CFOP plan). The cube's chips sit in a row under the picture,
// the trainer's first; the rest (Animate, Hidden faces, the view, Virtual cube, Save image) show
// with their names on the "..." button (#phOpts). CSS does the work (css/phone.css, body.mst and
// body[data-msheet]); nothing moves in the document. The sections are a bar at the foot of the
// screen for both methods (the rail, by CSS alone).
const PH={sheet:'sec',ro:null};
const PH_SHEETS=[['sec','','The section: its lesson, its drill and its cases'],['play','Moves · Timer','The moves of the scramble with the player\'s buttons, and the timer'],['more','More','Patterns, the CFOP plan and your smart cube']];
function phWanted(){return typeof mobileMQ!=='undefined'&&mobileMQ.matches&&typeof method!=='undefined'&&method==='cfop'&&!document.body.classList.contains('fullcube');}
function phOn(){return document.body.classList.contains('mst');}
function phBox(){const c=$('#cube');return c?c.closest('.cubebox'):null;}
function phSecName(){const b=document.querySelector(`nav#rail button[data-tab="${typeof curTab!=='undefined'?curTab:'cross'}"]`);return b?b.lastChild.textContent.trim():'Section';}
function phBuild(){
  if($('#phSeg'))return;const main=$('main.main'),box=phBox();if(!main||!box)return;
  const seg=document.createElement('div');seg.id='phSeg';seg.className='phseg';seg.setAttribute('role','group');seg.setAttribute('aria-label','What shows under the cube');
  for(const [k,name,tip] of PH_SHEETS){const b=document.createElement('button');b.type='button';b.dataset.sheet=k;b.setAttribute('aria-pressed','false');b.title=tip;b.textContent=name;seg.append(b);}
  seg.onclick=e=>{const b=e.target.closest('button[data-sheet]');if(b)phSheet(b.dataset.sheet,true);};
  main.append(seg);
  const o=document.createElement('button');o.type='button';o.id='phOpts';o.className='phopts';o.setAttribute('aria-expanded','false');o.setAttribute('aria-label','More for the cube');
  o.title='More for the cube: Animate, Hidden faces, the view, Virtual cube and Save image';o.textContent='⋯';
  o.onclick=()=>phOpts(!box.classList.contains('phopen'));
  box.append(o);
}
// The chips behind the "..." button, shown or put away.
function phOpts(on){const box=phBox(),o=$('#phOpts');if(!box||!o)return;box.classList.toggle('phopen',!!on);o.setAttribute('aria-expanded',on?'true':'false');phMeasure();}
// One sheet in view. A press on the switch goes to the top of the page, where the sheet starts.
function phSheet(s,top){
  if(!PH_SHEETS.some(x=>x[0]===s))s='sec';PH.sheet=s;
  if(!phOn())return;document.body.dataset.msheet=s;
  $$('#phSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.sheet===s?'true':'false'));
  if(top&&typeof scrollTo==='function')try{scrollTo(0,0);}catch(e){}
}
function phName(){const b=document.querySelector('#phSeg button[data-sheet="sec"]');if(b)b.textContent=phSecName();}
// The height of the cube box, for the switch that sticks under it.
function phMeasure(){const box=phBox();if(!box||!phOn())return;const h=box.offsetHeight;if(h)document.body.style.setProperty('--phcube',h+'px');}
function phApply(){
  const want=phWanted(),b=document.body;
  if(want){phBuild();b.classList.add('mst');phName();phSheet(PH.sheet);
    if(!PH.ro&&typeof ResizeObserver==='function'){PH.ro=new ResizeObserver(phMeasure);const box=phBox();if(box)PH.ro.observe(box);}
    phMeasure();}
  else{b.classList.remove('mst');delete b.dataset.msheet;b.style.removeProperty('--phcube');const box=phBox();if(box)box.classList.remove('phopen');}
}
// A move to the player (Step through on cube, a case's solution) shows the sheet that holds it.
function phShowPlayer(){if(!phOn())return false;phSheet('play');return true;}
document.addEventListener('cw:tab',()=>{PH.sheet='sec';phApply();phOpts(false);});
document.addEventListener('cw:method',phApply);
document.addEventListener('fullscreenchange',()=>setTimeout(phApply,0));
if(typeof mobileMQ!=='undefined'){if(mobileMQ.addEventListener)mobileMQ.addEventListener('change',phApply);else if(mobileMQ.addListener)mobileMQ.addListener(phApply);}
phApply();
