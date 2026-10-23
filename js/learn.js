// ===== Beginner mode: the Learn tab (the step list and the lessons) and the Cheat sheet =====
// Loads after beginner-ui.js. Fills #tab-learn and #tab-cheat at load. Defines openLesson(n).
// Every "Show" button loads a drill into the player: the current scramble is kept.
// Data: BEGINNER_STEPS, BEGINNER_ALGS and beginnerChunks (js/beginner.js).
// All markup is built from fixed strings and the method data; every dynamic string goes through esc().

// ---------- cubes for the pictures and the drills ----------
// The solved cube as step n holds it, from the pack (js/beginner-ui.js): yellow up for most 3×3
// steps, white up for the white corners; white up for the 2×2 top layer, yellow up after it.
function lnFrame(n){return begPack().frame(n);}
// The goal of each step, from one fixed example solve. Computed once per pack, on first use.
const lnGoalCache={};
function lnGoals(){
  const pk=begPack();if(lnGoalCache[pk.id])return lnGoalCache[pk.id];
  let c=pk.lessonStart();let up=pk.startUp;
  const plan=pk.solve(c);const g=[pk.frame(0)];
  for(const st of plan.stages){
    for(const p of st.parts){if(p.up!==up){c=applyAlg(c,['z2']);up=p.up;}if(p.pre)c=applyAlg(c,parseAlg(p.pre));if(p.moves.length)c=applyAlg(c,p.moves);}
    g[st.n]=pk.goalCube(st.n,c,up);}
  g[pk.count]=pk.frame(pk.count);lnGoalCache[pk.id]=g;return g;
}
// The cube a step's cases build on: the step's own hold, with what the pack adds (a daisy for
// the 3×3's first two steps, so the case moves bring a white edge up or down).
function lnCaseBase(n){return begPack().caseBase(n);}
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
// A picture from above (the top, front and right faces) or from below. `fade`, when given, keeps
// only those facelets bright and dims the rest (js/draw.js cubePolys).
const LN_PIC={scale:48,cx:200,cy:185};
function lnPic(cube,below,fade){const f=cube.toFacelets();
  return `<svg viewBox="40 30 320 300" aria-hidden="true">${renderCube3D(f,{yaw:-32,pitch:below?-34:28,...LN_PIC,fade})}</svg>`;}
const lnGoalBelow=n=>!!begPack().goalBelow[n]; // the white face is below: look from below
// The goal picture: every sticker carries its kind of piece, and a small figure stands in front
// of the cube at the end of a dashed line from the front face, so the front is clear when the
// front and the right are both in view. Lesson 0 leaves room round the cube for the rings.
function lnGoalView(n){return {yaw:-32,pitch:lnGoalBelow(n)?-34:28};}
function lnGoalBox(n){return n===0?'20 0 340 360':'40 30 320 300';}
function lnGoalSVG(n,v,fade,on){v=v||lnGoalView(n);const f=lnGoals()[n].toFacelets();
  return renderCube3D(f,{...v,...LN_PIC,fade,cls:i=>'pc-'+pieceKind(i,drawN())+(on&&on.has(i)?' hl-on':'')})+(fade?'':lnFrontMark(v));}
function lnFrontMark(v){
  const proj=p=>{const q=rot3(p,v.yaw,v.pitch);return [LN_PIC.cx+q[0]*LN_PIC.scale,LN_PIC.cy-q[1]*LN_PIC.scale];};
  const [x,y]=proj([0,0,5.3]),[ax,ay]=proj([0,0,1.7]),[bx,by]=proj([0,0,4.3]);const f=n=>n.toFixed(1);
  return `<g class="ln-front" aria-hidden="true"><line x1="${f(ax)}" y1="${f(ay)}" x2="${f(bx)}" y2="${f(by)}"/><circle cx="${f(x)}" cy="${f(y-13)}" r="8"/><path d="M${f(x-14)} ${f(y+12)}a14 14 0 0 1 28 0z"/><text x="${f(x)}" y="${f(y+27)}" text-anchor="middle">front</text></g>`;}
