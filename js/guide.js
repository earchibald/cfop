// ===== Beginner mode: Solve my cube =====
// Two views in #tab-bsolve. The entry view: the "What does your cube look like?" cards from
// beghome.js (scan, paint, mix it up, practice on the screen) and "Start with this scramble". The
// guide view: solveBeginner(heldCube()) shown one part at a time, with a stage bar, the steps in
// plain words, the moves, and Done / Show me. The cube starts white up. Every part says which center
// is on top (part.up): yellow for the daisy and the cross, white for the white corners, yellow from
// the middle layer on. Where that changes, the part begins with z2, the turn-over, as its own dashed
// tile, as the guide's own "flip your cube over" instruction.
// Globals: startGuide() (go to this tab and start the guided solve on the current scramble),
// guideState (the state, for tests). Every string from data goes through esc().

const GD_CENTRES=[4,13,22,31,40,49];
// view: 'entry' | 'guide' | 'done'. parts: the plan flattened, each with its stage and the cube before it.
const guideState={view:'entry',plan:null,parts:[],i:0,total:0,counted:false,showPlan:false,msg:''};
let gdArrived=false;

const gdFaceMoves=ms=>ms.filter(m=>m&&!/^[xyz]/.test(m)).length;

// ---------- the plan ----------
function gdBuild(){
  const g=guideState;g.plan=null;g.parts=[];g.i=0;g.total=0;g.counted=false;g.showPlan=false;g.msg='';
  let plan=null;try{plan=begPack().solve(heldCube());}catch(e){plan=null;}
  if(!plan||!plan.solved){g.view='entry';g.msg='The app cannot find a solve for this cube. Check the colors, then scan or paint the cube again.';return false;}
  // The cube starts white up. A part whose top differs from the cube so far turns it over (z2) first.
  let c=scr.cube,done=0,up='white';
  for(const st of plan.stages)st.parts.forEach((p,k)=>{
    const flip=p.up!==up;const before=c;if(flip){c=applyAlg(c,['z2']);up=p.up;}
    const hold=parseAlg(p.pre||'');const seq=[...(flip?['z2']:[]),...hold,...p.moves];const held=applyAlg(c,hold);
    c=applyAlg(c,[...hold,...p.moves]);
    g.parts.push({stage:st,k,m:st.parts.length,part:p,seq,before,held,after:c,done,flip});done+=gdFaceMoves(p.moves);
  });
  g.total=done;g.plan=plan;g.view=g.parts.length?'guide':'done';
  if(g.view==='done')gdCount();
  return true;
}
function gdCount(){if(!guideState.counted){guideState.counted=true;begProgress.solved();}}

// ---------- pieces and pictures ----------
function gdFindPiece(f,piece){
  const tbl=piece.type==='corner'?cornerFacelet:edgeFacelet;const key=piece.colors.slice().sort().join();
  for(let i=0;i<tbl.length;i++)if(tbl[i].map(x=>f[x]).sort().join()===key)return {i,fl:tbl[i]};
  return null;
}
// The facelets to keep bright: the piece this part moves and the six centers. null lights all.
function gdLit(cube,piece){if(!piece)return null;const p=gdFindPiece(cube.toFacelets(),piece);return p?new Set([...p.fl,...GD_CENTRES]):null;}
function gdThumb(cube,piece){const fade=gdLit(cube,piece);return `<svg viewBox="40 30 320 300" role="img">${renderCube3D(cube.toFacelets(),{yaw:-32,pitch:28,scale:48,fade})}</svg>`;}

// Why this part uses these moves: the guide's own words for its algorithm. null when there is nothing to add.
function gdWhy(e){
  const a=e.part.alg&&begPack().algs[e.part.alg];if(!a)return null;
  return {h:'Why these moves?',t:`${a.why?a.why+' ':''}Say it as: ${a.say}.`};
}

