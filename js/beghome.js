// ===== Beginner mode: the home (Up next, Your cube, Mix it up with me) and the player dress =====
// Loads after beginner-ui.js and before learn.js, guide.js and practice.js. Fills #begHome, #begBar
// and wires #keyPanel. Owns the beginner view, body[data-begview]:
//   ask     the question "What does your cube look like right now?" No moves are loaded, no player.
//   mix     the walkthrough "Mix it up with me": one turn at a time, in words, with a picture.
//   player  moves are loaded (a lesson's Show, the guided solve, Practice, or the letters view).
// A beginner holds the cube white up, green in front. The scramble is never shown with a hidden z2:
// step 1 of the guided solve turns the cube over as its own first instruction (js/guide.js).
// Globals the other modules use: showBegScr() (app.js calls it from showScr in beginner mode),
// showBegLetters(), setBegView(v), begYourCubeHTML() (guide.js reuses the cards), moveCaption(m)
// (app.js puts it under every tile in beginner mode), begState and begMix (tests read them).
// All markup is built from fixed strings and the method data; every dynamic string goes through esc(),
// as in every other beginner module (no build step, no templating library, a static site).

var begState={letters:false,known:false}; // var: tests read it from the window
var begMix={on:false,i:0,moves:[],own:false,anim:0};

