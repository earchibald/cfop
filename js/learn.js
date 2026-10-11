// ===== Beginner mode: the Learn tab (the step list and the lessons) and the Cheat sheet =====
// Loads after beginner-ui.js. Fills #tab-learn and #tab-cheat at load. Defines openLesson(n).
// Every "Show" button loads a drill into the player: the current scramble is kept.
// Data: BEGINNER_STEPS, BEGINNER_TRIGGERS, BEGINNER_ALGS and beginnerChunks (js/beginner.js).
// All markup is built from fixed strings and the method data; every dynamic string goes through esc().

// ---------- cubes for the pictures and the drills ----------
// The solved cube as the beginner holds it: yellow up, green in front, white down.
function lnHeld(){return applyAlg(new Cube(),['z2']);}
// Turn the cube about the vertical until green is in front again (a plan adds y holds).
function lnGreenFront(c){for(let i=0;i<4&&c.toFacelets()[22]!==2;i++)c=applyAlg(c,['y']);return c;}
// The goal of each step, from one fixed example solve. Computed once, on first use.
let lnGoalCache=null;
function lnGoals(){
  if(lnGoalCache)return lnGoalCache;
  let c=applyAlg(new Cube(),[...randomMoveScramble('lesson',22),'z2']);
  const plan=solveBeginner(c);const g=[lnHeld()];
  for(const st of plan.stages){for(const p of st.parts){if(p.pre)c=applyAlg(c,[p.pre]);if(p.moves.length)c=applyAlg(c,p.moves);}g[st.n]=lnGreenFront(c);}
  g[8]=lnHeld();lnGoalCache=g;return g;
}
// The cube a case starts from: the step's start position with the case moves undone.
// Steps 1 and 2 start from a daisy, so the moves bring a white edge up or down.
function lnCaseBase(n){const h=lnHeld();
  if(n===1)return applyAlg(h,['F2','R2','B2','L2']); // a full daisy
  if(n===2)return applyAlg(h,['R2','B2','L2']);      // a daisy with the front edge already down
  return h;}
function lnSetup(base,moves){const ms=Array.isArray(moves)?moves:parseAlg(moves);return ms.length?applyAlg(base,invertAlg(ms)):base;}
// Load moves into the player as a drill and step through from the start.
function lnDrill(moves,label,base,drill){
  const ms=Array.isArray(moves)?moves:parseAlg(moves);
  setSequence(ms,label,lnSetup(base,ms),drill);seqState.idx=0;applySequence();focusPlayer();
}
// A picture from above (the top, front and right faces) or from below.
function lnPic(cube,below){const f=cube.toFacelets();
  return `<svg viewBox="40 30 320 300" aria-hidden="true">${renderCube3D(f,{yaw:-32,pitch:below?-34:28,scale:48})}</svg>`;}
const LN_GOAL_BELOW={2:true,3:true,4:true}; // the white face is the goal: look from below

// ---------- small renderers ----------
const lnStepNo=s=>s.n===0?'Basics':'Step '+s.n;
const lnStatus=n=>begProgress.status(n);
// Move tiles. Triggers inside the moves show as boxes with their name.
function lnTiles(moves,big){
  const ms=Array.isArray(moves)?moves:parseAlg(moves);const ch=beginnerChunks(ms);let out='';
  for(let i=0;i<ms.length;i++){
    const c=ch.find(x=>x.at===i);
    if(c){out+=`<span class="trig"><b class="lbl">${esc(c.label)}</b>${ms.slice(i,i+c.len).map(m=>`<span class="m">${fmtMove(m)}</span>`).join('')}</span>`;i+=c.len-1;}
    else out+=`<span class="m">${fmtMove(ms[i])}</span>`;
  }
  return `<span class="ms${big?' big':''}">${out}</span>`;
}
function lnTrigBox(t){return `<span class="ms"><span class="trig"><b class="lbl">${esc(t.name)}</b>${t.moves.map(m=>`<span class="m">${fmtMove(m)}</span>`).join('')}</span></span>`;}
// The face thumb on a step card: the step's goal, as seen from above. '.' is a gray tile.
const LN_FACES={
  basics:'.W.WWW.W.',daisy:'.W.WYW.W.',cross:'.W.WWW.W.',corners:'WWWWWWWWW',middle:'GGGGGGGGG',
  ycross:'.Y.YYY.Y.',yface:'YYYYYYYYY',ycorners:'YYYYYYYYY',yedges:'YYYYYYYYY'};
