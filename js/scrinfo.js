// ===== Scramble Info =====
// The scramble, from any section: "Scramble Info" on the stage's step badge (js/stageview.js), and
// on the scramble pill where the stage is off. A hover shows a small pane; a click keeps it open.
// The pane has the scramble's moves and seed, a seed box, New scramble, Restore scramble and
// Speedy Solve. Restore scramble takes the cube where it is now back to the scramble; Speedy Solve
// takes it to solved, with no question first. How depends on the cube:
//   Virtual cube: the pane closes and the player turns the moves fast (siRun).
//   Smart cube: the pane closes and a Current Moves sheet lists the moves at the top of the column.
//     Each turn of the cube ticks them off; a turn off the list gives new moves from there.
//   Regular cube: the pane asks where the cube is: It's solved, or Scan or paint. Then the Current
//     Moves sheet lists the moves, and the player holds them to step through.
// siPath (pure) finds the moves: a whole-cube turn first where the centers differ, then face turns.
// Every text put in markup here goes through siEsc; moves are the engine's own move names.
var SI={pane:null,anchor:null,pinned:false,t:0,sub:'',cur:null,run:null}; // var: tests read it
// The 24 ways to hold the cube, as whole-cube turns from white up, green front.
const SI_ROTS=(()=>{const out=[];for(const a of ['','x','x2',"x'",'z',"z'"])for(const b of ['','y','y2',"y'"])out.push([a,b].filter(Boolean));return out;})();
// The turn that puts the centers of `from` where those of `to` are.
function siRotTo(from,to){const k=to.center.join();return SI_ROTS.find(R=>applyAlg(from,R).center.join()===k)||null;}
// Moves that take `from` to `to`: a whole-cube turn when the centers differ, then face turns.
function siPath(from,to){const R=siRotTo(from,to);if(!R)return null;const f=applyAlg(from,R);
  const rest=typeof resyncReturn==='function'?resyncReturn(f,to):null;return rest?[...R,...rest]:null;}
// Solved, held as `c` is held.
function siSolvedLike(c){const R=SI_ROTS.find(r=>applyAlg(new Cube(),r).center.join()===c.center.join());return applyAlg(new Cube(),R||[]);}
// What the player shows for the scramble: the scramble, then the turn to the solving grip.
function siScrambleShown(){const r=typeof crossRotation==='function'?crossRotation():'';return applyAlg(scr.cube,r?[r]:[]);}
function siSrc(){return typeof smartLive==='function'&&smartLive()?'smart':typeof cubeSrc==='function'?cubeSrc():'mine';}
function siEsc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
// ---- the pane ----
function siPaneHTML(){
  const code=scr.moves.length?scr.moves.join(' '):'Solved: no moves';
  const drill=seqState.drill?`<div class="sidrill"><span>The player shows a drill: <b>${siEsc(seqState.drill)}</b>.</span><button type="button" class="small" data-si="back" title="Put your scramble back in the player">Back to scramble</button></div>`:'';
  return `<div class="sihead"><span class="sveb">Scramble</span><span class="muted">seed</span><b class="mono" id="siSeed">${siEsc(scr.seed||'—')}</b></div>
    <div class="sicode mono" id="siCode" title="The moves of the scramble, white on top and green in front">${siEsc(code)}</div>
    ${drill}<div class="sibody" id="siBody">${siSubHTML()}</div>`;}
