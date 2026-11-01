// ================= The smart cube sheet =================
// A smart cube is one of the cubes on the page (cw:cubeSrc 'smart'), not a section of its own: the
// cube in every section follows it (js/live.js puts each turn on the player as your moves). This
// module keeps what a smart cube adds, in one panel of #everyMore, so it is an Everywhere sheet of
// the stage view (js/stageview.js) and sits under the timer elsewhere: the cube's name and charge,
// the stage of the solve, the last moves as a trail, Clear moves, and Listen (smart-listen.js).
// With Smart cube picked and no cube connected, the Connect card (#smartHome) takes its place: the
// chooser at once (the browser's own, or the list over the bridge, on the card); the connect itself
// is in smart-ui.js (smartConnect). A cube connected before connects with no click (smartAuto) while
// Smart cube is the cube; the look ends when another cube is picked.
// Versions 1.4 to 1.33 put the cube in the top bar, as a tab that opened a floating window. 1.35 to
// 1.63 made it tab 6 of the CFOP rail, with the cube large and the tilt, the hold row and the turn
// buttons under it. 1.64 folded the tab into the stage: the cube on the stage is the live cube.
// Disconnect in the dialog puts the Connect card back. When the link drops by itself (the cube went
// to sleep), the sheet stays, dimmed, and the page looks for the cube again by itself; Connect again
// opens the chooser. What the look says shows on the Connect card, or in the note of the dimmed
// sheet (`look`, from the cw:smart 'look' event).
// The dialog reports every change of the link as a cw:smart event (smart-ui.js); nothing here
// reaches into the dialog. All markup is fixed text in index.html; the cube's name goes in as text.
// `target` is the real cube, as far as the page knows. `moves` is every move since the cube
// connected, merged as they come (cubeTabMerge): R then R is R2, R then R' is nothing, so a turn
// back takes its move off the list. The sheet shows the last CUBE_TAB_SHOWN of them as a trail
// (js/trail.js); a range says there are more. Clear moves empties the list.
// The hold: the cube names its faces its own way (its white face is U however it sits). The moves
// and the stage read as the cube on the page shows it: the hold follows the player's picture
// (liveHoldSync in js/live.js: the scramble's grip, or a tile of the hold row), one of the 24
// CUBE_TAB_HOLDS, null for white up, green front. The moves then read as held (cubeTabRelabel): held
// white down (z2), the cube's R is the user's L. A hold said to Listen ("top yellow, front green"),
// or a whole-cube turn ("x prime", cubeTabTurn), turns the picture with it.
// The stage of a CFOP solve (cfopStage, stage.js): Cross, F2L, or the two-look case ("Sune") with
// its moves hidden. The stage is read only after the cube has been still for `stillMs` (1200); every
// `revealMs` (1500) more without a turn, one more move shows. A turn fades what is shown but leaves
// it there, until the cube is still again. A pause part way through the algorithm keeps the case,
// with the moves done so far marked (cfopStageDone); the same case read again (after a U turn, say)
// keeps the moves already revealed. The stage never falls back on its own: a reading further back
// than the stage shown (a Sune breaks the cross with its first move) keeps the stage,
// cubeTabBehind, until the cube is at or past it again, or more moves have gone by since it was
// read (`since`) than the user needs for it. A change of the hold with the cube still reads the
// stage again at once.
const cubeTab={conn:null,name:'',target:null,asked:false,want:false,moves:[],colors:[],hold:null,
  stage:null,done:0,revealed:0,stale:false,stillTimer:0,revealTimer:0,stillMs:1200,revealMs:1500,since:0,keepMoves:12,battery:null,look:''};
