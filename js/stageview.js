// ===== Stage view: the cube is the page =====
// Option C of the standard-view design (docs/stage-view.md). On a desktop in CFOP the cube fills the
// page as a stage. The sections are a glass rail at its top left. The panels of the section in view
// are sheets in a column over the right third: each one folds, closes, or drags off the column to
// float (drop it on the column to put it back). Your moves and the timer are sheets for every
// section, under them. On the stage: a step badge, the hold, an action bar, and the cube question
// when no cube is picked yet. A timed solve fades the rest (focus) and ends on a Solved! card.
// The module writes no section. It moves the cube slot, the sections and a few player parts with a
// placeholder for each, so the page goes back as it was for the beginner method, a phone, ?classic
// and Settings > Layout. cw:stageView (on by default) and cw:svSheets (fold, closed, float by
// section and sheet) keep the choices. Every text put in markup here goes through svEsc.
const SV={on:false,marks:new Map(),fmarks:new Map(),phase:'',obs:null,raf:0,drag:null,ate:false};
const SV_TITLES={planFold:'CFOP plan',f2lGuide:'Guide',f2lLive:'Live pairs',f2lCases:'Train cases',f2lCaseOut:'This case',
  f2lCaseList:'Cases',f2lStatsPanel:'Per-case times',llCurrent:'This case',labOut:'What it moves',labWhy:'Why it works',seedBar:'Scramble'};