function siSubHTML(){const s=SI.sub;
  if(s==='restore'){const src=siSrc();
    if(src==='screen')return `<p>Turn the virtual cube back to the scramble from where it is now.</p><div class="siacts"><button type="button" class="primary" data-si="go-restore" title="Turn the virtual cube back to the scramble, fast">Restore</button><button type="button" data-si="cancel" title="Keep the cube as it is">Cancel</button></div>`;
    if(src==='smart')return `<p>Show the moves that take your smart cube back to the scramble.</p><div class="siacts"><button type="button" class="primary" data-si="go-restore" title="List the moves in the column">Show the moves</button><button type="button" data-si="cancel" title="Keep the cube as it is">Cancel</button></div>`;
    return siAskHTML('restore');}
  if(s==='speedy')return siAskHTML('speedy');
  if(s==='read-restore'||s==='read-speedy')return `<p>Show the page your cube.</p><div class="siacts"><button type="button" class="primary" data-si="scan-${s.slice(5)}" title="Read the cube with the camera">Scan with the camera</button><button type="button" data-si="paint-${s.slice(5)}" title="Click each color onto a map">Paint the colors</button><button type="button" data-si="cancel" title="Go back">Cancel</button></div>`;
  return `<div class="siacts"><button type="button" class="primary" data-si="new" title="A new WCA scramble">New scramble<span class="hk" aria-hidden="true">N</span></button><button type="button" data-si="restore" title="Take your cube from where it is now back to this scramble">Restore scramble</button><button type="button" data-si="speedy" title="Take your cube to solved">Speedy Solve</button></div>
    <div class="siseed"><input id="siSeedIn" placeholder="seed name" title="Type any word for its WCA scramble. The same word always gives the same scramble" spellcheck="false" autocomplete="off"><button type="button" class="small" data-si="seed" title="Load the scramble of this seed name">Go</button></div>`;}
function siAskHTML(kind){return `<p>Where is your cube now?</p><div class="siacts"><button type="button" class="primary" data-si="solved-${kind}" title="Your cube is solved">It's solved</button><button type="button" data-si="read-${kind}" title="Scan your cube, or paint its colors">Scan or paint</button><button type="button" data-si="cancel" title="Go back">Cancel</button></div>`;}
function siDraw(){if(!SI.pane)return;SI.pane.innerHTML=siPaneHTML();
  const inp=SI.pane.querySelector('#siSeedIn');if(inp)inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();siAct('seed');}e.stopPropagation();});}
function siPlace(){const p=SI.pane,a=SI.anchor;if(!p||!a)return;const r=a.getBoundingClientRect();
  p.style.left=Math.max(8,Math.min(r.left,innerWidth-p.offsetWidth-8))+'px';p.style.top=Math.round(r.bottom+6)+'px';}
function siOpen(anchor,pin){clearTimeout(SI.t);SI.anchor=anchor;
  if(!SI.pane){const p=document.createElement('div');p.id='siPane';p.className='sipane svglass';p.setAttribute('role','dialog');p.setAttribute('aria-label','Scramble Info');
    p.addEventListener('click',e=>{const b=e.target.closest('[data-si]');if(b){e.stopPropagation();siAct(b.dataset.si);}});
    p.addEventListener('mouseenter',()=>clearTimeout(SI.t));p.addEventListener('mouseleave',siLeave);
    document.body.appendChild(p);SI.pane=p;SI.sub='';siDraw();}
  if(pin)SI.pinned=true;anchor.setAttribute('aria-expanded','true');siPlace();}
function siClose(){clearTimeout(SI.t);if(SI.pane)SI.pane.remove();SI.pane=null;SI.pinned=false;SI.sub='';
  if(SI.anchor)SI.anchor.setAttribute('aria-expanded','false');}
function siLeave(){if(SI.pinned)return;clearTimeout(SI.t);SI.t=setTimeout(()=>{if(!SI.pinned)siClose();},280);}
// Hover shows the pane; a click keeps it open; a second click closes it.
function siMount(el){if(!el||el.dataset.si)return;el.dataset.si='1';el.setAttribute('aria-haspopup','dialog');el.setAttribute('aria-expanded','false');
  el.addEventListener('mouseenter',()=>{clearTimeout(SI.t);if(SI.pane&&SI.anchor===el)return;SI.t=setTimeout(()=>siOpen(el,false),120);});
  el.addEventListener('mouseleave',siLeave);
  el.addEventListener('click',e=>{e.stopPropagation();if(SI.pane&&SI.anchor===el&&SI.pinned)siClose();else siOpen(el,true);});}
