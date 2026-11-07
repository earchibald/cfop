// ===== Your moves: the player follows the cube in your hands =====
// The hold row on the player cube (Top: white, yellow; Front: green, orange, blue, red) turns the
// picture to the way you hold the cube. A press of a tile puts no turn on the list. The keys of the
// virtual cube and the turns of a smart cube name the faces as the picture shows them: at your
// first move, the whole-cube turn to the hold goes on the list before it (cubePlayerTurn), so the
// list reads as you hold the cube. A press of the tile that is on puts the picture back as the
// player holds it (PLAYER.hold null).
// A smart cube's turns go on the player as your moves, as the virtual cube's keys do (cw:smartmoves
// from js/cubetab.js, cubePlayerTurn), while the cube on the page is the cube in your hands
// (liveInStep). When it is not, a note under the moves says so, with Use my cube. When a cube
// connects and is not in step, the cube in your hands becomes the scramble at once (liveConnected;
// 1.83.0: before, a question came up): nothing to press. In the beginner method the same, once,
// so the guided solve starts on the cube in your hands (liveBegConnected). The smart cube sheet reads
// its moves and its stage with the hold the picture shows (liveHoldSync), and a hold said to its
// Listen turns the picture (liveHoldFromTab).
// The tilt (1.76.0, js/tilt.js does the arithmetic): while a smart cube with a tilt sensor is the
// cube, the 3D picture turns as the cube turns in your hands (liveTiltRot, drawn by drawMain in
// js/app.js), a little closer each frame. The tilt turns the picture only: the moves and the stage
// still read by the hold (the hold row, PLAYER.hold, cubeTab.hold). Two gestures meet the two:
// R R' R R' (or R' R R' R) says "I hold the cube as the hold says", and the picture squares up to the
// hold; L L' L L' (or L' L L' L) says "the way I hold it now is the hold", and the hold becomes the one
// the picture is nearest, squared. A face is named by the picture first (the face it shows on the
// right or the left), then by the hold, so a gesture still works when the heading has drifted.
// While the picture sits in another hold than the moves read by, a line in the smart cube sheet says
// so (#cubeWinTilt). A tile of the hold row, or a hold said to Listen, squares the picture to the new
// hold. The Tilt chip on the cube turns it off and on (cw:smartTilt, on by default); it shows once
// a reading has come. A gen 3 cube has no tilt sensor: no chip, and nothing changes for it.
// The Cross tab's Check my plan follows the moves made on the player (a step back, then a move, backs
// out the moves after it), and moves typed there show on the player (crossFollow, crossTyped).
const PLAYER={hold:null}; // {top, front}: color indices, or null for the player's own hold
const LIVE={asked:false,typing:false,map:null};
const liveConj=q=>[-q[0],-q[1],-q[2],q[3]];
// An element: tag, attributes (class, id, title, type, ...), then children (text or elements).
function liveEl(tag,attrs,...kids){const x=document.createElement(tag);for(const [k,v] of Object.entries(attrs||{}))x.setAttribute(k,v);
  for(const k of kids)x.append(k);return x;}