function lnGoalCap(n){return lnGoalBelow(n)?'Seen from below: the white face.':n===0?'The small figure is you. The face it looks at is the front.':'';}
// Where a sticker's cubie sits, in the units of js/draw.js: cubies at -1, 0, 1 on a 3×3.
function lnCubiePos(idx,n){const nn=n*n,g=FACE_GEOM[Math.floor(idx/nn)],p=idx%nn,hs=1.5/n;
  const cu=(p%n-(n-1)/2)*2*hs,cv=(Math.floor(p/n)-(n-1)/2)*2*hs;
  return [0,1,2].map(t=>+(g.n[t]*(1.5-hs)+g.r[t]*cu+g.d[t]*cv).toFixed(3));}
// The stickers at one cubie's 3D position, grouped: a center's one tile, an edge's two, a
// corner's three, whatever the puzzle size.
function lnCubieGroups(n){const cubies={};for(let i=0;i<6*n*n;i++){const k=lnCubiePos(i,n).join();(cubies[k]=cubies[k]||[]).push(i);}return cubies;}
// The stickers a lesson word lights, on `cube`: whole cubies, so an edge lights both its tiles.
// ycenter: the yellow center. wedges: the edges with white. top, middle, bottom: a layer.
function lnMarkSet(key,cube){
  const n=drawN();let f=cube.toFacelets();const to54=n===2?i=>TWO_FACELET[i]:i=>i;if(n===2&&f.length===54)f=TWO_FACELET.map(i=>f[i]);
  const top=1.5-1.5/n,cubies=lnCubieGroups(n);
  const out=new Set();
  for(const k in cubies){const ids=cubies[k],y=+k.split(',')[1];
    const on=key==='top'?y>top-1e-6:key==='bottom'?y<-top+1e-6:key==='middle'?Math.abs(y)<top-1e-6:
      key==='ycenter'?ids.length===1&&f[ids[0]]===3:key==='wedges'?ids.length===2&&ids.some(i=>f[i]===0):false;
    if(on)ids.forEach(i=>out.add(to54(i)));}
  return out;
}
// Cheat sheet thumbnails: which pieces a step's own move picks out, by the step's id. Centers
// (the master pack's first step) and edge pairing (its second) have no white or yellow to go by,
// so every cubie the moves touch stays bright; every other step keeps only the white or yellow
// ones, so a piece of another color that the moves also disturb stays dim.
function lnCaseMode(s){return s.id==='centers'?'center':s.id==='edges'?'any':undefined;}
// The cubies `moves` changes on `cube`, as facelet ids for cubePolys' `fade`: every cubie whose
// color differs before and after, kept to those with white or yellow unless `mode` says otherwise.
// null moves, or nothing to pick out, means the picture shows plain, with nothing dimmed.
function lnCaseLit(cube,moves,mode){
  const ms=Array.isArray(moves)?moves:parseAlg(moves||'');if(!ms.length)return null;
  const n=drawN(),after=applyAlg(cube,ms);const to54=n===2?i=>TWO_FACELET[i]:i=>i;
  let f0=cube.toFacelets(),f1=after.toFacelets();
  if(n===2&&f0.length===54){f0=TWO_FACELET.map(i=>f0[i]);f1=TWO_FACELET.map(i=>f1[i]);}
  const cubies=lnCubieGroups(n),changed=[],target=[];
  for(const k in cubies){const ids=cubies[k];
    if(mode==='center'?ids.length!==1:ids.length<2)continue;
    if(ids.some(i=>f0[i]!==f1[i])){changed.push(ids);if(mode!=='any'&&ids.some(i=>f0[i]===0||f0[i]===3))target.push(ids);}}
  const use=mode==='any'||mode==='center'?changed:(target.length?target:changed);
  if(!use.length)return null;
  const out=new Set();use.forEach(ids=>ids.forEach(i=>out.add(to54(i))));
  return out;
}
// A cheat sheet row's thumbnail: `cube` before the move, the piece or pieces it picks out kept
// bright. A fixed, small picture: the mobile Reference rows size it down with CSS.
function lnCsPic(cube,moves,mode){
  return `<span class="ln-cs-pic">${lnPic(cube,false,lnCaseLit(cube,moves,mode))}</span>`;
}
// Tap a word in the lesson text: those pieces stay bright, the rest dim for a moment. A kind of
// piece (center, edge, corner) lights by its class; any other word lights the set lnMarkSet gives.
const LN_KINDS=['center','edge','corner'];
function lnHighlight(kind){const pic=$('#tab-learn .ln-pic'),svg=$('#lnGoalSvg');if(!pic||!svg)return;lnDemoStop();lnRestoreGoal();
  const n=lnView.n;svg.innerHTML=LN_KINDS.includes(kind)?lnGoalSVG(n):lnGoalSVG(n,null,null,lnMarkSet(kind,lnGoals()[n]));
  delete pic.dataset.hl;void pic.offsetWidth;pic.dataset.hl=LN_KINDS.includes(kind)?kind:'on';
  clearTimeout(lnView.hlT);lnView.hlT=setTimeout(()=>{delete pic.dataset.hl;},2200);}