const CUBE_TAB_SHOWN=10;
// The tiles of the hold row (js/live.js): the top colors and the front colors, as color indices.
const CUBE_TAB_TOPS=[0,3],CUBE_TAB_FRONTS=[2,4,5,1];
// Is Smart cube the cube in use?
function cubeTabWanted(){return typeof store!=='undefined'&&store.get('cubeSrc',null)==='smart';}
// The sheet: live, off (the link dropped), or no cube (the Connect card, while Smart cube is picked).
function cubeTabRender(){
  const w=$('#cubeWin'),home=$('#smartHome');
  if(w)w.classList.toggle('hidden',!cubeTab.name);if(home)home.classList.toggle('hidden',!!cubeTab.name||!cubeTabWanted());
  // One list row for the look: on the Connect card, or under Connect again in the dimmed sheet.
  const list=$('#smartTabList');
  if(list&&home&&w){const at=cubeTab.name?$('#cubeWinAgain'):$('#smartTabStatus');if(at&&at.nextElementSibling!==list)at.after(list);}
  const st=$('#smartTabStatus');if(st)st.textContent=cubeTab.name?'':cubeTab.look;
}
// Connect: the chooser at once where the page can reach a cube; else the dialog, which offers the
// macOS app or says why the browser cannot connect.
function cubeTabConnect(){const m=smartMode();if(m==='bt'||m==='bridge')smartConnect({where:'tab'});else openSmart();}
// The look with no click: in CFOP, with Smart cube picked and no cube.
function cubeTabLook(){if(typeof method!=='undefined'&&method==='cfop'&&cubeTabWanted()&&!cubeTab.conn)smartAuto('show');}
// Another cube picked: the look the sheet began ends (a look from the dialog goes on).
function cubeTabSrc(){cubeTabRender();
  if(cubeTabWanted())cubeTabLook();else if(typeof smartLook!=='undefined'&&smartLook&&smartLook.where==='tab'&&smartLook.why==='show')smartLookStop('show');}
