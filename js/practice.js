// ===== Beginner mode: Practice (one step at a time) and Progress =====
// Fills #tab-practice and #tab-progress at load. Loads after beginner-ui.js, learn.js, guide.js
// and paint.js. Defines startPractice(n): go to Practice, choose step n, New cube.
// Data: BEGINNER_STEPS, BEGINNER_ALGS (js/beginner.js), solveBeginner, heldCube(),
// begProgress, stBtn, cycleStatus (js/beginner-ui.js and js/app.js). Every dynamic string goes
// through esc(); this file writes only trusted, escaped markup via innerHTML, as every other
// beginner-mode module does (no build step, no templating library, a static site).

// practiceState: the practice cube for the chosen step, built from the current scramble.
// step: 1..8. built: a practice cube exists. seed/scrMoves: the scramble it was built from.
// prefix: the moves for steps 1..step-1, already done, with z2 where the top changes.
// parts: the chosen step's parts. partCubes: the cube before each part, partSeqs: its moves with
// the turn-over and the hold first, so a row click can set the player up correctly.
const practiceState={step:Math.min(8,Math.max(1,+store.get('practiceStep',1)||1)),built:false,
  revealed:false,plan:null,prefix:[],parts:[],partCubes:[],partSeqs:[],seed:'',scrMoves:[]};
let prOwnScramble=false;

// ---------- building the practice cube ----------
function prBuild(n){
  let plan=null;try{plan=begPack().solve(heldCube());}catch(e){plan=null;}
  if(!plan){practiceState.built=false;return;}
  const prefix=[];let up=begPack().startUp; // the top of heldCube()
  for(const st of plan.stages){
    if(st.n>=n)break;
    for(const p of st.parts){if(p.up!==up){prefix.push('z2');up=p.up;}if(p.pre)prefix.push(...parseAlg(p.pre));prefix.push(...p.moves);}
  }
  const stage=plan.stages.find(st=>st.n===n);
  const parts=stage?stage.parts:[];
  let cube=applyAlg(heldCube(),prefix);
  const partCubes=[],partSeqs=[];
  for(const p of parts){const seq=[];if(p.up!==up){seq.push('z2');up=p.up;}if(p.pre)seq.push(...parseAlg(p.pre));seq.push(...p.moves);
    partCubes.push(cube);partSeqs.push(seq);cube=applyAlg(cube,seq);}
  Object.assign(practiceState,{step:n,plan,prefix,parts,partCubes,partSeqs,seed:scr.seed,scrMoves:scr.moves.slice(),
    revealed:false,built:true});
}

// ---------- the player ----------
function prShowPlayer(){
  const g=practiceState;if(!g.built)return;
  const moves=[...g.scrMoves,...begPack().heldMoves,...g.prefix];
  const done=g.step>1?'steps 1 to '+(g.step-1):'the hold only';
  setSequence(moves,'your mixed-up cube · seed '+g.seed+' · dashed moves are solved for you: '+done+'.');
  $$('#scramble .m').forEach((el,i)=>{if(i>=g.scrMoves.length){el.classList.add('rot');el.title='Solved for you, not a scramble move.';}});
}
tabShow.practice=()=>{if(practiceState.built)prShowPlayer();else showScr();};

// ---------- the moves of one part, as tiles with the guide's algorithms boxed ----------
function prTiles(p){
  let out='';const chunks=p.chunks||[];
  for(let i=0;i<p.moves.length;i++){
    const ch=chunks.find(c=>c.at===i);
    if(ch){out+=`<span class="trig"><b class="lbl">${esc(ch.label)}</b>${p.moves.slice(i,i+ch.len).map(m=>`<span class="m">${fmtMove(m)}</span>`).join('')}</span>`;i+=ch.len-1;}
    else out+=`<span class="m">${fmtMove(p.moves[i])}</span>`;
  }
  return `<span class="ms">${out}</span>`;
}
function prRowHTML(p,i){
  return `<div class="pr-row" data-i="${i}" tabindex="0" role="button" title="Show this part in the player">
    <b>${esc(p.title)}</b><div class="muted" style="font-size:14px">${esc(p.text)}</div>
    <div style="margin-top:6px">${prTiles(p)}</div></div>`;
}