// Tap a letter: the cube keeps its view. The layer that moves stays bright, the rest dims, and a
// ring of arrows shows the turn. On the top, front and right the ring sits on the face. The left,
// bottom and back are hidden, so their ring sits in the plane of that face at the center of the
// cube, over the dimmed layers: above the bottom layer, right of the left one, in front of the back.
const LN_RING_AT={L:{at:[0,0,0],r:1.3},D:{at:[0,0,0],r:1.3},B:{at:[0,0,0],r:1.3}};
const LN_FACE_NAME={U:'top',D:'bottom',F:'front',B:'back',R:'right',L:'left'};
function lnTurnText(m){return `${m}: the ${LN_FACE_NAME[m[0]]} face turns ${m.endsWith("'")?'counterclockwise':'clockwise'}, as you look at it.`+(LN_RING_AT[m[0]]?' That face is hidden here. The ring shows the turn through the cube.':'');}
// The stickers of the cubies in the layer a face move turns.
function lnLayer(face){const g=FACE_GEOM['URFDLB'.indexOf(face)];const s=new Set();const n=drawN(),hs=1.5/n;
  for(let f=0;f<6;f++){const h=FACE_GEOM[f];for(let i=0;i<n;i++)for(let j=0;j<n;j++){
    const c=[0,1,2].map(t=>h.n[t]*(1.5-hs)+h.r[t]*(j-(n-1)/2)*2*hs+h.d[t]*(i-(n-1)/2)*2*hs);if(Math.abs(c[0]*g.n[0]+c[1]*g.n[1]+c[2]*g.n[2]-(1.5-hs))<1e-6)s.add(n*n*f+n*i+j);}}
  return s;}
function lnShowTurn(m){
  const svg=$('#lnGoalSvg'),cap=$('#lnGoalCap'),pic=$('#tab-learn .ln-pic');if(!svg||!LN_FACE_NAME[m[0]])return;lnDemoStop();
  const n=lnView.n,v=lnGoalView(n);
  delete pic.dataset.hl;svg.innerHTML=lnGoalSVG(n,v,lnLayer(m[0]))+turnRing(m,{...v,...LN_PIC,...LN_RING_AT[m[0]]});pic.dataset.turn=m;
  if(cap)cap.textContent=lnTurnText(m);
  clearTimeout(lnView.turnT);lnView.turnT=setTimeout(lnRestoreGoal,2800);
}
function lnRestoreGoal(){if(!lnView.turnT)return;clearTimeout(lnView.turnT);lnView.turnT=0;
  const svg=$('#lnGoalSvg'),cap=$('#lnGoalCap'),pic=$('#tab-learn .ln-pic');if(!svg||lnView.n==null)return;
  svg.innerHTML=lnGoalSVG(lnView.n);delete pic.dataset.turn;if(cap)cap.textContent=lnGoalCap(lnView.n);}

// ---------- the goal, made: the moves of a step's demo play on the goal picture ----------
// The picture starts on the goal with the demo moves undone and turns one move every two
// seconds (ms), so it ends on the goal. Only the pieces the step cares about stay bright.
// The caption tells what each part does, and the move tiles below mark the move that turns.
var lnDemo={on:false,t:0,raf:0,ms:2000}; // var: tests read it and set ms
const LN_DEMO_KEYS=['wedges','ycenter'];
function lnDemoFade(c){const s=new Set();for(const k of LN_DEMO_KEYS)for(const i of lnMarkSet(k,c))s.add(i);return s;}
function lnDemoDraw(c,move,t){const svg=$('#lnGoalSvg');if(!svg)return;const v=lnGoalView(lnView.n);
  svg.innerHTML=renderCube3D(c.toFacelets(),{...v,...LN_PIC,move,t,fade:lnDemoFade(c)})+lnFrontMark(v);}
