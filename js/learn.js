// ===== Beginner mode: the Learn tab (the step list and the lessons) and the Cheat sheet =====
// Loads after beginner-ui.js. Fills #tab-learn and #tab-cheat at load. Defines openLesson(n).
// Every "Show" button loads a drill into the player: the current scramble is kept.
// Data: BEGINNER_STEPS, BEGINNER_ALGS and beginnerChunks (js/beginner.js).
// All markup is built from fixed strings and the method data; every dynamic string goes through esc().

// ---------- cubes for the pictures and the drills ----------
// The solved cube as the beginner holds it: yellow up, green in front, white down.
function lnHeld(){return applyAlg(new Cube(),['z2']);}
// Step 3 works white up, green in front. Every other step works yellow up.
function lnWhiteUp(){return new Cube();}
function lnFrame(n){return n===3?lnWhiteUp():lnHeld();}
// Turn the cube about the vertical until green is in front again (a plan adds y holds).
function lnGreenFront(c){for(let i=0;i<4&&c.toFacelets()[22]!==2;i++)c=applyAlg(c,['y']);return c;}
// The goal of each step, from one fixed example solve. Computed once, on first use.
let lnGoalCache=null;
function lnGoals(){
  if(lnGoalCache)return lnGoalCache;
  let c=applyAlg(new Cube(),[...randomMoveScramble('lesson',22),'z2']);let up='yellow';
  const plan=solveBeginner(c);const g=[lnHeld()];
  for(const st of plan.stages){
    for(const p of st.parts){if(p.up!==up){c=applyAlg(c,['z2']);up=p.up;}if(p.pre)c=applyAlg(c,[p.pre]);if(p.moves.length)c=applyAlg(c,p.moves);}
    // Step 3's goal is seen white up, as the step holds it. Every other goal is seen yellow up.
    const want=st.n===3?0:3;g[st.n]=lnGreenFront(c.toFacelets()[4]===want?c:applyAlg(c,['z2']));}
  g[8]=lnHeld();lnGoalCache=g;return g;
}
// The cube a step's cases build on: the step's own hold, and for steps 1 and 2 a daisy, so the
// case moves bring a white edge up or down.
function lnCaseBase(n){const h=lnFrame(n);
  if(n===1)return applyAlg(h,['F2','R2','B2','L2']); // a full daisy
  if(n===2)return applyAlg(h,['R2','B2','L2']);      // a daisy with the front edge already down
  return h;}
function lnSetup(base,moves){const ms=Array.isArray(moves)?moves:parseAlg(moves);return ms.length?applyAlg(base,invertAlg(ms)):base;}
// Where a case starts: its own setup from the base, or else its moves undone, so they end on the base.
function lnCaseStart(n,c){return c.setup?applyAlg(lnCaseBase(n),parseAlg(c.setup)):lnSetup(lnCaseBase(n),parseAlg(c.moves||''));}
// An algorithm's drill starts with the algorithm undone on the step's hold, so it ends solved.
function lnAlgStart(a){return lnSetup(lnFrame(a.step),parseAlg(a.alg));}
// Load moves into the player as a drill, from `start`, and step through from the start.
function lnDrill(moves,label,start,drill){
  const ms=Array.isArray(moves)?moves:parseAlg(moves);
  setSequence(ms,label,start,drill);seqState.idx=0;applySequence();focusPlayer();
}
// A picture from above (the top, front and right faces) or from below.
const LN_PIC={scale:48,cx:200,cy:185};
function lnPic(cube,below){const f=cube.toFacelets();
  return `<svg viewBox="40 30 320 300" aria-hidden="true">${renderCube3D(f,{yaw:-32,pitch:below?-34:28,...LN_PIC})}</svg>`;}
const LN_GOAL_BELOW={2:true,4:true}; // the white face is below: look from below. Step 3 holds it on top.
// The goal picture: every sticker carries its kind of piece, and a small figure stands in front
// of the cube at the end of a dashed line from the front face, so the front is clear when the
// front and the right are both in view. Lesson 0 leaves room round the cube for the rings.
function lnGoalView(n){return {yaw:-32,pitch:LN_GOAL_BELOW[n]?-34:28};}
function lnGoalBox(n){return n===0?'20 0 340 360':'40 30 320 300';}
function lnGoalSVG(n,v,fade){v=v||lnGoalView(n);const f=lnGoals()[n].toFacelets();
  return renderCube3D(f,{...v,...LN_PIC,fade,cls:i=>'pc-'+pieceKind(i)})+(fade?'':lnFrontMark(v));}
