// ================= Quest cube lab: the page =================
// The smart cube lab's live cube, in a Meta Quest headset. The page opens flat in the Quest Browser
// (or any browser, for a test): it connects to the cube, draws a preview, and has the buttons that
// start a WebXR session. In the session the cube floats in front of the user, in passthrough (AR)
// or in VR; each turn of the real cube turns the layer, and the tilt turns the whole cube.
//
// The way to the cube. The Quest Browser has no working Web Bluetooth (navigator.bluetooth is there,
// but getAvailability() says no and requestDevice fails), so the Twistwright app for macOS
// does the Bluetooth work, as it does for Safari (js/bridge.js). The headset reaches the Mac through
// adb reverse: http://localhost:27272 on the Quest is the app's page server on the Mac, and
// ws://127.0.0.1:27273 its bridge. localhost is a secure context, so WebXR runs over plain http.
// quest/run.sh sets this up. A browser whose Web Bluetooth works (Chrome on a computer) connects
// directly.
// With no cube at all, Demo cube turns the cube by itself and the keys U R F D L B (Shift: prime)
// turn it by hand.
//
// Storage: cw:ganMac (the site's map from cube name to MAC address), cw:ganFix (the site's
// correction for a cube whose count is off), cw:questCube (the last cube's name, connected by
// itself when the bridge hears it), cw:questHold, cw:questTilt.
const $=s=>document.querySelector(s);
const qs={conn:null,busy:false,pickSeq:0,wb:false,listEnd:null,macWait:null,
  shown:null,target:null,queue:[],anim:null,moves:[],colors:[],stage:null,
  raw:null,basis:null,q:null,qTo:null,tilt:true,hold:QUEST_HOLDS.white,
  name:'',battery:null,status:'',demo:0,
  gl:null,r:null,view:{yaw:-32,pitch:24},drag:null,flatRaf:0,last:0,xr:null,support:{ar:false,vr:false}};

// The page's state, for the tests and the console (a const is not on window).
function questState(){return qs;}
function questGet(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}}
function questSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function questStatus(t){qs.status=t;$('#status').textContent=t;}

