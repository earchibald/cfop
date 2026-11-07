// ===== Trainer wins =====
// When your turn solves what a trainer asks for, the pieces just solved hop out with a soft glow and
// back (mainBump with bounce: TRAIN_WIN in app.js, 750 ms), and then the next drill comes:
//   Cross Trainer (Cross tab)  the four cross edges at home: the cross drill's next scramble; with
//                              Overlay on, the next cross on the screen (a smart cube too).
//   F2L Trainer, F2L-1         a pair it lit at home (the cross too): that pair glows, and the next
//                              pair lights after it. The last pair is the F2L solved.
//   F2L Trainer, F2L-2, F2L-3  the cross and the four pairs at home: the eight F2L pieces glow (and
//                              the cross edges in F2L-3).
//   The F2L solved: with Overlay on, a fresh drill (f2loNext): the screen's cube is not the cube
//   in your hands, so a smart cube gets one too. Else the F2L tab's next scramble.
//   F2L-1 with Overlay on (1.79): each pair solved (the pairs lit, with Two at once) brings the
//   fresh drill, the next of the 41 cases from the deck (f2lDeckDraw). A pair named in the Pair row
//   solved brings the next drill too.
//   The 41 cases (the F2L tab's third mode), with a trainer on or not (1.79): the case solved, the
//   next case from the deck (Next case).
// The next drill comes only where the page owns the cube: F2L's or Cross's Overlay, or the virtual
// cube's keys. A smart cube with neither is the cube in your hands, so it glows and you mix it again. A running
// timer waits for its stop (Next on stop). A turn that undoes the win before the glow ends keeps
// the drill. "Your turn" is cw:yourmove (the virtual cube's keys, a smart cube's turns), not a step
// of the player. Find the edges has a lift of its own when the fourth edge is found.
// A turn that comes during the glow ends the pieces' hop (each turn redraws the cube), so the whole
// cube shows the win too: a soft halo and the same double hop (#cube.twwin, css/app.css), on the
// element, which no redraw and no turn stops (1.78.1). It starts with the winning turn; the pieces
// hop once that turn's animation ends. The win lasts TRAIN_WIN.ms from the hop, or from the turn
// while you keep turning, so a smart cube turned on at speed still gets its next drill.
// TW.win: {pairs} while a glow shows; F2L-1 keeps those pairs lit (f2lTrainPairs) until it ends.
const TW={win:null,timer:0,lift:0};
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
  if(typeof f2lOnF2L!=='function'||!f2lOnF2L())return null;
  const done=f=>twCross(f,ci)&&twAllPairs(f,ci),home=(f,ps)=>ps.every(([a,b])=>f2lPairHome(f,ci,a,b));
  // The 41 cases: the case's pair solved, the F2L with it, with a trainer on or not.
  if(twCaseDrill()){if(done(fb)||!done(fn))return null;
    const pairs=f2ltPairs(ci).map(f2ltKeyColors).filter(p=>!home(fb,[p]));
    return {set:twPairStickers(fn,ci,pairs),pairs,done:true,goal:done};}
  if(typeof f2lTrainOn!=='function'||!f2lTrainOn())return null;
  const style=f2lTrainStyle();
  if(style===1){
    // The pairs lit before the turn and after it: the guide moves on to the next pair at once.
    const lit=f2lTrainPairs(fb),seen=new Map();for(const p of [...lit,...f2lTrainPairs(fn)])seen.set(f2ltKey(...p),p);
    const pairs=[...seen.values()].filter(p=>!home(fb,[p])&&home(fn,[p]));
    if(!pairs.length||!twCross(fn,ci))return null;
    // A drill per pair (1.79): with Overlay on, the pairs lit before the turn all solved bring the
    // next case; a pair named in the Pair row solved brings the next drill. Else the F2L solved.
    const id=typeof f2ltChoiceId==='function'?f2ltChoiceId():'guide',named=id!=='guide'&&!f2ltAuto(id);
    const each=named||typeof f2loOv==='function'&&f2loOv()&&home(fn,lit);
    if(each)return {set:twPairStickers(fn,ci,pairs),pairs,done:true,goal:f=>twCross(f,ci)&&home(f,pairs)};
    return {set:twPairStickers(fn,ci,pairs),pairs,done:done(fn),goal:done};}
  if(done(fb)||!done(fn))return null;
  const set=twPairStickers(fn,ci,f2ltPairs(ci).map(f2ltKeyColors));if(style===3)for(const i of twCrossStickers(fn,ci))set.add(i);
  return {set,done:true,goal:done};}
