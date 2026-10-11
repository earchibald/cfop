// ===== Beginner mode: Solve my cube =====
// Two views in #tab-bsolve. The entry view: three ways to get a real cube in (scan, paint,
// scramble) and "Start with this scramble". The guide view: solveBeginner(heldCube()) shown one
// part at a time, with a stage bar, the steps in plain words, the moves, and Done / Show me.
// Globals: startGuide() (go to this tab and start the guided solve on the current scramble),
// guideState (the state, for tests). Every string from data goes through esc().

const GD_SHORT=['Daisy','White cross','White corners','Middle layer','Yellow cross','Yellow face','Yellow corners','Yellow edges'];
const GD_CENTRES=[4,13,22,31,40,49];
// view: 'entry' | 'guide' | 'done'. parts: the plan flattened, each with its stage and the cube before it.
const guideState={view:'entry',plan:null,parts:[],i:0,total:0,counted:false,showPlan:false,msg:''};
let gdWant=false,gdWantTimer=0,gdArrived=false;

const gdFaceMoves=ms=>ms.filter(m=>m&&!/^[xyz]/.test(m)).length;

// ---------- the plan ----------
function gdBuild(){
  const g=guideState;g.plan=null;g.parts=[];g.i=0;g.total=0;g.counted=false;g.showPlan=false;g.msg='';
  let plan=null;try{plan=solveBeginner(heldCube());}catch(e){plan=null;}
  if(!plan||!plan.solved){g.view='entry';g.msg='The app cannot find a solve for this cube. Check the colours, then scan or paint the cube again.';return false;}
  let c=heldCube(),done=0;
  for(const st of plan.stages)st.parts.forEach((p,k)=>{
    const seq=[p.pre,...p.moves].filter(Boolean);const before=c;const held=p.pre?applyAlg(before,[p.pre]):before;
    c=applyAlg(c,seq);
    g.parts.push({stage:st,k,m:st.parts.length,part:p,seq,before,held,after:c,done});done+=gdFaceMoves(p.moves);
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
// The facelets to keep bright: the piece this part moves and the six centres. null lights all.
function gdLit(cube,piece){if(!piece)return null;const p=gdFindPiece(cube.toFacelets(),piece);return p?new Set([...p.fl,...GD_CENTRES]):null;}
function gdThumb(cube,piece){const fade=gdLit(cube,piece);return `<svg viewBox="40 30 320 300" role="img">${renderCube3D(cube.toFacelets(),{yaw:-32,pitch:28,scale:48,fade})}</svg>`;}

// One sentence on why this part uses these moves. null when there is nothing to add.
function gdWhy(e){
  const p=e.part;
  if(p.trigger){
    const ch=p.chunks[0];const c1=applyAlg(e.held,p.moves.slice(0,ch?ch.at:0));const f=c1.toFacelets();const w=f[31];
    const pc=p.piece&&gdFindPiece(f,p.piece);
    if(pc&&(pc.i===0||pc.i===1)&&f[pc.fl[0]]!==w){
      const right=pc.i===0;const tile=f[right?20:18];const side=right?'right':'left';
      return {h:'Why this trigger?',t:`The ${COLOR_NAMES[tile]} tile is at the top ${side} of its face, so the ${side} hand does it.`};
    }
    if(pc&&pc.i<4)return {h:'Why this trigger?',t:'White faces up. Two Right Triggers turn the corner so white faces out.'};
    return {h:'Why this trigger?',t:'The corner is in the wrong spot. A Right Trigger lifts it out to the top layer.'};
  }
  if(p.move){
    const pc=p.piece&&gdFindPiece(e.held.toFacelets(),p.piece);
    if(pc&&pc.i>=8)return {h:'Why this move?',t:'The edge is stuck in the middle layer. A Move Right with a yellow edge pushes it out.'};
    return {h:'Why this move?',t:`The top colour matches the ${p.move} centre, so the edge goes to the ${p.move}.`};
  }
  if(p.alg&&BEGINNER_ALGS[p.alg]){const a=BEGINNER_ALGS[p.alg];return {h:'Why this move?',t:`This is the ${a.name.toLowerCase()} algorithm. Say it as one phrase: ${a.say}.`};}
  return null;
}

// The moves as tiles: the hold change dashed first, the triggers boxed with their name.
function gdTiles(p){
  let out=p.pre?`<span class="m gd-rot" title="Turn the whole cube">${fmtMove(p.pre)}</span>`:'';
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
  if(g.view==='done'){setSequence(g.plan.moves,'solve · the whole plan',heldCube());return;}
  const e=g.parts[g.i];setSequence(e.seq,gdLabel(e),e.before);seqState.idx=0;applySequence();
  // Light the piece this part moves. With a hold change first, the piece moves with the turn: skip it.
  if(!e.part.pre){const lit=gdLit(e.before,e.part.piece);if(lit)showCube(cubeAtSeq(0),lit);}
}
function gdShowMe(){
  const e=guideState.parts[guideState.i];if(!e)return;
  setSequence(e.seq,gdLabel(e),e.before);seqState.idx=0;applySequence();focusPlayer();startAuto();
}
tabShow.bsolve=()=>gdLoadPart(false);

// ---------- views ----------
function gdStageBar(){
  const g=guideState;const cur=g.view==='guide'?g.parts[g.i].stage.n:9;
  return `<div class="stagebar" id="gdBar" aria-label="The eight stages">${g.plan.stages.map(st=>{
    const done=st.n<cur||!st.parts.length;const on=st.n===cur;
    return `<button class="stage${done&&!on?' done':''}${on?' cur':''}" data-n="${st.n}" title="Stage ${st.n}: ${esc(st.name)}${st.parts.length?'':'. Already done on this cube.'}"><i></i>${st.n} ${esc(GD_SHORT[st.n-1])}</button>`;}).join('')}</div>`;
}
function gdPlanList(){
  const g=guideState;
  return g.plan.stages.map(st=>`<h3 class="gd-ph">Stage ${st.n} · ${esc(st.name)}</h3>`+(st.parts.length?st.parts.map(p=>{
    const i=g.parts.findIndex(e=>e.part===p);const on=i===g.i&&g.view==='guide';const done=i<g.i||g.view==='done';
    return `<button class="gd-prow${on?' cur':''}${done&&!on?' done':''}" data-i="${i}"><span class="mono muted">${i+1}</span><span>${esc(p.title)}</span><span class="muted">${gdFaceMoves(p.moves)} moves</span></button>`;}).join(''):'<p class="muted gd-pnone">Already done on this cube.</p>')).join('');
}
function gdEntryHTML(){
  const g=guideState;
  const paintOk=typeof openPaint==='function';
  const net=`<span class="gd-net" aria-hidden="true">${[null,3,null,null,4,2,1,5,null,0,null,null].map(c=>c==null?'<span></span>':`<span class="face">${Array.from({length:9},(_,k)=>`<i class="${k===4?'WRGYOB'[c]:''}"></i>`).join('')}</span>`).join('')}</span>`;
  return `<div class="panel"><h2>Solve my cube</h2><p class="muted">Show the app your cube. It then tells you each move, part by part. Pick the way that suits you.</p>${g.msg?`<div class="notice gd-msg">${esc(g.msg)}</div>`:''}</div>
  <div class="bcards">
    <div class="panel pick"><svg class="gd-ic" viewBox="0 0 48 36" aria-hidden="true"><rect x="3" y="8" width="42" height="25" rx="5"/><path d="M16 8l3-5h10l3 5"/><circle cx="24" cy="20" r="7"/></svg>
      <h3>Scan with the camera</h3><p class="muted">Hold each face up to the camera. It takes about a minute. You need a webcam or a phone camera.</p>
      <button class="primary" id="gdScan">Scan cube</button></div>
    <div class="panel">${net}
      <h3>Paint the colours</h3><p class="muted">Tap the colours onto a flat map of the cube. This works on every device. The app checks that the cube is possible.</p>
      <button id="gdPaint"${paintOk?'':' disabled title="Not built yet"'}>Paint my cube</button></div>
    <div class="panel"><svg class="gd-ic" viewBox="0 0 48 36" aria-hidden="true"><path d="M4 9h9c8 0 14 18 22 18h9M38 22l6 5-6 5M4 27h9c3 0 5-2 7-5M28 13c2-2 4-4 7-4h9M38 4l6 5-6 5"/></svg>
      <h3>No cube to hand?</h3><p class="muted">Practise on the screen. The app scrambles a cube for you. You solve it with the same steps.</p>
      <button id="gdRandom">Scramble one for me</button></div>
  </div>
  <div class="panel gd-now"><div><b>Or solve the cube in the player now</b><div class="muted">Scramble <span class="mono" id="gdSeed">${esc(scr.seed)}</span> is in the player.</div></div><button id="gdStart">Start with this scramble</button></div>`;
}
function gdGuideHTML(){
  const g=guideState;const e=g.parts[g.i];const p=e.part;const st=e.stage;
  const col=COLOR_NAMES[e.held.center[2]];
  const hold=`<li><b>Hold the cube</b> with yellow up and <b>${esc(col)} in front</b>.${p.pre?` Turn the whole cube so ${esc(col)} faces you. The dashed move is this turn.`:' The 3D cube shows this view.'}</li>`;
  const why=gdWhy(e);
  const next=g.parts[g.i+1];
  const lesson=typeof openLesson==='function'?`<button class="small ghost" id="gdLesson">Open the lesson</button>`:'';
  const plan=g.showPlan?'Hide the whole plan':'Show the whole plan';
  return `<div class="panel">${gdStageBar()}</div>
  <div class="panel gd-solve">
    <div class="gd-line"><div><b id="gdWhere">Stage ${st.n} of 8 · ${esc(st.name)} · part ${e.k+1} of ${e.m}</b><div class="muted" id="gdCount">${e.done} moves done, about ${g.total-e.done} to go.</div></div>
      <div class="row"><button class="small ghost" id="gdPlanBtn" aria-expanded="${g.showPlan}">${plan}</button><button class="small ghost" id="gdDiff">My cube looks different</button></div></div>
    ${g.showPlan?`<div class="gd-plan" id="gdPlan">${gdPlanList()}</div>`:''}
  </div>
  <div class="panel gd-part">
    <div class="gd-head"><div><div class="muted mono gd-sub">Stage ${st.n} · part ${e.k+1} of ${e.m}</div><h2 id="gdTitle">${esc(p.title)}</h2></div>${lesson}</div>
    <div class="gd-body">
      <ol class="gd-steps">${hold}<li>${esc(p.text)}</li><li><b>Do the moves:</b><div>${gdTiles(p)}</div></li></ol>
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
    <div class="row"><button class="big primary" id="gdAgain">Solve again</button><button class="big" id="gdCfop">Try CFOP</button><button class="ghost" id="gdPlanBtn">${plan}</button></div>
    ${g.showPlan?`<div class="gd-plan" id="gdPlan">${gdPlanList()}</div>`:''}</div>`;
}
function gdRender(){
  const g=guideState;const root=$('#tab-bsolve');if(!root)return;
  const html=g.view==='guide'?gdGuideHTML():g.view==='done'?gdDoneHTML():gdEntryHTML();
  root.innerHTML=html;
  const on=(sel,fn)=>{const el=root.querySelector(sel);if(el)el.onclick=fn;};
  on('#gdScan',()=>gdEnter(()=>openScan()));
  on('#gdPaint',()=>{if(typeof openPaint==='function')gdEnter(()=>openPaint());});
  on('#gdRandom',()=>{gdWant=true;newScramble();});
  on('#gdStart',()=>gdBegin());
  on('#gdDiff',gdToEntry);
  on('#gdAgain',gdToEntry);
  on('#gdCfop',()=>setMethod('cfop'));
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
  gdClearWant();gdArrived=false;
  gdBuild();gdRender();gdLoadPart(force!==false);
}
function gdToEntry(){const g=guideState;g.view='entry';g.plan=null;g.parts=[];g.i=0;g.msg='';gdRender();gdLoadPart(false);}
// Scan and paint load a scramble later, from a dialog. The guide starts when it arrives.
// When the dialog closes with no cube, the wait ends.
function gdEnter(fn){
  gdWant=true;fn();
  clearInterval(gdWantTimer);
  gdWantTimer=setInterval(()=>{if(!document.querySelector('.modal-bg'))gdClearWant();},500);
}
function gdClearWant(){gdWant=false;clearInterval(gdWantTimer);gdWantTimer=0;}

// Go to Solve my cube and start the guided solve on the current scramble.
function startGuide(){
  gdClearWant();gdBuild();
  if(curTab!=='bsolve')goTab('bsolve');
  gdRender();gdLoadPart(true);
}

document.addEventListener('cw:scramble',()=>{
  const g=guideState;
  if(curTab!=='bsolve'){
    // scrambleFromCube loads the scramble, then opens this tab at once: start the guide there.
    if(method==='beginner'){gdArrived=true;setTimeout(()=>{gdArrived=false;},0);}
    if(g.view!=='entry'){gdBuild();gdRender();}
    return;
  }
  // From an entry card, or a new scramble from the seed bar while a guide shows: restart at part 1.
  if(gdWant||g.view!=='entry'){gdBegin(gdWant);return;}
  const s=$('#gdSeed');if(s)s.textContent=scr.seed;
});
document.addEventListener('cw:tab',e=>{
  if(e.detail!=='bsolve'){gdClearWant();return;}
  if(gdArrived){gdBegin();return;}
  gdRender();
});

gdRender();