function lnDemoCap(text){const cap=$('#lnGoalCap');if(cap)cap.textContent=text;}
function lnDemoMark(k){$$('#lnDemoMoves .m').forEach((e,i)=>{e.classList.toggle('cur',i===k);const li=e.closest('li');if(li)li.classList.toggle('cur',i===k);});}
function lnDemoBtn(text){const b=$('#tab-learn [data-ln="demo"]');if(b){b.textContent=text;b.title=text==='Skip'?'Stop the demo and show the goal':'Play the moves of this step on the goal picture';}}
// Stop the demo. With `done`, the picture shows the goal and the caption says so.
function lnDemoStop(done){
  const was=lnDemo.on;clearTimeout(lnDemo.t);if(lnDemo.raf&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(lnDemo.raf);
  lnDemo.on=false;lnDemo.raf=0;if(!was&&!done)return;
  const n=lnView.n,s=n==null?null:begPack().steps[n],svg=$('#lnGoalSvg');if(!s||!s.demo||!svg)return;
  svg.innerHTML=lnGoalSVG(n);lnDemoMark(-1);lnDemoCap(done?s.demo.end:lnGoalCap(n));lnDemoBtn('Watch');
}
function lnDemoPlay(){
  const n=lnView.n,s=begPack().steps[n];if(!s||!s.demo)return;lnDemoStop();lnRestoreGoal();
  const pic=$('#tab-learn .ln-pic');if(pic)delete pic.dataset.hl;
  const ms=parseAlg(s.demo.moves),caps={};let at=0;for(const [len,text] of s.demo.parts){caps[at]=text;at+=len;}
  const cubes=[applyAlg(lnGoals()[n],invertAlg(ms))];for(const m of ms)cubes.push(applyAlg(cubes[cubes.length-1],[m]));
  const smooth=!reducedMotion()&&typeof requestAnimationFrame==='function';
  const list=$('#lnDemoMoves');if(list)list.classList.remove('hidden');
  lnDemo.on=true;lnDemoBtn('Skip');lnDemoDraw(cubes[0]);lnDemoCap(s.demo.start);lnDemoMark(-1);
  // Move k: the layer turns for about half of the time, then the cube rests until the next move.
  const move=k=>{if(!lnDemo.on)return;if(k>=ms.length){lnDemoStop(true);return;}
    if(caps[k])lnDemoCap(caps[k]);lnDemoMark(k);
    const turn=lnDemo.ms*(ms[k].endsWith('2')?0.65:0.45),t0=performance.now();
    const step=()=>{if(!lnDemo.on)return;const x=Math.min(1,(performance.now()-t0)/turn);
      if(x<1){lnDemoDraw(cubes[k],ms[k],0.5-0.5*Math.cos(Math.PI*x));lnDemo.raf=requestAnimationFrame(step);}
      else{lnDemo.raf=0;lnDemoDraw(cubes[k+1]);}};
    if(smooth)step();else lnDemoDraw(cubes[k+1]);
    lnDemo.t=setTimeout(()=>move(k+1),lnDemo.ms);};
  lnDemo.t=setTimeout(()=>move(0),lnDemo.ms*0.75);
}

// ---------- small renderers ----------
// The demo moves under the goal. The goal shows the step solved, so the moves stay hidden until
// Watch plays them. With a `list`, each move is a row that says what it does.
function lnDemoMoves(d){
  if(!d.list)return `<div class="ln-demo hidden" id="lnDemoMoves">${lnTiles(d.moves)}</div>`;
  const row=([m,text])=>`<li><span class="ms"><span class="m">${fmtMove(m)}</span></span><span>${esc(text)}</span></li>`;
  return `<ol class="ln-demo ln-demo-list hidden" id="lnDemoMoves">${d.list.map(r=>r.group?`<li class="grp"><b>${esc(r.group)}</b><ol>${r.rows.map(row).join('')}</ol></li>`:row(r)).join('')}</ol>`;
}
const lnStepNo=s=>s.n===0?'Basics':'Step '+s.n;
const lnStatus=n=>begProgress.status(n);
// Move tiles. The guide's algorithms inside the moves show as boxes with their name.
function lnTiles(moves,big){
  const ms=Array.isArray(moves)?moves:parseAlg(moves);const ch=begPack().chunks(ms);let out='';
  for(let i=0;i<ms.length;i++){
    const c=ch.find(x=>x.at===i);
    if(c){out+=`<span class="trig"><b class="lbl">${esc(c.label)}</b>${ms.slice(i,i+c.len).map(m=>`<span class="m">${fmtMove(m)}</span>`).join('')}</span>`;i+=c.len-1;}
    else out+=`<span class="m">${fmtMove(ms[i])}</span>`;
  }
  return `<span class="ms${big?' big':''}">${out}</span>`;
}
// Move tiles with no chunk boxes: for a row that already names its own algorithm once, as its
// own heading, so the tiles need not repeat the name in a dashed box.
function lnPlainTiles(moves,big){
  const ms=Array.isArray(moves)?moves:parseAlg(moves);
  return `<span class="ms${big?' big':''}">${ms.map(m=>`<span class="m">${fmtMove(m)}</span>`).join('')}</span>`;
}
// The face thumb on a step card: the step's goal, as seen from above. '.' is a gray tile.
function lnFace(id){const p=begPack().faces[id]||'.'.repeat(puzzleN()*puzzleN());
  return `<span class="face${p.length===4?' f2':p.length===16?' f4':''}" aria-hidden="true">${[...p].map(ch=>`<i${ch==='.'?'':` class="${ch}"`}></i>`).join('')}</span>`;}
// The algorithm names a step uses.
function lnUses(s){return s.algs?s.algs.map(a=>begPack().algs[a].name).join(' · '):'';}
function lnTag(st){return `<span class="tag ln-tag ${esc(st)}">${esc(st||'unlearned')}</span>`;}

// ---------- the Learn home: the nine steps ----------
const lnView={n:null,why:new Set(),hlT:0,turnT:0}; // n: the open lesson, or null for the step list
// Up next and the way a real cube gets in live above the tabs, in the beginner home (js/beghome.js).
function lnHomeHTML(){
  const pk=begPack();const nx=begProgress.next();
  const cards=pk.steps.map(s=>{const st=lnStatus(s.n),cur=nx&&nx.n===s.n,uses=lnUses(s);
    return `<button class="bstep${cur?' cur':''}" data-ln="open" data-n="${s.n}" title="Open the lesson: ${esc(lnStepNo(s))}, ${esc(s.name)}">${lnFace(s.id)}<span class="body"><span class="n">${esc(lnStepNo(s))}${cur?' · up next':''}</span><br><b>${esc(s.name)}</b>${uses?` <span class="muted ln-uses">· ${esc(uses)}</span>`:''}<br><span class="desc">${esc(s.goal)}</span></span>${lnTag(st)}</button>`;}).join('');
  return `<div class="panel ln-intro"><div><h2>Learn: the ${pk.word} steps</h2><p class="muted">Do them in order, or tap any step. Each lesson shows the goal, the moves, and the cases you will meet. Mark a step finished when you can do it without the app.</p></div></div>
  <div class="panel ln-steps"><div class="ln-mob ln-listhead"><b>Learn</b><span class="muted">tap a step</span></div>${cards}</div>
  <div class="panel ln-foot"><div><b>Finished all ${pk.word}?</b> <span class="muted">${esc(pk.next.foot)}</span></div><button class="small" data-ln="next" title="Switch the method to ${esc(pk.next.name)}">${esc(pk.next.btn)}</button></div>`;
}

// ---------- a lesson ----------
const LN_FACE_WORDS=[['U','the top face (up)'],['D','the bottom face (down)'],['F','the front face'],['B','the back face'],['R','the right face'],['L','the left face']];
// Lesson text with action words: the first time a word of the step's marks (s.kinds for the basics,
// s.marks for the others: [word, key]) shows, it is a button that lights those pieces on the goal
// cube. `used` keeps the words already made buttons, across the What, How and note texts.
function lnMarked(text,s,used){
  const acts=[];let out=esc(text);
  for(const [word,key] of (s.kinds||s.marks||[])){if(used.has(word))continue;
    out=out.replace(new RegExp('\\b'+word+'s?\\b'),w=>{used.add(word);acts.push(`<button class="ln-act" data-ln="hl" data-kind="${esc(key)}" title="Show the ${esc(LN_KINDS.includes(key)?key+"s":word)} on the goal cube">${w}</button>`);return '\u0000'+(acts.length-1)+'\u0000';});}
  return out.replace(/\u0000(\d+)\u0000/g,(_,i)=>acts[+i]);
}
// The six moves: each letter and its mark are buttons that show the turn on the goal cube.
// The basics show them in the text column, right after How, so no space opens beside the goal.
function lnSixMoves(){
  const tile=m=>`<button class="m ln-mv" data-ln="face" data-m="${esc(m)}" title="Show ${esc(m)} on the goal cube">${fmtMove(m)}</button>`;
  return `<div class="ln-panel ln-six"><h3>The six moves</h3><p>Each letter turns one face a quarter turn, clockwise as you look at that face. A letter with a mark, such as <span class="ms"><span class="m">${fmtMove("R'")}</span></span>, turns the other way. Tap a letter to see the turn on the goal cube.</p>
    <ul class="ln-faces">${LN_FACE_WORDS.map(([m,w])=>`<li><span class="ms">${tile(m)}${tile(m+"'")}</span><span>${esc(w)}</span></li>`).join('')}</ul>
    <div class="row"><button class="small" data-ln="moves" title="Load the six moves into the player as a drill">Show the six moves on the cube at the top of the page</button></div></div>`;
}
function lnLessonHTML(n){
  const pk=begPack();const s=pk.steps[n];const st=lnStatus(n);const prev=pk.steps[n-1],next=pk.steps[n+1];
  const head=`<div class="panel ln-head"><div class="ln-title"><button class="ln-link" data-ln="list" title="Back to the list of steps">← All steps</button><div class="mono muted ln-of">${n===0?'Basics':`Step ${n} of ${pk.count}`}</div><h2>${esc(s.name)}</h2></div>
    <div class="row ln-nav"><span class="ln-st">${stBtn(begStatusId(n))}<span class="muted ln-hint">tap to change</span></span>${prev?`<button class="small" data-ln="open" data-n="${prev.n}" title="Open ${esc(lnStepNo(prev))}: ${esc(prev.name)}">← ${esc(lnStepNo(prev))}</button>`:''}${next?`<button class="small primary" data-ln="open" data-n="${next.n}" title="Open ${esc(lnStepNo(next))}: ${esc(next.name)}">${esc(lnStepNo(next))} →</button>`:''}</div></div>`;
  const goal=s.goals?`<ul class="ln-goals">${s.goals.map(g=>`<li>${esc(g)}</li>`).join('')}</ul>`:`<p class="muted">${esc(s.goal)}</p>`;
  const used=new Set(),marked=!!(s.kinds||s.marks);
  const tapNote=marked?`<p class="muted ln-small">${n===0?'Tap a kind of piece to see it on the goal cube.':'Tap an underlined word to see those pieces on the goal cube.'}</p>`:'';
  // Watch sits on the picture, top right. While the demo plays it says Skip, which jumps to the goal.
  const demo=s.demo?lnDemoMoves(s.demo):'',watch=s.demo?'<button class="small ln-watch" data-ln="demo" title="Play the moves of this step on the goal picture">Watch</button>':'';
  let moves='';
  if(s.algs)moves+=`<div class="${s.algsInText?'':'panel '}ln-panel"><h3>The algorithm${s.algs.length>1?'s':''}</h3><div class="ln-algs">${s.algs.map(id=>{const a=pk.algs[id];const open=lnView.why.has(id);
    return `<div class="ln-box"><b>${esc(a.name)}</b>${a.when?`<div class="ln-when">${esc(a.when)}</div>`:''}${lnTiles(a.alg,true)}<div class="ln-say">Say it as: <b>${esc(a.say)}</b></div><div class="row"><button class="small" data-ln="alg" data-id="${esc(id)}" title="Load this algorithm into the player as a drill">Show on the cube</button>${a.why?`<button class="small ghost" data-ln="why" data-id="${esc(id)}" aria-expanded="${open}" title="${open?'Hide':'Show'} why the algorithm works">Why it works</button>`:''}</div>${open?`<p class="ln-why">${esc(a.why)}</p>`:''}</div>`;}).join('')}</div></div>`;
  const what=`<div class="panel ln-what"><div class="ln-text"><div><h3>What you do</h3><p>${lnMarked(s.what,s,used)}</p>${tapNote}</div><div><h3>How</h3><p>${lnMarked(s.how,s,used)}</p></div><div class="note">${lnMarked(s.note,s,used)}</div>${n===0?lnSixMoves():''}${s.algsInText?moves:''}</div>
    <div class="ln-goal"><h3>Goal for this step</h3>${goal}<div class="ln-pic"><svg id="lnGoalSvg" viewBox="${lnGoalBox(n)}" aria-hidden="true">${lnGoalSVG(n)}</svg>${watch}</div><div class="muted ln-cap" id="lnGoalCap" aria-live="polite">${esc(lnGoalCap(n))}</div>${demo}</div></div>`;
  const cases=s.cases?`<div class="panel ln-panel"><div class="row ln-ch"><h3>${esc(pk.caseTitles[n]||'Where you find the piece, and what to do')}</h3><span class="muted ln-small">Show puts the case on the cube</span></div>
    ${s.cases.map((c,i)=>{const ms=parseAlg(c.moves||'');
      return `<div class="ln-case"><div class="ln-cpic">${ms.length?lnPic(lnCaseStart(n,c),false):''}</div><div class="ln-cbody"><b>${esc(c.name)}</b><div class="muted">${esc(c.text)}</div>${ms.length?`<div class="ln-cmoves">${lnTiles(ms)}</div>`:''}</div>${ms.length?`<button class="small" data-ln="case" data-i="${i}" title="Put this case on the cube in the player">Show</button>`:''}</div>`;}).join('')}</div>`:'';
  const done=st==='finished';
  const nextBtn=next?`<button class="primary" data-ln="open" data-n="${next.n}" title="Open ${esc(lnStepNo(next))}: ${esc(next.name)}">Next: ${esc(lnStepNo(next))}, ${esc(next.name)} →</button>`:'';
  const ask=n===0?'<b>Mark finished if this makes sense to you.</b> <span class="muted">You can always come back!</span>':'<b>Can you do this step on your own cube?</b> <span class="muted">Mark it finished. You can always come back.</span>';
  const end=`<div class="panel ln-foot"><div>${ask}</div>
    <div class="row"><button data-ln="mark" id="lnMark"${done?' disabled':''} title="${done?'This step is finished':'Mark this step finished. The status button above changes it back'}">${done?'Finished':'Mark finished'}</button>${nextBtn}</div></div>`;
  return head+what+(s.algsInText?'':moves)+(s.hideCases?'':cases)+end;
}

// ---------- render and actions ----------
function lnRender(){
  const t=$('#tab-learn');if(!t)return;lnDemoStop();clearTimeout(lnView.hlT);clearTimeout(lnView.turnT);lnView.turnT=0;
  if(lnView.n==null){t.innerHTML=lnHomeHTML();delete document.body.dataset.lesson;}
  else{t.innerHTML=lnLessonHTML(lnView.n);document.body.dataset.lesson='1';}
}
// Scroll so the top of `el` (the Learn section by default) sits under the top bar.
function lnScrollTop(el,smooth){const t=el||$('#tab-learn');if(!t)return;
  const bar=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--toph'))||58;
  const top=t.getBoundingClientRect().top+window.scrollY-bar-8;
  try{window.scrollTo({top:Math.max(0,top),behavior:smooth&&!reducedMotion()?'smooth':'auto'});}catch(e){}}
function openLesson(n){n=Math.max(0,Math.min(begPack().count,Math.round(+n)||0));if(curTab!=='learn')goTab('learn');lnView.n=n;lnView.why.clear();lnRender();lnScrollTop();}
function lnShowList(){lnView.n=null;lnRender();lnScrollTop();}
// "Mark finished" goes through the status button's own path, so every view follows.
function lnMarkFinished(n){const id=begStatusId(n);for(let i=0;i<3&&llState.status[id]!=='finished';i++)cycleStatus(id);}
$('#tab-learn').addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-ln]');if(!b||e.target.closest('.stbtn'))return;
  const pk=begPack();const n=lnView.n,s=pk.steps[n],act=b.dataset.ln;
  if(act==='open')openLesson(+b.dataset.n);
  else if(act==='list')lnShowList();
  else if(act==='next')setMethod(pk.next.method);
  else if(act==='mark')lnMarkFinished(n);
  else if(act==='demo'){if(lnDemo.on)lnDemoStop(true);else{lnDemoPlay();lnScrollTop($('#tab-learn .ln-pic'),true);}}
  else if(act==='moves'){const six=['U','D','F','B','R','L'];lnDrill(six,'the six moves, from the lesson',lnSetup(lnFrame(0),six),'Lesson: the six moves');}
  else if(act==='hl')lnHighlight(b.dataset.kind);
  else if(act==='face')lnShowTurn(b.dataset.m);
  else if(act==='why'){const id=b.dataset.id;if(lnView.why.has(id))lnView.why.delete(id);else lnView.why.add(id);lnRender();}
  else if(act==='alg'){const a=pk.algs[b.dataset.id];lnDrill(a.alg,a.name+' algorithm, from the lesson',lnAlgStart(a),'Lesson: '+a.name);}
  else if(act==='case'){const c=s.cases[+b.dataset.i];lnDrill(c.moves,c.name+', from the lesson',lnCaseStart(n,c),'Lesson: '+lnStepNo(s).toLowerCase());}
});
document.addEventListener('cw:status',e=>{if(!/^(beg-|mini-|master-)/.test(String(e.detail)))return;
  const a=document.activeElement,refocus=a&&a.classList&&a.classList.contains('stbtn')&&a.closest('#tab-learn');
  lnRender();if(refocus){const b=$('#tab-learn .stbtn');if(b)b.focus({preventScroll:true});}});

