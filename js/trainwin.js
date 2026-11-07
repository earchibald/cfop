// ===== Trainer wins =====
// When your turn solves what a trainer asks for, the pieces just solved hop out with a soft glow and
// back (mainBump with bounce: TRAIN_WIN in app.js, 750 ms), and then the next drill comes:
//   Cross Trainer (Cross tab)  the four cross edges at home: the cross drill's next scramble; with
//                              Virtual scramble on, the next virtual one (a smart cube too).
//   F2L Trainer, F2L-1         a pair it lit at home (the cross too): that pair glows, and the next
//                              pair lights after it. The last pair is the F2L solved.
//   F2L Trainer, F2L-2, F2L-3  the cross and the four pairs at home: the eight F2L pieces glow (and
//                              the cross edges in F2L-3).
//   The F2L solved: with Overlay on, a fresh drill (f2loNext): the screen's cube is not the cube
//   in your hands, so a smart cube gets one too. Else the F2L tab's next scramble.
// The next drill comes only where the page owns the cube: Overlay, Virtual scramble, or the virtual
// cube's keys. A smart cube with neither is the cube in your hands, so it glows and you mix it again. A running
// timer waits for its stop (Next on stop). A turn that undoes the win before the glow ends keeps
// the drill. "Your turn" is cw:yourmove (the virtual cube's keys, a smart cube's turns), not a step
// of the player. Find the edges has a lift of its own when the fourth edge is found.
// TW.win: {pairs} while a glow shows; F2L-1 keeps those pairs lit (f2lTrainPairs) until it ends.
const TW={win:null,timer:0};
function twCross(f,ci){return edgeFacelet.filter(e=>e.some(i=>f[i]===ci)).every(e=>f2lTrainHome(f,e));}
function twAllPairs(f,ci){return f2ltPairs(ci).every(k=>f2lPairHome(f,ci,...f2ltKeyColors(k)));}
// The stickers of the corner and the edge of each pair [a, b] in facelets f.
function twPairStickers(f,ci,pairs){const out=new Set(),has=(p,x)=>p.some(i=>f[i]===x);
  for(const [a,b] of pairs){for(const e of edgeFacelet)if(has(e,a)&&has(e,b))e.forEach(i=>out.add(i));
    for(const c of cornerFacelet)if(has(c,ci)&&has(c,a)&&has(c,b))c.forEach(i=>out.add(i));}return out;}
function twCrossStickers(f,ci){const out=new Set();for(const e of edgeFacelet)if(e.some(i=>f[i]===ci))e.forEach(i=>out.add(i));return out;}
// What a turn from cube `before` to cube `now` won, or null: {set, pairs, done, next}.
// done: the trainer's whole goal holds (the cross; the F2L), so a next drill can come.
function twJudge(before,now){
  const fb=before.toFacelets(),fn=now.toFacelets(),ci=crossColorIndex();
  if(typeof crossTrainOn==='function'&&crossTrainOn()&&crossOnCross()&&!CF.on){
    if(twCross(fb,ci)||!twCross(fn,ci))return null;
    return {set:twCrossStickers(fn,ci),done:true,goal:f=>twCross(f,ci)};}
  if(typeof f2lTrainOn!=='function'||!f2lTrainOn()||!f2lOnF2L())return null;
  const done=f=>twCross(f,ci)&&twAllPairs(f,ci),style=f2lTrainStyle();
  if(style===1){
    // The pairs lit before the turn and after it: the guide moves on to the next pair at once.
    const seen=new Map();for(const p of [...f2lTrainPairs(fb),...f2lTrainPairs(fn)])seen.set(f2ltKey(...p),p);
    const pairs=[...seen.values()].filter(([a,b])=>!f2lPairHome(fb,ci,a,b)&&f2lPairHome(fn,ci,a,b));
    if(!pairs.length||!twCross(fn,ci))return null;
    return {set:twPairStickers(fn,ci,pairs),pairs,done:done(fn),goal:done};}
  if(done(fb)||!done(fn))return null;
  const set=twPairStickers(fn,ci,f2ltPairs(ci).map(f2ltKeyColors));if(style===3)for(const i of twCrossStickers(fn,ci))set.add(i);
  return {set,done:true,goal:done};}
// Stop a glow (a new scramble, another tab): no next drill.
function twStop(){clearTimeout(TW.timer);TW.timer=0;if(TW.win){TW.win=null;mainBump(null);}}
function twTiming(){return typeof timer!=='undefined'&&(timer.state==='running'||timer.state==='inspecting');}
function twTurn(e){
  if(TW.win||typeof displayedCube==='undefined'||!displayedCube)return;
  const d=e&&e.detail||{},moves=d.moves||[];if(!moves.length)return;
  const now=displayedCube,w=twJudge(applyAlg(now,parseAlg(invertAlg(moves))),now);if(!w)return;
  const src=d.src||'screen',tab=curTab;
  TW.win={pairs:w.pairs||null};
  // The next drill: Overlay's fresh one, the next virtual cross, or the tab's next scramble for the virtual cube.
  const next=()=>{if(!w.done||curTab!==tab||twTiming()||!w.goal(displayedCube.toFacelets()))return;
    if(tab==='f2l'&&typeof f2loOv==='function'&&f2loOv()){f2loNext();return;}
    if(tab==='cross'&&typeof cxoOv==='function'&&cxoOv()){crossNewScramble();return;}
    if(src==='screen')nextForTab();};
  // The glow starts once the turn on the picture ends.
  const go=()=>{if(!TW.win)return;if(typeof anim!=='undefined'&&anim.move){TW.timer=setTimeout(go,30);return;}
    mainBump(w.set,{bounce:true});
    TW.timer=setTimeout(()=>{TW.timer=0;TW.win=null;drawMain();next();},TRAIN_WIN.ms);};
  go();}
document.addEventListener('cw:yourmove',twTurn);
for(const ev of ['cw:scramble','cw:tab','cw:method'])document.addEventListener(ev,twStop);
