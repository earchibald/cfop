// ===== Beginner mode: Solve my cube =====
// Views in #tab-bsolve. The entry view: how the app learns the cube, by the cube in use (a regular
// cube: mix it up with me, scan or paint; the virtual cube: a mix-up; a smart cube: connect), and
// "Start with the mix-up that is loaded". The mix view: Mix it up with me (js/beghome.js draws it
// into #begMix). The guide view: solveBeginner(heldCube()) shown one part at a time, with a stage
// bar, the hold, the steps in plain words, the moves, and Done / Show me. The cube starts white up,
// as the basics hold it. Every part says which center is on top (part.up): yellow for the daisy and
// the cross, white for the white corners, yellow from the middle layer on. Where that changes, the
// guide stops on a turn-over screen of its own (an entry with turn: true): the cube turns over (z2)
// on the picture, again and again, with the new top in large words. The part after it starts
// already turned over.
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
  // The cube starts white up. Before a part whose top differs from the cube so far, a turn-over
  // entry: z2, on a screen of its own. The part then starts turned over.
  let c=scr.cube,done=0,up='white';
  for(const st of plan.stages)st.parts.forEach((p,k)=>{
    if(p.up!==up){const before=c;c=applyAlg(c,['z2']);
      g.parts.push({turn:true,stage:st,k,m:st.parts.length,part:p,from:up,to:p.up,seq:['z2'],before,held:c,after:c,done,flip:false});up=p.up;}
    const hold=parseAlg(p.pre||'');const before=c;const held=applyAlg(c,hold);
    c=applyAlg(c,[...hold,...p.moves]);
    g.parts.push({stage:st,k,m:st.parts.length,part:p,seq:[...hold,...p.moves],before,held,after:c,done,flip:false});done+=gdFaceMoves(p.moves);
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
function gdLit(cube,piece){if(!piece||cube.isFour)return null;const p=gdFindPiece(cube.toFacelets(),piece);return p?new Set([...p.fl,...GD_CENTRES]):null;}
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

// ---------- the hold ----------
const GD_COLOR_KEY={white:'W',yellow:'Y',green:'G',blue:'B',red:'R',orange:'O'};
const gdCap=w=>w?w[0].toUpperCase()+w.slice(1):'';
// The color toward you as held: the front center. A 2×2 or a 4×4 state has no fixed centers: ''.
function gdFrontWord(cube){return cube&&cube.center&&!cube.isFour?COLOR_NAMES[cube.center[2]]||'':'';}
// The hold in large words with a square of each color: "Yellow on top · Green toward you".
function gdHoldBadge(up,front){const sq=c=>`<i class="gd-holdsq" style="--sec:var(--sticker-${GD_COLOR_KEY[c]||'W'})" aria-hidden="true"></i>`;
  return `<div class="gd-hold" aria-label="Hold the cube with ${esc(up)} on top${front?', '+esc(front)+' toward you':''}">${sq(up)}<b>${esc(gdCap(up))} on top</b>${front?`<span class="muted">·</span>${sq(front)}<b>${esc(gdCap(front))} toward you</b>`:''}</div>`;}
// The turn-over in two small pictures, for the entry: white on top, then yellow on top.
function gdFlipPics(){const c=new Cube(),pic=(x,l)=>`<svg viewBox="40 30 320 300" role="img" aria-label="${l}">${renderCube3D(x.toFacelets(),{yaw:-32,pitch:28,scale:48,n:3})}</svg>`;
  return `<span class="st-flip">${pic(c,'White on top')}<b aria-hidden="true">→</b>${pic(applyAlg(c,['z2']),'Yellow on top')}</span>`;}

// ---------- the turn-over screen ----------
// The cube on the screen turns over (z2) as a slow whole-cube turn, rests, and does it again until
// the user goes on. gdTurnRun stops an older loop.
let gdTurnRun=0;
function gdTurnDraw(box,cube,t){box.innerHTML=`<svg viewBox="20 10 360 340" aria-hidden="true">${renderCube3D(cube.toFacelets(),{yaw:-32,pitch:28,scale:52,move:t>0&&t<1?'z2':null,t})}</svg>`;}
function gdTurnPlay(){
  const g=guideState,e=g.parts[g.i],box=$('#gdTurnCube');if(!e||!e.turn||!box)return;const run=++gdTurnRun;
  const live=()=>run===gdTurnRun&&box.isConnected&&curTab==='bsolve';
  gdTurnDraw(box,e.before,0);
  if(typeof requestAnimationFrame!=='function'||reducedMotion()){setTimeout(()=>{if(live())gdTurnDraw(box,e.after,0);},900);return;}
  const once=()=>{if(!live())return;gdTurnDraw(box,e.before,0);
    setTimeout(()=>{if(!live())return;const t0=performance.now(),dur=1500;
      const step=()=>{if(!live())return;const x=Math.min(1,(performance.now()-t0)/dur);
        if(x>=1){gdTurnDraw(box,e.after,0);setTimeout(once,2200);return;}
        gdTurnDraw(box,e.before,0.5-0.5*Math.cos(Math.PI*x));requestAnimationFrame(step);};
      requestAnimationFrame(step);},700);};
  once();
}
function gdTurnHTML(){
  const g=guideState,pk=begPack(),e=g.parts[g.i],st=e.stage,front=gdFrontWord(e.held);
  const first=!g.parts.slice(0,g.i).some(x=>x.turn),note=pk.topNote[st.n]||'';
  const lead=first&&e.from==='white'?`You hold the cube white on top, as in the basics. The solve works with ${esc(e.to)} on top. Turn the whole cube over before the first move.`
    :`Stage ${st.n} works with ${esc(e.to)} on top. Turn the whole cube over before its first move.`;
  return `<div class="panel">${gdStageBar()}</div>
  <div class="panel gd-turn" id="gdTurn">
    <div class="gd-turnpic"><div class="gd-turncube" id="gdTurnCube" role="img" aria-label="The cube turns over: ${esc(e.from)} on top, then ${esc(e.to)} on top"></div><span class="muted">The picture turns the whole cube over, again and again.</span></div>
    <div class="gd-turnbody"><span class="st-lbl">Before stage ${st.n} · ${esc(st.name)}</span><h2 id="gdTitle">Turn it over: ${esc(e.to)} on top</h2><p>${lead}</p>
      ${gdHoldBadge(e.to,front)}
      <ul class="st-rules"><li><b>${esc(gdCap(e.to))} goes on top.</b> ${esc(gdCap(e.from))} goes to the bottom.</li>${front?`<li><b>${esc(gdCap(front))} stays toward you.</b> Turn the cube over like a wheel, top over the right side.</li>`:''}${note?`<li>${esc(note)}</li>`:''}<li>The move letters say <b class="mono">z2</b> for this turn.</li></ul>
      <div class="gd-actions"><button class="big primary" id="gdDone" title="The cube is turned over: go to the next part">${esc(gdCap(e.to))} is on top →</button><button class="big" id="gdShow" title="Turn the cube over on the picture again">▷ Show me the turn again</button><button class="ghost" id="gdPrev"${g.i?'':' disabled'} title="Go back one part">← Previous part</button></div></div>
  </div>`;
}

// ---------- the player ----------
function gdLabel(e){return e.turn?'solve · turn the cube over: '+e.to+' on top':'solve · stage '+e.stage.n+' · '+e.part.title;}
// Load the current part at its first move: the 3D cube shows the cube before the part.
// force: load it even when a drill shows (an explicit start of the guide).
function gdLoadPart(force){
  const g=guideState;if(curTab!=='bsolve')return;
  if(seqState.drill&&!force)return;
  if(g.view==='entry'){showScr();return;}
  if(g.view==='done'){setSequence([...begPack().heldMoves,...g.plan.moves],'solve · the whole plan',scr.cube);return;}
  const e=g.parts[g.i];
  // The turn-over screen has its own large picture: no player above it, so it is the first thing in view.
  if(e.turn){if(typeof setBegView==='function')setBegView('home');return;}
  setSequence(e.seq,gdLabel(e),e.before);seqState.idx=0;applySequence();
  // Light the piece this part moves. With a whole-cube turn first, the piece moves with the turn: skip it.
  if(!e.turn&&!e.part.pre&&!e.flip){const lit=gdLit(e.before,e.part.piece);if(lit)showCube(cubeAtSeq(0),lit);}
}
function gdShowMe(){
  const e=guideState.parts[guideState.i];if(!e)return;if(e.turn){gdTurnPlay();return;}
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
    const i=g.parts.findIndex(e=>e.part===p&&!e.turn);const on=i===g.i&&g.view==='guide';const done=i<g.i||g.view==='done';
    return `<button class="gd-prow${on?' cur':''}${done&&!on?' done':''}" data-i="${i}" title="Go to part ${i+1} of the solve"><span class="mono muted">${i+1}</span><span>${esc(p.title)}</span><span class="muted">${gdFaceMoves(p.moves)} moves</span></button>`;}).join(''):'<p class="muted gd-pnone">Already done on this cube.</p>')).join('');
}
// The entry: how the app learns the cube, for the cube in use. Mix it up with me takes the place
// of the cards while it runs (#begMix).
function gdEntryCards(){
  const pk=begPack(),src=typeof cubeSrc==='function'?cubeSrc():'mine',n=puzzleN();
  const card=(tag,name,text,acts)=>`<div class="st-card st-ready"><span class="tag">${tag}</span><b>${name}</b><span>${text}</span><span class="spacer"></span><div class="row">${acts}</div></div>`;
  if(src==='screen')return card('virtual cube','A mixed-up virtual cube','The app mixes up the virtual cube, then tells you every move. The keyboard or the numeric keypad turns it.','<button class="primary" data-beg="screen" title="Mix up the virtual cube and solve it with the app">Mix it up and solve it →</button>')
    +card('a cube in your hands','Have a regular cube?','Change the cube in the top bar. The app then asks how to learn your cube.','<button data-gd="cube" title="Choose the cube: regular, virtual or smart">Change the cube</button>');
  if(src==='smart'){const live=typeof smartLive==='function'&&smartLive();
    return card('smart cube',live?'Your smart cube is connected':'Connect your smart cube',live?'The app reads the cube. Use this cube starts the solve on it.':typeof smartHowWords==='function'?smartHowWords():'','<button class="primary" data-gd="smart" title="Open the smart cube window">'+(live?'Use this cube →':'Connect my cube →')+'</button>');}
  const scanOk=pk.scan&&typeof openScan==='function',paintOk=typeof openPaint==='function';
  return card('new, or solved','It is solved','Mix it up with me. I say each turn, one at a time. Hold it white on top, green toward you.','<button class="primary" data-beg="mix" title="The app says each turn of a mix-up, one at a time">Mix it up with me →</button>')
    +card('mixed up','It is mixed up',scanOk?'Show it to the app. The camera reads each face, or you paint the colors on a map.':`Show it to the app: paint the ${6*n*n} stickers on a map.`,
      (scanOk?'<button class="primary" data-beg="scan" title="Show each face of your cube to the camera">Scan it with the camera</button>':'')+`<button${scanOk?'':' class="primary"'} data-beg="paint"${paintOk?'':' disabled'} title="Tap the colors of your cube onto a map">Paint its colors</button>`);
}
function gdEntryHTML(){
  const g=guideState;
  if(typeof begMix==='object'&&begMix.on)return `<div class="panel beg-mix" id="begMix"></div>`;
  return `<div class="panel gd-entry"><div class="gd-entryhead"><h2>Solve my cube with help</h2><p>The app tells you every move, part by part. First it needs to know your cube.</p></div>${g.msg?`<div class="notice gd-msg">${esc(g.msg)}</div>`:''}
    <div class="st-two">${gdEntryCards()}</div>
    ${puzzleN()===3?`<div class="st-box st-flipnote">${gdFlipPics()}<div><b>The solve starts with yellow on top.</b><span>You mix it up and scan it white on top. Before the first move the app stops and shows you the turn: yellow on top.</span></div></div>`:''}
    <div class="gd-now muted">Typed a mix-up, or took one from the cube menu? Mix-up <span class="mono" id="gdSeed">${esc(scr.seed)}</span> is loaded now. <button class="st-link" id="gdStart" title="Start the guided solve on the mix-up that is loaded">Start with this scramble</button></div></div>`;
}
function gdGuideHTML(){
  const g=guideState,pk=begPack();const e=g.parts[g.i];const p=e.part;const st=e.stage;
  const col=e.held.center?COLOR_NAMES[e.held.center[2]]:''; // a 4×4 state has no centers; its pack writes its own hold line
  const topNote=pk.topNote[st.n]||'';
  const hold=pk.holdLine?`<li>${pk.holdLine(e)}${topNote&&(e.flip||e.k===0)?' '+esc(topNote):''}</li>`
    :e.flip?`<li><b>Turn the cube over</b> (z2) so the ${esc(p.up)} center is on top${p.pre?'':` and <b>${esc(col)} in front</b>`}.${topNote?' '+topNote:''}${p.pre?` Then turn the whole cube so the ${esc(col)} center faces you (${esc(p.pre)}). The dashed moves are these turns.`:' The dashed move is this turn.'}</li>`
    :`<li><b>Hold the cube</b> with ${esc(p.up)} up and <b>${esc(col)} in front</b>.${p.pre?` Turn the whole cube so the ${esc(col)} center faces you (${esc(p.pre)}). The dashed move is this turn.`:' The 3D cube shows this view.'}</li>`;
  const why=gdWhy(e);
  const next=g.parts[g.i+1];
  const lesson=typeof openLesson==='function'?`<button class="small ghost" id="gdLesson" title="Open the lesson for this stage">Open the lesson</button>`:'';
  const plan=g.showPlan?'Hide the whole plan':'Show the whole plan';const planTip=g.showPlan?'Hide the list of every part':'List every part of the solve. A click goes to that part';
  return `<div class="panel">${gdStageBar()}</div>
  <div class="panel gd-solve">
    <div class="gd-line"><div><b id="gdWhere">Stage ${st.n} of ${pk.count} · ${esc(st.name)} · part ${e.k+1} of ${e.m}</b><div class="muted" id="gdCount">${e.done} moves done, about ${g.total-e.done} to go.</div></div>
      <div class="row"><button class="small ghost" id="gdPlanBtn" aria-expanded="${g.showPlan}" title="${planTip}">${plan}</button><button class="small ghost" id="gdDiff" title="Start over: scan or paint your cube again">My cube looks different</button></div></div>
    ${g.showPlan?`<div class="gd-plan" id="gdPlan">${gdPlanList()}</div>`:''}
  </div>
  <div class="panel gd-part">
    <div class="gd-head"><div><div class="muted mono gd-sub">Stage ${st.n} · part ${e.k+1} of ${e.m}</div><h2 id="gdTitle">${esc(p.title)}</h2></div>${lesson}</div>
    ${p.up?gdHoldBadge(p.up,col):''}
    <div class="gd-body">
      <ol class="gd-steps">${hold}${p.short?`<li>${esc(p.short)}<div>${gdTiles(p,e.flip)}</div></li>`:`<li>${esc(p.text)}</li><li><b>Do the moves:</b><div>${gdTiles(p,e.flip)}</div></li>`}</ol>
      <div class="gd-side">
        <div class="gd-ba"><figure>${gdThumb(e.held,p.piece)}<figcaption class="muted">before</figcaption></figure><span class="gd-arrow" aria-hidden="true">→</span><figure>${gdThumb(e.after,p.piece)}<figcaption class="muted">after</figcaption></figure></div>
        ${why?`<div class="note"><b>${esc(why.h)}</b> ${esc(why.t)}</div>`:''}
      </div>
    </div>
    <div class="gd-actions"><button class="big primary" id="gdDone" title="${next?'The moves are made: go to the next part':'The moves are made: the cube is solved'}">${next?'Done, next part →':'Done, last part →'}</button><button class="big" id="gdShow" title="Play the moves of this part on the screen cube">▷ Show me on the cube</button><button class="ghost" id="gdPrev"${g.i?'':' disabled'} title="Go back one part">← Previous part</button>
      <span class="muted gd-lost">Lost? Press <b>My cube looks different</b> and scan or paint it again.</span></div>
  </div>
  <div class="panel gd-next" id="gdNext">${next?`<div><b>Coming up:</b> ${esc(next.part.title)}.</div>${next.stage!==st?`<div class="muted">Stage ${next.stage.n} next: ${esc(next.stage.name.replace(/^The /,'the '))}.</div>`:''}`:'<div><b>Coming up:</b> nothing. This is the last part. After it, the cube is solved.</div>'}</div>`;
}
function gdDoneHTML(){
  const g=guideState;const plan=g.showPlan?'Hide the whole plan':'Show the whole plan';const planTip=g.showPlan?'Hide the list of every part':'List every part of the solve';
  return `<div class="panel">${gdStageBar()}</div>
  <div class="panel gd-win" id="gdWin"><h2>You did it</h2><p>Your cube is solved.</p><p class="muted">${g.total} moves in ${g.parts.length} parts.</p>
    <div class="row"><button class="big primary" id="gdAgain" title="Back to the start: show the app a new cube">Solve again</button><button class="big" id="gdCfop" title="Switch the method to ${esc(begPack().next.name)}">Try ${esc(begPack().next.name)}</button><button class="ghost" id="gdPlanBtn" title="${planTip}">${plan}</button></div>
    ${g.showPlan?`<div class="gd-plan" id="gdPlan">${gdPlanList()}</div>`:''}</div>`;
}
function gdRender(){
  const g=guideState;const root=$('#tab-bsolve');if(!root)return;
  const turn=g.view==='guide'&&g.parts[g.i].turn;
  const html=g.view==='guide'?(turn?gdTurnHTML():gdGuideHTML()):g.view==='done'?gdDoneHTML():gdEntryHTML();
  root.innerHTML=html;
  if(turn)gdTurnPlay();else gdTurnRun++;
  if(g.view==='entry'&&typeof begMix==='object'&&begMix.on&&typeof renderBegMix==='function')renderBegMix();
  const on=(sel,fn)=>{const el=root.querySelector(sel);if(el)el.onclick=fn;};
  on('#gdStart',()=>gdBegin());
  on('#gdDiff',gdToEntry);
  on('#gdAgain',gdToEntry);
  on('#gdCfop',()=>setMethod(begPack().next.method));
  on('#gdPlanBtn',()=>{g.showPlan=!g.showPlan;gdRender();});
  on('#gdDone',()=>gdGo(g.i+1));
  on('#gdPrev',()=>gdGo(g.i-1));
  on('#gdShow',gdShowMe);
  on('[data-gd="cube"]',e=>{if(e)e.stopPropagation();if(typeof cubePopOpenNow==='function')cubePopOpenNow();});
  on('[data-gd="smart"]',()=>{if(typeof smartLive==='function'&&smartLive()){if(typeof openSmart==='function')openSmart();}else if(typeof smartConnectNow==='function')smartConnectNow();});
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