// The moves as tiles: the turn-over and the hold change dashed first, the guide's algorithms boxed with their name.
function gdTiles(p,flip){
  let out=flip?'<span class="m gd-rot" title="Turn the whole cube over">z2</span>':'';
  for(const r of parseAlg(p.pre||''))out+=`<span class="m gd-rot" title="Turn the whole cube">${fmtMove(r)}</span>`;
  for(let i=0;i<p.moves.length;i++){
    const ch=p.chunks.find(c=>c.at===i);
    if(ch){out+=`<span class="trig"><b>${esc(ch.label)}</b>${p.moves.slice(i,i+ch.len).map(m=>`<span class="m">${fmtMove(m)}</span>`).join('')}</span>`;i+=ch.len-1;}
    else out+=`<span class="m">${fmtMove(p.moves[i])}</span>`;
  }
  return `<span class="ms big gd-moves">${out}</span>`;
}

// ---------- the player ----------
function gdLabel(e){return 'solve · stage '+e.stage.n+' · '+e.part.title;}
// Load the current part at its first move: the 3D cube shows the cube before the part.
// force: load it even when a drill shows (an explicit start of the guide).
function gdLoadPart(force){
  const g=guideState;if(curTab!=='bsolve')return;
  if(seqState.drill&&!force)return;
  if(g.view==='entry'){showScr();return;}
  if(g.view==='done'){setSequence([...begPack().heldMoves,...g.plan.moves],'solve · the whole plan',scr.cube);return;}
  const e=g.parts[g.i];setSequence(e.seq,gdLabel(e),e.before);seqState.idx=0;applySequence();
  // Light the piece this part moves. With a whole-cube turn first, the piece moves with the turn: skip it.
  if(!e.part.pre&&!e.flip){const lit=gdLit(e.before,e.part.piece);if(lit)showCube(cubeAtSeq(0),lit);}
}
function gdShowMe(){
  const e=guideState.parts[guideState.i];if(!e)return;
  setSequence(e.seq,gdLabel(e),e.before);seqState.idx=0;applySequence();focusPlayer();startAuto();
}
tabShow.bsolve=()=>gdLoadPart(false);