function lnFace(id){const p=LN_FACES[id]||'.........';
  return `<span class="face" aria-hidden="true">${[...p].map(ch=>`<i${ch==='.'?'':` class="${ch}"`}></i>`).join('')}</span>`;}
// The trigger or algorithm names a step uses.
function lnUses(s){
  if(s.id==='middle')return 'Move Left, Move Right';
  if(s.triggers)return s.triggers.map(t=>BEGINNER_TRIGGERS[t].name).join(', ');
  if(s.algs)return s.algs.map(a=>BEGINNER_ALGS[a].name+' algorithm').join(', ');
  return '';
}
function lnTag(st){return `<span class="tag ln-tag ${esc(st)}">${esc(st||'unlearned')}</span>`;}

// ---------- the Learn home: the nine steps ----------
const lnView={n:null,why:new Set()}; // n: the open lesson, or null for the step list
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
const LN_WHY={
  right:"R turns the right face up. The empty spot at the bottom right comes up to the top, and the white corner moves to the back. U brings the white corner round into the raised right face. R' turns the face back down, and the corner drops into its spot.",
  left:"L' turns the left face up. The empty spot at the bottom left comes up to the top, and the white corner moves to the back. U' brings the white corner round into the raised left face. L turns the face back down, and the corner drops into its spot.",
};
const LN_FACE_WORDS=[['U','the top face (up)'],['D','the bottom face (down)'],['F','the front face'],['B','the back face'],['R','the right face'],['L','the left face']];
function lnLessonHTML(n){
  const s=BEGINNER_STEPS[n];const st=lnStatus(n);const prev=BEGINNER_STEPS[n-1],next=BEGINNER_STEPS[n+1];
  const head=`<div class="panel ln-head"><div class="ln-title"><button class="ln-link" data-ln="list">← All steps</button><div class="mono muted ln-of">${n===0?'Basics':`Step ${n} of 8`}</div><h2>${esc(s.name)}</h2></div>
    <div class="row ln-nav"><span class="ln-st">${stBtn('beg-'+n)}<span class="muted ln-hint">tap to change</span></span>${prev?`<button class="small" data-ln="open" data-n="${prev.n}">← ${esc(lnStepNo(prev))}</button>`:''}${next?`<button class="small primary" data-ln="open" data-n="${next.n}">${esc(lnStepNo(next))} →</button>`:''}</div></div>`;
  const what=`<div class="panel ln-what"><div class="ln-text"><div><h3>What you do</h3><p>${esc(s.what)}</p></div><div><h3>How</h3><p>${esc(s.how)}</p></div><div class="note">${esc(s.note)}</div></div>
    <div class="ln-goal"><h3>Goal for this step</h3><p class="muted">${esc(s.goal)}</p><div class="ln-pic">${lnPic(lnGoals()[n],LN_GOAL_BELOW[n])}</div>${LN_GOAL_BELOW[n]?'<div class="muted ln-cap">Seen from below: the white face.</div>':''}<button class="small" data-ln="goal">Show the goal on the cube</button></div></div>`;
  let moves='';
  if(n===0)moves=`<div class="panel ln-panel"><h3>The six moves</h3><p>Each letter turns one face a quarter turn, clockwise as you look at that face.</p>
    <ul class="ln-faces">${LN_FACE_WORDS.map(([m,w])=>`<li><span class="ms"><span class="m">${esc(m)}</span></span> <span>${esc(w)}</span></li>`).join('')}</ul>
    <div class="row"><button class="small" data-ln="moves">Show the six moves on the cube</button></div></div>`;
  if(s.triggers)moves+=`<div class="panel ln-panel"><h3>The triggers</h3><div class="ln-trigs">${s.triggers.map(id=>{const t=BEGINNER_TRIGGERS[id];const open=lnView.why.has(id);
    return `<div class="ln-box">${lnTrigBox(t)}<div class="muted ln-small">${esc(t.hint)}</div><div class="row"><button class="small" data-ln="trig" data-id="${esc(id)}">Show on the cube</button><button class="small ghost" data-ln="why" data-id="${esc(id)}" aria-expanded="${open}">Why it works</button></div>${open?`<p class="ln-why">${esc(LN_WHY[id])}</p>`:''}</div>`;}).join('')}</div></div>`;
  if(s.algs)moves+=`<div class="panel ln-panel"><h3>The algorithm${s.algs.length>1?'s':''}</h3>${s.algs.map(id=>{const a=BEGINNER_ALGS[id];
    return `<div class="ln-box"><b>${esc(a.name)}</b>${lnTiles(a.alg,true)}<div class="ln-say">Say it as: <b>${esc(a.say)}</b></div><div class="row"><button class="small" data-ln="alg" data-id="${esc(id)}">Show on the cube</button></div></div>`;}).join('')}</div>`;
  const cases=s.cases?`<div class="panel ln-panel"><div class="row ln-ch"><h3>${esc(LN_CASES_TITLE[n]||'Where you find the piece, and what to do')}</h3><span class="muted ln-small">Show puts the case on the cube</span></div>
    ${s.cases.map((c,i)=>{const ms=parseAlg(c.moves||'');
      return `<div class="ln-case"><div class="ln-cpic">${ms.length?lnPic(lnSetup(lnCaseBase(n),ms),false):''}</div><div class="ln-cbody"><b>${esc(c.name)}</b><div class="muted">${esc(c.text)}</div>${ms.length?`<div class="ln-cmoves">${lnTiles(ms)}</div>`:''}</div>${ms.length?`<button class="small" data-ln="case" data-i="${i}">Show</button>`:''}</div>`;}).join('')}</div>`:'';
  const done=st==='finished';
  const nextBtn=next?`<button class="primary" data-ln="open" data-n="${next.n}">Next: ${esc(lnStepNo(next))}, ${esc(next.name)} →</button>`:`<button class="primary" data-ln="solve">Solve my cube →</button>`;
  const end=`<div class="panel ln-foot"><div><b>Can you do this step on your own cube?</b> <span class="muted">Mark it finished. You can always come back.</span></div>
    <div class="row"><button data-ln="mark" id="lnMark"${done?' disabled':''}>${done?'Finished':'Mark finished'}</button>${n>0&&typeof startPractice==='function'?'<button data-ln="practice">Practice this step</button>':''}${next?'<button data-ln="solve">Solve my cube</button>':''}${nextBtn}</div></div>`;
  return head+what+moves+cases+end;
}