function lnFrontMark(v){
  const proj=p=>{const q=rot3(p,v.yaw,v.pitch);return [LN_PIC.cx+q[0]*LN_PIC.scale,LN_PIC.cy-q[1]*LN_PIC.scale];};
  const [x,y]=proj([0,0,5.3]),[ax,ay]=proj([0,0,1.7]),[bx,by]=proj([0,0,4.3]);const f=n=>n.toFixed(1);
  return `<g class="ln-front" aria-hidden="true"><line x1="${f(ax)}" y1="${f(ay)}" x2="${f(bx)}" y2="${f(by)}"/><circle cx="${f(x)}" cy="${f(y-13)}" r="8"/><path d="M${f(x-14)} ${f(y+12)}a14 14 0 0 1 28 0z"/><text x="${f(x)}" y="${f(y+27)}" text-anchor="middle">front</text></g>`;}
function lnGoalCap(n){return LN_GOAL_BELOW[n]?'Seen from below: the white face.':n===0?'The small figure is you. The face it looks at is the front.':'';}
// Tap a kind of piece in the lesson text: those pieces stay bright, the rest dim for a moment.
function lnHighlight(kind){const pic=$('#tab-learn .ln-pic');if(!pic)return;lnRestoreGoal();
  delete pic.dataset.hl;void pic.offsetWidth;pic.dataset.hl=kind;
  clearTimeout(lnView.hlT);lnView.hlT=setTimeout(()=>{delete pic.dataset.hl;},2200);}
// Tap a letter: the cube keeps its view. The layer that moves stays bright, the rest dims, and a
// ring of arrows shows the turn. On the top, front and right the ring sits on the face. The left,
// bottom and back are hidden, so their ring floats beside the cube in the plane of that face:
// to the left, below, and standing behind the top edge.
const LN_RING_AT={L:{at:[-3.4,0,0],r:1.15},D:{at:[0,-3.3,0]},B:{at:[0,2.35,-1.66]}};
const LN_FACE_NAME={U:'top',D:'bottom',F:'front',B:'back',R:'right',L:'left'};
function lnTurnText(m){return `${m}: the ${LN_FACE_NAME[m[0]]} face turns ${m.endsWith("'")?'counterclockwise':'clockwise'}, as you look at it.`+(LN_RING_AT[m[0]]?' That face is hidden here. The ring floats next to it.':'');}
// The stickers of the cubies in the layer a face move turns.
function lnLayer(face){const g=FACE_GEOM['URFDLB'.indexOf(face)];const s=new Set();
  for(let f=0;f<6;f++){const h=FACE_GEOM[f];for(let i=0;i<3;i++)for(let j=0;j<3;j++){
    const c=[0,1,2].map(t=>h.n[t]+h.r[t]*(j-1)+h.d[t]*(i-1));if(c[0]*g.n[0]+c[1]*g.n[1]+c[2]*g.n[2]===1)s.add(9*f+3*i+j);}}
  return s;}
function lnShowTurn(m){
  const svg=$('#lnGoalSvg'),cap=$('#lnGoalCap'),pic=$('#tab-learn .ln-pic');if(!svg||!LN_FACE_NAME[m[0]])return;
  const n=lnView.n,v=lnGoalView(n);
  delete pic.dataset.hl;svg.innerHTML=lnGoalSVG(n,v,lnLayer(m[0]))+turnRing(m,{...v,...LN_PIC,...LN_RING_AT[m[0]]});pic.dataset.turn=m;
  if(cap)cap.textContent=lnTurnText(m);
  clearTimeout(lnView.turnT);lnView.turnT=setTimeout(lnRestoreGoal,2800);
}
function lnRestoreGoal(){if(!lnView.turnT)return;clearTimeout(lnView.turnT);lnView.turnT=0;
  const svg=$('#lnGoalSvg'),cap=$('#lnGoalCap'),pic=$('#tab-learn .ln-pic');if(!svg||lnView.n==null)return;
  svg.innerHTML=lnGoalSVG(lnView.n);delete pic.dataset.turn;if(cap)cap.textContent=lnGoalCap(lnView.n);}