// ----- the sheet: wired once, at load -----
function cubeTabMount(){
  const w=$('#cubeWin');if(!w||w.dataset.ready)return;w.dataset.ready='1';
  $('#smartTabConnect').onclick=cubeTabConnect;
  $('#cubeWinOptions').onclick=()=>openSmart();
  $('#cubeWinConnect').onclick=cubeTabConnect;
  $('#cubeWinClear').onclick=cubeTabClear;
  if(typeof smartListenMount==='function')smartListenMount(); // the voice commands (smart-listen.js)
  document.addEventListener('cw:cubesrc',cubeTabSrc);
  document.addEventListener('cw:method',cubeTabLook);
  // The bridge can answer after the page loads (the page asks the app on load).
  document.addEventListener('cw:bridge',()=>{if(!cubeTab.conn)cubeTabLook();});
  cubeTabRender();cubeTabWindow();cubeTabLook();
}
// The sheet's text.
function cubeTabWindow(){
  const w=$('#cubeWin');if(!w)return;
  const off=!cubeTab.conn;
  w.classList.toggle('off',off);
  w.querySelector('.nm').textContent=cubeTab.name;
  smartBatteryDraw($('#cubeWinBatt'),off?null:cubeTab.battery);
  $('#cubeWinNote').textContent=off?(cubeTab.look||'The cube is no longer connected. Turn a face to wake it up, then connect again.'):!cubeTab.target?'Reading the cube.':`Live. The moves and the stage read with ${cubeTabHoldWords(cubeTab.hold)}, as the cube on the page shows it.`;
  $('#cubeWinAgain').classList.toggle('hidden',!off);
  const listen=$('#cubeWinListen');if(listen)listen.disabled=off;
  cubeTabMovesDraw();
  cubeTabStageDraw();
}
// ----- the hold -----
// Set the hold with no turn on the list: the moves still to come read as held. With the cube still,
// the stage is read again at once. `quiet`: from the player's picture, which is already there.
function cubeTabSetHold(h,quiet){
  const was=cubeTab.hold;cubeTab.hold=h&&h.moves.length?h:null;
  if(was===cubeTab.hold)return;
  if(!quiet&&typeof liveHoldFromTab==='function')liveHoldFromTab();
  if(!cubeTab.stillTimer&&cubeTab.target)cubeTabSettle();
  cubeTabWindow();
}
// Clear moves: the list is emptied. False when it was empty.
function cubeTabClear(){if(!cubeTab.moves.length)return false;cubeTab.moves=[];cubeTabMovesDraw();return true;}
// ----- the moves: every turn since the cube connected, merged -----
// The turn count of a move: R is 1, R2 is 2, R' is 3.
const cubeTabTurns=m=>m.endsWith('2')?2:m.endsWith("'")?3:1;
// `moves` with `m` added. The same face as the last move merges with it: the turns add up round
// the four, and no turns left takes the last move off. So R U R' U' done, then U R U' R' undoes it
// move by move, and the list is empty again. Returns a new list.
function cubeTabMerge(moves,m){
  const last=moves[moves.length-1];
  if(!last||last[0]!==m[0])return moves.concat(m);
  const t=(cubeTabTurns(last)+cubeTabTurns(m))%4;
  return moves.slice(0,-1).concat(t?[m[0]+['','','2',"'"][t]]:[]);
}
// A move as the cube names it (its white face is U), named by the face it sits at in the hold:
// the hold's centers say which of the cube's faces is at each place.
function cubeTabRelabel(m,hold){
  if(!hold||!hold.moves.length||!/^[URFDLB]/.test(m))return m;
  return FACE_NAMES[hold.cube.center.indexOf(FACE_NAMES.indexOf(m[0]))]+m.slice(1);
}
// Record the moves the cube made between two states, as held.
function cubeTabRecord(path){
  for(const m of path){
    const before=cubeTab.moves.length,r=cubeTabRelabel(m,cubeTab.hold);
    cubeTab.moves=cubeTabMerge(cubeTab.moves,r);
    cubeTab.colors=trailNote(cubeTab.colors,before,cubeTab.moves.length,trailColor(r,cubeTab.hold));
  }
  cubeTab.since+=path.length;
  cubeTabMovesDraw();
}
// The readout: the last CUBE_TAB_SHOWN moves as a trail (js/trail.js), Now, Recent and Earlier, each
// move in the color of the face it turned as the cube was held then (`colors`, kept as the moves come).
function cubeTabMovesDraw(){
  const el=$('#cubeWinMoves');if(!el)return;
  const clear=$('#cubeWinClear');if(clear)clear.disabled=!cubeTab.moves.length;
  cubeTab.colors=cubeTab.colors.slice(0,cubeTab.moves.length);
  trailDraw(el,cubeTab.moves,{shown:CUBE_TAB_SHOWN,colors:cubeTab.colors,colorOf:m=>trailColor(m,cubeTab.hold)});
}
// ----- live: a turn asks the cube for its state -----
// One request at a time. A turn during a request marks `want`, and the answer asks again, so the
// page ends on the real cube however fast the turns come.
function cubeTabAsk(){
  if(!cubeTab.conn)return;
  if(cubeTab.asked){cubeTab.want=true;return;}
  cubeTab.asked=true;
  cubeTab.conn.send('state').catch(()=>{cubeTab.asked=false;});
}
const CUBE_TAB_MOVES=['U',"U'",'U2','R',"R'",'R2','F',"F'",'F2','D',"D'",'D2','L',"L'",'L2','B',"B'",'B2'];
const cubeTabKey=c=>c.cp.join()+'/'+c.co.join()+'/'+c.ep.join()+'/'+c.eo.join();
// The shortest list of up to four moves that takes `from` to `to`: [] when they are equal, null
// when no such list exists. Two moves out from `from` meet two moves back from `to`. Under a
// millisecond, so it runs on every state message.
function cubeTabPath(from,to){
  if(!from||!to)return null;
  const inv=m=>m.endsWith("'")?m[0]:m.endsWith('2')?m:m+"'";
  const grow=layer=>{const next=[];for(const {c,ms} of layer)for(const m of CUBE_TAB_MOVES){if(ms.length&&ms[ms.length-1][0]===m[0])continue;next.push({c:applyAlg(c,[m]),ms:ms.concat(m)});}return next;};
  // back: the cubes one and two moves before `to`, each with the moves that lead from it to `to`
  const back=new Map();let bl=[{c:to,ms:[]}];
  for(let d=0;d<=2;d++){for(const {c,ms} of bl){const k=cubeTabKey(c);if(!back.has(k))back.set(k,ms.map(inv).reverse());}if(d<2)bl=grow(bl);}
  let layer=[{c:from,ms:[]}],best=null;
  for(let d=0;d<=2;d++){
    if(best&&best.length<=d)return best; // nothing from here on is shorter
    for(const {c,ms} of layer){const b=back.get(cubeTabKey(c));if(b&&(!best||ms.length+b.length<best.length))best=ms.concat(b);}
    if(best&&best.length<=d+1)return best;
    if(d<2)layer=grow(layer);
  }
  return best;
}
// The real cube's state came. Up to four moves past the last state, the moves go on the list; five
// or more apart, the moves are not known, and the list keeps what it has. The rest of the page
// follows the cube from here (cw:smartmoves, js/live.js).
function cubeTabShow(cube){
  const was=cubeTab.target,moved=cubeTabPath(was,cube);
  if(moved&&moved.length)cubeTabRecord(moved);
  if(!moved||moved.length)document.dispatchEvent(new CustomEvent('cw:smartmoves',{detail:{moves:moved,from:was,to:cube}}));
  if(!moved||moved.length)cubeTabStir(); // the cube changed; a state read again with no turn is not a turn
  cubeTab.target=cube;cubeTabWindow();
}
// ----- the hold: which way the cube sits in the hands -----
// Quaternions as [x,y,z,w]. quatMul(a,b) is a after b: its matrix is the matrix of a times the
// matrix of b. quatMat gives the 3×3 matrix (three rows) that draw.js takes as `rot` (js/live.js
// turns the player's picture with it).
function quatMul(a,b){const [ax,ay,az,aw]=a,[bx,by,bz,bw]=b;
  return [aw*bx+ax*bw+ay*bz-az*by,aw*by-ax*bz+ay*bw+az*bx,aw*bz+ax*by-ay*bx+az*bw,aw*bw-ax*bx-ay*by-az*bz];}
