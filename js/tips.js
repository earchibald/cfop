// Tooltips: one styled card for every control that carries a title.
// The title stays the source of the text (and the accessible description). On a mouse hover
// the title moves to data-tip for the length of the hover, so the browser's own tooltip
// does not show as well; on a keyboard focus the card shows and the title stays.
// A control with a key badge (.hk) gets the key after the text: "New scramble · N".
// The card never opens on a touch screen: a touch has no hover, and a press means a click.
// tipText(el) gives the text the card would show; tipsShown() the control whose card is open, or null.

const TIP_DELAY=350;
let tipEl=null,tipFor=null,tipStash=null,tipTimer=0;

function tipText(el){
  const raw=el.getAttribute('title')||el.dataset.tip||'';
  if(!raw)return '';
  const hk=el.querySelector('.hk');
  const k=hk?hk.textContent.trim():'';
  if(!k||raw.includes('('+k)||raw.includes(k+')')||raw.endsWith(' · '+k))return raw;
  return raw+' · '+k;
}
function tipsShown(){return tipEl&&!tipEl.classList.contains('hidden')?tipFor:null;}

function tipTarget(node){
  let el=node&&node.nodeType===1?node:node&&node.parentElement;
  while(el&&el!==document.body){
    if(el.hasAttribute('title')||el.dataset.tip)return el;
    el=el.parentElement;
  }
  return null;
}
function tipPlace(el){
  const r=el.getBoundingClientRect(),t=tipEl,w=window.innerWidth,h=window.innerHeight;
  t.style.left='0px';t.style.top='0px';
  const tw=t.offsetWidth,th=t.offsetHeight;
  let x=r.left+r.width/2-tw/2;x=Math.max(8,Math.min(w-tw-8,x));
  let y=r.top-th-8,below=false;
  if(y<8){y=r.bottom+8;below=true;}
  if(y+th>h-8)y=Math.max(8,h-th-8);
  t.style.left=Math.round(x)+'px';t.style.top=Math.round(y)+'px';
  t.classList.toggle('below',below);
}
function tipShow(el){
  const txt=tipText(el);
  if(!txt)return;
  if(!tipEl){tipEl=document.createElement('div');tipEl.className='tipcard hidden';tipEl.setAttribute('role','tooltip');tipEl.id='tipcard';document.body.appendChild(tipEl);}
  tipFor=el;tipEl.textContent=txt;tipEl.classList.remove('hidden');
  tipPlace(el);
}
function tipUnstash(){
  if(tipStash&&tipStash.dataset.tip&&!tipStash.hasAttribute('title')){tipStash.setAttribute('title',tipStash.dataset.tip);delete tipStash.dataset.tip;}
  tipStash=null;
}
function tipHide(){
  clearTimeout(tipTimer);tipTimer=0;
  if(tipEl)tipEl.classList.add('hidden');
  tipFor=null;
}
function tipOver(e){
  const el=tipTarget(e.target);
  if(!el||el===tipStash)return;
  tipUnstash();tipHide();
  if(el.hasAttribute('title')){el.dataset.tip=el.getAttribute('title');el.removeAttribute('title');}
  tipStash=el;
  tipTimer=setTimeout(()=>{tipTimer=0;if(tipStash===el&&el.isConnected)tipShow(el);},TIP_DELAY);
}
function tipOut(e){
  if(!tipStash)return;
  const to=e.relatedTarget;
  if(to&&tipStash.contains(to))return;
  if(tipTarget(e.target)!==tipStash)return;
  tipUnstash();tipHide();
}
function tipFocus(e){
  const el=tipTarget(e.target);
  if(!el||!el.matches(':focus-visible'))return;
  tipHide();tipShow(el);
}
function tipBlur(e){if(tipFor&&tipTarget(e.target)===tipFor)tipHide();}

(function initTips(){
  if(typeof document==='undefined')return;
  const touch=typeof matchMedia==='function'&&matchMedia('(hover: none)').matches;
  if(!touch){
    document.addEventListener('mouseover',tipOver);
    document.addEventListener('mouseout',tipOut);
  }
  document.addEventListener('focusin',tipFocus);
  document.addEventListener('focusout',tipBlur);
  document.addEventListener('mousedown',tipHide,true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='Enter'||e.key===' ')tipHide();},true);
  document.addEventListener('scroll',tipHide,true);
  window.addEventListener('resize',tipHide);
})();