// The hold of the 24 whose centers are `c`'s.
function liveHoldOf(c){return c&&c.center?CUBE_TAB_HOLD_BY.get(c.center.join())||null:null;}
// The picture's turn for the cube `P` under the hold row: rot (a matrix for renderCube3D) and the
// whole-cube moves that give the same cube for the net. Null when the picture is as P holds it.
function playerHoldView(P){
  if(!PLAYER.hold||!P||P.isFour||!P.center)return null;
  const hp=liveHoldOf(P),t=CUBE_TAB_HOLDS.find(h=>h.cube.center[0]===PLAYER.hold.top&&h.cube.center[2]===PLAYER.hold.front);
  if(!hp||!t||hp===t)return null;
  const moves=(CUBE_TAB_HOLDS.find(h=>applyAlg(P,h.moves).center.join()===t.cube.center.join())||{moves:[]}).moves;
  return {rot:quatMat(quatMul(t.q,liveConj(hp.q))),moves};
}
// The cube as the picture shows it: `P`, or the cube on the player by default.
function playerHeldCube(P=displayedCube){if(!P||P.isFour||!P.center)return null;const H=playerHoldView(P);return H?applyAlg(P,H.moves):P;}
// The tiles: one press sets that color on top (the front stays where it can) or in front (the top
// stays where it can, else white goes on top). A press of a tile that is on goes back to the
// player's own hold.
function playerHoldPick(place,c){
  const D=playerHeldCube(),cur=D?{top:D.center[0],front:D.center[2]}:{top:0,front:2};
  if(PLAYER.hold&&PLAYER.hold[place==='up'?'top':'front']===c)PLAYER.hold=null;
  else if(place==='up'){const front=cur.front!==c&&cur.front!==(c+3)%6?cur.front:CUBE_TAB_FRONTS.find(f=>f!==c&&f!==(c+3)%6);PLAYER.hold={top:c,front};}
  else{const top=cur.top!==c&&cur.top!==(c+3)%6?cur.top:0;PLAYER.hold={top,front:c};}
  if(liveTiltLive())liveTiltSquare(); // you hold the cube as the tile says
  if(view.mode==='net')setViewNet(false);else drawMain();playerHoldDraw();
}
// A tile is on when the picture shows that color there.
function playerHoldDraw(){
  const D=playerHeldCube();
  $$('#viewHold .ht').forEach(b=>{const at=b.parentNode.dataset.place==='up'?0:2;b.setAttribute('aria-pressed',String(!!D&&D.center[at]===+b.dataset.c));});
  const box=$('#viewHold');if(box)box.classList.toggle('held',!!PLAYER.hold);
  liveHoldSync();
}
// The smart cube sheet (js/cubetab.js) reads the moves and the stage as the picture holds the cube.
function liveHoldSync(){
  if(typeof cubeTab==='undefined'||typeof cubeTabSetHold!=='function'||isBeg())return;
  const D=playerHeldCube(),h=D&&liveHoldOf(D);if(h)cubeTabSetHold(h,true);
}
// A hold said to the sheet's Listen ("top yellow, front green", "x prime"): the picture turns to it.
function liveHoldFromTab(){
  const c=(cubeTab.hold||CUBE_TAB_HOLDS[0]).cube.center;PLAYER.hold={top:c[0],front:c[2]};
  if(liveTiltLive())liveTiltSquare();
  if(view.mode==='net')setViewNet(false);else drawMain();playerHoldDraw();
}
function playerHoldMount(){
  for(const [place,cs] of [['up',CUBE_TAB_TOPS],['front',CUBE_TAB_FRONTS]]){
    const g=$(`#viewHold .grp[data-place="${place}"]`);if(!g)continue;
    for(const c of cs){const name=COLOR_NAMES[c][0].toUpperCase()+COLOR_NAMES[c].slice(1),t=place==='up'?`${name} on top`:`${name} in front`;
      const b=liveEl('button',{type:'button',class:'ht','data-c':c,'data-cb':'WRGYOB'[c],'aria-label':t,title:`${t}: turn the picture to the way you hold the cube. No turn goes on the list. Press again for the player's hold`});
      b.style.setProperty('--c',stickerColor(c));b.onclick=()=>playerHoldPick(place,c);g.appendChild(b);}
  }
  playerHoldDraw();
}
// ----- the tilt: the picture turns with the smart cube in your hands -----
const TILT={on:store.get('smartTilt',true)!==false,tr:null,gest:null,q:null,qTo:null,raf:0,at:0,
  away:null,awayTimer:0,awayMs:800,awayDeg:55,backDeg:40,warn:false,said:'',saidTimer:0,saidMs:3500,line:null};
function liveTiltTracker(){if(!TILT.tr)TILT.tr=tiltTracker({holds:CUBE_TAB_HOLDS});if(!TILT.gest)TILT.gest=tiltGesture();return TILT.tr;}
// A reading has come since the cube connected: the cube has a tilt sensor.
function liveTiltHas(){return !!TILT.tr&&!!TILT.tr.state.basis&&liveOn()&&(typeof cubeSrc!=='function'||cubeSrc()==='smart');}
// Does the picture follow the tilt? The cube has one, Tilt is on, and the player shows the cube.
function liveTiltLive(){return TILT.on&&!!TILT.q&&liveTiltHas()&&view.mode==='3d';}
// The hold the picture shows when it does not follow the tilt: the one the moves read by.
function liveTiltHold(){const D=playerHeldCube();return (D&&liveHoldOf(D))||CUBE_TAB_HOLDS[0];}
// The picture's turn for the cube `P` on the player: the cube's pose (TILT.q, white up, green front
// turned as it sits in your hands), less the turn P's centers already have. Null when off.
function liveTiltRot(P){
  if(!liveTiltLive()||!P||!P.center)return null;const hp=liveHoldOf(P);if(!hp)return null;
  return quatMat(tiltMul(TILT.q,tiltConj(hp.q)));}