// ----- the cube's state: moves found between two states, turned in a queue -----
function questShow(cube){
  const moved=questPath(qs.target||qs.shown,cube);
  if(!moved){questJump(cube);return;}
  if(!moved.length)return;
  for(const m of moved)questAdd(questRelabel(m,qs.hold));
  qs.target=cube;qs.queue.push(...moved);questStage();questMovesDraw();
}
// A state too far from the last to show as turns: the picture jumps, and nothing goes on the list.
function questJump(cube){qs.queue=[];qs.anim=null;qs.shown=qs.target=cube;questStage();questMovesDraw();}
function questAdd(m){
  // A merge changes only the last move, and keeps its face: the colors so far stay.
  qs.moves=questMerge(qs.moves,m);qs.colors=qs.colors.slice(0,qs.moves.length);
  const held=questHeld(qs.target||qs.shown||new Cube(),qs.hold);
  while(qs.colors.length<qs.moves.length)qs.colors.push(questMoveColor(qs.moves[qs.colors.length],held));
}
function questDur(m,n){return Math.max(90,Math.round((m.endsWith('2')?360:240)*[1,0.65,0.5][Math.min(n,2)]));}
// One step of the clock, from whichever loop runs (the page's or the session's).
function questTick(now){
  const a=qs.anim;
  if(a){a.t=Math.min(1,(now-a.t0)/a.dur);if(a.t>=1){qs.shown=applyAlg(a.from,[a.move]);qs.anim=null;}}
  if(!qs.anim&&qs.queue.length){const m=qs.queue.shift();qs.anim={from:qs.shown||new Cube(),move:m,t:0,t0:now,dur:questDur(m,qs.queue.length)};}
  if(qs.anim){const x=qs.anim.t;qs.anim.e=0.5-0.5*Math.cos(Math.PI*x);}
  const dt=qs.last?Math.min(0.1,(now-qs.last)/1000):0;qs.last=now;
  if(qs.qTo)qs.q=qs.q?quatNorm(quatSlerp(qs.q,qs.qTo,1-Math.exp(-dt*18))):qs.qTo;
  return dt;
}
// The cube's turn on the screen: the tilt when it is on and live, else the hold.
function questOrient(){return qs.tilt&&qs.q?qs.q:qs.hold.q;}
function questStage(){
  const c=qs.target||qs.shown;
  try{qs.stage=c&&typeof cfopStage==='function'?cfopStage(questHeld(c,qs.hold)):null;}catch(e){qs.stage=null;}
  $('#stage').textContent=qs.stage?qs.stage.name+(qs.stage.sub?' · '+qs.stage.sub:''):'';
}
function questMovesDraw(){
  const box=$('#moves');box.textContent='';
  const from=Math.max(0,qs.moves.length-20);
  if(from){const s=document.createElement('span');s.className='more';s.textContent='… ';box.appendChild(s);}
  qs.moves.slice(from).forEach((m,i)=>{const s=document.createElement('span');s.className='mv';s.textContent=m;s.style.setProperty('--c',qs.colors[from+i]||'#8f8f97');box.appendChild(s);});
  $('#count').textContent=qs.moves.length===1?'1 move':qs.moves.length+' moves';
  $('#clear').disabled=!qs.moves.length;
}
function questClear(){qs.moves=[];qs.colors=[];questMovesDraw();}
function questPanelLines(){
  const p=questPanel({name:qs.name||(qs.demo?'Demo cube':''),battery:qs.battery,status:qs.status,stage:qs.stage,moves:qs.moves,tilt:qs.tilt&&!!qs.q,hint:questHint()});
  p.moves=p.moves.map((m,i)=>({m,color:qs.colors[qs.moves.length-p.moves.length+i]||'#8f8f97'}));
  return p;
}
function questHint(){
  const x=qs.xr;if(!x)return '';
  return x.hands?'Poke a button · pinch: carry · hold a pinch: bring here':'Poke a button, or A tilt · B level · Stick size · Grip carries';
}

// ----- tilt -----
function questGyro(q){
  q=quatNorm(q);qs.raw=q;
  if(!qs.basis)qs.basis=resetBasis(q,'yaw',qs.hold.q);
  qs.qTo=quatNorm(quatMul(qs.basis,q));
  if(!qs.q)questButtons();
}
// Level: the cube as held now is the hold, seen square from the front.
function questLevel(){if(qs.raw){qs.basis=resetBasis(qs.raw,'yaw',qs.hold.q);qs.qTo=quatNorm(quatMul(qs.basis,qs.raw));}}
function questTilt(on){qs.tilt=on;questSet('cw:questTilt',on);$('#tilt').checked=on;}
function questHoldSet(id){qs.hold=QUEST_HOLDS[id]||QUEST_HOLDS.white;questSet('cw:questHold',qs.hold.id);$('#hold').value=qs.hold.id;qs.basis=null;if(qs.raw)questGyro(qs.raw);questStage();}