// ---------- views ----------
function gdStageBar(){
  const g=guideState,pk=begPack();const cur=g.view==='guide'?g.parts[g.i].stage.n:pk.count+1;
  return `<div class="stagebar" id="gdBar" aria-label="The ${pk.word} stages">${g.plan.stages.map(st=>{
    const done=st.n<cur||!st.parts.length;const on=st.n===cur;
    return `<button class="stage${done&&!on?' done':''}${on?' cur':''}" data-n="${st.n}" title="Stage ${st.n}: ${esc(st.name)}${st.parts.length?'':'. Already done on this cube.'}"><i></i>${st.n} ${esc(pk.short[st.n-1])}</button>`;}).join('')}</div>`;
}
function gdPlanList(){
  const g=guideState;
  return g.plan.stages.map(st=>`<h3 class="gd-ph">Stage ${st.n} · ${esc(st.name)}</h3>`+(st.parts.length?st.parts.map(p=>{
    const i=g.parts.findIndex(e=>e.part===p);const on=i===g.i&&g.view==='guide';const done=i<g.i||g.view==='done';
    return `<button class="gd-prow${on?' cur':''}${done&&!on?' done':''}" data-i="${i}"><span class="mono muted">${i+1}</span><span>${esc(p.title)}</span><span class="muted">${gdFaceMoves(p.moves)} moves</span></button>`;}).join(''):'<p class="muted gd-pnone">Already done on this cube.</p>')).join('');
}
function gdEntryHTML(){
  const g=guideState;
  return `<div class="panel"><h2>Solve my cube</h2><p class="muted">Show the app your cube. It then tells you each move, part by part.</p>${g.msg?`<div class="notice gd-msg">${esc(g.msg)}</div>`:''}</div>
  <div class="panel beg-ask">${typeof begYourCubeHTML==='function'?begYourCubeHTML():''}</div>
  <div class="panel gd-now"><div><b>Loaded a mix-up as letters?</b><div class="muted">Mix-up <span class="mono" id="gdSeed">${esc(scr.seed)}</span> is loaded now.</div></div><button id="gdStart">Start with this scramble</button></div>`;
}
function gdGuideHTML(){
  const g=guideState,pk=begPack();const e=g.parts[g.i];const p=e.part;const st=e.stage;
  const col=COLOR_NAMES[e.held.center[2]];
  const topNote=pk.topNote[st.n]||'';
  const hold=pk.holdLine?`<li>${pk.holdLine(e)}${topNote&&(e.flip||e.k===0)?' '+esc(topNote):''}</li>`
    :e.flip?`<li><b>Turn the cube over</b> so the ${esc(p.up)} center is on top${p.pre?'':` and <b>${esc(col)} in front</b>`}.${topNote?' '+topNote:''}${p.pre?` Then turn the whole cube so ${esc(col)} faces you. The dashed moves are these turns.`:' The dashed move is this turn.'}</li>`
    :`<li><b>Hold the cube</b> with ${esc(p.up)} up and <b>${esc(col)} in front</b>.${p.pre?` Turn the whole cube so ${esc(col)} faces you. The dashed move is this turn.`:' The 3D cube shows this view.'}</li>`;
  const why=gdWhy(e);
  const next=g.parts[g.i+1];
  const lesson=typeof openLesson==='function'?`<button class="small ghost" id="gdLesson">Open the lesson</button>`:'';
  const plan=g.showPlan?'Hide the whole plan':'Show the whole plan';
  return `<div class="panel">${gdStageBar()}</div>
  <div class="panel gd-solve">
    <div class="gd-line"><div><b id="gdWhere">Stage ${st.n} of ${pk.count} · ${esc(st.name)} · part ${e.k+1} of ${e.m}</b><div class="muted" id="gdCount">${e.done} moves done, about ${g.total-e.done} to go.</div></div>
      <div class="row"><button class="small ghost" id="gdPlanBtn" aria-expanded="${g.showPlan}">${plan}</button><button class="small ghost" id="gdDiff">My cube looks different</button></div></div>
    ${g.showPlan?`<div class="gd-plan" id="gdPlan">${gdPlanList()}</div>`:''}
  </div>
  <div class="panel gd-part">
    <div class="gd-head"><div><div class="muted mono gd-sub">Stage ${st.n} · part ${e.k+1} of ${e.m}</div><h2 id="gdTitle">${esc(p.title)}</h2></div>${lesson}</div>
    <div class="gd-body">
      <ol class="gd-steps">${hold}<li>${esc(p.text)}</li><li><b>Do the moves:</b><div>${gdTiles(p,e.flip)}</div></li></ol>
      <div class="gd-side">
        <div class="gd-ba"><figure>${gdThumb(e.held,p.piece)}<figcaption class="muted">before</figcaption></figure><span class="gd-arrow" aria-hidden="true">→</span><figure>${gdThumb(e.after,p.piece)}<figcaption class="muted">after</figcaption></figure></div>
        ${why?`<div class="note"><b>${esc(why.h)}</b> ${esc(why.t)}</div>`:''}
      </div>
    </div>
    <div class="gd-actions"><button class="big primary" id="gdDone">${next?'Done, next part →':'Done, last part →'}</button><button class="big" id="gdShow">▷ Show me on the cube</button><button class="ghost" id="gdPrev"${g.i?'':' disabled'}>← Previous part</button>
      <span class="muted gd-lost">Lost? Press <b>My cube looks different</b> and scan or paint it again.</span></div>
  </div>
  <div class="panel gd-next" id="gdNext">${next?`<div><b>Coming up:</b> ${esc(next.part.title)}.</div>${next.stage!==st?`<div class="muted">Stage ${next.stage.n} next: ${esc(next.stage.name.replace(/^The /,'the '))}.</div>`:''}`:'<div><b>Coming up:</b> nothing. This is the last part. After it, the cube is solved.</div>'}</div>`;
}
function gdDoneHTML(){
  const g=guideState;const plan=g.showPlan?'Hide the whole plan':'Show the whole plan';
  return `<div class="panel">${gdStageBar()}</div>
  <div class="panel gd-win" id="gdWin"><h2>You did it</h2><p>Your cube is solved.</p><p class="muted">${g.total} moves in ${g.parts.length} parts.</p>
    <div class="row"><button class="big primary" id="gdAgain">Solve again</button><button class="big" id="gdCfop">Try ${esc(begPack().next.name)}</button><button class="ghost" id="gdPlanBtn">${plan}</button></div>
    ${g.showPlan?`<div class="gd-plan" id="gdPlan">${gdPlanList()}</div>`:''}</div>`;
}
function gdRender(){
  const g=guideState;const root=$('#tab-bsolve');if(!root)return;
  const html=g.view==='guide'?gdGuideHTML():g.view==='done'?gdDoneHTML():gdEntryHTML();
  root.innerHTML=html;
  const on=(sel,fn)=>{const el=root.querySelector(sel);if(el)el.onclick=fn;};
  on('#gdStart',()=>gdBegin());
  on('#gdDiff',gdToEntry);
  on('#gdAgain',gdToEntry);
  on('#gdCfop',()=>setMethod(begPack().next.method));
  on('#gdPlanBtn',()=>{g.showPlan=!g.showPlan;gdRender();});
  on('#gdDone',()=>gdGo(g.i+1));
  on('#gdPrev',()=>gdGo(g.i-1));
  on('#gdShow',gdShowMe);
  on('#gdLesson',()=>{const e=g.parts[g.i];if(e&&typeof openLesson==='function')openLesson(e.stage.n);});
  root.querySelectorAll('#gdBar .stage').forEach(b=>b.onclick=()=>{
    if(!b.classList.contains('done'))return;const n=+b.dataset.n;const i=g.parts.findIndex(e=>e.stage.n===n);if(i>=0)gdGo(i);});
  root.querySelectorAll('.gd-prow').forEach(b=>b.onclick=()=>gdGo(+b.dataset.i));
}