function siAct(a){
  if(a==='new'){siClose();newScramble();return;}
  if(a==='back'){siClose();showForTab();return;}
  if(a==='seed'){const v=(SI.pane.querySelector('#siSeedIn')||{}).value;if(!v||!v.trim())return;siClose();newScramble(v.trim());return;}
  if(a==='cancel'){SI.sub='';siDraw();return;}
  if(a==='restore'){SI.pinned=true;SI.sub='restore';siDraw();return;}
  if(a==='speedy'){const src=siSrc();if(src==='mine'){SI.pinned=true;SI.sub='speedy';siDraw();return;}siClose();siGo('speedy');return;}
  if(a==='go-restore'){siClose();siGo('restore');return;}
  if(a.startsWith('read-')){SI.sub=a;siDraw();return;}
  const m=a.match(/^(solved|scan|paint)-(restore|speedy)$/);if(!m)return;siClose();
  if(m[1]==='solved'){siRegular(m[2],new Cube());return;}
  const back=c=>siRegular(m[2],c);
  if(m[1]==='scan')openScan({onCube:back});else openPaint({onCube:back});}
// ---- the moves ----
// kind: restore (to the scramble) or speedy (to solved).
function siGo(kind){const src=siSrc();
  if(src==='smart'){const st=typeof cubeTab!=='undefined'&&cubeTab.target;if(!st){if(typeof openSmart==='function')openSmart();return;}
    const to=kind==='restore'?scr.cube:new Cube();siCurOpen({kind,src,from:st,to,moves:siPath(st,to)||[]});return;}
  if(src==='screen'){const from=cubeAtSeq(seqState.idx),to=kind==='restore'?siScrambleShown():siSolvedLike(from);siRun(kind,from,to);}}
// A regular cube read as `from`: the moves on the Current Moves sheet, and on the player to step.
// From solved, the way back to the scramble is the scramble itself.
function siRegular(kind,from){const to=kind==='restore'?scr.cube:new Cube(),moves=kind==='restore'&&from.isSolved()?scr.moves.slice():siPath(from,to)||[];
  siCurOpen({kind,src:'mine',from,to,moves});
  setSequence(moves,kind==='restore'?'back to the scramble':'speedy solve',from,kind==='restore'?'Back to the scramble':'Solved cube');
  seqState.idx=0;applySequence();}
// The virtual cube: the moves turn on the player, fast. A key pressed meanwhile stops the run where it is.
function siRun(kind,from,to){siStop();const moves=siPath(from,to);if(!moves)return;
  setSequence(moves,kind==='restore'?'back to the scramble':'speedy solve',from,kind==='restore'?'Back to the scramble':'Solved cube');seqState.idx=0;applySequence();
  const R={kind,timer:0};SI.run=R;anim.quick=110;
  const end=()=>{siStop();if(kind==='restore')showForTab();};
  const step=()=>{if(SI.run!==R)return;if(seqState.idx>=seqState.moves.length){end();return;}seqState.idx++;applySequence();R.timer=setTimeout(step,140);};
  R.timer=setTimeout(step,moves.length?160:0);}