// ----- the link -----
function questMacs(){return questGet('cw:ganMac',{})||{};}
function questSaveMac(name,mac){const m=questMacs();if(mac)m[name]=mac;else delete m[name];questSet('cw:ganMac',m);}
function questFix(name){const e=(questGet('cw:ganFix',{})||{})[name];return e&&typeof ganFixLoad==='function'?ganFixLoad(e.fix):null;}
// The page in the Quest app (quest/android/): the cube comes over the headset's own Bluetooth.
function questInApp(){return typeof window!=='undefined'&&!!window.TwistwrightAndroid;}
// Web Bluetooth only where it works: the Quest Browser has the object with no Bluetooth behind it.
// Set once at the start, by questWBCheck.
function questWB(){return qs.wb;}
async function questWBCheck(){
  const bt=navigator.bluetooth;
  if(!bt||/[?&]bridge=1/.test(location.search))return false;
  if(typeof bt.getAvailability!=='function')return true;
  try{return !!await bt.getAvailability();}catch(e){return false;}
}
// The chooser: the browser's own with Web Bluetooth, else a list on the page of the cubes the
// Mac app hears. auto: the look with no click; the last cube is taken as soon as it is heard.
async function questPick(auto){
  if(questWB())return auto?null:ganPick();
  const link=BRIDGE||await bridgeStart();
  if(!link)throw new Error('No way to a cube. Run quest/run.sh on the Mac, then open http://localhost:27272/quest/ in the headset.');
  const app=questInApp();
  if(link.bluetooth==='unauthorized')throw new Error(app?'The headset did not allow Bluetooth for this app. Allow Nearby devices for Twistwright Cube Lab in Settings, Apps, Permissions.':'macOS did not allow Bluetooth for Twistwright. Allow it in System Settings, Privacy & Security, Bluetooth.');
  if(link.bluetooth==='poweredOff')throw new Error(app?'Bluetooth is off on the headset. Turn it on in the Quick Settings, then press Connect.':'Bluetooth is off on the Mac. Turn it on, then press Connect.');
  // The look with no click never brings up the question: a press of Connect does, on the Mac's
  // screen or in the headset.
  if(auto&&link.bluetooth==='notAsked')throw new Error(app?'Press Connect. The headset then asks whether the app may find nearby devices: allow it.':'Press Connect. macOS then asks on the Mac whether Twistwright may use Bluetooth: allow it there.');
  const last=questGet('cw:questCube',null);
  const row=$('#list');row.hidden=false;$('#listItems').textContent='';
  $('#listNote').textContent=auto&&last?`Looking for ${last}. Turn a face to wake the cube up.`:'Looking for cubes. Turn a face to wake the cube up.';
  return new Promise((res,rej)=>{
    let ended=false;const seen=new Map();
    const end=dev=>{if(ended)return;ended=true;stop();link.off(onEv);qs.listEnd=null;row.hidden=true;dev?res(dev):rej(Object.assign(new Error('cancelled'),{name:'NotFoundError'}));};
    const stop=link.scan(d=>{
      if(auto&&last&&d.name===last){end(bridgeDevice(link,{id:d.id,name:d.name,mac:d.mac||questMacs()[d.name]||null}));return;}
      let b=seen.get(d.id);
      if(!b){b=document.createElement('button');b.title='Connect to this cube';$('#listItems').appendChild(b);seen.set(d.id,b);}
      b.textContent=d.name;b.dataset.mac=d.mac||'';
      b.onclick=()=>end(bridgeDevice(link,{id:d.id,name:d.name,mac:b.dataset.mac||questMacs()[d.name]||null}));
      $('#listNote').textContent='Choose your cube.';
    },auto);
    const onEv=e=>{if(e.ev==='closed')end(null);};link.on(onEv);
    $('#listCancel').onclick=()=>end(null);qs.listEnd=end;
  });
}
function questAskMac(name){
  $('#macRow').hidden=false;$('#macName').textContent=name;const inp=$('#mac');inp.value=questMacs()[name]||'';
  return new Promise(res=>{qs.macWait=res;});
}
function questMacGo(){
  const mac=ganParseMac($('#mac').value);
  if(!mac){questStatus('Type six pairs of letters and digits, with a colon between each pair: AB:12:34:56:78:9A.');return;}
  $('#macRow').hidden=true;if(qs.macWait){const w=qs.macWait;qs.macWait=null;w(mac);}
}
async function questConnect(auto){
  auto=auto===true;
  if(qs.busy||qs.conn||!ganAvailable())return;
  if(qs.listEnd)qs.listEnd(null);
  const seq=++qs.pickSeq;let device;
  try{device=await questPick(auto);}
  // A NotFoundError is a closed chooser, or no Bluetooth at all ("Bluetooth adapter not available"):
  // only the first is quiet.
  catch(e){if(seq===qs.pickSeq)questStatus(e.name==='NotFoundError'&&/cancel/i.test(e.message)?'Press Connect to look for your cube.':e.message);return;}
  if(!device)return;
  questDemo(false);
  const name=device.name||'GAN cube';qs.busy=true;questButtons();
  let mac=device.mac||questMacs()[name],typed=false;
  if(!mac&&typeof device.watchAdvertisements==='function'){questStatus(`Looking for the address of ${name}. Turn a face now and then.`);mac=await ganWatchMac(device,8000);}
  for(;;){
    if(!mac){qs.busy=false;questButtons();questStatus(`Type the MAC address of ${name}.`);mac=await questAskMac(name);typed=true;if(!mac)return;qs.busy=true;questButtons();}
    questStatus(`Connecting to ${name}.`);
    let conn=null;
    try{conn=await ganOpen(device,mac,ev=>questLink(ev,conn),{fix:questFix(name)});}
    catch(e){qs.busy=false;questButtons();questStatus(e.code==='model'?e.message:'The connection did not start. Turn the cube to wake it up, then press Connect again.');return;}
    try{
      const cube=await conn.readState(3000);
      questSaveMac(name,conn.mac);questSet('cw:questCube',name);
      Object.assign(qs,{conn,busy:false,name:conn.name,battery:conn.battery,raw:null,basis:null,q:null,qTo:null});
      questClear();questJump(cube);questButtons();
      questStatus(conn.gen===3?'Live. Each turn of your cube turns the layer. This cube has no tilt sensor.':'Live. Each turn of your cube turns the layer, and the cube tilts with yours.');
      return;
    }catch(e){
      conn.close();
      if(e.code!=='badmac'&&e.code!=='timeout'){qs.busy=false;questButtons();questStatus('The cube did not answer: '+e.message);return;}
      questSaveMac(name,null);
      questStatus(typed?'The cube did not answer. Check the MAC address, then try again.':`The cube did not answer. Type the MAC address of ${name}.`);
      mac=null;
    }
  }
}
// One state request at a time; a move during a request asks again when the answer lands.
function questAsk(){
  const c=qs.conn;if(!c)return;
  if(c.asked){c.want=true;return;}
  c.asked=true;c.send('state').catch(()=>{c.asked=false;});
}
function questLink(ev,conn){
  if(!conn||conn!==qs.conn)return;
  if(ev.type==='gone'){qs.conn=null;qs.name='';qs.battery=null;questButtons();questStatus('The cube is no longer connected. Turn a face to wake it up.');questConnect(true);return;}
  if(ev.type==='off'){conn.close();return;}
  if(ev.type==='move')questAsk();
  if(ev.type==='gyro')questGyro(ev.q);
  if(ev.type==='battery'){qs.battery=ev.level;questButtons();}
  if(ev.type==='state'){conn.asked=false;if(conn.want){conn.want=false;questAsk();}questShow(ev.cube);}
}
function questDisconnect(){
  if(qs.conn){const c=qs.conn;qs.conn=null;c.close();}
  qs.name='';qs.battery=null;questButtons();questStatus('Disconnected. Press Connect to connect again.');
}