// ---------- the Cheat sheet (the rules per step come from the pack) ----------
function lnCheatHTML(){
  const pk=begPack();const show=(kind,id)=>`<button class="small" data-cs="${kind}" data-id="${esc(id)}" title="Load this algorithm into the player as a drill">Show</button>`;
  const panels=pk.steps.filter(s=>s.n>0).map(s=>{const c=pk.cheat[s.n]||{};const mode=lnCaseMode(s);let body='';
    if(c.list)body+=`<ul class="ln-cs-list">${c.list.map(([t,m])=>{const start=lnSetup(lnCaseBase(s.n),parseAlg(m));
      return `<li class="ln-cs-row"><span class="ln-cs-pic">${lnPic(start,false,lnCaseLit(start,m,mode))}</span><span class="ln-cs-body"><span>${esc(t)}</span><span class="ln-cs-mv">${lnPlainTiles(m)}</span></span></li>`;}).join('')}</ul>`;
    if(s.algs)body+=s.algs.map(id=>{const a=pk.algs[id];const start=lnAlgStart(a);
      return `<div class="ln-cs-alg"><span class="ln-cs-pic">${lnPic(start,false,lnCaseLit(start,a.alg,mode))}</span><span class="ln-cs-body"><b>${esc(a.name)}</b><span class="muted">${esc(a.when||a.say)}</span><span class="ln-cs-mv">${lnPlainTiles(a.alg)}</span></span>${show('alg',id)}</div>`;}).join('');
    return `<div class="panel ln-cs-step" data-n="${s.n}"><h3><span class="mono muted">Step ${s.n}</span> · ${esc(s.name)}</h3><p class="ln-cs-goal">${esc(s.goal)}</p>${body}<p class="ln-cs-rule">${esc(c.rule||s.how)}</p></div>`;}).join('');
  return `<div class="panel"><h2>Cheat sheet</h2><p class="muted">${esc(pk.cheatIntro)}</p></div><div class="ln-cs-grid">${panels}</div>`;
}
function lnRenderCheat(){const t=$('#tab-cheat');if(t)t.innerHTML=lnCheatHTML();}
$('#tab-cheat').addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-cs]');if(!b)return;const id=b.dataset.id;
  if(b.dataset.cs==='alg'){const a=begPack().algs[id];lnDrill(a.alg,a.name+' algorithm, from the cheat sheet',lnAlgStart(a),'Cheat sheet: '+a.name);}
});

lnRender();lnRenderCheat();
// Another method: the step list and the cheat sheet of its pack.
document.addEventListener('cw:method',()=>{lnView.n=null;lnView.why.clear();lnRender();lnRenderCheat();});
// A click on the Learn rail button while a lesson is open goes back to the step list.
// openLesson switches the tab first and opens the lesson after, so it is not affected.
document.addEventListener('cw:tab',e=>{if(e.detail==='learn'&&lnView.n!=null)lnShowList();});