const SV_ICON={
  grip:'<svg viewBox="0 0 12 16" aria-hidden="true"><circle cx="4" cy="4" r="1.2"/><circle cx="8" cy="4" r="1.2"/><circle cx="4" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="4" cy="12" r="1.2"/><circle cx="8" cy="12" r="1.2"/></svg>',
  fold:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>',
  dock:'<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="2.5" width="11" height="11" rx="2"/><path d="M10 2.5v11"/></svg>',
  close:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>',
  plus:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.5v9M3.5 8h9"/></svg>',
  check:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>'};
function svText(el,t){if(el&&el.textContent!==t)el.textContent=t;}
function svEsc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
// Wanted: CFOP, a window wider than a phone, not ?classic, and not off in Settings. The tests stub
// matchMedia with one answer for every query, so the two queries keep the stage off there.
function svWanted(){
  if(/[?&]classic(&|=|$)/.test(location.search))return false;
  if(typeof method==='undefined'||method!=='cfop'||typeof matchMedia!=='function')return false;
  const wide=matchMedia('(min-width: 761px)').matches&&!matchMedia('(max-width: 760px)').matches;
  return wide&&store.get('stageView',true)!==false;}
// A move that can go back: a comment marks where the element was.
function svPut(el,parent,before){if(!el||!parent)return;
  if(!SV.marks.has(el)){const m=document.createComment('stage view');el.before(m);SV.marks.set(el,m);}
  parent.insertBefore(el,before||null);}
function svBack(){for(const [el,m] of SV.marks)m.replaceWith(el);SV.marks.clear();}
function svBuild(){if($('#svCol'))return;const wrap=$('.wrap');
  const col=document.createElement('aside');col.id='svCol';col.className='svcol';col.setAttribute('aria-label','Sheets');
  col.innerHTML=`<div class="svhead"><span class="sveb" id="svSec"></span><span class="svtip">Drag a sheet by its title to float it</span><button type="button" class="svlink" id="svReset" title="Put every sheet of this section back in the column, open">Put back</button></div>
    <div class="svmain" id="svMain"></div>
    <div class="svhead svhead2"><span class="sveb">Everywhere</span></div>
    <div class="svevery" id="svEvery"></div>
    <div class="svadd" id="svAdd"></div>`;
  const badge=document.createElement('div');badge.id='svBadge';badge.className='svglass svbadge';
  badge.innerHTML='<i class="sec-sq"></i><b id="svBadgeSec"></b><span id="svBadgeSub"></span>';
  const acts=document.createElement('div');acts.id='svActs';acts.className='svglass svacts';
  acts.innerHTML='<button type="button" class="svsrc" id="svSrc" title="The cube you use. Click to change it"><i class="cdot" aria-hidden="true"></i><span id="svSrcName"></span></button><span class="svsep" aria-hidden="true"></span>';
  const big=document.createElement('div');big.id='svBig';big.className='svbig';big.hidden=true;big.setAttribute('aria-live','polite');
  const ask=document.createElement('div');ask.id='svAsk';ask.className='svask';ask.hidden=true;ask.innerHTML=svAskHTML();
  // Safari clips a fixed sheet to the scrolling column, so a floating sheet lives in a layer of its own.
  const fl=document.createElement('div');fl.id='svFloats';fl.className='svfloats';
  wrap.append(col,badge,big,ask,fl);SV.acts=acts;
  fl.addEventListener('click',svClick);fl.addEventListener('pointerdown',svDown);
  col.addEventListener('click',svClick);col.addEventListener('pointerdown',svDown);
  $('#svReset').onclick=svReset;acts.querySelector('#svSrc').onclick=e=>{e.stopPropagation();const c=$('#cubeChip');if(c)c.click();};
  ask.addEventListener('click',e=>{const b=e.target.closest('[data-src]');if(!b)return;svAskPick(b.dataset.src);});
  big.addEventListener('click',e=>{const b=e.target.closest('[data-sv]');if(!b)return;
    if(b.dataset.sv==='next'){svBigClose();if(typeof nextForTab==='function')nextForTab();}
    else if(b.dataset.sv==='close')svBigClose();});}
function svAskHTML(){return `<div class="svask-in svglass">
  <svg class="svask-mark" viewBox="0 0 26 26" aria-hidden="true"><path d="M13 2 24 7.5 13 13 2 7.5Z" fill="var(--sticker-W)"/><path d="M2 7.5 13 13v11L2 18.5Z" fill="var(--sticker-G)"/><path d="M24 7.5 13 13v11l11-5.5Z" fill="var(--sticker-R)"/></svg>
  <h2>Which cube do you use?</h2><p class="muted">The cube here follows the cube you pick.</p>
  <div class="svpicks">
   <button type="button" class="svpick" data-src="mine" title="A cube in your hands"><span class="svico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 21 7v10l-9 4.5L3 17V7Z"/><path d="M3 7l9 4.5L21 7M12 11.5v10"/></svg></span><b>Regular cube</b><span class="muted">A cube in your hands. Scan it or paint its colors, then type or say your moves.</span></button>
   <button type="button" class="svpick" data-src="screen" title="A cube on the screen"><span class="svico"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h1M10 10h1M14 10h1M7 14h10"/></svg></span><b>Virtual cube</b><span class="muted">A cube on the screen. Six keys turn it: <span class="mono">A W D X · S E</span>, or the number pad.</span></button>
   <button type="button" class="svpick" data-src="smart" title="A Bluetooth cube"><span class="svico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10-5 5V2l5 5L7 17"/></svg></span><b>Smart cube</b><span class="muted">A Bluetooth cube. Each turn shows here as you make it. Chrome, Edge or the Mac app.</span></button>
  </div><p class="muted svask-foot">You can change it any time from the cube chip in the top bar.</p></div>`;}
function svAskPick(id){if(typeof setCubeSrc==='function')setCubeSrc(id);svAskDraw();
  if(id==='smart'&&typeof smartConnectNow==='function')smartConnectNow();}
function svAskDraw(){const a=$('#svAsk');if(!a)return;
  a.hidden=!(SV.on&&store.get('cubeSrc',null)==null&&document.body.dataset.cube!=='none'&&!document.body.classList.contains('starting'));}
function svApply(){const want=svWanted();
  if(want===SV.on){if(want)svRefresh();return;}
  SV.on=want;document.body.classList.toggle('sv',want);
  if(!want){svBigClose();svFocus('');[...SV.fmarks.keys()].forEach(p=>svFloatSet(p,null));
    $$('.svclosed,.svfold').forEach(p=>p.classList.remove('svclosed','svfold'));svBack();svAskDraw();return;}
  svBuild();const wrap=$('.wrap'),slot=$('#cubeSlot'),box=$('#player .cubebox');
  svPut(slot,wrap,$('#svCol'));
  svPut($('#scrPill'),$('#svMain'));svPut($('#seedBar'),$('#svMain'));svPut($('main.main'),$('#svMain'));
  svPut($('#player .seqpanel'),$('#svEvery'));svPut($('#player .timerpanel'),$('#svEvery'));
  svPut(SV.acts,box);['animBtn','hiddenBtn','vcubeBtn','saveImgBtn'].forEach(id=>svPut($('#'+id),SV.acts));
  svRefresh();}
function svRefresh(){if(!SV.on)return;svSheets();svBadge();svSrc();svAskDraw();}
// ---- sheets ----
function svState(){return store.get('svSheets',{})||{};}
function svSave(st){store.set('svSheets',st);}
function svPanels(sec){return [...sec.querySelectorAll('.panel')].filter(p=>!p.parentElement.closest('.panel'));}
function svDetails(p){return p.tagName==='DETAILS'?p:p.querySelector(':scope>details');}
function svHeading(p){return p.querySelector(':scope>h2,:scope>h3,:scope>.row>h2,:scope>.row>h3,:scope>.row>div>h2,:scope>summary>h2,:scope>summary>h3,:scope>details>summary>h2,:scope>details>summary>h3');}
function svTitle(p){if(SV_TITLES[p.id])return SV_TITLES[p.id];
  if(p.classList.contains('seqpanel'))return 'Your moves';if(p.classList.contains('timerpanel'))return 'Timer';
  const h=svHeading(p);if(h)return h.textContent.replace(/\s+/g,' ').trim();
  const sec=p.closest('.tab');return sec?svSecName(sec.id.slice(4)):'Sheet';}
function svSub(p){if(p.classList.contains('seqpanel'))return ($('#seqLabel')||{}).textContent||'';
  if(p.classList.contains('timerpanel')){const n=($('#stN')||{}).textContent;return n&&n!=='0'?n+' times':'';}return '';}
// A closed details shows its summary alone, so a details sheet keeps its strip in the summary.
function svHost(p){return p.tagName==='DETAILS'?p.querySelector(':scope>summary')||p:p;}
function svStrip(p){const host=svHost(p);let bar=host.querySelector(':scope>.svbar');const t=svTitle(p);
  if(!bar){bar=document.createElement('div');bar.className='svbar';
    bar.innerHTML=`<span class="svgrip" title="Drag to move">${SV_ICON.grip}</span><button type="button" class="svtitle" data-sv="fold"><span class="svname"></span><span class="svsub"></span><span class="svchev">${SV_ICON.fold}</span></button><button type="button" class="svib" data-sv="dock" title="Put it back in the column" aria-label="Put it back in the column">${SV_ICON.dock}</button><button type="button" class="svib" data-sv="close" aria-label="Close">${SV_ICON.close}</button>`;
    host.prepend(bar);}
  svText(bar.querySelector('.svname'),t);svText(bar.querySelector('.svsub'),svSub(p));
  bar.querySelector('.svtitle').title='Fold or open '+t;bar.querySelector('[data-sv="close"]').title='Close '+t+'. Add brings it back';
  // The panel's own heading says the same: it hides while the strip shows it.
  const h=svHeading(p);if(h&&!SV_TITLES[p.id])h.classList.add('svh');
  const d=svDetails(p);if(d)d.dataset.svdet='';}
function svKey(p,i,tab){return tab+':'+(p.id||(p.classList.contains('seqpanel')?'moves':p.classList.contains('timerpanel')?'timer':'p'+i));}
// A sheet keeps the key it got in its place, and the section it came from (it may float out of it).
function svList(){const tab=typeof curTab!=='undefined'?curTab:'solve',sec=$('#tab-'+tab);const out=[];
  if(sec&&document.body.dataset.cube!=='none'){svPanels(sec).forEach((p,i)=>{if(!p.dataset.svkey){p.dataset.svkey=svKey(p,i,tab);p.dataset.svtab=tab;}out.push({p,key:p.dataset.svkey});});
    $$('#svFloats>.svsheet').forEach(p=>{if(p.dataset.svtab===tab)out.push({p,key:p.dataset.svkey});});}
  [$('#player .seqpanel,#svEvery .seqpanel,#svFloats>.seqpanel'),$('#svEvery .timerpanel,#svFloats>.timerpanel')].forEach(p=>{if(p)out.push({p,key:svKey(p,0,tab),every:true});});
  return out;}
function svSheets(){if(!SV.on)return;const st=svState(),list=svList(),seen=new Set(list.map(x=>x.p));
  // a sheet of another section that floats: back in its column, so it hides with its section
  [...SV.fmarks.keys()].forEach(p=>{if(!seen.has(p))svFloatSet(p,null);});
  for(const {p,key} of list){p.dataset.svkey=key;p.classList.add('svsheet');svStrip(p);const s=st[key]||{},d=svDetails(p);
    if(d){if('fold' in s&&d.open===!!s.fold)d.open=!s.fold;p.classList.remove('svfold');p.classList.toggle('svfolded',!d.open);}
    else{p.classList.toggle('svfold',!!s.fold);p.classList.toggle('svfolded',!!s.fold);}
    p.classList.toggle('svclosed',!!s.closed);svFloatSet(p,s.float);}
  const sec=$('#svSec');if(sec){const tab=typeof curTab!=='undefined'?curTab:'solve';sec.textContent=svSecName(tab);sec.dataset.sec=tab;}
  svAddDraw(list,st);}
function svFloatSet(p,f){if(f&&!p.classList.contains('svclosed')){p.classList.add('svfloat');
    if(!SV.fmarks.has(p)){const m=document.createComment('stage view float');p.before(m);SV.fmarks.set(p,m);$('#svFloats').append(p);}
    const W=innerWidth,H=innerHeight,w=Math.min(f.w||360,W-24);p.style.width=w+'px';
    p.style.left=Math.max(8,Math.min(f.x,W-w-8))+'px';p.style.top=Math.max(8,Math.min(f.y,H-48))+'px';}
  else{const m=SV.fmarks.get(p);if(m){m.replaceWith(p);SV.fmarks.delete(p);}
    if(!p.classList.contains('svdrag')){p.classList.remove('svfloat');p.style.left=p.style.top=p.style.width='';}}}
function svAddDraw(list,st){const box=$('#svAdd');if(!box)return;
  const shut=list.filter(x=>st[x.key]&&st[x.key].closed);
  box.innerHTML=shut.map(x=>`<button type="button" class="svchip" data-svadd="${svEsc(x.key)}" title="Open ${svEsc(svTitle(x.p))} again">${SV_ICON.plus}${svEsc(svTitle(x.p))}</button>`).join('');
  box.hidden=!shut.length;}
function svSet(key,patch){const st=svState();const s=Object.assign({},st[key]||{},patch);
  for(const k of Object.keys(s))if(s[k]==null||s[k]===false)delete s[k];
  if(Object.keys(s).length)st[key]=s;else delete st[key];svSave(st);svSheets();}
function svClick(e){if(SV.ate){SV.ate=false;e.stopPropagation();e.preventDefault();return;}
  const add=e.target.closest('[data-svadd]');if(add){svSet(add.dataset.svadd,{closed:null});return;}
  const b=e.target.closest('.svbar [data-sv]');if(!b)return;const p=b.closest('.svsheet'),key=p&&p.dataset.svkey;if(!key)return;
  const act=b.dataset.sv;
  if(act==='fold'){const d=svDetails(p);if(d){e.preventDefault();d.open=!d.open;svSet(key,{fold:!d.open});}else svSet(key,{fold:!p.classList.contains('svfold')});}
  else if(act==='dock')svSet(key,{float:null});
  else if(act==='close')svSet(key,{closed:true,float:null});}
function svReset(){const tab=typeof curTab!=='undefined'?curTab:'solve',st=svState();
  for(const k of Object.keys(st))if(k.startsWith(tab+':'))delete st[k];svSave(st);
  $$('.svsheet').forEach(p=>{const d=svDetails(p);if(d&&p.id!=='planFold')d.open=true;});svSheets();}
// Drag a sheet by its strip. Off the column it floats where it is let go; on the column it docks.
function svDown(e){const bar=e.target.closest('.svbar');if(!bar||e.button!==0||e.target.closest('[data-sv="dock"],[data-sv="close"]'))return;
  const p=bar.closest('.svsheet');if(!p)return;
  SV.drag={p,x0:e.clientX,y0:e.clientY,on:false,id:e.pointerId};
  addEventListener('pointermove',svMove);addEventListener('pointerup',svUp,{once:true});addEventListener('pointercancel',svUp,{once:true});}
function svMove(e){const d=SV.drag;if(!d)return;const dx=e.clientX-d.x0,dy=e.clientY-d.y0;
  if(!d.on){if(Math.hypot(dx,dy)<6)return;d.on=true;const r=d.p.getBoundingClientRect();d.r0={x:r.left,y:r.top,w:r.width};
    d.p.classList.add('svfloat','svdrag');d.p.style.width=r.width+'px';document.body.classList.add('svdragging');
    if(!SV.fmarks.has(d.p)){const m=document.createComment('stage view float');d.p.before(m);SV.fmarks.set(d.p,m);$('#svFloats').append(d.p);}}
  d.p.style.left=(d.r0.x+dx)+'px';d.p.style.top=(d.r0.y+dy)+'px';
  const col=$('#svCol').getBoundingClientRect();$('#svCol').classList.toggle('svdrop',e.clientX>=col.left);}
function svUp(e){removeEventListener('pointermove',svMove);const d=SV.drag;SV.drag=null;if(!d||!d.on)return;
  SV.ate=true;setTimeout(()=>{SV.ate=false;},0);
  d.p.classList.remove('svdrag');document.body.classList.remove('svdragging');$('#svCol').classList.remove('svdrop');
  const col=$('#svCol').getBoundingClientRect(),key=d.p.dataset.svkey;
  if(e.clientX>=col.left&&e.clientX<=col.right)svSet(key,{float:null});
  else{const r=d.p.getBoundingClientRect();svSet(key,{float:{x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width)}});}}