// ----- no cube: the demo, and the keys -----
const QUEST_DEMO_MOVES=['R','U',"R'","U'",'F','R2','L',"D'",'B','U2'];
function questTurnBy(m){
  if(qs.conn)return;
  if(!qs.target&&!qs.shown)qs.shown=qs.target=new Cube(); // no cube yet: start from solved, so the first move turns
  questShow(applyAlg(qs.target,[m]));
}
function questDemo(on){
  clearInterval(qs.demo);qs.demo=0;
  if(on){if(qs.conn)return;let i=0;qs.demo=setInterval(()=>questTurnBy(QUEST_DEMO_MOVES[i++%QUEST_DEMO_MOVES.length]),1100);
    questStatus('Demo cube: it turns by itself. Press U, R, F, D, L or B to turn it by hand; Shift turns it the other way.');}
  questButtons();
}
function questKeys(e){
  if(e.target&&/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))return;
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  const f=e.key.toUpperCase();
  if('URFDLB'.includes(f)&&f.length===1){e.preventDefault();questTurnBy(f+(e.shiftKey?"'":''));}
}

// ----- the page's buttons -----
function questButtons(){
  const live=!!qs.conn;
  $('#connect').disabled=live||qs.busy||!ganAvailable();$('#disconnect').hidden=!live;$('#connect').hidden=live;
  $('#demo').textContent=qs.demo?'Stop demo':'Demo cube';$('#demo').disabled=live;
  $('#level').disabled=!qs.raw;
  $('#name').textContent=qs.name?qs.name+(qs.battery!=null?' · '+qs.battery+'%':''):'';
  $('#enterAR').disabled=!qs.support.ar||!qs.r;$('#enterVR').disabled=!qs.support.vr||!qs.r;
  $('#way').textContent=questWB()?'Web Bluetooth':BRIDGE?(questInApp()?'Quest app':'Mac app bridge')+(BRIDGE.version?' '+BRIDGE.version:''):'none';
  $('#way').className=questWB()||BRIDGE?'ok':'no';
}
async function questProbeXR(){
  const xr=navigator.xr;
  const yes=async m=>{try{return !!xr&&await xr.isSessionSupported(m);}catch(e){return false;}};
  qs.support={ar:await yes('immersive-ar'),vr:await yes('immersive-vr')};
  const t=(id,ok)=>{const el=$(id);el.textContent=ok?'yes':'no';el.className=ok?'ok':'no';};
  t('#xrAR',qs.support.ar);t('#xrVR',qs.support.vr);t('#secure',!!window.isSecureContext);
  questButtons();
}