// ---------- the Practice tab ----------
function prStepSelHTML(){
  const pk=begPack();return Array.from({length:pk.count},(_,i)=>i+1).map(n=>{
    const label=n+' '+pk.steps[n].name.replace(/^The /,'');
    return `<button type="button" class="${n===practiceState.step?'on':''}" data-n="${n}">${esc(label)}</button>`;
  }).join('');
}
function prRenderStepSel(){
  const el=$('#prSteps');if(!el)return;
  el.innerHTML=prStepSelHTML();
  $$('#prSteps button').forEach(b=>b.onclick=()=>{prSelectStep(+b.dataset.n);});
}
function prRenderPanel(){
  const g=practiceState,n=g.step,st=begPack().steps[n];
  let html=`<h3>Goal</h3><p>${esc(st.goal)}</p>`;
  if(!g.built)html+='<p class="muted">Press New cube to begin.</p>';
  else if(!g.revealed)html+='<p class="muted">Moves hidden. Press Reveal.</p>';
  else if(!g.parts.length)html+='<p class="muted">Already done on this cube.</p>';
  else html+=g.parts.map((p,i)=>prRowHTML(p,i)).join('');
  const panel=$('#prGoal');if(!panel)return;
  panel.innerHTML=html;
  $$('#prGoal .pr-row').forEach(el=>{
    const go=()=>{const i=+el.dataset.i,p=g.parts[i];
      setSequence(g.partSeqs[i],'practice · step '+n+' · '+p.title,g.partCubes[i]);
      seqState.idx=0;applySequence();focusPlayer();};
    el.onclick=go;el.onkeydown=e=>{if(e.key==='Enter')go();};
  });
}
function prRebuild(){
  prBuild(practiceState.step);prRenderStepSel();prRenderPanel();
  if(curTab==='practice')prShowPlayer();
}
function prSelectStep(n){practiceState.step=Math.min(begPack().count,n);store.set('practiceStep',practiceState.step);prRebuild();}
function prNewCube(){prOwnScramble=true;newScramble();prOwnScramble=false;prRebuild();}

function prMountPractice(){
  const t=$('#tab-practice');if(!t)return;
  t.innerHTML=`<div class="panel"><h2>Practice one step</h2>
    <p class="muted" style="margin:4px 0 0">Pick a step. The app scrambles a cube and solves every step before it for you. You do the step on your cube. Reveal shows the moves.</p></div>
  <div class="panel"><div class="status-sel" id="prSteps"></div></div>
  <div class="panel row" style="gap:8px">
    <button class="primary" id="prNew">New cube</button>
    <button id="prReveal">Reveal</button>
    <button id="prSolved">Solved it</button>
  </div>
  <div class="panel" id="prGoal"></div>`;
  prRenderStepSel();prRenderPanel();
  $('#prNew').onclick=()=>prNewCube();
  $('#prReveal').onclick=()=>{practiceState.revealed=!practiceState.revealed;prRenderPanel();};
  $('#prSolved').onclick=()=>{begProgress.practiced(practiceState.step);prNewCube();};
}

// Go to Practice, choose step n, and start with a new cube.
function startPractice(n){
  goTab('practice');practiceState.step=Math.min(begPack().count,Math.max(1,Math.round(+n)||1));
  store.set('practiceStep',practiceState.step);prNewCube();
}

document.addEventListener('cw:scramble',()=>{
  if(prOwnScramble)return;
  if(curTab==='practice')prRebuild();
  else practiceState.built=false;
});