// ---------- small renderers ----------
const lnStepNo=s=>s.n===0?'Basics':'Step '+s.n;
const lnStatus=n=>begProgress.status(n);
// Move tiles. The guide's algorithms inside the moves show as boxes with their name.
function lnTiles(moves,big){
  const ms=Array.isArray(moves)?moves:parseAlg(moves);const ch=beginnerChunks(ms);let out='';
  for(let i=0;i<ms.length;i++){
    const c=ch.find(x=>x.at===i);
    if(c){out+=`<span class="trig"><b class="lbl">${esc(c.label)}</b>${ms.slice(i,i+c.len).map(m=>`<span class="m">${fmtMove(m)}</span>`).join('')}</span>`;i+=c.len-1;}
    else out+=`<span class="m">${fmtMove(ms[i])}</span>`;
  }
  return `<span class="ms${big?' big':''}">${out}</span>`;
}
// The face thumb on a step card: the step's goal, as seen from above. '.' is a gray tile.
const LN_FACES={
  basics:'.W.WWW.W.',daisy:'.W.WYW.W.',cross:'.W.WWW.W.',corners:'WWWWWWWWW',middle:'GGGGGGGGG',
  ycross:'.Y.YYY.Y.',yface:'YYYYYYYYY',ycorners:'YYYYYYYYY',yedges:'YYYYYYYYY'};
function lnFace(id){const p=LN_FACES[id]||'.........';
  return `<span class="face" aria-hidden="true">${[...p].map(ch=>`<i${ch==='.'?'':` class="${ch}"`}></i>`).join('')}</span>`;}
// The algorithm names a step uses.
function lnUses(s){return s.algs?s.algs.map(a=>BEGINNER_ALGS[a].name).join(' · '):'';}
function lnTag(st){return `<span class="tag ln-tag ${esc(st)}">${esc(st||'unlearned')}</span>`;}

// ---------- the Learn home: the nine steps ----------
const lnView={n:null,why:new Set(),hlT:0,turnT:0}; // n: the open lesson, or null for the step list
// Up next and the way a real cube gets in live above the tabs, in the beginner home (js/beghome.js).
function lnHomeHTML(){
  const nx=begProgress.next();
  const cards=BEGINNER_STEPS.map(s=>{const st=lnStatus(s.n),cur=nx&&nx.n===s.n,uses=lnUses(s);
    return `<button class="bstep${cur?' cur':''}" data-ln="open" data-n="${s.n}">${lnFace(s.id)}<span class="body"><span class="n">${esc(lnStepNo(s))}${cur?' · up next':''}</span><br><b>${esc(s.name)}</b>${uses?` <span class="muted ln-uses">· ${esc(uses)}</span>`:''}<br><span class="desc">${esc(s.goal)}</span></span>${lnTag(st)}</button>`;}).join('');
  return `<div class="panel ln-intro"><div><h2>Learn: the eight steps</h2><p class="muted">Do them in order, or tap any step. Each lesson shows the goal, the moves, and the cases you will meet. Mark a step finished when you can do it without the app.</p></div></div>
  <div class="panel ln-steps"><div class="ln-mob ln-listhead"><b>Learn</b><span class="muted">tap a step</span></div>${cards}</div>
  <div class="panel ln-foot"><div><b>Finished all eight?</b> <span class="muted">Switch to CFOP from the chip in the top bar. Your times and history come with you.</span></div><button class="small" data-ln="cfop">Show me CFOP</button></div>`;
}

// ---------- a lesson ----------
const LN_CASES_TITLE={1:'Where you find a white edge, and what to do',2:'Line up each edge, then turn it down',3:'Where you find a white corner, and what to do',
  4:'Where the edge goes, and what to do',5:'What you see on top, and what to do',6:'What you see on top, and what to do',7:'What you see, and what to do',8:'What you see, and what to do'};