// A reading from the cube. The first one squares the picture to the hold.
function liveTiltGyro(q){
  const tr=liveTiltTracker(),first=!tr.state.basis;
  tr.feed(typeof performance!=='undefined'?performance.now():Date.now(),q);
  if(!tr.state.basis)tr.reset(liveTiltHold().q);
  TILT.qTo=tr.pose();
  if(first||!TILT.q){TILT.q=TILT.qTo;liveTiltDraw();if(liveTiltLive())drawMain();return;}
  liveTiltAwayCheck();
  if(liveTiltLive())liveTiltView();
}
// Turn the picture toward qTo, most of the way within a tenth of a second, drawn once a frame. A
// running layer turn or lift draws every frame already. Reduced motion: straight there.
function liveTiltView(){
  if(!TILT.qTo)return;
  const raf=typeof requestAnimationFrame==='function';
  if(!raf||reducedMotion()){TILT.q=TILT.qTo;if(!raf){drawMain();return;}}
  if(TILT.raf)return;
  TILT.at=performance.now();
  const step=()=>{
    const now=performance.now(),k=1-Math.exp(-(now-TILT.at)/70);TILT.at=now;
    TILT.q=tiltSlerp(TILT.q,TILT.qTo,k);
    const done=tiltAngle(TILT.q,TILT.qTo)<0.05;if(done)TILT.q=TILT.qTo;
    if(!anim.raf&&!mainLift)drawMain();
    TILT.raf=done?0:requestAnimationFrame(step);
  };
  TILT.raf=requestAnimationFrame(step);
}
// Square the picture to the hold the moves read by (R R' R R', a tile, a hold said to Listen).
function liveTiltSquare(){
  if(!liveTiltHas())return false;const h=liveTiltHold();TILT.tr.reset(h.q);TILT.qTo=TILT.tr.pose();
  liveTiltAwayClear();liveTiltView();return true;}
// L L' L L': the hold the picture is nearest becomes the hold, and the picture squares up to it. No
// turn goes on the list now; your next move puts the turn to the new hold before it, as a tile does.
function liveTiltAdopt(){
  if(!liveTiltHas())return null;const h=TILT.tr.adopt(CUBE_TAB_HOLDS);if(!h)return null;
  PLAYER.hold={top:h.cube.center[0],front:h.cube.center[2]};TILT.qTo=TILT.tr.pose();
  liveTiltAwayClear();if(view.mode==='net')setViewNet(false);else drawMain();playerHoldDraw();liveTiltView();return h;}
