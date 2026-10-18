// ================= Smart cube lab =================
// A page of its own for work on the smart cube, without the rest of Twistwright: a full-page live
// cube that turns with the real cube and tilts with it, Reset cube for the facing, and the
// experiments in the panel on the right. It loads engine.js, draw.js, gan.js and bridge.js from
// the site, the scanner and the painter (scan-assemble.js, scan.js, paint.js, with lab/helpers.js
// for the few helpers of app.js they expect), and lab/smack.js (the quaternions and the smack
// detector, pure). Nothing here touches the site's own pages.
// The link: Web Bluetooth where the browser has it (Chrome), else the bridge of the macOS app,
// which serves this checkout at http://127.0.0.1:27272/ when run with --root (lab/run.sh). The
// address of a cube is saved by its name in cw:ganMac, the same map as the site, so a cube known
// to the site needs no typing here. The lab opens as if Connect were pressed: over the bridge the
// list comes up at once, and a cube this browser has connected before (cw:labCubes) is taken as
// soon as it is heard, with no click. With Web Bluetooth the browser's chooser needs a click, so
// the look without one goes through getDevices, the cubes this page was once allowed.
// The picture: the cube as the cube names it (white up, green front), turned by `q` (the turn of
// the body in the frame of draw.js), seen from the fixed camera: straight on, so a level cube
// shows the face toward the user alone until it tilts, or with the Isometric box (cw:labIso)
// from a little to the right and above, so three faces show. A tilt reading sets `qTo`, and the
// picture turns toward it a little each frame. The heading (`basis`) is what Reset cube sets:
// the first reading takes the cube as held white up, green toward the viewer, and so does each
// press, as far as a turn about the vertical goes (or the whole reading with Full reset).
// The state: the cube counts its own turns and reports the count; it cannot see its stickers. A
// turn made while it slept, or one it missed, leaves the count off from the real cube, and the
// picture shows a scramble the cube does not have. My cube is solved (S) sends the reset command,
// as the site's Smart cube dialog does: the cube takes its state now as solved, and the picture
// jumps there with no moves added to the list. Scan my cube asks the cube for its state again, as
// the lab does when it connects, and the picture jumps there with no moves added. Paint my cube
// reads the colors of the real cube by hand (paint.js) and hands them to conn.correct (gan.js):
// the link takes them as the real state now and corrects every state after, as the site's Smart
// cube dialog does. The fix is kept by the cube's name in cw:ganFix, the site's map, so a
// correction made here holds on the site too, and one made there holds here. My cube is solved
// drops it: the cube counts from solved again.
// Experiment 1: three smacks on the right face bring the Reset dialog (smackDetector, fed the
// tilt in the frame of the picture, so "right" is the user's right).
// Experiment 2: a turn of the cube in the hands, from the tilt (turnDetector, fed the same way).
// The log says when a turn starts, how it goes on and when it is over. A turn that comes to rest
// within `snap` degrees of another of the 24 holds is that whole-cube turn: it goes on the list,
// dashed, and the hold moves on, so the moves after it read as held. One that comes to rest
// between holds, or back at the hold, changes nothing.
// Experiment 3: one face turned and turned back, three times over (R R' R R' R R'), is a gesture
// (twistDetector, fed each move before the list merges it): the lab waits `twistMs`, then does
// Reset cube, as if R were pressed. The six quarter turns leave the cube, and the list, as they were.
// Patterns (P): each state the cube reports is read as the CFOP stage of the cube as held
// (cfopStage, js/stage.js), with the color on the bottom as held as the cross. A two-look OLL or
// PLL case goes in the Patterns window with the moves that solve it as held, newest first, the same
// case once until another comes or the cube is solved; kept in cw:labPatterns. P opens the window,
// Esc or P closes it. New scramble (N) is the user's word that the cube in their hands is a fresh
// scramble: it makes no moves. The matcher starts over with the cross on the bottom as held as its
// first goal: an entry for the cube as it is, with the shortest cross, the count of the solutions
// by length up to seven moves (crossSolutions, js/engine.js) and up to three of the shortest, one
// per line; then, when the cross is made, an entry with the moves it took. A case's moves and each
// shortest solution show their first move only: a cover hides each move after it, as the site's
// Reference does (labSpoil). A click on the line uncovers the next move, Reveal uncovers the rest,
// and a click on an open line covers it again. The moves the user made for the cross stay plain.
// The moves since the connect sit in a box of their own under the picture, as the cube tab's
// readout: merged as they come, the last ten shown, a triangle for more, and Clear moves.
// The hold: the cube names its moves with its white face up and green in front, however it is
// held. "I hold it <color> up, <color> toward me" in the bar is the user's word on the pose, one
// of the 24 (LAB_HOLDS, as CUBE_TAB_HOLDS): the moves read as held (labRelabel), the turn from
// the old hold to the new goes on the list, Reset cube takes the cube as held that way (and a
// change of the hold is a Reset cube at once), and the hold is kept in cw:labHold.
// The pictures are SVG text from renderCube3D and from numbers, as on the site: no user text.
const lab={conn:null,shown:null,target:null,queue:[],anim:null,raf:0,asked:false,want:false,patOpen:{},
  q:null,qTo:null,qraf:0,qAt:0,raw:null,basis:null,gyro:false,moves:[],jump:false,hold:null,iso:false,view:{yaw:0,pitch:0},drag:null,
  busy:false,reading:false,listEnd:null,pickSeq:0,macWait:null,det:null,turn:null,snap:30,twist:null,twistMs:45,twistTimer:0,pats:[],patLast:null,goal:null,patPos:null,copyTimer:0,times:[],trace:[],traceRaf:0,confirmOpen:false};