// ---------- render and actions ----------
function lnRender(){
  const t=$('#tab-learn');if(!t)return;
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
  else if(act==='moves')lnDrill(['U','D','F','B','R','L'],'the six moves, from the lesson',lnHeld(),'Lesson: the six moves');
  else if(act==='trig'){const t=BEGINNER_TRIGGERS[b.dataset.id];lnDrill(t.moves,t.name+', from the lesson',lnHeld(),'Lesson: '+t.name);}
  else if(act==='why'){const id=b.dataset.id;if(lnView.why.has(id))lnView.why.delete(id);else lnView.why.add(id);lnRender();}
  else if(act==='alg'){const a=BEGINNER_ALGS[b.dataset.id];lnDrill(a.alg,a.name+' algorithm, from the lesson',lnHeld(),'Lesson: '+a.name);}
  else if(act==='case'){const c=s.cases[+b.dataset.i];lnDrill(c.moves,c.name+', from the lesson',lnCaseBase(n),'Lesson: '+lnStepNo(s).toLowerCase());}
});
document.addEventListener('cw:status',e=>{if(!String(e.detail).startsWith('beg-'))return;
  const a=document.activeElement,refocus=a&&a.classList&&a.classList.contains('stbtn')&&a.closest('#tab-learn');
  lnRender();if(refocus){const b=$('#tab-learn .stbtn');if(b)b.focus({preventScroll:true});}});