const LN_FACE_WORDS=[['U','the top face (up)'],['D','the bottom face (down)'],['F','the front face'],['B','the back face'],['R','the right face'],['L','the left face']];
// The basics lesson's text: the three kinds of piece are buttons that light those pieces on the goal cube.
function lnBasicsWhat(s){
  const act=(k,w)=>`<button class="ln-act" data-ln="hl" data-kind="${k}" title="Show the ${k}s on the goal cube">${w}</button>`;
  const text=esc(s.what).replace(/\bcenters, edges and corners\b/,`${act('center','centers')}, ${act('edge','edges')} and ${act('corner','corners')}`);
  return `<p>${text}</p><p class="muted ln-small">Tap a kind of piece to see it on the goal cube.</p>`;
}
// The six moves: each letter and its mark are buttons that show the turn on the goal cube.
function lnSixMoves(){
  const tile=m=>`<button class="m ln-mv" data-ln="face" data-m="${esc(m)}" title="Show ${esc(m)} on the goal cube">${fmtMove(m)}</button>`;
  return `<div class="panel ln-panel"><h3>The six moves</h3><p>Each letter turns one face a quarter turn, clockwise as you look at that face. A letter with a mark, such as <span class="ms"><span class="m">${fmtMove("R'")}</span></span>, turns the other way. Tap a letter to see the turn on the goal cube.</p>
    <ul class="ln-faces">${LN_FACE_WORDS.map(([m,w])=>`<li><span class="ms">${tile(m)}${tile(m+"'")}</span><span>${esc(w)}</span></li>`).join('')}</ul>
    <div class="row"><button class="small" data-ln="moves">Show the six moves on the cube at the top of the page</button></div></div>`;
}
function lnLessonHTML(n){
  const s=BEGINNER_STEPS[n];const st=lnStatus(n);const prev=BEGINNER_STEPS[n-1],next=BEGINNER_STEPS[n+1];
  const head=`<div class="panel ln-head"><div class="ln-title"><button class="ln-link" data-ln="list">← All steps</button><div class="mono muted ln-of">${n===0?'Basics':`Step ${n} of 8`}</div><h2>${esc(s.name)}</h2></div>
    <div class="row ln-nav"><span class="ln-st">${stBtn('beg-'+n)}<span class="muted ln-hint">tap to change</span></span>${prev?`<button class="small" data-ln="open" data-n="${prev.n}">← ${esc(lnStepNo(prev))}</button>`:''}${next?`<button class="small primary" data-ln="open" data-n="${next.n}">${esc(lnStepNo(next))} →</button>`:''}</div></div>`;
  const goal=s.goals?`<ul class="ln-goals">${s.goals.map(g=>`<li>${esc(g)}</li>`).join('')}</ul>`:`<p class="muted">${esc(s.goal)}</p>`;
  const what=`<div class="panel ln-what"><div class="ln-text"><div><h3>What you do</h3>${n===0?lnBasicsWhat(s):`<p>${esc(s.what)}</p>`}</div><div><h3>How</h3><p>${esc(s.how)}</p></div><div class="note">${esc(s.note)}</div></div>
    <div class="ln-goal"><h3>Goal for this step</h3>${goal}<div class="ln-pic"><svg id="lnGoalSvg" viewBox="${lnGoalBox(n)}" aria-hidden="true">${lnGoalSVG(n)}</svg></div><div class="muted ln-cap" id="lnGoalCap">${esc(lnGoalCap(n))}</div><button class="small" data-ln="goal">Show the goal on the cube</button></div></div>`;
  let moves='';
  if(n===0)moves=lnSixMoves();
  if(s.algs)moves+=`<div class="panel ln-panel"><h3>The algorithm${s.algs.length>1?'s':''}</h3><div class="ln-algs">${s.algs.map(id=>{const a=BEGINNER_ALGS[id];const open=lnView.why.has(id);
    return `<div class="ln-box"><b>${esc(a.name)}</b>${lnTiles(a.alg,true)}<div class="ln-say">Say it as: <b>${esc(a.say)}</b></div><div class="row"><button class="small" data-ln="alg" data-id="${esc(id)}">Show on the cube</button>${a.why?`<button class="small ghost" data-ln="why" data-id="${esc(id)}" aria-expanded="${open}">Why it works</button>`:''}</div>${open?`<p class="ln-why">${esc(a.why)}</p>`:''}</div>`;}).join('')}</div></div>`;
  const cases=s.cases?`<div class="panel ln-panel"><div class="row ln-ch"><h3>${esc(LN_CASES_TITLE[n]||'Where you find the piece, and what to do')}</h3><span class="muted ln-small">Show puts the case on the cube</span></div>
    ${s.cases.map((c,i)=>{const ms=parseAlg(c.moves||'');
      return `<div class="ln-case"><div class="ln-cpic">${ms.length?lnPic(lnCaseStart(n,c),false):''}</div><div class="ln-cbody"><b>${esc(c.name)}</b><div class="muted">${esc(c.text)}</div>${ms.length?`<div class="ln-cmoves">${lnTiles(ms)}</div>`:''}</div>${ms.length?`<button class="small" data-ln="case" data-i="${i}">Show</button>`:''}</div>`;}).join('')}</div>`:'';
  const done=st==='finished';
  const nextBtn=next?`<button class="primary" data-ln="open" data-n="${next.n}">Next: ${esc(lnStepNo(next))}, ${esc(next.name)} →</button>`:`<button class="primary" data-ln="solve">Solve my cube →</button>`;
  const end=`<div class="panel ln-foot"><div><b>Can you do this step on your own cube?</b> <span class="muted">Mark it finished. You can always come back.</span></div>
    <div class="row"><button data-ln="mark" id="lnMark"${done?' disabled':''}>${done?'Finished':'Mark finished'}</button>${n>0&&typeof startPractice==='function'?'<button data-ln="practice">Practice this step</button>':''}${next?'<button data-ln="solve">Solve my cube</button>':''}${nextBtn}</div></div>`;
  return head+what+moves+cases+end;
}

