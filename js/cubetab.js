// ================= The cube tab =================
// While a smart cube is connected, the top bar carries a tab with the name of the cube. The tab
// opens a floating window with a live cube: each turn of the real cube turns the layer on the
// screen. Close (Esc) collapses the window back into the tab. Disconnect in the Smart cube dialog
// removes the tab. When the link drops by itself (the cube went to sleep), the tab stays, dimmed,
// and the window offers the way back to the dialog.
// The first time a cube connects, the page dims around the tab for a moment and a callout points
// to it. The Smart cube dialog is a modal, so the callout waits until the dialog closes.
// The window moves: drag it by its head. The place is kept in cw:cubeWin and clamped to the screen.
// The picture follows how the cube is held: a gen 2 or gen 4 cube reports its tilt (a gyro
// message, `q` in gan.js) many times a second. The cube knows which way is up (gravity), so the
// picture takes the up face from each reading as it is. It does not know which way the user
// faces, so the first reading sets the heading (`basis`, a turn about the vertical): the green
// face is taken to point at the user at that moment. Reset view takes the heading again. A frame
// that took the whole first reading as white up, green front went wrong whenever the cube lay
// some other way when it first moved, and the picture then stayed tilted for good.
// Follow my cube switches between the held view and the fixed view, kept in cw:cubeFollow.
// The held view is the cube as it sits in space: the camera looks straight at it, so a level cube
// with green toward the user shows only its green face until it tilts. The Isometric box
// (cw:cubeIso, off by default) looks from a little to the right and above instead, so three
// faces show when the cube is held straight.
// The dialog reports every change of the link as a cw:smart event (smart-ui.js); nothing here
// reaches into the dialog. All markup here is fixed text; the cube's name goes in as text.
// `shown` is the cube the picture is on (or turns toward), `queue` the moves still to turn, and
// `target` the cube at the end of the queue: the real cube, as far as the page knows. `q` is the
// turn of the body the picture shows, `qTo` the one the cube reports, in the frame of draw.js.
// `moves` is every move since the cube connected, merged as they come (cubeTabMerge): R then R is
// R2, R then R' is nothing, so a turn back takes its move off the list. The readout under the
// picture shows the last CUBE_TAB_SHOWN of them; a triangle after them says there are more.
// Clear moves empties the list.
// The moves read as the cube is held, not as the cube names its faces. The tilt reading, snapped
// to the nearest of the 24 ways to hold a cube, is the hold (`hold`, one of CUBE_TAB_HOLDS); a
// new hold takes after CUBE_TAB_HOLD_MS (750) in one place, so a cube on its way past a face does
// not count. The cube reports a turn by its own face (its white face is U); the readout names the
// face by where it sits in the hands (cubeTabRelabel), and a change of hold puts the turn of the
// whole cube (z2) on the list. A slice turn moves the core, so the cube reports two face turns and
// a turn of its body: R2 L2 and x2 read as M2 once the turn lands (cubeTabSlice). The first
// reading and Reset view set the hold without a turn on the list: the cube did not move, the
// page learned how it is held.
// Above the picture, the stage of a CFOP solve (cfopStage, stage.js): Cross, F2L, or the two-look
// case ("Sune") with the hold under it and its moves hidden. The stage is read only after the
// cube has been still for `stillMs` (1200); every `revealMs` (1500) more without a turn, one
// more move shows. A turn fades what is shown but leaves it there, until the cube is still
// again. A pause part way through the algorithm keeps the case, with the moves done so far
// marked (cfopStageDone); the same case read again (after a U turn, say) keeps the moves already
// revealed. A change of hold with the cube still reads the stage again at once.
const cubeTab={conn:null,name:'',shown:null,target:null,queue:[],anim:null,raf:0,yaw:-32,pitch:28,asked:false,want:false,tipWait:false,spotTimer:0,pos:null,
  gyro:false,raw:null,basis:null,q:null,qTo:null,qraf:0,qAt:0,follow:true,iso:false,moves:[],
  hold:null,holdNext:null,holdTimer:0,holdMs:750,
  stage:null,done:0,revealed:0,stale:false,stillTimer:0,revealTimer:0,stillMs:1200,revealMs:1500};