// ---------- the Cheat sheet ----------
const LN_CHEAT={
  1:{rule:'Bring each white edge to the top, white side up. Turn the top first if the spot is taken.',
     list:[['White on the left of the front face',"L'"],['White on the right of the front face','R'],['White at the top of the front face','F R'],['White at the bottom of the front face',"F' R"],['White on the bottom face','F2']]},
  2:{rule:'Turn the top until an edge sits over the center of its other color. Then do a half turn of that face.',list:[['Edge over its center, in front','F2']]},
  3:{rule:'Turn the top until the side color sits over its center. Matching tile top left: Left Trigger. Top right: Right Trigger. White up: Right Trigger twice.',trigs:['left','right']},
  4:{rule:'Match the front color to the front center. Top color on the left: Move Left. On the right: Move Right. Then put the white corner back with a trigger.',
     list:[['Move Left',"U' L' U' L"],['Move Right',"U R U R'"]]},
  5:{rule:'Dot: hold the cube any way. L at the back left. Line left to right. Repeat until you see the cross.'},
  6:{rule:'One yellow corner on top: hold it at the front left. None or two: yellow faces you on the front left corner. Repeat.'},
  7:{rule:'Matching pair on the left, over its center. Do the algorithm, then the yellow face algorithm. No pair: do both once, then look again.'},
  8:{rule:'Solved side at the back. Do the algorithm. Up to three times.'},
};
function lnCheatHTML(){
  const show=(kind,id)=>`<button class="small" data-cs="${kind}" data-id="${esc(id)}">Show</button>`;
  const panels=BEGINNER_STEPS.filter(s=>s.n>0).map(s=>{const c=LN_CHEAT[s.n]||{};let body='';
    if(c.list)body+=`<ul class="ln-cs-list">${c.list.map(([t,m],i)=>`<li><span>${esc(t)}</span><span class="ln-cs-mv">${lnTiles(m)}${s.n===4?show('move',s.n+':'+i):''}</span></li>`).join('')}</ul>`;
    if(c.trigs)body+=c.trigs.map(id=>`<div class="ln-cs-alg">${lnTrigBox(BEGINNER_TRIGGERS[id])}${show('trig',id)}</div>`).join('');
    if(s.algs)body+=s.algs.map(id=>{const a=BEGINNER_ALGS[id];return `<div class="ln-cs-alg"><div class="ln-cs-an"><b>${esc(a.name)}</b><span class="muted"> · ${esc(a.say)}</span></div>${lnTiles(a.alg)}${show('alg',id)}</div>`;}).join('');
    return `<div class="panel ln-cs-step" data-n="${s.n}"><h3><span class="mono muted">Step ${s.n}</span> · ${esc(s.name)}</h3><p class="ln-cs-goal">${esc(s.goal)}</p>${body}<p class="ln-cs-rule">${esc(c.rule||s.how)}</p></div>`;}).join('');
  return `<div class="panel"><h2>Cheat sheet</h2><p class="muted">Keep this page open while you solve. Turn the cube over first: yellow on top for every step.</p></div><div class="ln-cs-grid">${panels}</div>`;
}
function lnRenderCheat(){const t=$('#tab-cheat');if(t)t.innerHTML=lnCheatHTML();}
$('#tab-cheat').addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-cs]');if(!b)return;const id=b.dataset.id;
  if(b.dataset.cs==='trig'){const t=BEGINNER_TRIGGERS[id];lnDrill(t.moves,t.name+', from the cheat sheet',lnHeld(),'Cheat sheet: '+t.name);}
  else if(b.dataset.cs==='alg'){const a=BEGINNER_ALGS[id];lnDrill(a.alg,a.name+' algorithm, from the cheat sheet',lnHeld(),'Cheat sheet: '+a.name);}
  else if(b.dataset.cs==='move'){const [n,i]=id.split(':').map(Number);const [name,m]=LN_CHEAT[n].list[i];lnDrill(m,name+', from the cheat sheet',lnHeld(),'Cheat sheet: '+name);}
});

lnRender();lnRenderCheat();
// A click on the Learn rail button while a lesson is open goes back to the step list.
// openLesson switches the tab first and opens the lesson after, so it is not affected.
document.addEventListener('cw:tab',e=>{if(e.detail==='learn'&&lnView.n!=null)lnShowList();});
