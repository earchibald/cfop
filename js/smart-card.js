// ================= The reference card =================
// A small floating window with one case, for the Smart cube tab: a case name said to the tab
// (smart-listen.js) opens it beside the live cube, and smartCardOpen(entry) opens it from code.
// `entry` is a Listen catalog entry ({kind, id, name}, listenCatalog in listen.js); the card is
// built from the same data as the details window (modalForLL, modalForPLL, modalForF2L in app.js).
// The card: the group and the name in the head, the picture with its views as chips (Top, Side,
// 3D, Flat and Play, caseViews; Play turns the algorithm on the small cube over and over, loop.js)
// and Save image, the algorithm covered under the Reference's spoiler rule (spoilAlg) and
// uncovered one move per second (smartCardReveal, as Listen's case window does; a click on the
// line uncovers the next move at once, app.js, the button the rest), a Recognize line, and
// Details, which opens the full window. One card at a time: the next case takes its place, where
// it sits and at its size.
// Move: drag the head. Zoom: drag the grip at the bottom right corner. The whole card scales
// (`z`: the font size and the width; everything inside is in em, and the picture fills the width),
// from SMART_CARD_MIN to SMART_CARD_MAX and no wider than the screen. The place and the zoom are
// kept in cw:smartCard, clamped to the screen on open and when the window changes size. Esc closes
// the card, unless a modal is open: that one takes the key. The voice (smart-listen.js): "reveal
// moves" and "hide moves" (smartCardMoves), "play" and "stop" (smartCardPlay), "close" (smartCardClose).
const SMART_CARD={entry:null,o:null,timer:null,ms:1000,box:null,z:1};
const SMART_CARD_W=340,SMART_CARD_FONT=13,SMART_CARD_MIN=0.7,SMART_CARD_MAX=2.6;
const SMART_CARD_SAVE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 19h14"/></svg>';
function smartCardEl(){return document.getElementById('smartCard');}
function smartCardOpenNow(){return !!smartCardEl();}
// The details of a catalog entry, as the details window takes them. Null for an entry that is no case.
function smartCardFor(e){
  if(!e)return null;
  if(e.kind==='ll'){const a=LL_ALL.find(x=>x.id===e.id);return a?modalForLL(a):null;}
  if(e.kind==='pll'){const p=PLL_FULL.find(x=>x.name===e.id);return p?modalForPLL(p):null;}
  const f=F2L_CASES.find(x=>x.n===+e.id);return f?modalForF2L(f):null;}
// Open the card on `e`, or put `e` in the open card. Returns the card, or null for no such case.
function smartCardOpen(e){
  const o=smartCardFor(e);if(!o)return null;
  let w=smartCardEl();
  if(w){const pv=w.querySelector('.pic .pv[data-v="play"]');if(pv)loopStop(pv);w.textContent='';} // a running loop ends before its picture goes
  else{
    w=document.createElement('div');w.className='smartcard panel';w.id='smartCard';w.setAttribute('role','dialog');document.body.appendChild(w);
    smartCardPointer(w);
    document.addEventListener('keydown',smartCardKeys,true);window.addEventListener('resize',smartCardFit);
    if(!SMART_CARD.box)SMART_CARD.box=store.get('smartCard',null);
    smartCardZoom(SMART_CARD.box?SMART_CARD.box.z:1,false);
  }
  clearTimeout(SMART_CARD.timer);SMART_CARD.timer=null;
  SMART_CARD.entry=e;SMART_CARD.o=o;
  w.setAttribute('aria-label','Reference card: '+o.title);
  const vs=caseViews(o);
  const chips=vs.length>1?`<div class="pvchips" role="group" aria-label="Views">${vs.map((v,i)=>`<button type="button" class="pvchip" data-v="${v.key}" aria-pressed="${!i}" title="${esc(CASE_VIEW_TITLE[v.key]||'Show this view')}">${esc(v.label)}</button>`).join('')}</div>`:'<span></span>';
  w.insertAdjacentHTML('afterbegin',`<div class="sc-head" title="Drag to move the card"><span class="tag">${esc(o.group)}</span><b class="nm">${esc(o.title)}</b><button type="button" class="small ghost sc-close" title="Close the card (Esc)">Close<span class="hk" aria-hidden="true">Esc</span></button></div>
   <div class="sc-body">
    <div class="pic sc-pic">${caseViewsHTML(o)}</div>
    <div class="sc-bar">${chips}<button type="button" class="small ghost savebtn sc-save" title="Save this picture as an image file">${SMART_CARD_SAVE}Save image</button></div>
    <div class="algbig spoiled sc-alg">${spoilAlg(o.alg)}</div>
    <div class="muted sc-hint">Click the line for the next move. Say "reveal moves", "hide moves", "play" or "close".</div>
    ${o.recog?`<div class="sc-rec"><b>Recognize</b>${esc(o.recog)}</div>`:''}
    <div class="sc-foot"><button type="button" class="small sc-details" title="Open the full details of this case: what it moves, the setup, and the Lab">Details</button></div>
   </div>
   <div class="sc-grip" title="Drag to zoom the card" aria-hidden="true"></div>`);
  caseViewsWire(w,o);
  pictureButton(w.querySelector('.sc-save'),()=>{const el=[...w.querySelectorAll('.pic .pv')].find(x=>!x.hidden);return el&&el.querySelector('svg');},()=>o.title);
  w.querySelector('.sc-close').onclick=smartCardClose;
  w.querySelector('.sc-details').onclick=()=>openCaseModal(Object.assign({},o,{spoil:true}));
  // The first time: the bottom right corner, clear of the stage and the moves beside the live cube. Then where it was left.
  if(SMART_CARD.box&&SMART_CARD.box.x!=null)smartCardFit();
  else smartCardPlace(1e9,(window.innerHeight||0)-(w.offsetHeight||0)-18);
  smartCardReveal();
  return w;}