// ---- the stage: badge, source, focus ----
function svSecName(tab){const b=document.querySelector(`nav.rail button[data-tab="${tab}"]`);
  return b?[...b.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim():tab;}
function svBadge(){const b=$('#svBadge');if(!b)return;const tab=typeof curTab!=='undefined'?curTab:'solve';
  b.dataset.sec=tab;svText($('#svBadgeSec'),svSecName(tab));
  const drill=$('#drillNote')&&!$('#drillNote').classList.contains('hidden')?($('#drillName')||{}).textContent:'';
  svText($('#svBadgeSub'),drill?'Drill: '+drill:(($('#seqLabel')||{}).textContent||''));
  $$('.svsheet').forEach(p=>{svText(svHost(p).querySelector(':scope>.svbar .svsub'),svSub(p));});}
function svSrc(){const n=$('#svSrcName');if(!n)return;const id=typeof smartLive==='function'&&smartLive()?'smart':typeof cubeSrc==='function'?cubeSrc():'mine';
  n.textContent=typeof cubeSrcName==='function'?cubeSrcName(id):'Regular cube';$('#svSrc').dataset.src=id;}
// The timer's class tells the phase: insp (inspection), run (the solve); ready is a held Space.
function svTimer(){if(!SV.on)return;const t=$('#timer');if(!t)return;const c=t.className;
  const ph=/\binsp\b/.test(c)?'inspect':/\brun\b/.test(c)?'solve':/\bready\b/.test(c)?SV.phase:'';
  if(SV.phase==='solve'&&ph==='')svSolved(t.textContent.trim());
  else if(ph)svBigDraw(ph,t.textContent.trim());
  if(ph!==SV.phase){SV.phase=ph;svFocus(ph);}}
function svFocus(ph){if(ph)document.body.dataset.svfocus=ph;else delete document.body.dataset.svfocus;
  if(!ph&&!$('#svBig.svsolved'))svBigClose();}
function svBigDraw(ph,text){const g=$('#svBig');if(!g)return;g.hidden=false;g.className='svbig sv'+ph;
  if(ph==='inspect'){const n=parseFloat(text),f=isFinite(n)?Math.max(0,Math.min(1,n/15)):0,C=2*Math.PI*60;
    g.innerHTML=`<div class="svglass svcard svinsp"><div class="sveb">Inspection</div>
      <svg viewBox="0 0 140 140" aria-hidden="true"><circle cx="70" cy="70" r="60" class="svring0"/><circle cx="70" cy="70" r="60" class="svring" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C*(1-f)).toFixed(1)}" transform="rotate(-90 70 70)"/><text x="70" y="70" text-anchor="middle" dominant-baseline="central">${svEsc(text)}</text></svg>
      <div class="muted">Hold <span class="kbd">space</span>, then let go to start the timer.</div></div>`;}
  else g.innerHTML=`<div class="svclock"><div class="svtime">${svEsc(text)}</div><div class="muted">Press <span class="kbd">space</span> to stop</div></div>`;}
function svSolved(text){const g=$('#svBig');if(!g)return;const best=($('#stBest')||{}).textContent,ao5=($('#stAo5')||{}).textContent;
  g.hidden=false;g.className='svbig svsolved';
  g.innerHTML=`<div class="svglass svcard svwin" role="status"><div class="svwin-h">${SV_ICON.check}Solved!</div><div class="svwin-t">${svEsc(text)}</div>
    <div class="row" style="justify-content:center;gap:8px">${best&&best===text?'<span class="svpill good">Your best</span>':''}${ao5&&ao5!=='—'?`<span class="svpill">ao5 ${svEsc(ao5)}</span>`:''}</div>
    <div class="row" style="justify-content:center;gap:8px;margin-top:6px"><button type="button" class="primary" data-sv="next" title="A new scramble">Next scramble<span class="hk" aria-hidden="true">N</span></button><button type="button" data-sv="close" title="Close this card">Close<span class="hk" aria-hidden="true">Esc</span></button></div></div>`;}
function svBigClose(){const g=$('#svBig');if(g){g.hidden=true;g.innerHTML='';g.className='svbig';}}
// ---- wiring ----
function svInit(){const t=$('#timer');
  if(t&&typeof MutationObserver==='function'){SV.obs=new MutationObserver(svTimer);SV.obs.observe(t,{attributes:true,attributeFilter:['class'],childList:true,characterData:true,subtree:true});}
  // A module may write a panel again: its strip comes back on the next frame.
  if(typeof MutationObserver==='function'){const m=$('main.main');if(m)new MutationObserver(()=>{if(!SV.on||SV.raf)return;
    SV.raf=requestAnimationFrame(()=>{SV.raf=0;svSheets();svBadge();});}).observe(m,{childList:true,subtree:true});}
  ['cw:tab','cw:method'].forEach(n=>document.addEventListener(n,()=>{svApply();svBigClose();}));
  ['cw:sequence','cw:scramble'].forEach(n=>document.addEventListener(n,()=>{if(SV.on){svBadge();if(!SV.phase)svBigClose();}}));
  document.addEventListener('cw:cubesrc',()=>{svSrc();svAskDraw();});document.addEventListener('cw:smart',svSrc);
  document.addEventListener('keydown',e=>{if(!SV.on||!$('#svBig.svsolved'))return;
    if(e.key==='Escape'){svBigClose();e.stopPropagation();}else if(e.key===' ')svBigClose();},true);
  if(typeof matchMedia==='function'){const q=matchMedia('(max-width: 760px)');if(q&&q.addEventListener)q.addEventListener('change',svApply);}
  addEventListener('resize',()=>{if(SV.on)svSheets();});
  document.addEventListener('change',e=>{if(e.target&&e.target.id==='setStage'){store.set('stageView',e.target.checked);svApply();}});
  svApply();}
svInit();