// ---------- render and actions ----------
function lnRender(){
  const t=$('#tab-learn');if(!t)return;clearTimeout(lnView.hlT);clearTimeout(lnView.turnT);lnView.turnT=0;
  if(lnView.n==null){t.innerHTML=lnHomeHTML();delete document.body.dataset.lesson;}
  else{t.innerHTML=lnLessonHTML(lnView.n);document.body.dataset.lesson='1';}
}
// Scroll so the top of the Learn section sits under the top bar.
function lnScrollTop(){const t=$('#tab-learn');if(!t)return;
  const bar=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--toph'))||58;
  const top=t.getBoundingClientRect().top+window.scrollY-bar-8;
  try{window.scrollTo({top:Math.max(0,top)});}catch(e){}}
function openLesson(n){n=Math.max(0,Math.min(8,Math.round(+n)||0));if(curTab!=='learn')goTab('learn');lnView.n=n;lnView.why.clear();lnRender();lnScrollTop();}
function lnShowList(){lnView.n=null;lnRender();lnScrollTop();}
// "Mark finished" goes through the status button's own path, so every view follows.
function lnMarkFinished(n){const id='beg-'+n;for(let i=0;i<3&&llState.status[id]!=='finished';i++)cycleStatus(id);}
$('#tab-learn').addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-ln]');if(!b||e.target.closest('.stbtn'))return;
  const n=lnView.n,s=BEGINNER_STEPS[n],act=b.dataset.ln;
  if(act==='open')openLesson(+b.dataset.n);
  else if(act==='list')lnShowList();
  else if(act==='solve')goTab('bsolve');
  else if(act==='cfop')setMethod('cfop');
  else if(act==='practice'){if(typeof startPractice==='function')startPractice(n);}
  else if(act==='mark')lnMarkFinished(n);
  else if(act==='goal'){setSequence([],'goal of '+lnStepNo(s).toLowerCase(),lnGoals()[n],'Lesson: '+lnStepNo(s).toLowerCase());focusPlayer();}
  else if(act==='moves'){const six=['U','D','F','B','R','L'];lnDrill(six,'the six moves, from the lesson',lnSetup(lnHeld(),six),'Lesson: the six moves');}
  else if(act==='hl')lnHighlight(b.dataset.kind);
  else if(act==='face')lnShowTurn(b.dataset.m);
  else if(act==='why'){const id=b.dataset.id;if(lnView.why.has(id))lnView.why.delete(id);else lnView.why.add(id);lnRender();}
  else if(act==='alg'){const a=BEGINNER_ALGS[b.dataset.id];lnDrill(a.alg,a.name+' algorithm, from the lesson',lnAlgStart(a),'Lesson: '+a.name);}
  else if(act==='case'){const c=s.cases[+b.dataset.i];lnDrill(c.moves,c.name+', from the lesson',lnCaseStart(n,c),'Lesson: '+lnStepNo(s).toLowerCase());}
});
document.addEventListener('cw:status',e=>{if(!String(e.detail).startsWith('beg-'))return;
  const a=document.activeElement,refocus=a&&a.classList&&a.classList.contains('stbtn')&&a.closest('#tab-learn');
  lnRender();if(refocus){const b=$('#tab-learn .stbtn');if(b)b.focus({preventScroll:true});}});