const LAB_SHOWN=10,LAB_TRACE_MS=4000,LAB_PAT_MAX=200,LAB_CROSS_MAX=7,LAB_SOLS_SHOWN=3;
const LAB_PAT_STEPS={eo:'OLL edges',co:'OLL corners',cp:'PLL corners',ep:'PLL edges'};
// The cameras: straight on, the cube as it sits in space; and isometric, a little from the right
// and above, the site's usual view.
const LAB_FLAT={yaw:0,pitch:0},LAB_ISO={yaw:-32,pitch:28};
function labStatus(t){$('#status').textContent=t;}
function labButtons(){
  const on=!!lab.conn;
  $('#connect').hidden=on;$('#disconnect').hidden=!on;
  $('#connect').disabled=lab.busy||!ganAvailable();
  $('#reset').disabled=!on;$('#solved').disabled=!on||lab.busy;
  $('#scan').disabled=!on||lab.busy;$('#paint').disabled=!on||lab.busy||typeof openPaint!=='function';
  $('#name').textContent=on?lab.conn.name:'';
  $('#macShow').hidden=!(on&&lab.conn.mac);$('#macText').textContent=on&&lab.conn.mac?lab.conn.mac:'';
  if(!on)labCopied(false);
  labVersion();
}
// The copy button by the address: the clipboard where the browser gives one, else a select and
// the old copy command. The icon turns to a check for a moment.
async function labCopyMac(){
  const mac=$('#macText').textContent;if(!mac)return;
  let ok=false;
  try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(mac);ok=true;}}catch(e){}
  if(!ok){try{const r=document.createRange();r.selectNodeContents($('#macText'));const sel=getSelection();sel.removeAllRanges();sel.addRange(r);ok=document.execCommand('copy');sel.removeAllRanges();}catch(e){}}
  if(!ok){labStatus('The browser did not let the page copy. Select the address and copy it yourself.');return;}
  labCopied(true);labLog('link','Copied the MAC address '+mac+'.');
  clearTimeout(lab.copyTimer);lab.copyTimer=setTimeout(()=>labCopied(false),1500);
}
function labCopied(yes){const b=$('#macCopy');b.classList.toggle('copied',yes);b.title=yes?'Copied':'Copy the MAC address';b.setAttribute('aria-label',b.title);if(!yes){clearTimeout(lab.copyTimer);lab.copyTimer=0;}}
// The lab's version, and the app's when the bridge serves the page. Numbers and the app's own
// version string, in the bar and the window title.
function labVersion(){
  const app=typeof BRIDGE!=='undefined'&&BRIDGE&&BRIDGE.version?' · app '+BRIDGE.version:'';
  $('#ver').textContent='lab '+LAB_VERSION+app;
  document.title='Smart cube lab '+LAB_VERSION;
}
// ----- the picture -----
// A drag on the picture spins the view, as on the site's cube: lab.view is the drag's offset over
// the camera, pitch held within 80 degrees of level. A double click or the Isometric box puts it back.
function labDraw(){
  const cam=lab.iso?LAB_ISO:LAB_FLAT,svg=$('#cube'),a=lab.anim,o={n:3,scale:60,cx:200,cy:185,yaw:cam.yaw+lab.view.yaw,pitch:Math.max(-80,Math.min(80,cam.pitch+lab.view.pitch))};
  o.rot=quatMat(lab.q||lab.hold.q);
  if(a&&a.t<1)svg.innerHTML=renderCube3D(a.from.toFacelets(),Object.assign(o,{move:a.move,t:Math.max(a.t,0.01)}));
  else{const f=lab.shown?lab.shown.toFacelets():Array.from({length:54},(_,i)=>i%9===4?(i-4)/9:-1);svg.innerHTML=renderCube3D(f,o);}
}
// ----- the moves: the cube's turns, found between two states -----
// One state request at a time; a turn during a request asks again when the answer lands.
function labAsk(){
  if(!lab.conn)return;
  if(lab.asked){lab.want=true;return;}
  lab.asked=true;lab.conn.send('state').catch(()=>{lab.asked=false;});
}
const LAB_MOVES=['U',"U'",'U2','R',"R'",'R2','F',"F'",'F2','D',"D'",'D2','L',"L'",'L2','B',"B'",'B2'];
const labKey=c=>c.cp.join()+'/'+c.co.join()+'/'+c.ep.join()+'/'+c.eo.join();
// The shortest list of up to four moves from one state to the next (cubeTabPath in cubetab.js):
// two moves out meet two moves back. [] for the same state, null for five or more apart.
function labPath(from,to){
  if(!from||!to)return null;
  const inv=m=>m.endsWith("'")?m[0]:m.endsWith('2')?m:m+"'";
  const grow=layer=>{const next=[];for(const {c,ms} of layer)for(const m of LAB_MOVES){if(ms.length&&ms[ms.length-1][0]===m[0])continue;next.push({c:applyAlg(c,[m]),ms:ms.concat(m)});}return next;};
  const back=new Map();let bl=[{c:to,ms:[]}];
  for(let d=0;d<=2;d++){for(const {c,ms} of bl){const k=labKey(c);if(!back.has(k))back.set(k,ms.map(inv).reverse());}if(d<2)bl=grow(bl);}
  let layer=[{c:from,ms:[]}],best=null;
  for(let d=0;d<=2;d++){
    if(best&&best.length<=d)return best;
    for(const {c,ms} of layer){const b=back.get(labKey(c));if(b&&(!best||ms.length+b.length<best.length))best=ms.concat(b);}
    if(best&&best.length<=d+1)return best;
    if(d<2)layer=grow(layer);
  }
  return best;
}
// The same face as the last move merges with it: R then R is R2, R then R' is nothing.
function labMerge(moves,m){
  const turns=x=>x.endsWith('2')?2:x.endsWith("'")?3:1,last=moves[moves.length-1];
  if(!last||last[0]!==m[0])return moves.concat(m);
  const t=(turns(last)+turns(m))%4;
  return moves.slice(0,-1).concat(t?[m[0]+['','','2',"'"][t]]:[]);
}
// A move onto the list. The first move after New scramble is not merged into the one before it,
// so the moves since the scramble stay whole.
function labAdd(m){lab.moves=lab.goal&&lab.moves.length<=lab.goal.at?lab.moves.concat(m):labMerge(lab.moves,m);}
// The box under the picture, as the cube tab's readout (cubeTabMovesDraw): the last LAB_SHOWN moves,
// a triangle after them when there are more, the count in the head, and Clear moves.
function labMovesDraw(){
  const el=$('#moves'),ms=lab.moves,span=(cls,text)=>{const s=document.createElement('span');s.className=cls;if(text)s.textContent=text;return el.appendChild(s);};
  $('#movesClear').disabled=!ms.length;
  $('#movesCount').textContent=ms.length?ms.length+(ms.length===1?' move':' moves'):'';
  el.textContent='';
  if(!ms.length){span('none','No moves yet');return;}
  ms.slice(-LAB_SHOWN).forEach((m,i,a)=>{const s=span('mv'+(/^[xyz]/.test(m)?' rot':'')+(i===a.length-1?' head':''),m);if(i===a.length-1)s.title='Your last move';});
  if(ms.length>LAB_SHOWN){
    const more=span('more');more.setAttribute('aria-label',`${ms.length-LAB_SHOWN} more`);more.title=`${ms.length} moves in all`;
    const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg'),p=document.createElementNS(NS,'polygon');
    svg.setAttribute('viewBox','0 0 8 10');svg.setAttribute('aria-hidden','true');p.setAttribute('points','0,0 8,5 0,10');svg.appendChild(p);more.appendChild(svg);
  }
}
function labMovesClear(){lab.moves=[];if(lab.goal)lab.goal.at=0;labMovesDraw();}
// Isometric (I): on, the camera looks from a little to the right and above; off, straight on.
function labIso(on){lab.iso=!!on;$('#iso').checked=lab.iso;try{localStorage.setItem('cw:labIso',lab.iso?'1':'');}catch(e){}lab.view={yaw:0,pitch:0};labDraw();}
function labIsoLoad(){try{return !!localStorage.getItem('cw:labIso');}catch(e){return false;}}
// Drag to spin: half a degree per pixel, as the site's cube. The pointer is captured, so the drag
// goes on outside the picture. preventDefault and body.cube-drag keep it from selecting page text.
function labViewDrag(){
  const svg=$('#cube');
  const stop=ev=>{if(!lab.drag||(ev&&ev.pointerId!==lab.drag.id))return;lab.drag=null;document.body.classList.remove('cube-drag');};
  svg.addEventListener('pointerdown',e=>{
    if(e.button)return;e.preventDefault();
    lab.drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:lab.view.yaw,pitch:lab.view.pitch};
    document.body.classList.add('cube-drag');
    if(svg.setPointerCapture)try{svg.setPointerCapture(e.pointerId);}catch(_){}
  });
  svg.addEventListener('pointermove',e=>{
    if(!lab.drag||e.pointerId!==lab.drag.id)return;
    lab.view={yaw:lab.drag.yaw+(e.clientX-lab.drag.x)*0.5,pitch:lab.drag.pitch+(e.clientY-lab.drag.y)*0.5};
    labDraw();
  });
  svg.addEventListener('pointerup',stop);svg.addEventListener('pointercancel',stop);
  svg.addEventListener('dblclick',()=>labViewReset());
}
// The view back to the camera: straight on, or isometric.
function labViewReset(){lab.view={yaw:0,pitch:0};labDraw();}
// ----- the hold: which color is up and which faces the user -----
// The 24 ways to hold the cube, as CUBE_TAB_HOLDS in cubetab.js: the whole-cube turns from the
// cube's own frame (white up, green in front), the solved cube after them (its centers say which
// of the cube's faces sits at each place) and the body's turn for the picture. A turn of the body
// about an axis of draw.js is the prime of the move about that axis, and a later turn goes on the
// left (quatMul), as the renderer composes them.
const LAB_HOLDS=(()=>{
  const s=Math.SQRT1_2,base={x:[-s,0,0,s],y:[0,-s,0,s],z:[0,0,-s,s]};
  const qOf=m=>{const b=base[m[0]];return m.endsWith("'")?quatConj(b):m.endsWith('2')?quatMul(b,b):b;};
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
const LAB_HOLD_BY=new Map(LAB_HOLDS.map(h=>[h.cube.center.join(),h]));
const LAB_COLORS=['white','red','green','yellow','orange','blue'];
// The hold with `up` on top and `front` toward the user (color indices); null for a pair that is
// no hold, such as white up and yellow in front.
function labHoldOf(up,front){return LAB_HOLDS.find(h=>h.cube.center[0]===up&&h.cube.center[2]===front)||null;}
function labHoldWords(h){const c=h.cube.center;return `${LAB_COLORS[c[0]]} up, ${LAB_COLORS[c[2]]} toward you`;}
// A move as the cube names it (its white face is U), named by the place its face sits in the hold.
function labRelabel(m){
  const h=lab.hold;if(!h||!h.moves.length||!/^[URFDLB]/.test(m))return m;
  return FACE_NAMES[h.cube.center.indexOf(FACE_NAMES.indexOf(m[0]))]+m.slice(1);
}
// The hold kept from last time, or white up and green in front.
function labHoldLoad(){
  try{const s=JSON.parse(localStorage.getItem('cw:labHold')||'null');if(s)return labHoldOf(s.up,s.front)||LAB_HOLDS[0];}catch(e){}
  return LAB_HOLDS[0];
}
// The two selects: every color on top; in front, the four that are not the top or its opposite.
function labHoldFill(){
  const up=$('#holdUp'),fr=$('#holdFront'),c=lab.hold.cube.center,opt=(sel,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=LAB_COLORS[i];sel.appendChild(o);};
  up.textContent='';for(let i=0;i<6;i++)opt(up,i);up.value=String(c[0]);
  fr.textContent='';for(let i=0;i<6;i++)if(i!==c[0]&&i!==(c[0]+3)%6)opt(fr,i);fr.value=String(c[2]);
}
// A new top: the front stays where it can, else green, else red.
function labHoldPick(){
  const up=parseInt($('#holdUp').value,10),front=parseInt($('#holdFront').value,10);
  const ok=f=>Number.isInteger(f)&&f!==up&&f!==(up+3)%6,h=labHoldOf(up,ok(front)?front:ok(2)?2:1);
  if(h)labSetHold(h,'user');
  labBlur();
}
// A select keeps the focus after a choice, and then a key goes to it (R picks red) and not to the
// page. Let it go.
function labBlur(){const a=document.activeElement;if(a&&a!==document.body&&a.blur)a.blur();}
// Set the hold. From the user: the turn from the old hold to the new goes on the list, so the
// moves before it still read right, the log says so, and the cube as held now is the reference
// pose (Reset cube) when there is a tilt reading. From a detected turn: the turn goes on the list
// and comes back as words; the picture already shows the cube as held, so no Reset cube.
function labSetHold(h,src){
  const old=lab.hold;lab.hold=h;
  try{localStorage.setItem('cw:labHold',JSON.stringify({up:h.cube.center[0],front:h.cube.center[2]}));}catch(e){}
  labHoldFill();
  $('#reset').title=`Hold the cube ${labHoldWords(h)}, then press. The picture takes that as its facing.`;
  if(src==='load')return '';
  let turn='';
  if(old&&old!==h){const d=LAB_HOLD_BY.get(old.cube.inverse().mul(h.cube).center.join());if(d){for(const m of d.moves)labAdd(m);turn=d.moves.join(' ');}labMovesDraw();}
  if(src==='turn')return turn;
  labLog('hold','Hold: '+labHoldWords(h)+'.');
  if(lab.conn&&lab.raw)labReset();else labDraw();
}
// Show the real cube's state: up to four moves past the picture turn their layers in a queue;
// further away, the picture jumps.
function labShow(cube){
  if(lab.jump){lab.jump=false;labJump(cube);labPatRead(cube);return;}
  const moved=labPath(lab.target||lab.shown,cube);
  if(moved&&moved.length){for(const m of moved){const r=labRelabel(m);labAdd(r);if($('#twistOn').checked&&lab.twist.feed(r))labTwist(r);}labMovesDraw();}
  labPatRead(cube); // after the moves, so a cross made lists the moves it took
  if(!moved||!moved.length){labStopAnim();lab.shown=lab.target=cube;labDraw();return;}
  lab.target=cube;lab.queue.push(...moved);
  if(!lab.anim)labNext();
}
function labDur(move,n){return Math.max(90,Math.round((move.endsWith('2')?360:260)*[1,0.65,0.5][Math.min(n,2)]*(n>2?0.8:1)));}
function labNext(){
  const m=lab.queue.shift();
  if(!m){lab.raf=0;lab.anim=null;labDraw();return;}
  const from=lab.shown;lab.shown=applyAlg(from,[m]);
  const dur=labDur(m,lab.queue.length),t0=performance.now();
  lab.anim={from,move:m,t:0};
  const step=()=>{const x=Math.min(1,(performance.now()-t0)/dur);lab.anim.t=x<1?0.5-0.5*Math.cos(Math.PI*x):1;
    if(x>=1){labNext();return;}
    labDraw();lab.raf=requestAnimationFrame(step);};
  lab.raf=requestAnimationFrame(step);
}
function labStopAnim(){if(lab.raf){cancelAnimationFrame(lab.raf);lab.raf=0;}lab.anim=null;lab.queue=[];if(lab.target)lab.shown=lab.target;}
// Show a state at once, as a new start: no layer turns, nothing on the move list, and the cross
// goal of New scramble is dropped (the moves it took cannot be known).
function labJump(cube){labStopAnim();lab.shown=lab.target=cube;lab.goal=null;labDraw();}
// My cube is solved: the reset command, then the state read again. The cube's count was off, so
// the moves between the old picture and solved are not turns; the picture jumps.
async function labSolved(){
  if(!lab.conn||lab.busy)return;
  const conn=lab.conn;lab.busy=true;labButtons();
  try{
    lab.jump=true;await conn.send('reset');labFixDrop(conn.name);
    await new Promise(r=>setTimeout(r,100));
    const cube=await conn.readState(3000);
    lab.jump=false;labJump(cube);
    labLog('solved',cube.isSolved()?'The cube took its state as solved.':'The cube answered, but not with a solved state.');
    labStatus(cube.isSolved()?'The cube now counts from solved. Each turn of your cube turns the layer.':'The cube did not take the change. Press My cube is solved again.');
  }catch(e){lab.jump=false;labLog('solved','The reset failed: '+e.message);labStatus('The cube did not take the change: '+e.message);}
  lab.busy=false;labButtons();
}
// Scan my cube: the state read from the cube again, as at connect. A read that matches the
// picture changes nothing. Any other read is one the lab had not seen (a turn it missed while
// the link was busy, or a state the cube did not report), so the moves between the two are not
// known as turns: nothing goes on the list, and the picture jumps.
async function labRead(){
  if(!lab.conn||lab.busy)return;
  const conn=lab.conn;lab.busy=true;lab.reading=true;labButtons();
  try{
    const cube=await conn.readState(3000);
    lab.reading=false;
    const same=!!lab.target&&lab.target.equals(cube);
    if(!same){lab.jump=true;labShow(cube);}
    labLog('state','State read: '+labFaceletText(cube)+(cube.isSolved()?' (solved)':'')+(same?' (as the picture)':''));
    labStatus(same?'The cube reads as the picture shows.'+labSolvedHint(cube):'The picture now shows the cube as it reads. Each turn of your cube turns the layer from here.'+labSolvedHint(cube));
  }catch(e){lab.reading=false;labLog('state','The read failed: '+e.message);labStatus('The cube did not answer. Turn a face to wake it up, then press Scan my cube again.');}
  lab.busy=false;labButtons();
}
// Paint my cube: the painter of the site opens over the lab (the link stays), the cube that comes
// back is the real state, and the picture jumps to it. The state the cube reports is not the real
// one, so the moves between the two are not turns: nothing goes on the list.
function labPaint(){
  if(!lab.conn||lab.busy)return;
  const conn=lab.conn,name=conn.name;
  if(typeof openPaint!=='function')return;
  lab.busy=true;labButtons();
  labStatus('Paint the colors of your cube as it is, yellow up and green toward you.');
  openPaint({go:'Use this cube',
    onCube:async cube=>{
      if(conn!==lab.conn){lab.busy=false;labButtons();labStatus('The cube is no longer connected. Connect, then read the colors again.');return;}
      let fixed=null;
      lab.reading=true;
      try{fixed=await conn.correct(cube,3000);labFixSave(name,conn.fix,'paint');}
      catch(e){lab.reading=false;lab.busy=false;labButtons();labLog('fix','The colors were not used: the cube did not answer.');labStatus('The cube did not answer, so the colors were not used. Turn a face to wake it up, then try again.');return;}
      lab.reading=false;lab.jump=true;labShow(fixed);
      lab.busy=false;labButtons();
      labLog('fix','The state is corrected from the colors painted: '+labFaceletText(fixed)+(fixed.isSolved()?' (solved)':''));
      labStatus('The picture now shows your cube as painted. Each turn of your cube turns the layer from here.');
    },
    onClose:()=>{lab.busy=false;labButtons();labStatus('The colors were not read. The picture shows the cube as the cube counts it.');}});
}
// The state as 54 letters, face by face (U R F D L B), to compare with the net in the site's
// Smart cube dialog.
function labFaceletText(cube){const L='WRGYOB';return cube.toFacelets().map((c,i)=>(i&&i%9===0?' ':'')+L[c]).join('');}
// The hint after a connect where the cube does not read as solved. Its count may be off.
function labSolvedHint(cube){return cube.isSolved()?'':' If your cube is solved, press My cube is solved: the cube counts its own turns and can lose count.';}
// ----- the tilt: the picture follows the cube in the hands -----
function labTurnView(){
  if(!lab.qTo||lab.qraf)return;
  lab.qAt=performance.now();
  const step=()=>{
    const now=performance.now(),k=1-Math.exp(-(now-lab.qAt)/70);lab.qAt=now;
    lab.q=lab.q?quatSlerp(lab.q,lab.qTo,k):lab.qTo;
    const done=quatAngle(lab.q,lab.qTo)<0.05;if(done)lab.q=lab.qTo;
    if(!lab.raf)labDraw();
    lab.qraf=done?0:requestAnimationFrame(step);
  };
  lab.qraf=requestAnimationFrame(step);
}
function labStopView(){if(lab.qraf){cancelAnimationFrame(lab.qraf);lab.qraf=0;}}
function labResetMode(){return $('#full').checked?'full':'yaw';}
// A tilt reading. The first one sets the heading. The detector gets the reading as the picture
// shows it, so its axes are the user's.
function labGyro(q){
  q=quatNorm(q);lab.raw=q;
  if(!lab.basis)lab.basis=resetBasis(q,labResetMode(),lab.hold.q);
  lab.qTo=quatNorm(quatMul(lab.basis,q));
  const now=performance.now();
  lab.times.push(now);while(lab.times.length&&now-lab.times[0]>1000)lab.times.shift();
  for(const ev of lab.det.feed(now,lab.qTo))labEvent(ev);
  if($('#turnOn').checked)for(const ev of lab.turn.feed(now,lab.qTo))labTurnEvent(ev);
  labTurnNow();
  labMeter(now);
  if(!lab.gyro){lab.gyro=true;labStopView();lab.q=lab.qTo;labDraw();labStatus('Live. Each turn of your cube turns the layer, and the picture tilts with the cube. Hold it white up, green toward you, and press Reset cube (R) to line the picture up.');return;}
  labTurnView();
}
// Reset cube: the cube as held now is the reference pose, the hold (white up and green toward the
// viewer unless the user said otherwise).
function labReset(){
  if(!lab.conn)return;
  if(lab.raw){lab.basis=resetBasis(lab.raw,labResetMode(),lab.hold.q);lab.qTo=quatNorm(quatMul(lab.basis,lab.raw));lab.det.reset();lab.turn.reset();labDots();labTurnNow();labTurnView();}
  else{lab.q=lab.qTo=null;labDraw();}
  labLog('reset','Reset cube ('+labResetMode()+'): '+labHoldWords(lab.hold)+'.');
}
// ----- patterns: the two-look cases the cube shows -----
// The cube as held: the hold's turns applied, so U is the top as held (cubeTabHeld).
function labHeld(cube){return cube&&lab.hold&&lab.hold.moves.length?applyAlg(cube,lab.hold.moves):cube;}
// A state reported: a two-look case goes in the list, once. A solved cube starts the once over.
// After New scramble the cross on the bottom as held is the first goal: once made, it goes in the
// list with the moves it took, and the goal is spent.
function labPatRead(cube){
  if(!cube||typeof cfopStage!=='function')return;
  const held=labHeld(cube),st=cfopStage(held,LAB_COLORS[held.center[3]]);
  if(lab.goal&&st.stage!=='cross'&&st.down===lab.goal.color){
    const g=lab.goal,moves=lab.moves.slice(g.at),n=moves.length;lab.goal=null;
    lab.pats.unshift({t:Date.now(),step:'Cross',name:n+(n===1?' move':' moves'),moves:moves.join(' '),
      sub:`The ${g.color} cross, made in ${n} moves. The shortest was ${g.optimal}.`});
    if(lab.pats.length>LAB_PAT_MAX)lab.pats.length=LAB_PAT_MAX;
    labPatSave();labPatDraw();
    labLog('cross',`Cross: ${g.color} in ${n} moves (shortest ${g.optimal}): ${moves.join(' ')||'no moves'}.`);
  }
  if(st.stage==='solved'){lab.patLast=null;return;}
  const step=LAB_PAT_STEPS[st.stage];if(!step)return;
  const key=st.stage+':'+st.name;if(key===lab.patLast)return;lab.patLast=key;
  lab.pats.unshift({t:Date.now(),step,name:st.name,moves:st.moves.join(' '),sub:st.sub});
  if(lab.pats.length>LAB_PAT_MAX)lab.pats.length=LAB_PAT_MAX;
  labPatSave();labPatDraw();
}
// New scramble (N): the cube in the hands is a fresh scramble; no moves are made. The entry holds
// the cross on the bottom as held: its color, the shortest length, the count of the solutions by
// length up to LAB_CROSS_MAX and the shortest ones, in letters as held (reframe puts the bottom as
// held where the engine's D cross is). The matcher starts over, with that cross as its goal.
function labPatNew(){
  const cube=lab.target||lab.shown||new Cube(),held=labHeld(cube),color=LAB_COLORS[held.center[3]];
  const r=crossSolutions(reframe(held),LAB_CROSS_MAX),made=r.optimal===0;
  const lens=[];if(!made)for(let n=r.optimal;n<=LAB_CROSS_MAX;n++)lens.push(n+' moves: '+(r.byLen[n]||[]).length);
  if(!made&&!lens.length)lens.push('none in '+LAB_CROSS_MAX+' moves or fewer');
  const counts=made?'already made':lens.join(' · '),sols=r.byLen[r.optimal]||[];
  const e={t:Date.now(),step:'Scramble',name:made?'Cross made':'Cross first',moves:'',cross:{color,optimal:r.optimal,counts,lens,sols},
    sub:`As held: ${labHoldWords(lab.hold)}. The cross on the bottom is ${color}. Each solution is counted once, up to ${LAB_CROSS_MAX} moves.`};
  lab.pats.unshift(e);if(lab.pats.length>LAB_PAT_MAX)lab.pats.length=LAB_PAT_MAX;
  lab.patLast=null;lab.goal=made?null:{color,optimal:r.optimal,at:lab.moves.length};
  labPatSave();labPatDraw();labPatShow(true);
  labLog('scramble',`New scramble, as held ${labHoldWords(lab.hold)}. ${color} cross: ${made?'already made':`shortest ${r.optimal}; ${counts}`}.`);
}
function labPatSave(){try{localStorage.setItem('cw:labPatterns',JSON.stringify(lab.pats));}catch(e){}}
function labPatLoad(){try{const a=JSON.parse(localStorage.getItem('cw:labPatterns')||'[]');return Array.isArray(a)?a.filter(e=>e&&e.name).slice(0,LAB_PAT_MAX):[];}catch(e){return [];}}
// The window: the count in the head, the entries newest first (time, step, case, moves).
function labPatDraw(){
  const el=$('#patList'),n=lab.pats.length,mk=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!=null)x.textContent=text;return x;};
  $('#patCount').textContent=n?n+(n===1?' pattern':' patterns'):'';$('#patClear').disabled=!n;
  el.textContent='';
  if(!n){el.appendChild(mk('div','none','No patterns yet. A two-look OLL or PLL case the cube shows goes here.'));return;}
  for(const e of lab.pats){
    const d=mk('div','ent'),t=new Date(e.t),p=x=>String(x).padStart(2,'0');
    d.appendChild(mk('time',null,`${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}`));
    const line=mk('span');line.appendChild(mk('b',null,e.step));line.appendChild(mk('span','name',e.name));d.appendChild(line);
    if(e.moves){const c=mk('code');if(e.step==='Cross')c.textContent=e.moves;else c.appendChild(labSpoil(e.moves,e.t+':alg'));d.appendChild(c);}if(e.sub)d.title=e.sub;
    if(e.cross){const c=e.cross,data=mk('span','data');data.appendChild(mk('b',null,c.color[0].toUpperCase()+c.color.slice(1)+' cross'));
      data.appendChild(document.createTextNode(c.optimal?`: shortest ${c.optimal}`:': already made'));for(const l of c.lens||[c.counts])data.appendChild(mk('span','len',l));d.appendChild(data);
      if(c.sols&&c.sols.length){const s=mk('div','sols');c.sols.slice(0,LAB_SOLS_SHOWN).forEach((sol,i)=>{const line=mk('code');line.appendChild(labSpoil(sol,e.t+':sol:'+i));s.appendChild(line);});
        if(c.sols.length>LAB_SOLS_SHOWN)s.appendChild(mk('span','more',`+${c.sols.length-LAB_SOLS_SHOWN} more`));d.appendChild(s);}}
    el.appendChild(d);
  }
}
// A line of moves with its first move shown and a cover on each move after it (the site's Reference
// spoilers, spoilAlg in js/app.js). A lead whole-cube turn is a hold: the move after it shows too. A
// click on the line uncovers the next move, the Reveal button uncovers the rest, and a click on an
// open line covers it again. What is open is kept for the session by entry and line in lab.patOpen,
// so a redraw for a new entry does not cover a line again. A line of one move has no cover.
function labSpoil(moves,key){
  const t=moves.trim().split(/\s+/).filter(Boolean),s=document.createElement('span');s.className='spoil';s.dataset.key=key;
  let k=0;while(k<t.length-1&&/^[xyz]/.test(t[k]))k++;
  s.appendChild(document.createTextNode(t.slice(0,k+1).join(' ')));
  const rest=t.slice(k+1),open=lab.patOpen[key]||0;
  if(!rest.length){s.classList.add('open');s.classList.add('one');return s;}
  rest.forEach((m,i)=>{s.appendChild(document.createTextNode(' '));const x=document.createElement('span');x.className='sp-m'+(i<open?' on':'');x.textContent=m;s.appendChild(x);});
  const b=document.createElement('button');b.type='button';b.className='sp-btn';s.appendChild(b);
  labSpoilSync(s);return s;
}
function labSpoilSync(s){const left=s.querySelectorAll('.sp-m:not(.on)').length,b=s.querySelector('.sp-btn');s.classList.toggle('open',!left);
  if(b)b.textContent=`Reveal ${left} more move${left===1?'':'s'}`;s.title=left?'Click to reveal the next move':'Click to cover the moves again';
  if(s.dataset.key)lab.patOpen[s.dataset.key]=s.querySelectorAll('.sp-m.on').length;}