// ---------- the Progress tab ----------
function prProgressTableHTML(){
  const data=begProgress.data();
  return begPack().steps.map(s=>{const n=s.n,times=data.steps[n]||0;
    return `<tr><td class="mono">${n===0?'Basics':n}</td><td><a href="#" class="pr-stepname" data-n="${n}">${esc(s.name)}</a></td><td>${stBtn(begStatusId(n))}</td><td class="mono">${times}</td></tr>`;}).join('');
}
function prRenderProgress(){
  const sq=$('#prSq');if(!sq)return;const pk=begPack();
  sq.innerHTML=Array.from({length:pk.count},(_,i)=>{const n=i+1,s=begProgress.status(n);
    return `<i class="${s}" title="Step ${n}: ${esc(pk.steps[n].name)}, ${s||'unlearned'}"></i>`;}).join('');
  sq.setAttribute('aria-label',`The ${pk.word} steps`);
  const {finished,learning}=begProgress.counts();
  $('#prText').textContent=finished===pk.count?`All ${pk.word} steps finished.`:finished||learning?
    `${finished} step${finished===1?'':'s'} finished${learning?`, ${learning} in learning`:''}.`:'No steps finished yet.';
  const data=begProgress.data();
  $('#prSolves').textContent=data.solves;$('#prPract').textContent=data.practiced;
  const nx=begProgress.next();$('#prNext').textContent=nx?begStepLabel(nx):pk.next.text;
  const body=$('#prTable tbody');if(body){body.innerHTML=prProgressTableHTML();
    $$('#prTable .pr-stepname').forEach(el=>el.onclick=e=>{e.preventDefault();if(typeof openLesson==='function')openLesson(+el.dataset.n);});}
}
function prResetProgress(){
  const pk=begPack();Object.keys(llState.status).forEach(k=>{if(k.startsWith(pk.prefix))delete llState.status[k];});
  store.set('llStatus',llState.status);
  const data=begProgress.data();data.solves=0;data.practiced=0;data.steps={};
  store.set(pk.prog,data);
  prRenderProgress();
  document.dispatchEvent(new CustomEvent('cw:status',{detail:begStatusId(0)}));
}
function prMountProgress(){
  const t=$('#tab-progress');if(!t)return;
  t.innerHTML=`<div class="panel">
    <h2>Progress</h2>
    <div class="psq" id="prSq" aria-label="The eight steps"></div>
    <div id="prText" style="font-size:14px"></div>
    <div class="ptiles"><div><span class="muted">cubes solved</span><br><b id="prSolves">0</b></div><div><span class="muted">rounds practiced</span><br><b id="prPract">0</b></div></div>
    <div style="font-size:14px"><b>Up next:</b> <span id="prNext"></span></div>
  </div>
  <div class="panel"><div class="wide"><table id="prTable"><thead><tr><th>Step</th><th>Name</th><th>Status</th><th>Times practiced</th></tr></thead><tbody></tbody></table></div></div>
  <div class="panel">
    <h3>Timer</h3>
    <p>Ready to go faster? Time your solves. The timer shows in the player. Times save like in CFOP.</p>
    <button id="prTimer">Time my solves</button>
    <p class="muted" style="font-size:13px">Hold space, then release, to start the timer. On a phone, tap the time.</p>
  </div>
  <div class="panel">
    <h3>Start over</h3>
    <p class="muted" style="margin:0 0 8px">Reset every step to unlearned and the counts to zero.</p>
    <button id="prReset">Reset beginner progress</button>
  </div>`;
  prRenderProgress();
  $('#prTimer').onclick=()=>showBegTimer(true);
  $('#prReset').onclick=()=>askConfirm('Reset beginner progress?',
    'Every step goes back to unlearned and the counts go to zero. Your times and scrambles stay.',
    'Reset',prResetProgress);
}
document.addEventListener('cw:status',e=>{if(/^(beg-|mini-|master-)/.test(String(e.detail)))prRenderProgress();});
// Another method: its own steps in the picker and the table; a practice cube is built on demand.
document.addEventListener('cw:method',()=>{practiceState.built=false;practiceState.step=Math.min(begPack().count,practiceState.step);prRenderStepSel();prRenderPanel();prRenderProgress();});
document.addEventListener('cw:tab',e=>{if(e.detail==='progress')prRenderProgress();});

prMountPractice();
prMountProgress();