// ----- the flat preview -----
function questFlatStart(){if(!qs.r||qs.flatRaf||qs.xr)return;qs.flatRaf=requestAnimationFrame(questFlatFrame);}
function questFlatFrame(now){
  qs.flatRaf=0;if(qs.xr)return;
  questTick(now);
  const gl=qs.gl,c=gl.canvas,dpr=Math.min(2,window.devicePixelRatio||1),w=Math.round(c.clientWidth*dpr),h=Math.round(c.clientHeight*dpr);
  if(w&&h&&(c.width!==w||c.height!==h)){c.width=w;c.height=h;}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,c.width,c.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const proj=m4Persp(36,c.width/Math.max(1,c.height),0.1,100);
  const view=m4Mul(m4Trs([0,0,-10],null,1),m4Trs([0,0,0],quatMul(quatAxis([1,0,0],qs.view.pitch),quatAxis([0,1,0],qs.view.yaw)),1));
  qs.r.drawScene(proj,view,{cube:qs.anim?qs.anim.from:qs.shown,anim:qs.anim?{move:qs.anim.move,t:qs.anim.e}:null,model:m4Trs([0,0,0],questOrient(),1)});
  questFlatStart();
}
function questDragSetup(){
  const c=$('#view');
  c.addEventListener('pointerdown',e=>{if(e.button)return;qs.drag={x:e.clientX,y:e.clientY,yaw:qs.view.yaw,pitch:qs.view.pitch};c.setPointerCapture&&c.setPointerCapture(e.pointerId);});
  c.addEventListener('pointermove',e=>{const d=qs.drag;if(!d)return;qs.view.yaw=d.yaw+(e.clientX-d.x)*0.5;qs.view.pitch=Math.max(-80,Math.min(80,d.pitch+(e.clientY-d.y)*0.5));});
  const up=()=>{qs.drag=null;};c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
  c.addEventListener('dblclick',()=>{qs.view={yaw:-32,pitch:24};});
}