function labSpoilStep(s,all){const hid=[...s.querySelectorAll('.sp-m:not(.on)')];
  if(!hid.length)s.querySelectorAll('.sp-m.on').forEach(m=>m.classList.remove('on'));else(all?hid:hid.slice(0,1)).forEach(m=>m.classList.add('on'));
  labSpoilSync(s);}
function labPatShow(on){$('#pat').hidden=!on;$('#patBtn').setAttribute('aria-pressed',String(!!on));}
// The window moves: drag it by its head. The place is kept in cw:labPat and clamped to the screen,
// as the cube window on the site (cubeTabDrag).
function labPatPlace(x,y,save){
  const w=$('#pat'),W=window.innerWidth||0,H=window.innerHeight||0,ww=w.offsetWidth||400;
  x=Math.round(Math.max(8,Math.min(x,Math.max(8,W-ww-8))));y=Math.round(Math.max(0,Math.min(y,Math.max(0,H-48))));
  w.style.left=x+'px';w.style.top=y+'px';lab.patPos={x,y};
  if(save)try{localStorage.setItem('cw:labPat',JSON.stringify(lab.patPos));}catch(e){}
}
function labPatPosLoad(){try{const p=JSON.parse(localStorage.getItem('cw:labPat')||'null');return p&&isFinite(p.x)&&isFinite(p.y)?p:null;}catch(e){return null;}}
function labPatDrag(){
  const w=$('#pat'),h=w.querySelector('.head');
  const p=labPatPosLoad();if(p)labPatPlace(p.x,p.y,false);
  h.addEventListener('pointerdown',e=>{
    if(e.button>0||e.target.closest('button'))return;
    e.preventDefault();
    const r=w.getBoundingClientRect(),d={x:e.clientX-r.left,y:e.clientY-r.top,id:e.pointerId};
    const move=ev=>{if(ev.pointerId===d.id)labPatPlace(ev.clientX-d.x,ev.clientY-d.y,false);};
    const up=ev=>{if(ev.pointerId!==d.id)return;
      h.removeEventListener('pointermove',move);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);
      w.classList.remove('drag');if(lab.patPos)labPatPlace(lab.patPos.x,lab.patPos.y,true);};
    h.addEventListener('pointermove',move);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);
    if(h.setPointerCapture)try{h.setPointerCapture(e.pointerId);}catch(_){}
    w.classList.add('drag');
  });
  window.addEventListener('resize',()=>{if(lab.patPos)labPatPlace(lab.patPos.x,lab.patPos.y,false);});
}
function labPatClear(){lab.pats=[];lab.patLast=null;labPatSave();labPatDraw();}
// ----- experiment 3: six twists of one face -----
// The sixth quarter turn: say so, then Reset cube after the wait. A second gesture within the wait
// starts the wait over.
function labTwist(m){
  labLog('twist',`${m[0]} turned and turned back six times: Reset cube in ${lab.twistMs} ms`);
  clearTimeout(lab.twistTimer);lab.twistTimer=setTimeout(()=>{lab.twistTimer=0;labReset();},lab.twistMs);
}
// ----- the experiment: the panel -----
function labEvent(ev){
  const f=v=>v.toFixed(2);
  if(ev.type==='smack')labLog('smack',`smack ${ev.deg.toFixed(1)}° in ${Math.round(ev.ms)} ms, axis x ${f(ev.axis[0])} y ${f(ev.axis[1])} z ${f(ev.axis[2])} → ${ev.name}`);
  if(ev.type==='turn')labLog('turn',`turn ${ev.deg.toFixed(1)}°, axis x ${f(ev.axis[0])} y ${f(ev.axis[1])} z ${f(ev.axis[2])}`);
  if(ev.type==='series'){labLog('series',`${ev.smacks.length} smacks on the ${SMACK_FACES[lab.det.opts.face]||'cube'}: reset?`);labConfirm();}
  labDots();
}
// ----- experiment 2: whole-cube turns from the tilt -----
// The nearest of the 24 holds to the pose q, and how far off it is in degrees.
function labNearestHold(q){let best=null,off=Infinity;for(const h of LAB_HOLDS){const a=quatAngle(h.q,q);if(a<off){off=a;best=h;}}return {hold:best,off};}
function labTurnEvent(ev){
  const f=v=>v.toFixed(2),ax=`axis x ${f(ev.axis[0])} y ${f(ev.axis[1])} z ${f(ev.axis[2])}`;
  if(ev.type==='tstart')labLog('tstart',`turn start: ${ev.name}, ${ev.deg.toFixed(1)}°, ${ax}`);
  if(ev.type==='tupdate')labLog('tupdate',`turn update: ${ev.name}, ${ev.deg.toFixed(1)}° at ${Math.round(ev.ms)} ms, ${ax}`);
  if(ev.type==='tfinish'){
    const n=labNearestHold(ev.q),head=`turn finish: ${ev.name}, ${ev.deg.toFixed(1)}° in ${Math.round(ev.ms)} ms, ${ax}`;
    if(n.off>lab.snap)labLog('tfinish',`${head} → between holds (nearest ${labHoldWords(n.hold)}, ${n.off.toFixed(0)}° off); the hold stays`);
    else if(n.hold===lab.hold)labLog('tfinish',`${head} → back at the hold, ${n.off.toFixed(0)}° off`);
    else{const t=labSetHold(n.hold,'turn');labLog('tmove',`${head} → ${t||'the same hold'}, ${n.off.toFixed(0)}° off. Hold: ${labHoldWords(n.hold)}.`);}
  }
}
// The live line under the box: still or turning, and how far from the rest pose.
function labTurnNow(){const st=lab.turn.state,el=$('#turnNow');if(!el)return;el.textContent=!st.rest?'–':(st.turning?'turning, ':'still, ')+st.deg.toFixed(1)+'° from rest';}
function labDots(){const n=lab.det.state.series.length;$$('#dots span').forEach((s,i)=>s.classList.toggle('on',i<n));}
function labLog(cls,text){
  const el=$('#log'),d=document.createElement('div');d.className=cls;
  const t=new Date(),p=n=>String(n).padStart(2,'0');
  d.textContent=`${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}.${String(t.getMilliseconds()).padStart(3,'0')} ${text}`;
  el.prepend(d);while(el.children.length>40)el.lastChild.remove();
}
function labMeter(now){
  const st=lab.det.state;
  $('#mDeg').textContent=st.deg.toFixed(1);$('#mSpeed').textContent=Math.round(st.speed);$('#mHz').textContent=lab.times.length;$('#mN').textContent=st.n;
  lab.trace.push([now,st.deg]);while(lab.trace.length&&now-lab.trace[0][0]>LAB_TRACE_MS)lab.trace.shift();
  if(!lab.traceRaf)lab.traceRaf=requestAnimationFrame(()=>{lab.traceRaf=0;labTraceDraw();});
}
// The tilt away from rest over the last four seconds, with the jolt line. Numbers only.
function labTraceDraw(){
  const svg=$('#trace'),now=performance.now(),top=Math.max(20,lab.det.opts.jolt*3);
  const y=d=>(70-4-Math.min(d,top)/top*62).toFixed(1),x=t=>(320-(now-t)/LAB_TRACE_MS*320).toFixed(1);
  const pts=lab.trace.map(([t,d])=>x(t)+','+y(d)).join(' ');
  svg.innerHTML=`<line x1="0" x2="320" y1="${y(lab.det.opts.jolt)}" y2="${y(lab.det.opts.jolt)}"/><polyline points="${pts}"/>`;
}
function labKnobs(){
  for(const inp of $$('.knob input[type=range]')){
    const k=inp.dataset.k,out=inp.parentNode.querySelector('output');if(!k)continue;
    inp.value=lab.det.opts[k];out.value=inp.value;
    inp.oninput=()=>{lab.det.set(k,parseFloat(inp.value));out.value=inp.value;};
  }
  for(const inp of $$('.tknob input[type=range]')){
    const k=inp.dataset.k,out=inp.parentNode.querySelector('output');
    inp.value=k==='snap'?lab.snap:lab.turn.opts[k];out.value=inp.value;
    inp.oninput=()=>{const v=parseFloat(inp.value);if(k==='snap')lab.snap=v;else lab.turn.set(k,v);out.value=inp.value;};
  }
  const tw=$('#twistMs'),two=tw.parentNode.querySelector('output');tw.value=lab.twistMs;two.value=tw.value;
  tw.oninput=()=>{lab.twistMs=parseInt(tw.value,10);two.value=tw.value;};
  const face=$('#kFace');face.value=lab.det.opts.face==null?'':String(lab.det.opts.face);
  face.onchange=()=>{labBlur();lab.det.set('face',face.value===''?null:parseInt(face.value,10));lab.det.state.series=[];labDots();
    $('#confirmText').textContent=(face.value===''?'You smacked the cube three times.':`You smacked the ${SMACK_FACES[face.value]} face three times.`)+' Hold the cube white up, green toward you, then press Reset.';};
}
function labConfirm(){
  if(lab.confirmOpen)return;
  lab.confirmOpen=true;$('#confirm').hidden=false;
  setTimeout(()=>$('#confirmYes').focus(),20);
}
function labConfirmEnd(yes){
  if(!lab.confirmOpen)return;
  lab.confirmOpen=false;$('#confirm').hidden=true;
  if(yes)labReset();else labLog('cancel','Reset cancelled.');
}
function labSide(on){$('#side').hidden=!on;$('main').classList.toggle('side',on);$('#sideBtn').setAttribute('aria-pressed',String(on));}
function labKeys(e){
  if(e.target&&/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)&&e.target.type!=='checkbox'&&e.target.type!=='range')return;
  if(lab.confirmOpen){if(e.key==='Escape'){e.preventDefault();labConfirmEnd(false);}if(e.key==='Enter'){e.preventDefault();labConfirmEnd(true);}return;}
  if(e.key==='Escape'&&!$('#pat').hidden){e.preventDefault();labPatShow(false);return;}
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  const k=e.key.toLowerCase();
  if(k==='p'){e.preventDefault();labPatShow($('#pat').hidden);}
  if(k==='n'){e.preventDefault();labPatNew();}
  if(k==='r'){e.preventDefault();labReset();}
  if(k==='s'){e.preventDefault();labSolved();}
  if(k==='l'){e.preventDefault();labSide($('#side').hidden);}
  if(k==='c'){e.preventDefault();labClear();}
  if(k==='i'){e.preventDefault();labIso(!lab.iso);}
}
// Clear all (C): the moves and the log. Clear moves in the box empties the moves alone.
function labClear(){labMovesClear();$('#log').textContent='';}
// ----- the cubes this browser knows -----
// cw:labCubes, by name: the address, the id the link gave, and when it last connected. A cube in
// it connects by itself when the lab opens, and again when the link drops.
function labKnown(){try{return JSON.parse(localStorage.getItem('cw:labCubes')||'{}')||{};}catch(e){return {};}}
function labRemember(name,d){try{const m=labKnown();m[name]=Object.assign(m[name]||{},d,{at:Date.now()});localStorage.setItem('cw:labCubes',JSON.stringify(m));}catch(e){}}
function labIsKnown(d,known){return !!(known[d.name]||Object.values(known).some(k=>k.id&&k.id===d.id));}
// ----- the link -----
function labMacs(){try{return JSON.parse(localStorage.getItem('cw:ganMac')||'{}')||{};}catch(e){return {};}}
// The site's correction of a cube whose count is off (cw:ganFix by name, from Scan my cube or
// Paint my cube in the Smart cube dialog): the link applies it to every state. My cube is solved
// drops it, here and in storage.
function labFixLoad(name){try{const e=(JSON.parse(localStorage.getItem('cw:ganFix')||'{}')||{})[name];return e?ganFixLoad(e.fix):null;}catch(e){return null;}}
function labFixDrop(name){try{const m=JSON.parse(localStorage.getItem('cw:ganFix')||'{}')||{};if(m[name]){delete m[name];localStorage.setItem('cw:ganFix',JSON.stringify(m));}}catch(e){}}
// A fix made here, in the site's shape: {fix:{cp,co,ep,eo}, from:'scan'|'paint', at:ms}.
function labFixSave(name,fix,from){try{const m=JSON.parse(localStorage.getItem('cw:ganFix')||'{}')||{};m[name]={fix:ganFixSave(fix),from,at:Date.now()};localStorage.setItem('cw:ganFix',JSON.stringify(m));}catch(e){}}
function labSaveMac(name,mac){try{const m=labMacs();if(mac)m[name]=mac;else delete m[name];localStorage.setItem('cw:ganMac',JSON.stringify(m));}catch(e){}}
function labAskMac(name){
  $('#macRow').hidden=false;const inp=$('#mac');inp.value=labMacs()[name]||'';setTimeout(()=>inp.focus(),20);
  return new Promise(res=>{lab.macWait=res;});
}
function labMacGo(){
  const mac=ganParseMac($('#mac').value);
  if(!mac){labStatus('Type six pairs of letters and digits, with a colon between each pair: AB:12:34:56:78:9A.');return;}
  $('#macRow').hidden=true;
  if(lab.macWait){const w=lab.macWait;lab.macWait=null;w(mac);}
}
// The chooser: the browser's own with Web Bluetooth, a list on the page over the bridge. ?bridge=1
// takes the bridge where the browser has both (Chrome at 127.0.0.1): the app reads the address.
// known (the map from labKnown): a cube in it is taken as soon as it is heard, with no click.
async function labPick(known){
  if(navigator.bluetooth&&!/[?&]bridge=1/.test(location.search))return known?labPickKnown(known):ganPick();
  const link=BRIDGE||await bridgeStart();
  if(!link)throw new Error('The Twistwright app is not serving this page. Run lab/run.sh, then open http://127.0.0.1:27272/lab/ again.');
  if(link.bluetooth==='unauthorized')throw new Error('macOS did not allow Bluetooth for Twistwright. Allow it in System Settings › Privacy & Security › Bluetooth, then press Connect again.');
  if(link.bluetooth==='poweredOff')throw new Error('Bluetooth is off on this Mac. Turn it on, then press Connect again.');
  return labList(link,known);
}
// The row under the picture while the lab looks for a cube: a note, the cubes found as buttons
// (over the bridge) and Cancel. start(found) begins the look and returns what stops it; found(dev)
// ends the look with that device. Cancel, or the link closing, ends it with none.
function labRow(note,start){
  const row=$('#list');row.hidden=false;$('#listItems').textContent='';$('#listNote').textContent=note;
  return new Promise((res,rej)=>{
    let stop=null,ended=false;
    const end=dev=>{if(ended)return;ended=true;if(stop)stop();lab.listEnd=null;row.hidden=true;
      if(dev)res(dev);else rej(Object.assign(new Error('cancelled'),{name:'NotFoundError'}));};
    $('#listCancel').onclick=()=>end(null);lab.listEnd=end;
    stop=start(end);if(ended)stop();
  });
}
function labLookNote(names){return `Looking for ${names.join(', ')}. Turn a face to wake the cube up.`;}
// The list over the bridge. A known cube ends the look as soon as the scan hears it, with the
// address the scan carries or the one saved; any other cube is a button.
function labList(link,known){
  const names=known?Object.keys(known):[];if(!names.length)known=null;
  const seen=new Map();
  return labRow(known?labLookNote(names):'Looking for cubes. Turn a face to wake the cube up.',end=>{
    const stop=link.scan(d=>{
      if(known&&labIsKnown(d,known)){end(bridgeDevice(link,{id:d.id,name:d.name,mac:d.mac||(known[d.name]||{}).mac||null}));return;}
      let b=seen.get(d.id);
      if(!b){b=document.createElement('button');$('#listItems').appendChild(b);seen.set(d.id,b);}
      b.textContent=d.name;b.dataset.mac=d.mac||'';
      b.onclick=()=>end(bridgeDevice(link,{id:d.id,name:d.name,mac:b.dataset.mac||null}));
      if(!known)$('#listNote').textContent='Choose your cube.';
    });
    const onEv=e=>{if(e.ev==='closed')end(null);};link.on(onEv);
    return()=>{stop();link.off(onEv);};
  });
}
// Web Bluetooth with no click: of the cubes this page was once allowed (getDevices, where the
// browser has it), the known ones; the first heard advertising is taken. Where the browser cannot
// listen, the first known one is taken at once and the link tried. null where the browser has no
// getDevices or none of its cubes is known: then only Connect, a click, can open the chooser.
async function labPickKnown(known){
  const bt=navigator.bluetooth;
  if(typeof bt.getDevices!=='function')return null;
  const devs=(await bt.getDevices()).filter(d=>labIsKnown(d,known));
  if(!devs.length)return null;
  if(devs.some(d=>typeof d.watchAdvertisements!=='function'))return devs[0];
  return labRow(labLookNote(devs.map(d=>d.name)),end=>{
    const ab=new AbortController();
    const ons=devs.map(d=>{const f=()=>end(d);d.addEventListener('advertisementreceived',f);d.watchAdvertisements({signal:ab.signal}).catch(()=>{});return [d,f];});
    return()=>{ab.abort();for(const [d,f] of ons)d.removeEventListener('advertisementreceived',f);};
  });
}
// auto: true for the look with no click, when the lab opens or the link drops. A press of Connect
// while a look runs ends that look and starts the chooser.
async function labConnect(auto){
  auto=auto===true;
  if(lab.busy||lab.conn||!ganAvailable())return;
  if(lab.listEnd)lab.listEnd(null);
  const seq=++lab.pickSeq;
  let device;
  try{device=await labPick(auto?labKnown():null);}
  catch(e){if(seq===lab.pickSeq)labStatus(e.name==='NotFoundError'?(auto?'Press Connect to look for your cube again.':'No cube was chosen. Turn the cube to wake it up, then press Connect again.'):e.message);return;}
  if(!device){labStatus('Press Connect, then choose your cube in the list that the browser shows.');return;}
  const name=device.name||'GAN cube';
  lab.busy=true;labButtons();
  let mac=device.mac||labMacs()[name],typed=false;
  if(!mac){labStatus(`Looking for the address of ${name}. Turn a face now and then to keep the cube awake.`);mac=await ganWatchMac(device,8000);}
  for(;;){
    if(!mac){lab.busy=false;labButtons();mac=await labAskMac(name);typed=true;if(!mac)return;lab.busy=true;labButtons();}
    labStatus(`Connecting to ${name}.`);
    let conn=null;
    try{conn=await ganOpen(device,mac,ev=>labLink(ev,conn),{fix:labFixLoad(name)});}
    catch(e){lab.busy=false;labButtons();labStatus(e.code==='model'?e.message:'The connection did not start. Turn the cube to wake it up, then press Connect again.');return;}
    try{
      const cube=await conn.readState(3000);
      labSaveMac(name,conn.mac);labRemember(name,{mac:conn.mac,id:device.id||null});lab.conn=conn;lab.busy=false;
      lab.moves=[];if(lab.goal)lab.goal.at=0;lab.shown=lab.target=null;lab.asked=false;lab.want=false;lab.gyro=false;lab.raw=lab.basis=lab.q=lab.qTo=null;lab.det.reset();lab.twist.reset();clearTimeout(lab.twistTimer);lab.twistTimer=0;lab.trace=[];lab.times=[];
      labButtons();labMovesDraw();labDots();labShow(cube);
      labStatus((conn.gen===3?'Live. Each turn of your cube turns the layer. This cube has no tilt sensor.':'Live. Each turn of your cube turns the layer. Waiting for the first tilt reading: move the cube.')+labSolvedHint(cube));
      labLog('link',`Connected to ${conn.name} (gen ${conn.gen}).`+(conn.fix?' The state is corrected from the colors read in the Smart cube dialog.':''));
      labLog('state','State read: '+labFaceletText(cube)+(cube.isSolved()?' (solved)':''));
      return;
    }catch(e){
      conn.close();
      if(e.code!=='badmac'&&e.code!=='timeout'){lab.busy=false;labButtons();labStatus('The cube did not answer: '+e.message);return;}
      labSaveMac(name,null);labRemember(name,{mac:null});
      labStatus(typed?'The cube did not answer. Check the MAC address, then try again.':`The cube did not answer. Type the MAC address of ${name}.`);
      mac=null;
    }
  }
}
function labLink(ev,conn){
  if(!conn||conn!==lab.conn)return;
  if(ev.type==='gone'){lab.conn=null;lab.asked=false;lab.want=false;labStopView();labButtons();labStatus('The cube is no longer connected. Turn a face to wake it up.');labLog('link','The link dropped.');labConnect(true);return;}
  if(ev.type==='off'){conn.close();return;}
  if(ev.type==='move')labAsk();
  if(ev.type==='gyro')labGyro(ev.q);
  if(ev.type==='state'){lab.asked=false;if(lab.want){lab.want=false;labAsk();}if(!lab.reading)labShow(ev.cube);} // a read for a correction shows nothing: labReadColors jumps to the corrected state
}
function labDisconnect(){
  if(lab.conn){const c=lab.conn;lab.conn=null;c.close();labLog('link','Disconnected.');}
  labStopAnim();labStopView();lab.busy=false;labButtons();labStatus('Disconnected. Press Connect to connect again.');
}
// ----- start -----
function labStart(){
  lab.det=smackDetector({});lab.turn=turnDetector({});lab.twist=twistDetector({});
  labSetHold(labHoldLoad(),'load');$('#holdUp').onchange=labHoldPick;$('#holdFront').onchange=labHoldPick;
  lab.iso=labIsoLoad();$('#iso').checked=lab.iso;$('#iso').onchange=e=>labIso(e.target.checked);labViewDrag();
  labKnobs();labMovesDraw();labDraw();labButtons();
  $('#connect').onclick=labConnect;$('#disconnect').onclick=labDisconnect;$('#reset').onclick=labReset;$('#solved').onclick=labSolved;$('#scan').onclick=labRead;$('#paint').onclick=labPaint;$('#clear').onclick=labClear;$('#movesClear').onclick=labMovesClear;
  $('#macGo').onclick=labMacGo;$('#macCopy').onclick=labCopyMac;$('#mac').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();labMacGo();}});
  $('#confirmYes').onclick=()=>labConfirmEnd(true);$('#confirmNo').onclick=()=>labConfirmEnd(false);
  $('#sideBtn').onclick=()=>labSide($('#side').hidden);
  lab.pats=labPatLoad();labPatDraw();$('#patBtn').onclick=()=>labPatShow($('#pat').hidden);$('#patClose').onclick=()=>labPatShow(false);$('#patClear').onclick=labPatClear;$('#patNew').onclick=labPatNew;labPatDrag();
  $('#patList').addEventListener('click',e=>{const s=e.target.closest&&e.target.closest('.spoil');if(!s||s.classList.contains('one'))return;e.preventDefault();labSpoilStep(s,!!e.target.closest('.sp-btn'));});
  document.addEventListener('keydown',labKeys);
  document.addEventListener('cw:bridge',labButtons);
  // The bar wraps onto more rows in a narrow window. The Patterns window opens under its last row.
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>document.documentElement.style.setProperty('--barh',$('.bar').offsetHeight+'px')).observe($('.bar'));
  // The cross table takes over a second to build: build it while the page is idle, so the first
  // New scramble answers at once.
  if(typeof requestIdleCallback==='function')requestIdleCallback(()=>buildCrossTable());
  // Open as if Connect were pressed: the list over the bridge, or the look for a known cube.
  const ready=()=>{labButtons();
    const wb=navigator.bluetooth&&!/[?&]bridge=1/.test(location.search),known=Object.keys(labKnown());
    if(!wb&&!BRIDGE){labStatus('No way to a cube: this browser has no Bluetooth and the Twistwright app is not serving this page. Run lab/run.sh, then open http://127.0.0.1:27272/lab/.');return;}
    if(wb&&!(known.length&&typeof navigator.bluetooth.getDevices==='function')){labStatus('Press Connect, then choose your cube in the list that the browser shows.');return;}
    labStatus(known.length?`The lab looks for ${known.join(', ')} by itself. Press Connect to choose another cube.`:'Choose your cube in the list. The lab remembers it and connects by itself next time.');
    labConnect(true);};
  if(typeof bridgeStart==='function')bridgeStart().then(ready);else ready();
}
labStart();