const CUBE_TAB_SHOWN=10;
// The cameras while the picture follows the cube: straight on, the cube as it sits in space; and
// isometric, a little from the right and above, so three faces show when the cube is held straight.
const CUBE_TAB_FLAT={yaw:0,pitch:0},CUBE_TAB_ISO={yaw:-24,pitch:18};
const CUBE_TAB_TIP='Click your smart cube to open the Smart Cube interface!';
function cubeTabBtn(){return $('#cubeTab');}
// The tab: made when a cube connects, removed on Disconnect. `off` marks a link that dropped.
function cubeTabRender(){
  const top=$('header.top');if(!top)return;
  let b=cubeTabBtn();
  if(!cubeTab.name){if(b)b.remove();return;}
  if(!b){
    b=document.createElement('button');b.id='cubeTab';b.className='cubetab';b.setAttribute('aria-controls','cubeWin');
    b.innerHTML='<span class="dot" aria-hidden="true"></span><span class="nm"></span><span class="brk" aria-hidden="true">⧉</span>';
    b.onclick=()=>{cubeTabSpotEnd();if($('#cubeWin'))cubeTabClose();else cubeTabOpen();};
    const pop=$('#methodPop');if(pop)pop.after(b);else top.appendChild(b);
  }
  const off=!cubeTab.conn;
  b.classList.toggle('off',off);
  b.querySelector('.nm').textContent=cubeTab.name;
  b.setAttribute('aria-expanded',String(!!$('#cubeWin')));
  b.title=off?`${cubeTab.name} is no longer connected. Open its window to connect again.`:`Open the window of ${cubeTab.name}: a live view of your smart cube.`;
  b.setAttribute('aria-label',off?`${cubeTab.name}, not connected. Open its window.`:`Open the window of your smart cube, ${cubeTab.name}`);
}
// ----- the floating window -----
function cubeTabOpen(){
  if($('#cubeWin')||!cubeTab.name)return;
  const w=document.createElement('div');w.className='cubewin panel';w.id='cubeWin';w.setAttribute('role','dialog');w.setAttribute('aria-label',`Smart cube window: ${cubeTab.name}`);
  w.innerHTML=`<div class="cw-head" title="Drag to move the window"><span class="dot" aria-hidden="true"></span><b class="nm"></b><button class="small ghost" id="cubeWinClose" title="Collapse the window back into the tab (Esc)">Close<span class="hk" aria-hidden="true">Esc</span></button></div>
   <div class="cw-stage" id="cubeWinStage"><div class="st-name" aria-live="polite"></div><div class="st-sub"></div><div class="st-alg" aria-label="The moves of this case"></div></div>
   <svg id="cubeWinSvg" viewBox="0 0 400 360" role="img" aria-label="Your smart cube, live"></svg>
   <div class="cw-moves" id="cubeWinMoves" aria-label="Your last moves"></div>
   <div class="cw-row" id="cubeWinView"><div class="cw-gyro hidden" id="cubeWinGyro"><button class="small cw-tog" id="cubeWinFollow" aria-pressed="true" title="Turn the picture as you turn the cube in your hands">Follow my cube</button><button class="small ghost" id="cubeWinHome" title="Hold the cube with green toward you, then press. The picture and the moves turn to match.">Reset view</button></div><div class="cw-side"><label class="cw-chk hidden" id="cubeWinIsoBox" title="Look at the cube from a little to the right and above, so three faces show. Off: straight on, as the cube sits in space."><input type="checkbox" id="cubeWinIso"> Isometric</label><button class="small ghost" id="cubeWinClear" title="Empty the list of moves under the picture">Clear moves</button></div></div>
   <p class="muted cw-note" id="cubeWinNote"></p>
   <div class="scan-row hidden" id="cubeWinAgain"><button class="small" id="cubeWinConnect">Connect again</button></div>`;
  document.body.appendChild(w);
  $('#cubeWinClose').onclick=cubeTabClose;
  $('#cubeWinConnect').onclick=()=>{cubeTabClose();openSmart();};
  $('#cubeWinClear').onclick=()=>{cubeTab.moves=[];cubeTabMovesDraw();};
  $('#cubeWinFollow').onclick=()=>cubeTabFollow(!cubeTab.follow);
  $('#cubeWinHome').onclick=cubeTabHome;
  $('#cubeWinIso').onchange=e=>cubeTabIso(e.target.checked);
  cubeTab.follow=!!store.get('cubeFollow',true);
  cubeTab.iso=!!store.get('cubeIso',false);
  document.addEventListener('keydown',cubeTabKeys,true);
  cubeTabDrag(w);
  if(!cubeTab.pos)cubeTab.pos=store.get('cubeWin',null);
  if(cubeTab.pos)cubeTabPlace(cubeTab.pos.x,cubeTab.pos.y);
  window.addEventListener('resize',cubeTabResize);
  cubeTabRender();cubeTabWindow();
  if(cubeTab.conn)cubeTabAsk(); // the first picture
  setTimeout(()=>{const c=$('#cubeWinClose');if(c)c.focus();},20);
}
function cubeTabClose(){
  const w=$('#cubeWin');if(!w)return;
  document.removeEventListener('keydown',cubeTabKeys,true);window.removeEventListener('resize',cubeTabResize);
  cubeTabStopAnim();cubeTabStopView();w.remove();cubeTabRender();
  const b=cubeTabBtn();if(b)b.focus();
}
// ----- move the window: drag it by its head -----
// On a phone the window spans the screen and stays put.
function cubeTabPhone(){try{return matchMedia('(max-width:760px)').matches;}catch(e){return false;}}
// Put the window at (x,y), kept on the screen: the whole width, and at least the head in view.
function cubeTabPlace(x,y){
  const w=$('#cubeWin');if(!w||cubeTabPhone())return;
  const W=window.innerWidth||0,H=window.innerHeight||0,ww=w.offsetWidth||320;
  x=Math.round(Math.max(8,Math.min(x,Math.max(8,W-ww-8))));y=Math.round(Math.max(0,Math.min(y,Math.max(0,H-48))));
  w.style.left=x+'px';w.style.top=y+'px';w.style.right='auto';
  cubeTab.pos={x,y};
}
function cubeTabResize(){if(cubeTab.pos)cubeTabPlace(cubeTab.pos.x,cubeTab.pos.y);}
function cubeTabDrag(w){
  const h=w.querySelector('.cw-head');
  h.addEventListener('pointerdown',e=>{
    if(e.button>0||e.target.closest('button')||cubeTabPhone())return;
    e.preventDefault();
    const r=w.getBoundingClientRect(),d={x:e.clientX-r.left,y:e.clientY-r.top,id:e.pointerId};
    const move=ev=>{if(ev.pointerId!==d.id)return;cubeTabPlace(ev.clientX-d.x,ev.clientY-d.y);};
    const up=ev=>{if(ev.pointerId!==d.id)return;
      h.removeEventListener('pointermove',move);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);
      w.classList.remove('drag');if(cubeTab.pos)store.set('cubeWin',cubeTab.pos);};
    h.addEventListener('pointermove',move);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);
    if(h.setPointerCapture)try{h.setPointerCapture(e.pointerId);}catch(_){}
    w.classList.add('drag');
  });
}
// Esc closes the window, unless a modal is open: that one takes the key.
function cubeTabKeys(e){
  if(e.key!=='Escape'||!$('#cubeWin')||document.querySelector('.modal-bg'))return;
  e.preventDefault();e.stopPropagation();cubeTabClose();
}
// The window's text and the cube it shows.
function cubeTabWindow(){
  const w=$('#cubeWin');if(!w)return;
  const off=!cubeTab.conn;
  w.classList.toggle('off',off);
  w.querySelector('.nm').textContent=cubeTab.name;
  const held=cubeTab.gyro&&cubeTab.follow;
  $('#cubeWinNote').textContent=off?'The cube is no longer connected. Turn a face to wake it up, then connect again.':!cubeTab.shown?'Reading the cube.':held?'Live. The picture turns with your cube.':'Live. Each turn of your cube turns the layer here.';
  $('#cubeWinAgain').classList.toggle('hidden',!off);
  $('#cubeWinGyro').classList.toggle('hidden',!cubeTab.gyro);$('#cubeWinIsoBox').classList.toggle('hidden',!cubeTab.gyro);
  $('#cubeWinFollow').setAttribute('aria-pressed',String(cubeTab.follow));
  $('#cubeWinHome').disabled=!held||off;
  const iso=$('#cubeWinIso');iso.checked=cubeTab.iso;iso.disabled=!held||off;
  cubeTabMovesDraw();
  cubeTabStageDraw();
  cubeTabDraw();
}
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
// Two opposite faces and a turn of the whole cube, the way the cube sees a slice turn, read as the
// slice: R L' x' is M, U D' y' is E, F' B z is S. Only when the turn is the last move and the two
// faces are just before it. Returns a new list, or the same list when there is nothing to merge.
const CUBE_TAB_SLICES=[{rot:'x',a:'R',b:'L',slice:'M',sign:3},{rot:'y',a:'U',b:'D',slice:'E',sign:3},{rot:'z',a:'B',b:'F',slice:'S',sign:1}];
function cubeTabSlice(moves){
  const n=moves.length;if(n<3)return moves;
  const s=CUBE_TAB_SLICES.find(x=>x.rot===moves[n-1][0]);if(!s)return moves;
  const [p,q]=[moves[n-3],moves[n-2]],a=p[0]===s.a?p:q[0]===s.a?q:null,b=p[0]===s.b?p:q[0]===s.b?q:null;
  if(!a||!b)return moves;
  const k=cubeTabTurns(a);
  if(cubeTabTurns(b)!==(4-k)%4||cubeTabTurns(moves[n-1])!==(s.sign*k)%4)return moves;
  return cubeTabMerge(moves.slice(0,-3),s.slice+['','','2',"'"][k]); // M2 after M2 takes both off
}
// Record the moves the cube made between two states, as held.
function cubeTabRecord(path){
  for(const m of path)cubeTab.moves=cubeTabMerge(cubeTab.moves,cubeTabRelabel(m,cubeTab.hold));
  cubeTabMovesDraw();
}
// The readout: the last CUBE_TAB_SHOWN moves, and a triangle after them when there are more.
function cubeTabMovesDraw(){
  const el=$('#cubeWinMoves');if(!el)return;
  const ms=cubeTab.moves,span=(cls,text)=>{const s=document.createElement('span');s.className=cls;if(text)s.textContent=text;return el.appendChild(s);};
  const clear=$('#cubeWinClear');if(clear)clear.disabled=!ms.length;
  el.textContent='';
  if(!ms.length){span('none','No moves yet');return;}
  for(const m of ms.slice(-CUBE_TAB_SHOWN))span('mv'+(/^[xyz]/.test(m)?' rot':''),m);
  if(ms.length>CUBE_TAB_SHOWN){
    const more=span('more');more.setAttribute('aria-label',`${ms.length-CUBE_TAB_SHOWN} more`);more.title=`${ms.length} moves in all`;
    const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg'),p=document.createElementNS(NS,'polygon');
    svg.setAttribute('viewBox','0 0 8 10');svg.setAttribute('aria-hidden','true');p.setAttribute('points','0,0 8,5 0,10');svg.appendChild(p);more.appendChild(svg);
  }
}
function cubeTabDraw(){
  const svg=$('#cubeWinSvg');if(!svg)return;
  const held=cubeTab.gyro&&cubeTab.follow&&cubeTab.q;
  const cam=cubeTab.iso?CUBE_TAB_ISO:CUBE_TAB_FLAT;
  const a=cubeTab.anim,o=held?{yaw:cam.yaw,pitch:cam.pitch,rot:quatMat(cubeTab.q),n:3}:{yaw:cubeTab.yaw,pitch:cubeTab.pitch,n:3};
  if(a&&a.t<1)svg.innerHTML=renderCube3D(a.from.toFacelets(),Object.assign(o,{move:a.move,t:Math.max(a.t,0.01)}));
  else{const f=cubeTab.shown?cubeTab.shown.toFacelets():Array.from({length:54},(_,i)=>i%9===4?(i-4)/9:-1);svg.innerHTML=renderCube3D(f,o);}
}
// ----- live: a turn asks the cube for its state, the state turns the layer -----
// One request at a time. A turn during a request marks `want`, and the answer asks again, so the
// picture ends on the real cube however fast the turns come. The window closed, the request still
// goes: the move list needs every state.
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
// Show `cube`, the real cube's state. Up to four moves past the last picture: queue the turns, so
// each one turns its layer, even when the turns come fast. Further away: show it at once.
// The moves on the way go on the list, window or no window. Five or more apart, the moves are not
// known, and the list keeps what it has.
function cubeTabShow(cube){
  const moved=cubeTabPath(cubeTab.target||cubeTab.shown,cube);
  if(moved&&moved.length)cubeTabRecord(moved);
  cubeTabStir();
  const still=(typeof reducedMotion==='function'&&reducedMotion())||typeof requestAnimationFrame!=='function';
  const path=still||!$('#cubeWin')?null:moved;
  if(!path){cubeTabStopAnim();cubeTab.shown=cubeTab.target=cube;cubeTabWindow();return;}
  cubeTab.target=cube;cubeTab.queue.push(...path);
  if(cubeTab.anim)return; // the running turn goes on; the new ones follow it
  cubeTabNext();cubeTabWindow();
}
// How long one turn takes, with `n` more turns waiting: faster as the queue grows, so the picture
// catches up with the cube within a turn or two.
function cubeTabDur(move,n){return Math.max(90,Math.round((move.endsWith('2')?360:260)*[1,0.65,0.5][Math.min(n,2)]*(n>2?0.8:1)));}
// Turn the first move of the queue. When it ends, the next one starts in the same frame.
function cubeTabNext(){
  const m=cubeTab.queue.shift();
  if(!m){cubeTab.raf=0;cubeTab.anim=null;cubeTabWindow();return;}
  const from=cubeTab.shown;cubeTab.shown=applyAlg(from,[m]);
  const dur=cubeTabDur(m,cubeTab.queue.length),t0=performance.now();
  cubeTab.anim={from,move:m,t:0};
  const step=()=>{const x=Math.min(1,(performance.now()-t0)/dur);cubeTab.anim.t=x<1?0.5-0.5*Math.cos(Math.PI*x):1;
    if(x>=1){cubeTabNext();return;}
    cubeTabDraw();cubeTab.raf=requestAnimationFrame(step);};
  cubeTab.raf=requestAnimationFrame(step);
}
// Stop the turns. The picture lands on the real cube.
function cubeTabStopAnim(){if(cubeTab.raf){cancelAnimationFrame(cubeTab.raf);cubeTab.raf=0;}cubeTab.anim=null;cubeTab.queue=[];if(cubeTab.target)cubeTab.shown=cubeTab.target;}
// ----- how the cube is held: the picture turns with it -----
// Quaternions as [x,y,z,w]. quatMul(a,b) is a after b: its matrix is the matrix of a times the
// matrix of b. quatMat gives the 3×3 matrix (three rows) that draw.js takes as `rot`.
function quatMul(a,b){const [ax,ay,az,aw]=a,[bx,by,bz,bw]=b;
  return [aw*bx+ax*bw+ay*bz-az*by,aw*by-ax*bz+ay*bw+az*bx,aw*bz+ax*by-ay*bx+az*bw,aw*bw-ax*bx-ay*by-az*bz];}