// Stop a glow (a new scramble, another tab): no next drill.
function twStop(){clearTimeout(TW.timer);clearTimeout(TW.lift);TW.timer=TW.lift=0;twPulse(false);if(TW.win){TW.win=null;mainBump(null);}}
// The whole cube's halo and hop, from the start again on each win.
function twPulse(on){const c=$('#cube');if(!c)return;c.classList.remove('twwin');if(!on)return;
  void c.getBoundingClientRect();c.style.setProperty('--twwin-ms',TRAIN_WIN.ms+'ms');c.classList.add('twwin');}
// A case of the 41 in the player (the F2L tab's third mode, Next case).
function twCaseDrill(){return typeof f2lState!=='undefined'&&f2lState.mode==='cases'&&typeof seqState!=='undefined'&&seqState.drill==='F2L case';}
function twTiming(){return typeof timer!=='undefined'&&(timer.state==='running'||timer.state==='inspecting');}
function twTurn(e){
  if(TW.win){twCut();return;}
  if(typeof displayedCube==='undefined'||!displayedCube)return;
  const d=e&&e.detail||{},moves=d.moves||[];if(!moves.length)return;
  const now=displayedCube,w=twJudge(applyAlg(now,parseAlg(invertAlg(moves))),now);if(!w)return;
  const src=d.src||'screen',tab=curTab;
  TW.win={pairs:w.pairs||null,t0:performance.now(),end:null};
  // The next drill: Overlay's fresh one, the next virtual cross, or the tab's next scramble for the virtual cube.
  const next=()=>{if(!w.done||curTab!==tab||twTiming()||!w.goal(displayedCube.toFacelets()))return;
    if(tab==='f2l'&&typeof f2loOv==='function'&&f2loOv()){f2loNext();return;}
    if(tab==='cross'&&typeof cxoOv==='function'&&cxoOv()){crossNewScramble();return;}
    if(src==='screen')nextForTab();};
  const end=()=>{clearTimeout(TW.lift);TW.timer=TW.lift=0;TW.win=null;twPulse(false);drawMain();next();};
  // The cube's pulse now; the pieces' glow once the turn on the picture ends, if no other turn came.
  TW.win.end=end;twPulse(true);TW.timer=setTimeout(end,TRAIN_WIN.ms);
  const turned=()=>typeof anim!=='undefined'&&anim.move;
  const go=()=>{TW.lift=0;if(!TW.win)return;if(turned()){TW.lift=setTimeout(go,30);return;}
    if(displayedCube!==now)return;
    mainBump(w.set,{bounce:true});clearTimeout(TW.timer);TW.timer=setTimeout(end,TRAIN_WIN.ms);};
  go();}
// A turn during a win stops the pieces' hop: the win then ends with the cube's pulse.
function twCut(){const W=TW.win;if(!W||!W.end)return;clearTimeout(TW.lift);TW.lift=0;
  clearTimeout(TW.timer);TW.timer=setTimeout(W.end,Math.max(0,W.t0+TRAIN_WIN.ms-performance.now()));}
document.addEventListener('cw:yourmove',twTurn);
for(const ev of ['cw:scramble','cw:tab','cw:method'])document.addEventListener(ev,twStop);