// ---------- words for moves ----------
const BEG_FACE_WORD={U:'top',D:'bottom',F:'front',B:'back',R:'right',L:'left'};
// The caption under a tile: "right ↻", "front ↺", "top ×2", "turn over".
function moveCaption(m){
  const w=/^([URFDLB])([urfdlb])(['2]?)$/.exec(m);if(w&&w[1].toLowerCase()===w[2])return BEG_FACE_WORD[w[1]]+', 2 layers '+(w[3]===''?'↻':w[3]==="'"?'↺':'×2');
  const b=m[0],s=m.slice(1);const turn=s===''?'↻':s==="'"?'↺':'×2';
  if(BEG_FACE_WORD[b])return BEG_FACE_WORD[b]+' '+turn;
  if(puzzleN()===4&&BEG_FACE_WORD[b.toUpperCase()])return 'inside '+BEG_FACE_WORD[b.toUpperCase()]+' '+turn;
  if(s==='2'&&(b==='z'||b==='x'))return 'turn over';
  if(b==='y'||b==='x'||b==='z')return 'whole cube '+turn;
  return '';
}
// A 4×4 mix-up also turns two layers as one (Rr) or an inside slice (r).
function begTurnWords(m){const wide=/^([URFDLB])([urfdlb])/.exec(m);if(wide)return {w:BEG_FACE_WORD[wide[1]]+' two layers',s:m.slice(2),thing:'two layers'};
  if(/^[urfdlb]/.test(m))return {w:'inside '+BEG_FACE_WORD[m[0].toUpperCase()],s:m.slice(1),thing:'slice'};return {w:BEG_FACE_WORD[m[0]],s:m.slice(1),thing:'face'};}
function begTurnTitle(m){const {w,s,thing}=begTurnWords(m);return s==='2'?`Turn the ${w} ${thing} twice`:s==="'"?`Turn the ${w} ${thing} the other way`:`Turn the ${w} ${thing}`;}
function begTurnText(m){
  const {w,s}=begTurnWords(m);
  if(s==='2')return `A half turn. Turn the ${w} face twice, either way round.`;
  if(s==="'")return `A quarter turn, counterclockwise. Look straight at the ${w} face: it turns against a clock's hands.`;
  return `A quarter turn, clockwise. Look straight at the ${w} face: it turns the way a clock's hands do.`;
}

// ---------- the view ----------
function setBegView(v){
  document.body.dataset.begview=v;
  if(v!=='player')begState.letters=false;
  if(begState.letters)document.body.setAttribute('data-begletters','');else document.body.removeAttribute('data-begletters');
  renderBegBar();
}
// app.js calls this from showScr() in beginner mode: the current scramble, white up, no z2.
function showBegScr(){
  if(begState.letters){showBegLetters();return;}
  setSequence(scr.moves,'your cube · seed '+scr.seed+' · white on top, green in front');
  setBegView(begMix.on?'mix':'ask');
}
// "Show the scramble as letters": the player and the seed bar, for people who know the letters.
function showBegLetters(){
  begState.letters=true;
  setSequence(scr.moves,'your cube as letters · seed '+scr.seed+' · white on top, green in front');
  setBegView('player');
}
// The strip above the player: what is on the cube, and the way back.
function renderBegBar(){
  const bar=$('#begBar');if(!bar)return;
  let html='';
  if(isBeg()&&document.body.dataset.begview==='player'){
    if(seqState.drill)html=`<span><b>${esc(seqState.drill)}</b> <span class="muted">is on the cube in place of yours. Your own cube is kept.</span></span><button class="small primary" id="begBack">Back to my cube</button>`;
    else if(begState.letters)html=`<span><b>Your cube as letters.</b> <span class="muted">Hold it white on top, green facing you. The bar below gives a new mix-up, a length and the history.</span></span><button class="small primary" id="begSolveNow">Solve it, part by part</button><button class="small" id="begBack">Back to my cube</button>`;
  }
  bar.innerHTML=html;bar.classList.toggle('hidden',!html);
  const back=$('#begBack');if(back)back.onclick=()=>{begState.letters=false;showForTab();};
  const go=$('#begSolveNow');if(go)go.onclick=begSolveNow;
}
function begSolveNow(){
  if(typeof guideState==='object'&&guideState.view==='guide'){goTab('bsolve');return;}
  if(typeof startGuide==='function')startGuide();
}

// ---------- Up next ----------
function begNextText(s){return s.n===0?begPack().basics:s.goal;}
function renderBegNext(){
  const el=$('#begNext');if(!el)return;
  const pk=begPack(),N=pk.count;const nx=begProgress.next();const {finished}=begProgress.counts();
  const any=pk.steps.some(s=>begProgress.status(s.n));
  const sq=Array.from({length:N},(_,i)=>{const n=i+1;return `<i class="${esc(begProgress.status(n))}${nx&&nx.n===n?' cur':''}"></i>`;}).join('');
  const title=nx?`${nx.n===0?'Basics':'Step '+nx.n}: ${esc(nx.name)}`:`All ${pk.word} steps finished`;
  const text=nx?esc(begNextText(nx)):'Solve your own cube below. '+esc(pk.next.text);
  el.innerHTML=`<div class="beg-next-body"><div class="row beg-next-row"><span class="beg-kicker">Up next</span><span class="psq" aria-hidden="true">${sq}</span><span class="muted beg-next-count">${finished} of ${N} steps finished</span></div><h2 id="begNextTitle">${title}</h2><p id="begNextText">${text}</p></div>
  <div class="row beg-next-act"><button class="primary big" id="begContinue">${nx?(any?'Continue':'Start'):'Solve my cube'} →</button>${nx?'<button id="begPick">Pick another step</button>':''}</div>`;
  $('#begContinue').onclick=()=>{if(!nx){goTab('bsolve');return;}if(typeof openLesson==='function')openLesson(nx.n);};
  const pickBtn=$('#begPick');if(pickBtn)pickBtn.onclick=()=>{goTab('learn');if(typeof lnShowList==='function')lnShowList();};
}

// ---------- Your cube ----------
function begFaceThumb(p){return `<span class="face beg-face${p.length===4?' f2':p.length===16?' f4':''}" aria-hidden="true">${[...p].map(ch=>`<i class="${ch}"></i>`).join('')}</span>`;}
function begHoldPic(){return `<svg viewBox="40 30 320 300" aria-hidden="true">${renderCube3D(puzzleCube().toFacelets(),{yaw:-32,pitch:28,scale:48})}</svg>`;}
// The question and the two cards. guide.js shows the same cards on the Solve my cube tab.
function begYourCubeHTML(){
  const pk=begPack(),two=puzzleN()===2;const paintOk=typeof openPaint==='function';const scanOk=pk.scan&&typeof openScan==='function';
  const known=begState.known&&scr.seed;
  const mixed=scanOk?`<button class="primary" data-beg="scan">Scan it with the camera</button><button data-beg="paint"${paintOk?'':' disabled'}>Paint the colors instead</button><span class="muted beg-small">No camera? Paint works on every device.</span>`
    :`<button class="primary" data-beg="paint"${paintOk?'':' disabled'}>Paint the colors</button><span class="muted beg-small">Tap the ${6*puzzleN()*puzzleN()} tiles as you see them. It takes a moment.</span>`;
  return `<div class="beg-hold"><div class="beg-pic">${begHoldPic()}</div><p><b>Hold it like this.</b> ${esc(pk.holdText)} The picture always shows the cube the way you hold it.</p></div>
  <div class="beg-q">
    <div><h2>What does your cube look like right now?</h2><p class="muted">Pick one. The app needs to see your cube before it can guide you.</p></div>
    <div class="beg-cards">
      <div class="beg-card"><div class="row">${begFaceThumb(two?'RWBG':puzzleN()===4?'RWBYGOGRWBYROGWB':'RWBYGOGRW')}<b>It is mixed up</b></div><p>Show it to the app. The app then tells you every turn, one part at a time.</p>${mixed}</div>
      <div class="beg-card"><div class="row">${begFaceThumb(two?'WWWW':'W'.repeat(puzzleN()*puzzleN()))}<b>It is solved</b></div><p>Mix it up with me. I say each turn in plain words, one at a time. Then you solve it with the lessons.</p><button class="primary" data-beg="mix">Mix it up with me</button><button data-beg="screen">Practice on the screen only</button><span class="muted beg-small">Or mix it up any way you like, then scan it.</span></div>
    </div>
    ${known?`<div class="beg-known"><span><b>Your mixed-up cube is loaded:</b> <span class="mono">${esc(scr.seed)}</span>.</span><button class="primary" data-beg="solveNow">Solve it, part by part →</button></div>`:''}
    <div class="muted beg-small">Know the letters already? <button class="ln-link" data-beg="letters">Show the scramble as letters</button>. The seed, length and history live there too.</div>
  </div>`;
}
function renderBegAsk(){const el=$('#begAsk');if(el)el.innerHTML=begYourCubeHTML();}

// ---------- Mix it up with me ----------
function begMixStart(){
  begMix.own=true;newScramble();begMix.own=false;
  Object.assign(begMix,{on:true,i:0,moves:scr.moves.slice()});begState.known=false;
  setBegView('mix');renderBegMix();window.scrollTo({top:0});
}
// known: the mix-up ended, so the cube on the screen is the user's own.
function begMixEnd(known){begMix.on=false;if(known)begState.known=true;setBegView('ask');renderBegAsk();}
function begMixCubeAt(i){return applyAlg(puzzleCube(),begMix.moves.slice(0,i));}
// The camera turns to show a face the normal view hides. The cube itself stays as held.
const BEG_MIX_VIEW={L:{yaw:32,pitch:28,cap:'Seen from the left.'},B:{yaw:-148,pitch:28,cap:'Seen from behind.'},D:{yaw:-32,pitch:-34,cap:'Seen from below.'}};
function begMixView(m){return (m&&BEG_MIX_VIEW[m[0]])||{yaw:-32,pitch:28,cap:''};}
// The cube before the turn: the face that turns is bright, the rest is dim, an arrow shows the way.
function begMixPicSVG(cube,m){
  const v=begMixView(m);let fade=null;
  if(m){const fi='URFDLB'.indexOf(m[0].toUpperCase());const nn=drawN()*drawN();fade=new Set();for(let k=0;k<nn;k++)fade.add(nn*fi+k);}
  return renderCube3D(cube.toFacelets(),{yaw:v.yaw,pitch:v.pitch,scale:52,fade})+(m?begMixArrow(m,v):'');
}
// A curved arrow just above the face, clockwise or counterclockwise as the face sees it.
function begMixArrow(m,v){
  const g=FACE_GEOM['URFDLB'.indexOf(m[0].toUpperCase())];const S=52,cx=200,cy=185;
  const proj=p=>{const q=rot3(p,v.yaw,v.pitch);return [cx+q[0]*S,cy-q[1]*S];};
  const dir=m.endsWith("'")?-1:1,span=m.endsWith('2')?300:230,a0=dir>0?-140:-40,r=1.05,N=28;
  const pts=[];for(let k=0;k<=N;k++){const a=(a0+dir*span*k/N)*Math.PI/180;pts.push(proj([0,1,2].map(i=>g.n[i]*1.62+g.r[i]*r*Math.cos(a)+g.d[i]*r*Math.sin(a))));}
  const [x1,y1]=pts[N-2],[x2,y2]=pts[N];let dx=x2-x1,dy=y2-y1;const L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;
  const head=s=>{const c=Math.cos(s),sn=Math.sin(s);return [x2-14*(dx*c-dy*sn),y2-14*(dx*sn+dy*c)];};
  const [hx1,hy1]=head(0.5),[hx2,hy2]=head(-0.5);const f=n=>n.toFixed(1);
  return `<g fill="none" stroke="var(--accent)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><polyline points="${pts.map(p=>f(p[0])+','+f(p[1])).join(' ')}"/><polyline points="${f(hx1)},${f(hy1)} ${f(x2)},${f(y2)} ${f(hx2)},${f(hy2)}"/></g>`;
}
function renderBegMix(){
  const el=$('#begMix');if(!el)return;
  if(!begMix.on){el.innerHTML='';return;}
  const n=begMix.moves.length,i=begMix.i;
  if(i>=n){
    el.innerHTML=`<div class="beg-mix-pic"><svg id="begMixCube" viewBox="20 10 360 340" aria-hidden="true">${begMixPicSVG(begMixCubeAt(n),null)}</svg><span class="muted beg-small">Still white on top, green facing you.</span></div>
    <div class="beg-mix-body beg-mix-done"><span class="beg-kicker">Turn ${n} of ${n} done</span><h2>Your cube is mixed up. Keep holding it white on top.</h2><p>The app saw every turn, so it knows your cube. Start the solve now, or learn the basics first. When a step needs you to hold the cube another way, that step says so before its first move.</p>
    <div class="row beg-mix-act"><button class="primary big" data-beg="mixSolve">Start solving, part by part →</button><button data-beg="mixLearn">Learn first: Basics</button><button class="ghost" data-beg="mixBack">← Back</button></div></div>`;
    return;
  }
  const m=begMix.moves[i];const v=begMixView(m);const f=m[0];
  el.innerHTML=`<div class="beg-mix-pic"><svg id="begMixCube" viewBox="20 10 360 340" aria-hidden="true">${begMixPicSVG(begMixCubeAt(i),m)}</svg><span class="muted beg-small">${v.cap?esc(v.cap)+' ':''}The face that turns is bright. The rest is dim. The arrow shows the way.</span></div>
  <div class="beg-mix-body">
    <div class="row beg-mix-top"><span class="mono muted">Turn ${i+1} of ${n}</span><span class="beg-prog" aria-hidden="true"><i style="width:${Math.round(100*i/n)}%"></i></span><button class="ln-link" data-beg="letters">Show all ${n} as letters</button><button class="ln-link" data-beg="mixStop">Stop</button></div>
    <div class="beg-mix-turn"><span class="beg-tile${m.includes("'")?' mod':''}">${esc(m)}</span><div><h2 id="begMixTitle">${esc(begTurnTitle(m))}</h2><span class="beg-mix-sub">${esc(begTurnText(m))}</span></div></div>
    <p class="muted">Hold the rest of the cube still. Only the one face moves. The picture shows the result when you press Next.</p>
    <div class="row beg-mix-act"><button data-beg="mixBack"${i?'':' disabled'}>← Back</button><button class="primary big" data-beg="mixNext">Next turn →</button><button class="ghost" data-beg="mixEnd">Skip to the end</button></div>
    <div class="beg-key-line"><span><b class="mono">${esc(f.toUpperCase())}</b> is the ${esc(BEG_FACE_WORD[f.toUpperCase()])} face. The six letters: U top, D bottom, F front, B back, R right, L left.</span>${puzzleN()===4?'<span>Two letters, like <b class="mono">Rr</b>, turn the face and the slice behind it as one.</span>':''}<span><b class="mono mod">${esc(f)}'</b> with a mark means counterclockwise.</span><span><b class="mono">${esc(f)}2</b> with a 2 means twice: a half turn.</span></div>
  </div>`;
}
// Go to turn i. anim: play the turn just done on the picture, then show the next step.
function begMixGo(i,anim){
  const n=begMix.moves.length,from=begMix.i;i=Math.max(0,Math.min(n,i));
  const m=begMix.moves[from];const cube=anim&&i===from+1&&m?begMixCubeAt(from):null;
  begMix.i=i;renderBegMix();
  if(cube)begMixAnimate(cube,m);
}
function begMixAnimate(cube,m){
  const svg=$('#begMixCube');if(!svg||typeof requestAnimationFrame!=='function')return;
  try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;}catch(e){}
  const v=begMixView(m);const final=svg.innerHTML;const t0=performance.now();
  if(begMix.anim)cancelAnimationFrame(begMix.anim);
  const step=()=>{const t=Math.min(1,(performance.now()-t0)/500);
    if(t>=1){svg.innerHTML=final;begMix.anim=0;return;}
    svg.innerHTML=renderCube3D(cube.toFacelets(),{yaw:v.yaw,pitch:v.pitch,scale:52,move:m,t:Math.max(t,0.01)});
    begMix.anim=requestAnimationFrame(step);};
  begMix.anim=requestAnimationFrame(step);
}

// ---------- actions ----------
function begAction(a){
  if(a==='scan'){if(typeof openScan==='function')openScan();}
  else if(a==='paint'){if(typeof openPaint==='function')openPaint();}
  else if(a==='mix')begMixStart();
  else if(a==='screen'){newScramble();if(typeof startGuide==='function')startGuide();}
  else if(a==='letters'){showBegLetters();focusPlayer();}
  else if(a==='solveNow')begSolveNow();
  else if(a==='mixBack')begMixGo(begMix.i-1);
  else if(a==='mixNext')begMixGo(begMix.i+1,true);
  else if(a==='mixEnd')begMixGo(begMix.moves.length);
  else if(a==='mixStop')begMixEnd(false);
  else if(a==='mixSolve'){begMixEnd(true);if(typeof startGuide==='function')startGuide();}
  else if(a==='mixLearn'){begMixEnd(true);if(typeof openLesson==='function')openLesson(0);}
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-beg]');if(!b||b.disabled)return;begAction(b.dataset.beg);});

// ---------- the Key panel ----------
function setKey(on){
  if(on)document.body.setAttribute('data-key','');else document.body.removeAttribute('data-key');
  store.set('begKey',!!on);const b=$('#keyBtn');if(b)b.setAttribute('aria-expanded',String(!!on));
}
$('#keyBtn').onclick=()=>setKey(!document.body.hasAttribute('data-key'));
$('#keyLesson').onclick=()=>{if(typeof openLesson==='function')openLesson(0);};
setKey(store.get('begKey',true));

// ---------- events ----------
document.addEventListener('cw:sequence',()=>{if(isBeg())setBegView('player');});
document.addEventListener('cw:scramble',()=>{
  if(begMix.on&&!begMix.own){begMix.on=false;if(document.body.dataset.begview==='mix')setBegView('ask');}
  // A cube from the scan or paint dialog is the user's own cube. A new seed is not.
  begState.known=!!document.querySelector('.modal-bg');
  renderBegAsk();
});
document.addEventListener('cw:status',renderBegNext);
document.addEventListener('cw:method',()=>{renderBegNext();renderBegAsk();stopAuto();renderBegBar();});
document.addEventListener('cw:tab',()=>{if(begState.letters){begState.letters=false;if(!seqState.drill)showForTab();}});

// boot. paint.js loads later, so the cards render again once every script is in.
renderBegNext();renderBegAsk();
window.addEventListener('load',renderBegAsk);
if(isBeg())showForTab();