function quatConj(q){return [-q[0],-q[1],-q[2],q[3]];}
function quatNorm(q){const l=Math.hypot(...q)||1;return q.map(v=>v/l);}
function quatMat(q){const [x,y,z,w]=quatNorm(q);
  return [[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]];}
// Part of the way from a to b, the short way round. t=1 is b.
function quatSlerp(a,b,t){
  let d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];if(d<0){b=b.map(v=>-v);d=-d;}
  if(d>0.9995)return quatNorm(a.map((v,i)=>v+(b[i]-v)*t));
  const th=Math.acos(Math.min(1,d)),s=Math.sin(th),wa=Math.sin((1-t)*th)/s,wb=Math.sin(t*th)/s;
  return a.map((v,i)=>v*wa+b[i]*wb);
}
// The angle between two turns, in degrees.
function quatAngle(a,b){const d=Math.abs(a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]);return 2*Math.acos(Math.min(1,d))*180/Math.PI;}
// The heading frame for a reading: the turn about the vertical that points the green face at
// the viewer (+z). With green straight up or down, the red face goes to the right (+x) instead.
// Only the heading is taken out, so a tilt in the reading stays in the picture.
function cubeTabYawBasis(q){
  const M=quatMat(q);let a;
  const g=[M[0][2],M[2][2]]; // the green axis, seen from above: x and z
  if(Math.hypot(g[0],g[1])>0.3)a=-Math.atan2(g[0],g[1]);
  else{const r=[M[0][0],M[2][0]];a=Math.PI/2-Math.atan2(r[0],r[1]);}
  return [0,Math.sin(a/2),0,Math.cos(a/2)];
}
// A tilt reading from the cube. The first one sets the heading: green is taken to face the
// viewer at that moment. The up face comes from the reading itself.
function cubeTabGyro(q){
  q=quatNorm(q);cubeTab.raw=q;
  if(!cubeTab.basis)cubeTab.basis=cubeTabYawBasis(q);
  cubeTab.qTo=quatNorm(quatMul(cubeTab.basis,q));
  if(!cubeTab.gyro){cubeTab.gyro=true;cubeTab.q=cubeTab.qTo;cubeTabHoldSet(cubeTabSnap(cubeTab.qTo));cubeTabWindow();return;}
  cubeTabHoldSeen(cubeTabSnap(cubeTab.qTo));
  cubeTabTurnView();
}
// Turn the picture toward qTo, a little closer each frame, so a quick turn of the cube reads as a
// turn and not a jump. With reduced motion, or with no window, the picture goes straight there.
function cubeTabTurnView(){
  if(!cubeTab.qTo)return;
  const still=!cubeTab.follow||!$('#cubeWin')||(typeof reducedMotion==='function'&&reducedMotion())||typeof requestAnimationFrame!=='function';
  if(still){cubeTabStopView();cubeTab.q=cubeTab.qTo;if(cubeTab.follow&&!cubeTab.raf)cubeTabDraw();return;}
  if(cubeTab.qraf)return;
  cubeTab.qAt=performance.now();
  const step=()=>{
    const now=performance.now(),k=1-Math.exp(-(now-cubeTab.qAt)/70);cubeTab.qAt=now; // most of the way within a tenth of a second
    cubeTab.q=cubeTab.q?quatSlerp(cubeTab.q,cubeTab.qTo,k):cubeTab.qTo;
    const done=quatAngle(cubeTab.q,cubeTab.qTo)<0.05;if(done)cubeTab.q=cubeTab.qTo;
    if(!cubeTab.raf)cubeTabDraw(); // a running turn draws every frame already
    cubeTab.qraf=done?0:requestAnimationFrame(step);
  };
  cubeTab.qraf=requestAnimationFrame(step);
}
function cubeTabStopView(){if(cubeTab.qraf){cancelAnimationFrame(cubeTab.qraf);cubeTab.qraf=0;}}
// Forget the tilt: on connect and on disconnect. The hold goes back to the cube's own frame.
function cubeTabResetView(){cubeTabStopView();cubeTab.gyro=false;cubeTab.raw=cubeTab.basis=cubeTab.q=cubeTab.qTo=null;clearTimeout(cubeTab.holdTimer);cubeTab.holdTimer=0;cubeTab.hold=cubeTab.holdNext=null;}
// Follow my cube: on, the picture turns with the cube; off, the fixed view.
function cubeTabFollow(on){cubeTab.follow=!!on;store.set('cubeFollow',cubeTab.follow);if(on)cubeTabTurnView();cubeTabWindow();}
// Isometric: on, the held view looks from a little to the right and above; off, straight on.
function cubeTabIso(on){cubeTab.iso=!!on;store.set('cubeIso',cubeTab.iso);cubeTabWindow();}
// Reset view: green faces the viewer right now. The picture turns to line up; a tilt stays. The
// hold is taken again from the new frame, with no turn on the list: the cube did not move.
function cubeTabHome(){if(!cubeTab.raw)return;cubeTab.basis=cubeTabYawBasis(cubeTab.raw);cubeTab.qTo=quatNorm(quatMul(cubeTab.basis,cubeTab.raw));cubeTabHoldSet(cubeTabSnap(cubeTab.qTo));cubeTabTurnView();}
// ----- the hold: which way the cube sits in the hands -----
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
// The hold nearest a turn of the body.
function cubeTabSnap(q){let best=null,bd=-1;for(const h of CUBE_TAB_HOLDS){const d=Math.abs(q[0]*h.q[0]+q[1]*h.q[1]+q[2]*h.q[2]+q[3]*h.q[3]);if(d>bd){bd=d;best=h;}}return best;}
// The turns, in the hands, that take hold `a` to hold `b`.
function cubeTabHoldDelta(a,b){const A=(a||CUBE_TAB_HOLDS[0]).cube,B=(b||CUBE_TAB_HOLDS[0]).cube;const h=CUBE_TAB_HOLD_BY.get(A.inverse().mul(B).center.join());return h?h.moves:[];}
// The cube as held: the state the cube reports, turned the way it sits in the hands.
function cubeTabHeld(cube){return cube&&cubeTab.hold&&cubeTab.hold.moves.length?applyAlg(cube,cubeTab.hold.moves):cube;}
// A reading snapped to hold `h`. A hold other than the current one takes after holdMs in one place.
function cubeTabHoldSeen(h){
  if(h===cubeTab.holdNext)return;
  cubeTab.holdNext=h;clearTimeout(cubeTab.holdTimer);cubeTab.holdTimer=0;
  if(h!==cubeTab.hold)cubeTab.holdTimer=setTimeout(()=>{cubeTab.holdTimer=0;cubeTabHoldTake(h);},cubeTab.holdMs);
}
// The hold is `h` now, and the cube was turned to get there: the turn goes on the list, where it
// may read with the two face turns before it as a slice. The stage reads the new hold at once
// when the cube is still.
function cubeTabHoldTake(h){
  const from=cubeTab.hold;if(h===from)return;
  cubeTab.hold=h;
  for(const m of cubeTabHoldDelta(from,h))cubeTab.moves=cubeTabMerge(cubeTab.moves,m);
  cubeTab.moves=cubeTabSlice(cubeTab.moves);
  cubeTabMovesDraw();
  if(!cubeTab.stillTimer&&cubeTab.target)cubeTabSettle();
}
// The hold is `h` now, and the page only learned it: nothing goes on the list.
function cubeTabHoldSet(h){clearTimeout(cubeTab.holdTimer);cubeTab.holdTimer=0;cubeTab.holdNext=h;if(h===cubeTab.hold)return;cubeTab.hold=h;if(!cubeTab.stillTimer&&cubeTab.target)cubeTabSettle();}
// ----- the stage above the picture -----
// The cube turned: fade the stage, and read it again once the cube has been still for stillMs.
function cubeTabStir(){
  clearTimeout(cubeTab.stillTimer);clearTimeout(cubeTab.revealTimer);cubeTab.revealTimer=0;
  if(cubeTab.stage&&!cubeTab.stale){cubeTab.stale=true;cubeTabStageDraw();}
  cubeTab.stillTimer=setTimeout(cubeTabSettle,cubeTab.stillMs);
}
// The cube is still: read the stage. Part way through the algorithm shown, the case stays and the
// moves done are marked; otherwise the stage is read anew, and the same case keeps its reveals.
function cubeTabSettle(){
  clearTimeout(cubeTab.stillTimer);cubeTab.stillTimer=0;
  const held=cubeTabHeld(cubeTab.target);if(!held)return;
  const old=cubeTab.stage,k=old?cfopStageDone(old,held):0;
  if(k>0&&k<old.moves.length){cubeTab.done=k;cubeTab.revealed=Math.max(cubeTab.revealed,k);}
  else{
    const st=cfopStage(held,typeof store!=='undefined'?store.get('crossColor','white'):'white');
    const same=old&&old.stage===st.stage&&old.name===st.name;
    cubeTab.stage=st;cubeTab.done=0;cubeTab.revealed=same?Math.min(cubeTab.revealed,st.moves.length):0;
  }
  cubeTab.stale=false;cubeTabStageDraw();cubeTabRevealLater();
}
// One more move shows every revealMs, until all of them show.
function cubeTabRevealLater(){
  clearTimeout(cubeTab.revealTimer);cubeTab.revealTimer=0;
  const st=cubeTab.stage;if(!st||cubeTab.revealed>=st.moves.length)return;
  cubeTab.revealTimer=setTimeout(()=>{cubeTab.revealTimer=0;cubeTab.revealed++;cubeTabStageDraw();cubeTabRevealLater();},cubeTab.revealMs);
}
function cubeTabStageStop(){clearTimeout(cubeTab.stillTimer);clearTimeout(cubeTab.revealTimer);cubeTab.stillTimer=cubeTab.revealTimer=0;}
function cubeTabStageReset(){cubeTabStageStop();cubeTab.stage=null;cubeTab.done=cubeTab.revealed=0;cubeTab.stale=false;}
// The panel: the name, the line under it, and the moves, each shown or hidden, the done ones marked.
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
// ----- the first time: dim the page around the tab and point to it -----
function cubeTabSpot(){
  if(store.get('cubeTip',0)||!cubeTabBtn()||$('#cubeSpot'))return;
  if(document.querySelector('.modal-bg')){cubeTab.tipWait=true;return;} // after the dialog closes
  cubeTab.tipWait=false;store.set('cubeTip',1);
  const s=document.createElement('div');s.className='spot';s.id='cubeSpot';
  s.innerHTML='<div class="sh"></div><div class="sh"></div><div class="sh"></div><div class="sh"></div><div class="ring" aria-hidden="true"></div><div class="callout" role="status"></div>';
  s.querySelector('.callout').textContent=CUBE_TAB_TIP;
  s.querySelectorAll('.sh').forEach(d=>{d.onclick=cubeTabSpotEnd;});
  document.body.appendChild(s);
  cubeTabSpotLayout();
  window.addEventListener('resize',cubeTabSpotLayout);
  document.addEventListener('keydown',cubeTabSpotKeys,true);
  cubeTab.spotTimer=setTimeout(cubeTabSpotEnd,8000);
}
// Four shades around a hole over the tab, a ring on the hole, the callout under it.
function cubeTabSpotLayout(){
  const s=$('#cubeSpot'),b=cubeTabBtn();if(!s||!b)return;
  const r=b.getBoundingClientRect(),pad=10,W=window.innerWidth;
  const top=Math.max(0,r.top-pad),left=Math.max(0,r.left-pad),bottom=r.bottom+pad,right=r.right+pad;
  const sh=s.querySelectorAll('.sh'),px=v=>Math.round(v)+'px';
  Object.assign(sh[0].style,{top:0,left:0,right:0,height:px(top)});
  Object.assign(sh[1].style,{top:px(bottom),left:0,right:0,bottom:0});
  Object.assign(sh[2].style,{top:px(top),left:0,width:px(left),height:px(bottom-top)});
  Object.assign(sh[3].style,{top:px(top),left:px(right),right:0,height:px(bottom-top)});
  Object.assign(s.querySelector('.ring').style,{top:px(top),left:px(left),width:px(right-left),height:px(bottom-top)});
  const c=s.querySelector('.callout'),cl=Math.max(8,Math.min(left,W-c.offsetWidth-8));
  c.style.top=px(bottom+12);c.style.left=px(cl);
  c.style.setProperty('--arrow',px(Math.max(12,Math.min(r.left-cl+r.width/2-8,Math.max(12,c.offsetWidth-28)))));
}
function cubeTabSpotKeys(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cubeTabSpotEnd();}}
function cubeTabSpotEnd(){
  const s=$('#cubeSpot');if(!s)return;
  clearTimeout(cubeTab.spotTimer);window.removeEventListener('resize',cubeTabSpotLayout);document.removeEventListener('keydown',cubeTabSpotKeys,true);
  s.remove();
}
// ----- what the Smart cube dialog reports -----
function cubeTabEvent(ev){
  if(ev.type==='connect'){
    cubeTab.conn=ev.conn;cubeTab.name=smartNiceName(ev.conn.name);cubeTab.asked=false;cubeTab.want=false;cubeTabStopAnim();cubeTab.shown=cubeTab.target=null;cubeTab.moves=[];cubeTabResetView();cubeTabStageReset();
    cubeTabRender();
    if(ev.cube)cubeTabShow(ev.cube);else cubeTabWindow();
    if($('#cubeWin'))cubeTabAsk();
    cubeTabSpot();return;
  }
  if(ev.type==='disconnect'){cubeTab.conn=null;cubeTab.name='';cubeTabStopAnim();cubeTab.shown=cubeTab.target=null;cubeTab.moves=[];cubeTabClose();cubeTabResetView();cubeTabStageReset();cubeTabSpotEnd();cubeTabRender();return;}
  if(ev.type==='gone'){if(ev.conn!==cubeTab.conn)return;cubeTab.conn=null;cubeTab.asked=false;cubeTab.want=false;cubeTabStageStop();cubeTabRender();cubeTabWindow();return;}
  if(ev.type==='close'){if(cubeTab.tipWait)cubeTabSpot();return;}
  if(ev.conn!==cubeTab.conn)return;
  if(ev.type==='move'){cubeTabAsk();cubeTabStir();}
  if(ev.type==='gyro')cubeTabGyro(ev.q);
  if(ev.type==='state'){cubeTab.asked=false;if(cubeTab.want){cubeTab.want=false;cubeTabAsk();}cubeTabShow(ev.cube);}
}
if(typeof document!=='undefined')document.addEventListener('cw:smart',e=>cubeTabEvent(e.detail));