// ----- the WebXR session -----
// The cube floats 45 cm in front of the head and a little below it, turned to face the user, 15
// cm on an edge (about 2.7 times a real cube). Hands first, since the user holds the real cube: a
// row of buttons under the cube (Tilt, Level, Clear, Smaller, Larger, the panel) takes a poke of
// an index fingertip; a pinch near the cube carries it; a pinch held QUEST_HOLD_MS away from it, by
// a hand with no other hand near, brings it back in front (a short pinch does nothing, so a hand on
// the real cube sends nothing). Controllers second: a grip near the cube carries it, a trigger away
// brings it back, A toggles the tilt, B levels it, the right stick sizes the cube, X clears the
// moves, Y hides the panel.
async function questEnterXR(mode){
  if(qs.xr||!qs.r)return;
  try{
    await qs.gl.makeXRCompatible();
    const session=await navigator.xr.requestSession(mode,{optionalFeatures:['local-floor','hand-tracking']});
    session.updateRenderState({baseLayer:new XRWebGLLayer(session,qs.gl,{alpha:true,antialias:true})});
    let ref;try{ref=await session.requestReferenceSpace('local-floor');}catch(e){ref=await session.requestReferenceSpace('local');}
    qs.xr={session,ref,mode,placed:false,pos:[0,1.1,-0.45],face:[0,0,0,1],edge:questGet('cw:questEdge',0.15),grab:null,pressed:new Map(),grabbed:new Set(),panel:true,hands:false,head:[0,1.5,0],t:0,pinch:null,pokes:new Map(),hover:-1,lit:-1,litT:0};
    session.addEventListener('end',()=>{qs.xr=null;questButtons();questFlatStart();});
    session.addEventListener('selectstart',questGrabStart);session.addEventListener('squeezestart',questGrabStart);
    session.addEventListener('selectend',questGrabEnd);session.addEventListener('squeezeend',questGrabEnd);
    // A trigger that carried nothing brings the cube here. A hand's pinch does it only when held (questPinch).
    session.addEventListener('select',e=>{if(!qs.xr.grabbed.delete(e.inputSource)&&!e.inputSource.hand)qs.xr.placed=false;});
    session.requestAnimationFrame(questXRFrame);
    questButtons();
  }catch(e){questStatus('The headset did not start the session: '+e.message);}
}
// Where an input is: between the thumb tip and the index tip for a hand, the grip for a controller.
function questInputPos(frame,src,ref){
  if(src.hand&&frame.getJointPose){
    const a=src.hand.get('thumb-tip'),b=src.hand.get('index-finger-tip');
    const pa=a&&frame.getJointPose(a,ref),pb=b&&frame.getJointPose(b,ref);
    if(pa&&pb){const p=pa.transform.position,q=pb.transform.position;return [(p.x+q.x)/2,(p.y+q.y)/2,(p.z+q.z)/2];}
  }
  const pose=frame.getPose(src.gripSpace||src.targetRaySpace,ref);
  if(!pose)return null;const p=pose.transform.position;return [p.x,p.y,p.z];
}
function questGrabStart(e){
  const x=qs.xr;if(!x||x.grab)return;
  const p=questInputPos(e.frame,e.inputSource,x.ref);
  if(!p)return;
  if(v3Dist(p,x.pos)>questGrabRadius(x.edge)){if(e.inputSource.hand&&e.type==='selectstart')x.pinch={src:e.inputSource,t:x.t};return;}
  x.grab={src:e.inputSource,off:v3Sub(x.pos,p)};x.grabbed.add(e.inputSource);
}
function questGrabEnd(e){
  const x=qs.xr;if(!x)return;
  if(x.pinch&&x.pinch.src===e.inputSource)x.pinch=null;
  if(x.grab&&x.grab.src===e.inputSource){x.grab=null;questSet('cw:questEdge',x.edge);}
  if(e.type==='squeezeend')x.grabbed.delete(e.inputSource); // a squeeze never brings the cube here
}
function questPlace(x,t){
  const p=t.position,o=t.orientation,head=[p.x,p.y,p.z];
  let f=quatApply([o.x,o.y,o.z,o.w],[0,0,-1]);f=[f[0],0,f[2]];const l=Math.hypot(f[0],f[2])||1;f=[f[0]/l,0,f[2]/l];
  x.pos=v3Add(head,[f[0]*0.45,-0.16,f[2]*0.45]);x.face=quatFacing(x.pos,head);x.placed=true;
}
function questSize(x,k){x.edge=Math.max(0.057,Math.min(0.6,x.edge*k));questSet('cw:questEdge',x.edge);}
// What a button of the row does: the same as its controller button, or the page's.
function questBarDo(id){
  const x=qs.xr;
  if(id==='tilt')questTilt(!qs.tilt);else if(id==='level')questLevel();else if(id==='clear')questClear();
  else if(id==='smaller')questSize(x,0.8);else if(id==='larger')questSize(x,1.25);else if(id==='panel')x.panel=!x.panel;
}
function questBarState(){return questBarButtons({tilt:qs.tilt,moves:qs.moves.length,panel:!qs.xr||qs.xr.panel});}
function questJoint(frame,src,name,ref){const j=src.hand&&src.hand.get(name),p=j&&frame.getJointPose&&frame.getJointPose(j,ref);if(!p)return null;const t=p.transform.position;return [t.x,t.y,t.z];}
// The hands, each frame: a poke of an index fingertip on the row, and a pinch held away from the cube.
function questHands(x,frame){
  const center=questBarCenter(x.pos,x.edge),n=questBarState().length,tips=new Map();
  for(const src of x.session.inputSources)if(src.hand){const p=questJoint(frame,src,'index-finger-tip',x.ref);if(p)tips.set(src,p);}
  x.hover=-1;
  for(const [src,p] of tips){
    let st=x.pokes.get(src);if(!st){st={armed:false};x.pokes.set(src,st);}
    if(x.grab&&x.grab.src===src){st.armed=false;continue;}
    const r=questPoke(st,questBarLocal(p,center,x.face),n);
    if(r.hover>=0)x.hover=r.hover;
    if(r.press>=0){const b=questBarState()[r.press];if(!b.off){questBarDo(b.id);x.lit=r.press;x.litT=x.t;}}
  }
  for(const src of [...x.pokes.keys()])if(!tips.has(src))x.pokes.delete(src);
  const pin=x.pinch;
  if(pin&&x.t-pin.t>=QUEST_HOLD_MS){
    x.pinch=null;const p=tips.get(pin.src);
    const others=[...tips].filter(([s])=>s!==pin.src).map(([,q])=>q);
    if(p&&questHandFree(p,others))x.placed=false;
  }
}
function questPads(x,dt){
  x.hands=false;
  for(const src of x.session.inputSources){
    if(src.hand)x.hands=true;
    const g=src.gamepad;if(!g)continue;
    const was=x.pressed.get(src)||[],now=g.buttons.map(b=>b.pressed);x.pressed.set(src,now);
    const hit=i=>now[i]&&!was[i];
    if(src.handedness==='right'){
      if(hit(4))questTilt(!qs.tilt);
      if(hit(5))questLevel();
      const ay=g.axes[3]||0;if(Math.abs(ay)>0.15){x.edge=Math.max(0.057,Math.min(0.6,x.edge*Math.exp(-ay*dt*1.2)));}
    }
    if(src.handedness==='left'){if(hit(4))questClear();if(hit(5))x.panel=!x.panel;}
  }
}
function questXRFrame(now,frame){
  const x=qs.xr;if(!x)return;
  frame.session.requestAnimationFrame(questXRFrame);
  const dt=questTick(now);x.t=now;
  const pose=frame.getViewerPose(x.ref);if(!pose)return;
  const hp=pose.transform.position;x.head=[hp.x,hp.y,hp.z];
  if(!x.placed)questPlace(x,pose.transform);
  questPads(x,dt);questHands(x,frame);
  if(x.grab){const p=questInputPos(frame,x.grab.src,x.ref);if(p){x.pos=v3Add(p,x.grab.off);x.face=quatFacing(x.pos,x.head);}}
  const ar=x.mode==='immersive-ar',extras=[];
  if(!ar){
    extras.push({m:m4Trs([x.pos[0],0,x.pos[2]],null,[3,0.01,3]),c:[0.1,0.1,0.12]});
    for(const src of x.session.inputSources){
      if(src.hand){for(const j of src.hand.values()){const jp=frame.getJointPose(j,x.ref);if(jp){const p=jp.transform.position,o=jp.transform.orientation;extras.push({m:m4Trs([p.x,p.y,p.z],[o.x,o.y,o.z,o.w],(jp.radius||0.008)*1.8),c:[0.82,0.76,0.7]});}}}
      else if(src.gripSpace){const gp=frame.getPose(src.gripSpace,x.ref);if(gp){const p=gp.transform.position,o=gp.transform.orientation;extras.push({m:m4Trs([p.x,p.y,p.z],[o.x,o.y,o.z,o.w],[0.035,0.03,0.11]),c:[0.3,0.3,0.34]});}}
    }
  }
  const scene={cube:qs.anim?qs.anim.from:qs.shown,anim:qs.anim?{move:qs.anim.move,t:qs.anim.e}:null,
    model:m4Mul(m4Trs(x.pos,x.face,1),m4Trs([0,0,0],questOrient(),x.edge/3)),extras,
    panel:x.panel?{model:m4Trs(v3Add(x.pos,[0,x.edge*0.85+0.08,0]),x.face,[0.3,0.117,1]),lines:questPanelLines()}:null,
    bar:{model:m4Trs(questBarCenter(x.pos,x.edge),x.face,[questBarWidth(6),QUEST_BAR.h,1]),
      buttons:questBarState().map((b,i)=>Object.assign({hover:i===x.hover,lit:i===x.lit&&x.t-x.litT<250},b))}};
  const layer=frame.session.renderState.baseLayer,gl=qs.gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);
  if(ar)gl.clearColor(0,0,0,0);else gl.clearColor(0.04,0.04,0.05,1);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  for(const v of pose.views){const vp=layer.getViewport(v);gl.viewport(vp.x,vp.y,vp.width,vp.height);qs.r.drawScene(v.projectionMatrix,v.transform.inverse.matrix,scene);}
}