// A gesture on the cube's own face `f` (0 to 5, U R F D L B). The picture names the face first: the
// face it shows on your left is L, on your right R. Then the hold: a drifted heading still works.
function liveTiltGesture(f){
  if(!liveTiltLive())return;
  const Q=TILT.tr.pose(),rT=tiltFaceToward(Q,[1,0,0]),lT=tiltFaceToward(Q,[-1,0,0]),c=liveTiltHold().cube.center;
  if(f===lT||(f!==rT&&f!==c[1]&&f===c[4])){const h=liveTiltAdopt();if(h)liveTiltSay(`L L' L L': the moves now read with ${cubeTabHoldWords(h)}, as your cube sits.`);}
  else if(f===rT||f===c[1]){liveTiltSquare();const h=liveTiltHold();
    liveTiltSay(TILT.tr.state.level?`R R' R R': your cube sits with ${cubeTabHoldWords(tiltNearest(TILT.tr.pose(),CUBE_TAB_HOLDS))}, not ${cubeTabHoldWords(h)}. Hold it that way and turn R R' R R', or turn L L' L L' to keep it as it sits.`
      :`R R' R R': the picture is square, ${cubeTabHoldWords(h)}.`);}
}
// Is the picture in another hold than the moves read by? Past awayDeg from it and nearest another
// hold; back within backDeg, not away. The line shows after awayMs of it.
function liveTiltAwayCheck(){
  if(!liveTiltLive()){if(TILT.away)liveTiltAwayClear();return;}
  const hold=liveTiltHold(),deg=tiltAngle(TILT.qTo,hold.q);let away=TILT.away;
  if(deg>TILT.awayDeg){const n=tiltNearest(TILT.qTo,CUBE_TAB_HOLDS);away=n===hold?null:n;}
  else if(deg<TILT.backDeg||!away)away=null;
  if(away===TILT.away)return;
  TILT.away=away;clearTimeout(TILT.awayTimer);TILT.awayTimer=0;
  if(away)TILT.awayTimer=setTimeout(()=>{TILT.awayTimer=0;TILT.warn=true;liveTiltLine();},TILT.awayMs);
  else{TILT.warn=false;liveTiltLine();}
}
function liveTiltAwayClear(){clearTimeout(TILT.awayTimer);TILT.awayTimer=0;TILT.away=null;if(TILT.warn){TILT.warn=false;liveTiltLine();}}
// What a gesture did, on the line for a few seconds.
function liveTiltSay(t){TILT.said=t;clearTimeout(TILT.saidTimer);TILT.saidTimer=setTimeout(()=>{TILT.said='';liveTiltLine();},TILT.saidMs);liveTiltLine();}
// The line in the smart cube sheet: what a gesture did; else how the cube sits against the hold; else
// the two gestures. Written only when it changes: the sheet redraws often.
function liveTiltLine(){
  const el=document.getElementById('cubeWinTilt');if(!el)return;
  const live=liveTiltLive(),away=live&&TILT.warn&&TILT.away;
  const t=!live?'':TILT.said?TILT.said:away?`Your cube sits with ${cubeTabHoldWords(TILT.away)}. The moves read with ${cubeTabHoldWords(liveTiltHold())}. Turn L L' L L' to read them as it sits, or hold it as they read and turn R R' R R'.`
    :`The picture turns with your cube. R R' R R' squares it to the hold. L L' L L' makes the way you hold the cube the hold.`;
  const cls=!live?'':TILT.said?'done':away?'away':'';
  if(TILT.line===t+'|'+cls)return;TILT.line=t+'|'+cls;
  el.textContent=t;el.classList.toggle('hidden',!t);el.classList.toggle('away',cls==='away');el.classList.toggle('done',cls==='done');
}
// The Tilt chip: shown once the cube has sent a reading; pressed while the picture follows it.
function liveTiltDraw(){
  const b=document.getElementById('tiltBtn');
  if(b){b.classList.toggle('hidden',!(liveTiltHas()&&view.mode==='3d'));b.setAttribute('aria-pressed',String(TILT.on));
    const t=TILT.on?"Tilt: the picture turns as you turn your smart cube. R R' R R' squares it to the hold; L L' L L' makes the way you hold it the hold. Press to keep the picture on the hold":'The picture stays on the hold. Press to turn it as you turn your smart cube in your hands';
    if(b.title!==t)b.title=t;}
  liveTiltLine();
}
function liveTiltSet(on){
  TILT.on=!!on;store.set('smartTilt',TILT.on);
  if(TILT.on&&liveTiltHas()){TILT.tr.reset(liveTiltHold().q);TILT.q=TILT.qTo=TILT.tr.pose();}
  else{liveTiltAwayClear();if(TILT.raf){cancelAnimationFrame(TILT.raf);TILT.raf=0;}}
  liveTiltDraw();drawMain();
}
// A new link, or none: the cube's sensor starts its own frame again, so the heading goes.
function liveTiltForget(){
  if(TILT.tr)TILT.tr.clear();if(TILT.gest)TILT.gest.reset();
  if(TILT.raf&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(TILT.raf);
  TILT.raf=0;TILT.q=TILT.qTo=null;liveTiltAwayClear();TILT.said='';clearTimeout(TILT.saidTimer);liveTiltDraw();
}
// The moves of a smart cube, as the cube names them, for the gestures. Null: the moves are not known.
function liveTiltMoves(moves){
  if(!TILT.gest)return;if(!moves){TILT.gest.reset();return;}
  const now=typeof performance!=='undefined'?performance.now():Date.now();
  for(const m of moves){const f=TILT.gest.feed(now,m);if(f)liveTiltGesture(FACE_NAMES.indexOf(f));}
}
// ----- the smart cube on the player -----
function liveOn(){return typeof cubeTab!=='undefined'&&!!cubeTab.conn&&puzzleN()===3&&!isBeg();}
// The cube on the player turned back to white up, green front, as a smart cube names its state.
function liveNorm(c){const h=liveHoldOf(c);if(!h||c.isFour)return null;return h.moves.length?applyAlg(c,invertAlg(h.moves)):c;}
function liveSame(a,b){const n=liveNorm(a);return !!n&&!!b&&cubeTabKey(n)===cubeTabKey(b);}
function livePlayerCube(){return cubeAtSeq(seqState.idx);}
// Does the player show the cube in your hands?
function liveInStep(state){return !!state&&liveSame(livePlayerCube(),state);}
// A smart cube moved: from `from` to `to` by `moves` (the cube's own names), or a first state. The
// turns go on the home cube (app.js): on the player when it shows it, else on the kept home cube
// while a drill or a plan is in the player, so the cube of the page stays the cube in your hands on
// every tab. The F2L guide reads the cube too, and shows the same home cube.
function liveSmartMoves(d){
  if(d.from)liveTiltMoves(d.moves);
  if(!d.from&&!liveOn())liveBegConnected(d.to);
  if(!liveOn())return liveNoteDraw();
  if(!d.from){liveConnected(d.to);return liveNoteDraw();}
  if(d.moves&&liveInStep(d.from)){
    for(const m of d.moves){const P=playerHeldCube(livePlayerCube());cubePlayerTurn(FACE_NAMES[P.center.indexOf(FACE_NAMES.indexOf(m[0]))]+m.slice(1),'smart');}
  }else if(d.moves)liveHomeTurns(d);
  liveNoteDraw();
}
// The turns on the kept home cube, while the player shows something else.
function liveHomeTurns(d){const h=seqHome;if(!h||seqState.home||h.key!==homeKey())return false;
  let c=applyAlg(h.base,h.moves.slice(0,h.idx));if(!liveSame(c,d.from))return false;
  let moves=h.moves.slice(0,h.idx);if(h.yours==null||h.yours>h.idx)h.yours=h.idx;
  for(const m of d.moves){const P=playerHeldCube(c),x=FACE_NAMES[P.center.indexOf(FACE_NAMES.indexOf(m[0]))]+m.slice(1);
    const j=moves.length-1,y=j>=h.yours?seqJoin(moves[j],x):undefined;moves=y===undefined?moves.concat(x):moves.slice(0,j).concat(y?[y]:[]);c=applyAlg(c,[x]);}
  h.moves=moves;h.idx=moves.length;if(!/your moves/.test(h.label))h.label+=' · your moves';return true;}
// The first state after a connect: in step, nothing to do. Else the cube in your hands becomes the
// scramble, once per connect, with no question: the page follows the cube from here. The state
// comes in by hand: the sheet fires the event before it keeps the state (cubeTabShow).
function liveConnected(state){
  if(!state||LIVE.asked)return;
  LIVE.asked=true;
  if(!liveInStep(state))liveUse(state);
}
// The beginner method: the first state after a connect becomes the scramble, once, so the guided
// solve starts on the cube in your hands. The beginner pages do not follow the turns live.
function liveBegConnected(state){
  if(!state||LIVE.asked||!isBeg()||puzzleN()!==3||typeof cubeTab==='undefined'||!cubeTab.conn)return;
  LIVE.asked=true;
  if(scr.cube&&scr.cube.equals(state))return;
  scrambleFromCube(state,customName('smart'),true);
}
// Use my cube: the cube in your hands (`st`, or the state the sheet keeps) becomes the scramble, on
// the tab in view. A button passes its event: that is no cube.
function liveUse(st){if(typeof cxoEnd==='function'&&CXO.on){cxoEnd();if(typeof cxoDraw==='function')cxoDraw();}
  if(!st||!Array.isArray(st.cp))st=typeof cubeTab!=='undefined'&&cubeTab.target;if(!st)return;
  scrambleFromCube(liveReal(st),customName('smart'),true);liveNoteDraw();}
// ----- a screen cube that is not the cube in your hands: the map -----
// F2L Trainer's Overlay (js/f2ltrain.js) loads a scramble of its own while a smart cube is the cube.
// The screen's cube is then M · the cube in your hands, as the lab's drill draws setup · P0⁻¹ · P:
// M = setup · P0⁻¹, with P0 the cube in your hands at the start. Each state the smart cube sends
// goes on as M · state (cubeTabShow, liveMapIn), so the cube on the page, the sheet's stage and the
// F2L guide read the screen's cube, and each turn turns it as it turns your cube. The colors on the
// screen are not your cube's: you look at the screen. liveMapSet(null) ends it.
function liveMapIn(c){return LIVE.map&&c?LIVE.map.mul(c):c;}
// The cube in your hands, from a state as the page keeps it.
function liveReal(c){return LIVE.map&&c?LIVE.map.inverse().mul(c):c;}
// A new map, or none: the state kept is turned from the old map to the new.
function liveMapSet(M){const t=typeof cubeTab!=='undefined'?cubeTab.target:null,r=liveReal(t);
  LIVE.map=M||null;if(t){cubeTab.target=liveMapIn(r);if(typeof cubeTabStir==='function')cubeTabStir();}liveNoteDraw();}
// ----- a fresh start on a smart cube: New Cross, New F2L, New OLL · PLL -----
// While a smart cube is the cube and connected, Cross, F2L and OLL · PLL make no scramble: you
// scramble the cube in your hands, and New Cross (New F2L, New OLL · PLL) marks it, as it is now,
// as the start (liveUse). The New controls of the section take that label and that job
// (liveFreshDraw): the Cross lesson's New cross scramble button, the F2L New scramble buttons, the scramble pill,
// Scramble Info and the Solved! card. Next case keeps its drill. Next on stop marks nothing, as the
// cube is not scrambled yet. The Cross lesson's Length has no use: you make the scramble.
const LIVE_FRESH={cross:'New Cross',f2l:'New F2L',ll:'New OLL · PLL'};
const LIVE_FRESH_TIP='Scramble your smart cube first. Then press this: your cube as it is now becomes the start. The page makes no moves';
// The label of a fresh start on `tab` (the tab in view by default), or '' when New makes a scramble.
// Cross Trainer's Overlay (js/crosstrain.js) makes the scramble on the Cross tab: no fresh start there.
function liveFresh(tab){tab=tab||curTab;if(tab==='cross'&&typeof CXO!=='undefined'&&CXO.on)return '';
  return liveOn()&&!!cubeTab.target&&(typeof cubeSrc!=='function'||cubeSrc()==='smart')&&LIVE_FRESH[tab]||'';}
// A New control was pressed: mark the cube as the start, if this is a fresh start. True if it was.
function liveFreshGo(){if(!liveFresh())return false;liveUse();return true;}
// The New controls: the fresh label and tip, or their own. Each keeps its key badge.
function liveFreshDraw(){
  for(const [id,tab] of [['#crossNew','cross'],['#fgNew','f2l'],['#f2lNew','f2l'],['#scrPillNew',curTab]]){
    const b=$(id);if(!b||!b.firstChild)continue;
    if(b.dataset.label==null){b.dataset.label=b.firstChild.textContent;b.dataset.tip=b.title;}
    const l=liveFresh(tab),t=l||b.dataset.label,tip=l?LIVE_FRESH_TIP:b.dataset.tip;
    if(b.firstChild.textContent!==t)b.firstChild.textContent=t;if(b.title!==tip)b.title=tip;}
  const d=$('#crossDiff');if(!d)return;if(d.dataset.tip==null)d.dataset.tip=d.parentNode.title||'';
  const off=!!liveFresh('cross');d.disabled=off;d.parentNode.title=off?'Not with a smart cube: you scramble the cube yourself':d.dataset.tip;
}
// The note under the moves, while a smart cube is connected and the player shows another cube.
function liveNoteDraw(){
  let el=$('#liveNote');const st=typeof cubeTab!=='undefined'&&cubeTab.target;
  const show=liveOn()&&!!st&&!liveInStep(st);
  if(!el){if(!show)return;const head=$('#player .seqhead');if(!head)return;
    const b=liveEl('button',{class:'small',id:'liveNoteUse',title:'Make the cube in your hands the scramble'},'Use my cube');b.onclick=liveUse;
    el=liveEl('div',{id:'liveNote',class:'livenote'},liveEl('span',{},'Your smart cube is not at this cube. Turn it to match, or use it as it is.'),b);head.after(el);}
  el.hidden=!show;
}
// ----- the Cross tab: Check my plan follows the player -----
// Where your moves start on the player: after the scramble and its turn to the solving grip, or at
// the start of a plan typed in Check my plan. -1: the player shows something else.
function crossYourStart(){
  if(seqState.drill)return -1;const l=seqState.label||'';
  if(/^your cross plan/.test(l))return 0;
  if(/^scramble/.test(l)){const n=scr.moves.length+(crossRotation()?1:0);return seqState.moves.length>=n&&seqState.moves.slice(0,scr.moves.length).join(' ')===scr.moves.join(' ')?n:-1;}
  return -1;
}
// The moves from the start to the step in view, with a move and its undo taken off (cubeTabMerge).
function crossYourMoves(){const k=crossYourStart();if(k<0)return null;let out=[];for(const m of seqState.moves.slice(k,seqState.idx))out=/^[xyz]/.test(m)?out.concat(m):cubeTabMerge(out,m);return out;}
function crossFollow(){
  if(typeof curTab==='undefined'||curTab!=='cross'||LIVE.typing)return;const ms=crossYourMoves(),inp=$('#crossTry');if(!ms||!inp)return;
  const txt=ms.join(' ');if(inp.value.trim()===txt)return;inp.value=txt;
  crossCheckNow(true);
}
// Moves typed in Check my plan go on the player as they are typed, when they read as moves.
let crossTypeTimer=0;
function crossTyped(){clearTimeout(crossTypeTimer);crossTypeTimer=setTimeout(()=>{
  const v=$('#crossTry').value;let ms;try{ms=parseAlg(v);applyAlg(new Cube(),ms);}catch(e){return;}
  const {cube}=orientedScramble(),pc=phys(cube);LIVE.typing=true;
  try{setSequence(ms,'your cross plan · '+holdText(pc),pc);seqState.yours=0;}finally{LIVE.typing=false;}
  crossCheckNow(true);},250);}
if(typeof document!=='undefined'){
  playerHoldMount();
  document.addEventListener('cw:smartmoves',e=>liveSmartMoves(e.detail||{}));
  document.addEventListener('cw:smart',e=>{const d=e.detail||{},t=d.type;
    if(t==='gyro'){if(typeof cubeTab!=='undefined'&&d.conn===cubeTab.conn&&d.q)liveTiltGyro(d.q);return;}
    if(t==='connect'){LIVE.asked=false;liveHoldSync();}if(t==='disconnect'||t==='gone'||t==='connect'){liveTiltForget();liveNoteDraw();}});
  const tb=$('#tiltBtn');if(tb)tb.onclick=()=>liveTiltSet(!TILT.on);
  for(const ev of ['cw:tab','cw:method','cw:cubesrc'])document.addEventListener(ev,()=>{liveTiltDraw();if(TILT.q)drawMain();});
  for(const ev of ['cw:sequence','cw:scramble','cw:tab','cw:method'])document.addEventListener(ev,()=>{liveNoteDraw();playerHoldDraw();});
  for(const ev of ['cw:smart','cw:tab','cw:method','cw:cubesrc'])document.addEventListener(ev,liveFreshDraw);
  document.addEventListener('cw:step',playerHoldDraw);
  document.addEventListener('cw:yourmove',crossFollow);
  // A plan belongs to its scramble: a new one empties Check my plan.
  document.addEventListener('cw:scramble',()=>{const inp=$('#crossTry');if(inp)inp.value='';});
  const inp=$('#crossTry');if(inp)inp.addEventListener('input',crossTyped);
}