// ---------- the Cheat sheet ----------
const LN_CHEAT={
  1:{rule:'Yellow on top. Look at the top layer, then the middle, then the bottom. Turn the top to move a petal out of the way first.',
     list:[['Middle layer, white facing you, at the front right','R'],['Middle layer, white facing right, at the front right',"U' F'"],['Bottom layer, white facing down, under the front','F2'],['Top layer, white facing out: hold it on the right',"R' U F'"]]},
  2:{rule:'Yellow on top. Turn the top until the front tile of the top edge matches the front center. Then F2. Then flip the cube over.',list:[['Edge over its center, in front','F2']]},
  3:{rule:'White cross on top. Turn the bottom until the corner sits between its centers. Hold white facing you: bottom left or bottom right, then that algorithm. White facing down: white to the front first. Wrong corner on top: corner down first.'},
  4:{rule:'Flip over: white down. Turn the top until a top edge makes a vertical line with the front center. Top tile matches the left center: Moving Left. The right center: Moving Right. Stuck edge: hold it on the right, Moving Right.'},
  5:{rule:'Dot: hold the cube any way. Line: left to right. L: back left. FUR says U\'R\'F\'. Repeat until you see the cross.'},
  6:{rule:'One corner: feed the fish, that corner at the front left. None: a yellow tile on the left face, front left. Two: left thumb on a yellow tile on the front, front left. Repeat.'},
  7:{rule:'Turn the top until two corners are right. Next to each other: tail lights at the back. Across from each other: the chant once, then look again.'},
  8:{rule:'Solved side at the back. The front edge matches the left center: as written. The right center: both U turns as U\'. No side solved: once, any way.'},
};
function lnCheatHTML(){
  const show=(kind,id)=>`<button class="small" data-cs="${kind}" data-id="${esc(id)}">Show</button>`;
  const panels=BEGINNER_STEPS.filter(s=>s.n>0).map(s=>{const c=LN_CHEAT[s.n]||{};let body='';
    if(c.list)body+=`<ul class="ln-cs-list">${c.list.map(([t,m])=>`<li><span>${esc(t)}</span><span class="ln-cs-mv">${lnTiles(m)}</span></li>`).join('')}</ul>`;
    if(s.algs)body+=s.algs.map(id=>{const a=BEGINNER_ALGS[id];return `<div class="ln-cs-alg"><div class="ln-cs-an"><b>${esc(a.name)}</b><span class="muted"> · ${esc(a.say)}</span></div>${lnTiles(a.alg)}${show('alg',id)}</div>`;}).join('');
    return `<div class="panel ln-cs-step" data-n="${s.n}"><h3><span class="mono muted">Step ${s.n}</span> · ${esc(s.name)}</h3><p class="ln-cs-goal">${esc(s.goal)}</p>${body}<p class="ln-cs-rule">${esc(c.rule||s.how)}</p></div>`;}).join('');
  return `<div class="panel"><h2>Cheat sheet</h2><p class="muted">Keep this page open while you solve. Yellow on top for steps 1 and 2, white on top for step 3, yellow on top from step 4 to the end.</p></div><div class="ln-cs-grid">${panels}</div>`;
}
function lnRenderCheat(){const t=$('#tab-cheat');if(t)t.innerHTML=lnCheatHTML();}
$('#tab-cheat').addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-cs]');if(!b)return;const id=b.dataset.id;
  if(b.dataset.cs==='alg'){const a=BEGINNER_ALGS[id];lnDrill(a.alg,a.name+' algorithm, from the cheat sheet',lnAlgStart(a),'Cheat sheet: '+a.name);}
});

lnRender();lnRenderCheat();
// A click on the Learn rail button while a lesson is open goes back to the step list.
// openLesson switches the tab first and opens the lesson after, so it is not affected.
document.addEventListener('cw:tab',e=>{if(e.detail==='learn'&&lnView.n!=null)lnShowList();});