// ----- start -----
function questStart(){
  $('#ver').textContent='v'+QUEST_VERSION;document.title='Quest cube lab '+QUEST_VERSION;
  let gl=null;try{gl=$('#view').getContext('webgl2',{xrCompatible:true,alpha:true,antialias:true});}catch(e){}
  if(gl){try{qs.gl=gl;qs.r=questRenderer(gl);}catch(e){qs.r=null;$('#nogl').hidden=false;$('#nogl').textContent='The 3D view did not start: '+e.message;}}
  else $('#nogl').hidden=false;
  questTilt(questGet('cw:questTilt',true));questHoldSet(questGet('cw:questHold','white'));
  $('#tilt').onchange=e=>questTilt(e.target.checked);$('#hold').onchange=e=>questHoldSet(e.target.value);
  $('#connect').onclick=()=>questConnect();$('#disconnect').onclick=questDisconnect;$('#demo').onclick=()=>questDemo(!qs.demo);
  $('#level').onclick=questLevel;$('#clear').onclick=questClear;
  $('#enterAR').onclick=()=>questEnterXR('immersive-ar');$('#enterVR').onclick=()=>questEnterXR('immersive-vr');
  $('#macGo').onclick=questMacGo;$('#mac').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();questMacGo();}});
  document.addEventListener('keydown',questKeys);document.addEventListener('cw:bridge',questButtons);
  questDragSetup();questMovesDraw();questStage();questFlatStart();questProbeXR();
  const ready=()=>{questButtons();
    if(questWB()){questStatus('Press Connect, then choose your cube in the list that the browser shows.');return;}
    if(!BRIDGE){questStatus('No way to a cube here. Press Demo cube to try the view, or run quest/run.sh on the Mac and open http://localhost:27272/quest/ in the headset.');return;}
    const last=questGet('cw:questCube',null);
    questStatus(last?`Looking for ${last} by itself. Press Connect to choose another cube.`:'Choose your cube in the list. The page connects to it by itself next time.');
    questConnect(true);};
  Promise.all([bridgeStart(),questWBCheck().then(v=>{qs.wb=v;})]).then(ready);
}
questStart();