function quatNorm(q){const l=Math.hypot(...q)||1;return q.map(v=>v/l);}
function quatMat(q){const [x,y,z,w]=quatNorm(q);
  return [[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]];}
// The turns of the whole cube from hold a to hold b (null is white up, green front).
function cubeTabHoldDelta(a,b){const A=(a||CUBE_TAB_HOLDS[0]).cube,B=(b||CUBE_TAB_HOLDS[0]).cube;const h=CUBE_TAB_HOLD_BY.get(A.inverse().mul(B).center.join());return h?h.moves:[];}
// A hold in words: the center on top and the one in front.
function cubeTabHoldWords(h){const c=(h||CUBE_TAB_HOLDS[0]).cube.center;return `${COLOR_NAMES[c[0]]} up, ${COLOR_NAMES[c[2]]} in front`;}
// The 24 ways to hold a cube, each as the shortest turns from white up, green front (x, y, z and
// their primes and doubles), the cube after them (its centers say which of the cube's faces is at
// each place), and the turn of the body as a quaternion in the frame of draw.js. A quarter turn
// about an axis of draw.js is the prime of the move about that axis, and a later turn goes on
// the left (quatMul), as the renderer composes them.
const CUBE_TAB_HOLDS=(()=>{
  const s=Math.SQRT1_2,base={x:[-s,0,0,s],y:[0,-s,0,s],z:[0,0,-s,s]},conj=q=>[-q[0],-q[1],-q[2],q[3]];
  const qOf=m=>{const b=base[m[0]];return m.endsWith("'")?conj(b):m.endsWith('2')?quatMul(b,b):b;};
  const turns=['x','y','z',"x'","y'","z'",'x2','y2','z2'],out=[],seen=new Set();
  let layer=[{moves:[],cube:new Cube(),q:[0,0,0,1]}];
  while(layer.length){
    const next=[];
    for(const h of layer){const k=h.cube.center.join();if(seen.has(k))continue;seen.add(k);out.push(h);
      for(const m of turns)next.push({moves:h.moves.concat(m),cube:applyAlg(h.cube,[m]),q:quatMul(qOf(m),h.q)});}
    layer=next;
  }
  return out;
})();
const CUBE_TAB_HOLD_BY=new Map(CUBE_TAB_HOLDS.map(h=>[h.cube.center.join(),h]));
// The cube as held: the state the cube reports, turned the way it sits in the hands.
function cubeTabHeld(cube){return cube&&cubeTab.hold&&cubeTab.hold.moves.length?applyAlg(cube,cubeTab.hold.moves):cube;}
// A whole-cube turn said to Listen (x, y, z, a prime or a double): the hold moves on, the turn goes
// on the list (where y then y' takes both off), the picture turns with it, and the stage reads the
// new hold at once when the cube is still.
function cubeTabTurn(m){
  const from=cubeTab.hold||CUBE_TAB_HOLDS[0],h=CUBE_TAB_HOLD_BY.get(applyAlg(from.cube,[m]).center.join());
  if(!h)return;
  cubeTab.moves=cubeTabMerge(cubeTab.moves,m);
  cubeTabSetHold(h);cubeTabMovesDraw(); // a turn of the whole cube always changes the hold
}
// ----- the stage -----
// The cube turned (its state differs from the last one): fade the stage, and read it again once the
// cube has been still for stillMs. Only a change counts: a cube can send its state again on its
// own, and a state that matches must not put the reveals off.
function cubeTabStir(){
  clearTimeout(cubeTab.stillTimer);clearTimeout(cubeTab.revealTimer);cubeTab.revealTimer=0;
  if(cubeTab.stage&&!cubeTab.stale){cubeTab.stale=true;cubeTabStageDraw();}
  cubeTab.stillTimer=setTimeout(cubeTabSettle,cubeTab.stillMs);
}
// The cube is still: read the stage. Part way through the algorithm shown, the case stays and the
// moves done are marked; otherwise the stage is read anew. A reading that falls behind the stage
// shown keeps the stage (cubeTabBehind), with no move marked; the same case keeps its reveals.
function cubeTabSettle(){
  clearTimeout(cubeTab.stillTimer);cubeTab.stillTimer=0;
  const held=cubeTabHeld(cubeTab.target);if(!held)return;
  const old=cubeTab.stage,k=old?cfopStageDone(old,held):0;
  if(k>0&&k<old.moves.length){cubeTab.done=k;cubeTab.revealed=Math.max(cubeTab.revealed,k);}
  else{
    const st=cfopStage(held,typeof store!=='undefined'?store.get('crossColor','white'):'white');
    if(old&&cubeTabBehind(old,st))cubeTab.done=0;
    else{
      const same=old&&old.stage===st.stage&&old.name===st.name;
      cubeTab.stage=st;cubeTab.done=0;cubeTab.revealed=same?Math.min(cubeTab.revealed,st.moves.length):0;cubeTab.since=0;
    }
  }
  cubeTab.stale=false;cubeTabStageDraw();cubeTabRevealLater();
}
// `st`, read now, falls behind `old`, the stage shown, and the user may be part way through `old`:
// a Sune breaks the cross with its first move, and any other way through the algorithm (another
// algorithm for the case, a slip put right) leaves no prefix for cfopStageDone to find. Not behind
// a solved cube (a turn of it is a scramble) or the cross (nothing comes before it). And not once
// more moves have gone by since `old` was read than its algorithm twice and four more, twelve at
// the least (`keepMoves`): the user has moved on to something else, a new scramble say.
function cubeTabBehind(old,st){
  if(old.stage==='solved'||old.stage==='cross')return false;
  return stageRank(st.stage)<stageRank(old.stage)&&cubeTab.since<=Math.max(cubeTab.keepMoves,2*old.moves.length+4);
}
// One more move shows every revealMs, until all of them show.
function cubeTabRevealLater(){
  clearTimeout(cubeTab.revealTimer);cubeTab.revealTimer=0;
  const st=cubeTab.stage;if(!st||cubeTab.revealed>=st.moves.length)return;
  cubeTab.revealTimer=setTimeout(()=>{cubeTab.revealTimer=0;cubeTab.revealed++;cubeTabStageDraw();cubeTabRevealLater();},cubeTab.revealMs);
}
function cubeTabStageStop(){clearTimeout(cubeTab.stillTimer);clearTimeout(cubeTab.revealTimer);cubeTab.stillTimer=cubeTab.revealTimer=0;}
function cubeTabStageReset(){cubeTabStageStop();cubeTab.stage=null;cubeTab.done=cubeTab.revealed=cubeTab.since=0;cubeTab.stale=false;}
// The sheet: the name, the line under it, and the moves, each shown or hidden, the done ones marked.
function cubeTabStageDraw(){
  const el=$('#cubeWinStage');if(!el)return;
  const st=cubeTab.stage;
  el.classList.toggle('stale',cubeTab.stale);
  el.querySelector('.st-name').textContent=st?st.name:'';el.querySelector('.st-sub').textContent=st?st.sub:'';
  const alg=el.querySelector('.st-alg');alg.textContent='';
  if(!st)return;
  st.moves.forEach((m,i)=>{const s=document.createElement('span');
    if(i<cubeTab.revealed){s.className='mv'+(i<cubeTab.done?' done':'')+(/^[xyz]/.test(m)?' rot':'');s.textContent=m;}
    else{s.className='mv hid';s.textContent='•';s.setAttribute('aria-label','hidden move');}
    alg.appendChild(s);});
}
// ----- what the Smart cube dialog reports -----
// A connect keeps the hold: it is the player's (js/live.js syncs it after this listener).
function cubeTabEvent(ev){
  if(ev.type==='connect'){
    cubeTab.look='';cubeTab.conn=ev.conn;cubeTab.name=smartNiceName(ev.conn.name);cubeTab.battery=ev.conn.battery;cubeTab.asked=false;cubeTab.want=false;cubeTab.target=null;cubeTab.moves=[];cubeTabStageReset();
    cubeTabRender();
    if(ev.cube)cubeTabShow(ev.cube);else{cubeTabWindow();cubeTabAsk();}
    return;
  }
  if(ev.type==='look'){cubeTab.look=ev.text||'';cubeTabRender();cubeTabWindow();return;}
  if(ev.type==='disconnect'){cubeTab.look='';cubeTab.conn=null;cubeTab.name='';cubeTab.target=null;cubeTab.moves=[];if(typeof smartListenStop==='function')smartListenStop();cubeTabStageReset();cubeTabRender();cubeTabWindow();return;}
  if(ev.type==='gone'){if(ev.conn!==cubeTab.conn)return;cubeTab.look='';cubeTab.conn=null;cubeTab.asked=false;cubeTab.want=false;cubeTabStageStop();if(typeof smartListenStop==='function')smartListenStop();cubeTabRender();cubeTabWindow();return;}
  if(ev.type==='close')return;
  if(ev.conn!==cubeTab.conn)return;
  if(ev.type==='move')cubeTabAsk(); // the state that answers shows the turn
  if(ev.type==='battery'){cubeTab.battery=ev.level;smartBatteryDraw($('#cubeWinBatt'),ev.level);}
  if(ev.type==='state'){cubeTab.asked=false;if(cubeTab.want){cubeTab.want=false;cubeTabAsk();}cubeTabShow(ev.cube);}
}
if(typeof document!=='undefined'){document.addEventListener('cw:smart',e=>cubeTabEvent(e.detail));cubeTabMount();}