function siStop(){if(SI.run){clearTimeout(SI.run.timer);SI.run=null;}anim.quick=0;}
// ---- Current Moves: a sheet at the top of the column (or under the scramble pill) ----
function siCurOpen(c){SI.cur=Object.assign({done:0,half:false,finished:c.moves.length===0},c);siCurDraw();}
function siCurClose(){SI.cur=null;const el=$('#siCur');if(el)el.remove();}
function siCurHost(){const col=$('#svCol');if(col&&document.body.classList.contains('sv'))return {at:col,first:true};const pill=$('#scrPill');return pill?{at:pill,after:true}:null;}
function siCurDraw(){const c=SI.cur;let el=$('#siCur');if(!c){if(el)el.remove();return;}
  if(!el){el=document.createElement('section');el.id='siCur';el.className='panel svcur';el.setAttribute('aria-live','polite');
    el.addEventListener('click',e=>{const b=e.target.closest('[data-cur]');if(b)siCurClose();});}
  const h=siCurHost();if(h){if(h.first&&h.at.firstElementChild!==el)h.at.prepend(el);else if(h.after&&h.at.nextElementSibling!==el)h.at.after(el);}
  const title=c.kind==='restore'?'Restore current scramble':'Speedy Solve',fc=seqFaceColors(c.from,c.moves);
  const tiles=c.moves.map((m,i)=>`<span class="m${fc[i]>=0?' fc c'+fc[i]:''}${i<c.done?' done':''}${i===c.done&&c.half?' half':''}">${fmtMove(m)}</span>`).join(' ');
  const left=c.moves.length-c.done;
  const line=c.finished?(c.kind==='restore'?'Done. Your cube is at the scramble.':'Done. Your cube is solved.')
    :c.src==='smart'?`${left} move${left===1?'':'s'} to go. Turn your cube: each move ticks off.`
    :'Make these moves on your cube, white on top and green in front. The player steps through them.';
  el.innerHTML=`<div class="svbar svcurbar"><span class="svname">Current Moves</span><button type="button" class="svib" data-cur="close" title="Close Current Moves" aria-label="Close">${typeof SV_ICON!=='undefined'?SV_ICON.close:'✕'}</button></div>
    <p class="sicurt"><b><i>${title}</i></b></p>${c.moves.length?`<div class="scramble sicurm">${tiles}</div>`:''}<p class="muted sicurl">${siEsc(line)}</p>
    ${c.src==='smart'?'':`<div class="row"><button type="button" class="small" data-cur="done" title="Close Current Moves">Done</button></div>`}`;}
// A smart cube turned: tick off the moves it made; a turn off the list gives new moves from there.
function siCurSmart(d){const c=SI.cur;if(!c||c.src!=='smart'||c.finished||!d||!d.to)return;const st=d.to;
  if(st.equals(c.to)){c.done=c.moves.length;c.half=false;c.finished=true;siCurDraw();setTimeout(()=>{if(SI.cur===c)siCurClose();},4000);return;}
  let at=c.from;
  for(let k=0;k<=c.moves.length;k++){const m=c.moves[k];
    if(k>=c.done){if(at.equals(st)){c.done=k;c.half=false;siCurDraw();return;}
      if(m&&m.endsWith('2')&&(applyAlg(at,[m[0]]).equals(st)||applyAlg(at,[m[0]+"'"]).equals(st))){c.done=k;c.half=true;siCurDraw();return;}}
    if(m)at=applyAlg(at,[m]);}
  c.from=st;c.moves=siPath(st,c.to)||[];c.done=0;c.half=false;siCurDraw();}
if(typeof document!=='undefined'){
  document.addEventListener('cw:smartmoves',e=>siCurSmart(e.detail||{}));
  document.addEventListener('cw:smart',e=>{const t=e.detail&&e.detail.type;if((t==='disconnect'||t==='gone')&&SI.cur&&SI.cur.src==='smart')siCurClose();});
  document.addEventListener('cw:yourmove',e=>{if(SI.run&&e.detail&&e.detail.src==='screen')siStop();});
  document.addEventListener('cw:scramble',()=>{siStop();if(SI.cur&&SI.cur.kind==='restore')siCurClose();if(SI.pane)siDraw();});
  document.addEventListener('cw:sequence',()=>{if(SI.pane&&!SI.sub)siDraw();});
  document.addEventListener('click',e=>{if(SI.pane&&!e.target.closest('#siPane')&&!(SI.anchor&&SI.anchor.contains(e.target)))siClose();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&SI.pane){e.stopPropagation();siClose();}},true);
  addEventListener('resize',siPlace);
  siMount($('#scrPillInfo'));
}