// Close: the loop and the reveal stop, the card goes.
function smartCardClose(){
  const w=smartCardEl();if(!w)return;
  clearTimeout(SMART_CARD.timer);SMART_CARD.timer=null;
  const pv=w.querySelector('.pic .pv[data-v="play"]');if(pv)loopStop(pv);
  document.removeEventListener('keydown',smartCardKeys,true);window.removeEventListener('resize',smartCardFit);
  w.remove();SMART_CARD.entry=null;SMART_CARD.o=null;}
// Esc closes the card, unless a modal is open: that one takes the key.
function smartCardKeys(e){if(e.key!=='Escape'||!smartCardEl()||document.querySelector('.modal-bg'))return;e.preventDefault();e.stopPropagation();smartCardClose();}
// ----- the moves: one more every second, and the commands -----
function smartCardSpoil(){const w=smartCardEl();return w?w.querySelector('.algbig .spoil'):null;}
function smartCardReveal(){
  clearTimeout(SMART_CARD.timer);SMART_CARD.timer=null;
  const s=smartCardSpoil();if(!s||document.body.classList.contains('refall')||!s.querySelector('.sp-m:not(.on)'))return;
  SMART_CARD.timer=setTimeout(()=>{SMART_CARD.timer=null;if(smartCardSpoil()===s&&s.querySelector('.sp-m:not(.on)'))spoilStep(s);smartCardReveal();},SMART_CARD.ms);}
// 'reveal' uncovers every move at once, 'hide' covers them all again. Either stops the reveal; after
// hide, a click on the line still uncovers the next move. The words for the listen line.
function smartCardMoves(cmd){
  if(!smartCardEl())return `Say a case name first, then "${cmd} moves".`;
  const s=smartCardSpoil();if(!s)return 'The card shows every move.';
  clearTimeout(SMART_CARD.timer);SMART_CARD.timer=null;
  if(cmd==='hide'&&document.body.classList.contains('refall'))return 'Show all moves is on. Turn it off on the Reference page to hide the moves.';
  if(cmd==='reveal'){s.querySelectorAll('.sp-m:not(.on)').forEach(m=>m.classList.add('on'));spoilSync(s);return 'All moves shown.';}
  spoilReset(s);return 'Moves hidden. Say "reveal moves", or click the line for the next move.';}