// ---------- moves between parts and views ----------
function gdGo(i){
  const g=guideState;if(!g.plan||i<0)return;
  if(i>=g.parts.length){g.view='done';g.showPlan=false;gdCount();gdRender();gdLoadPart(false);return;}
  g.i=i;g.view='guide';gdRender();gdLoadPart(false);
  if(curTab==='bsolve'&&mobileMQ.matches){const r=$('#tab-bsolve');if(r&&r.scrollIntoView)r.scrollIntoView({block:'start'});}
}
// Build the plan on the current scramble and show part 1. force (default true): load the player
// even over a drill, because the user asked for this guide.
function gdBegin(force){
  gdArrived=false;
  gdBuild();gdRender();gdLoadPart(force!==false);
}
function gdToEntry(){const g=guideState;g.view='entry';g.plan=null;g.parts=[];g.i=0;g.msg='';gdRender();gdLoadPart(false);}

// Go to Solve my cube and start the guided solve on the current scramble.
function startGuide(){
  gdBuild();
  if(curTab!=='bsolve')goTab('bsolve');
  gdRender();gdLoadPart(true);
}

document.addEventListener('cw:scramble',()=>{
  const g=guideState;const fromDialog=!!document.querySelector('.modal-bg'); // the scan or paint dialog
  if(curTab!=='bsolve'){
    // scrambleFromCube loads the scramble, then opens this tab at once: start the guide there.
    if(isBeg()){gdArrived=true;setTimeout(()=>{gdArrived=false;},0);}
    if(g.view!=='entry'){gdBuild();gdRender();}
    return;
  }
  // A cube from the scan or paint dialog, or a new scramble from the seed bar while a guide shows:
  // start at part 1.
  if(fromDialog||g.view!=='entry'){gdBegin(fromDialog);return;}
  const s=$('#gdSeed');if(s)s.textContent=scr.seed;
});
document.addEventListener('cw:tab',e=>{
  if(e.detail!=='bsolve')return;
  if(gdArrived){gdBegin();return;}
  gdRender();
});

gdRender();
// Another method: back to the entry view; its own plan is built when the guide starts.
document.addEventListener('cw:method',()=>{const g=guideState;if(g.view==='entry')return;g.view='entry';g.plan=null;g.parts=[];g.i=0;g.msg='';gdRender();});