// Play: the Play view, the algorithm on the small cube over and over. Stop: the first still view.
function smartCardPlay(on){
  const w=smartCardEl();if(!w)return on?'Say a case name first, then "play".':'Nothing is playing.';
  const o=SMART_CARD.o,vs=caseViews(o);
  if(on){if(!vs.some(v=>v.key==='play'))return 'This card cannot play.';caseViewShow(w,o,'play');return 'Playing the moves on the card. Say "stop" for the still picture.';}
  const pv=w.querySelector('.pic .pv[data-v="play"]');if(!pv||pv.hidden)return 'Nothing is playing.';
  caseViewShow(w,o,(vs.find(v=>v.key!=='play')||vs[0]).key);return 'Stopped.';}
// ----- the place and the zoom -----
// Put the card at (x,y), kept on the screen: the whole width, and at least the head in view.
function smartCardPlace(x,y){
  const w=smartCardEl();if(!w)return;
  const W=window.innerWidth||0,H=window.innerHeight||0,ww=w.offsetWidth||Math.round(SMART_CARD_W*SMART_CARD.z);
  x=Math.round(Math.max(8,Math.min(x,Math.max(8,W-ww-8))));y=Math.round(Math.max(0,Math.min(y,Math.max(0,H-48))));
  w.style.left=x+'px';w.style.top=y+'px';
  SMART_CARD.box=Object.assign(SMART_CARD.box||{},{x,y,z:SMART_CARD.z});}
// Zoom the card to z: the font size and the width follow, and everything inside with them.
function smartCardZoom(z,place){
  const w=smartCardEl();if(!w)return;
  const W=window.innerWidth||0;
  z=Math.max(SMART_CARD_MIN,Math.min(SMART_CARD_MAX,z));if(W)z=Math.min(z,Math.max(SMART_CARD_MIN,(W-16)/SMART_CARD_W));
  SMART_CARD.z=z;w.style.fontSize=(SMART_CARD_FONT*z).toFixed(2)+'px';w.style.width=Math.round(SMART_CARD_W*z)+'px';
  if(SMART_CARD.box)SMART_CARD.box.z=z;
  if(place!==false&&SMART_CARD.box)smartCardPlace(SMART_CARD.box.x,SMART_CARD.box.y);}
// The window changed size: the card stays on the screen.
function smartCardFit(){if(!smartCardEl())return;smartCardZoom(SMART_CARD.z,false);if(SMART_CARD.box)smartCardPlace(SMART_CARD.box.x,SMART_CARD.box.y);}
function smartCardSave(){if(SMART_CARD.box)store.set('smartCard',SMART_CARD.box);}
// A press on the head drags the card; a press on the grip zooms it: the corner follows the pointer,
// the zoom from whichever of the width and the height the pointer asks more of.
function smartCardPointer(w){
  w.addEventListener('pointerdown',e=>{
    if(e.button>0||!e.target.closest)return;
    const grip=e.target.closest('.sc-grip'),head=grip?null:e.target.closest('.sc-head');
    if((!grip&&!head)||e.target.closest('button'))return;
    e.preventDefault();
    const r=w.getBoundingClientRect(),id=e.pointerId,d={x:e.clientX-r.left,y:e.clientY-r.top};
    const h1=((w.offsetHeight||r.height)||0)/SMART_CARD.z; // the card's height at zoom 1
    const edge=()=>({x:parseFloat(w.style.left)||r.left,y:parseFloat(w.style.top)||r.top}); // the corner the card grew from: a wide card may have moved left to stay on the screen
    const move=ev=>{if(ev.pointerId!==id)return;
      if(head)smartCardPlace(ev.clientX-d.x,ev.clientY-d.y);
      else{const o=edge();smartCardZoom(Math.max((ev.clientX-o.x)/SMART_CARD_W,h1>0?(ev.clientY-o.y)/h1:0));}};
    const up=ev=>{if(ev.pointerId!==id)return;
      w.removeEventListener('pointermove',move);w.removeEventListener('pointerup',up);w.removeEventListener('pointercancel',up);
      w.classList.remove('drag','zoom');smartCardSave();};
    w.addEventListener('pointermove',move);w.addEventListener('pointerup',up);w.addEventListener('pointercancel',up);
    if(w.setPointerCapture)try{w.setPointerCapture(id);}catch(_){}
    w.classList.add(head?'drag':'zoom');
  });}
