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
//
// As the site's Smart cube tab: the hold as tiles (Top white or yellow, Front green, orange, blue
// or red; questHoldPick), and Hidden faces (the faces turned away, as in a mirror; questMirror).
// In the session both are on the second row of buttons under the cube, with Exit.
//
// Drill mode (questDrillMode): a drill of a case, and the voice (quest/voice.js) listens for case
// names until Drill mode ends. A name said ("T perm", "Sune") drills that case; questDrill('T perm')
// does the same in code. The picture starts as the case, set up as the cube is held, whatever state
// the real cube is in, and each turn of the real cube turns the picture. Solved in the picture,
// "Solved" shows for 2 s with a count ("Sune in 2…", "Sune in 1…"), then the case comes again. The
// end of the drill puts the real cube back in the picture.
//
// Storage: cw:ganMac (the site's map from cube name to MAC address), cw:ganFix (the site's
// correction for a cube whose count is off), cw:questCube (the last cube's name, connected by
// itself when the bridge hears it), cw:questHold (the hold's id, 'white-green'), cw:questTilt,
// cw:hidden (the site's Hidden faces), cw:questDrill (the case Drill mode starts with: the last one drilled).
const $=s=>document.querySelector(s);
const qs={conn:null,busy:false,pickSeq:0,wb:false,listEnd:null,macWait:null,
  shown:null,target:null,queue:[],anim:null,moves:[],colors:[],stage:null,
  raw:null,basis:null,q:null,qTo:null,tilt:true,hold:QUEST_HOLD_FIRST,hidden:false,
  real:null,drill:null,solvedMs:QUEST_SOLVED_MS,
  name:'',battery:null,status:'',
  gl:null,r:null,view:{yaw:-32,pitch:24},zoom:10,drag:null,flatRaf:0,last:0,xr:null,support:{ar:false,vr:false}};
// The time the session's Exit asks for a second poke.
const QUEST_EXIT_MS=3000;

// The page's state, for the tests and the console (a const is not on window).
function questState(){return qs;}
function questGet(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}}
function questSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function questStatus(t){qs.status=t;$('#status').textContent=t;}

// ----- the cube's state: moves found between two states, turned in a queue -----
// A state of the real cube. The picture shows it, or in a drill the drill's state for it.
function questShow(cube){qs.real=cube;questView(questDrilled(cube),false);}
// A real state with no turns to show (a connect): the picture jumps, and nothing goes on the list.
function questJump(cube){qs.real=cube;questView(questDrilled(cube),true);}
// The picture's state: the moves from the last one turn in a queue and go on the list. Five or
// more apart, or with jump, the picture jumps.
function questView(cube,jump){
  const moved=jump?null:questPath(qs.target||qs.shown,cube);
  if(moved&&!moved.length)return;
  if(moved){for(const m of moved)questAdd(questRelabel(m,qs.hold));qs.target=cube;qs.queue.push(...moved);}
  else{qs.queue=[];qs.anim=null;qs.shown=qs.target=cube;}
  questStage();questMovesDraw();questDrillCheck();
}

// ----- the drill (questDrillState in core.js) -----
// qs.drill: {c (the case), scramble (true for New scramble), setup, p0 (the real cube at the start,
// or null until a cube is there), solved, reps, timer, tick, count}. The real cube's own state stays
// in qs.real, for the end of the drill.
const QUEST_DRILL_FIRST='co-sune';
function questDrilled(real){
  const d=qs.drill;if(!d||!real)return real;
  if(!d.p0)d.p0=real;
  return questDrillState(d,real);
}
// Drill mode on: the last case drilled (Sune the first time), and the voice listens for another.
// Off: the voice stops and the real cube comes back.
function questDrillMode(on){
  if(on){questDrill(questGet('cw:questDrill',QUEST_DRILL_FIRST));questVoiceStart();}
  else{questVoiceStop();questDrill(null);}
}
// Start a drill of a case (an id or a name: 'Sune', 'T perm'), or end it with none. The end puts
// the real cube back in the picture.
function questDrill(name){
  const c=name?questDrillFind(name)||questDrillFind(QUEST_DRILL_FIRST):null;
  if(!c){questDrillEnd();questView(qs.real,true);questDrillDraw();return;}
  questSet('cw:questDrill',c.id);
  questDrillOn(c,false,0);
}
function questDrillEnd(){if(qs.drill){clearTimeout(qs.drill.timer);clearTimeout(qs.drill.tick);}qs.drill=null;}
function questDrillOn(c,scramble,reps){
  questDrillEnd();
  qs.drill={c,scramble,setup:null,p0:null,solved:false,reps,timer:0,tick:0,count:2};
  questDrillAgain();
}
// A drill runs (not a scramble): Drill mode is on.
function questDrilling(){return !!qs.drill&&!qs.drill.scramble;}

// ----- a scramble on the picture -----
// New scramble: the picture starts as a random scramble, set up as held, over the real cube as a
// drill is (questDrillSetup of the scramble's inverse is the scrambled state), and the real cube's
// turns turn it. Solved: "Solved!", a count, then another. It ends Drill mode first.
function questScramble(){
  const reps=qs.drill&&qs.drill.scramble?qs.drill.reps:0;
  if(questDrilling())questDrillMode(false);
  const moves=randomMoveScramble(randomSeedName(),20);
  questDrillOn({id:'scramble',name:'Scramble',alg:invertAlg(moves),moves:moves.join(' ')},true,reps);
}
// Real cube state: a drill or a scramble ends, and the cube is asked for its state again, so the
// picture shows its own stickers as they are now, with nothing on the list.
function questRealState(){
  if(questDrilling())questDrillMode(false);else if(qs.drill)questDrill(null);
  questClear();const c=qs.conn;if(c){c.jump=true;questAsk();}
}
// The case again: from the real cube as it is now, set up as the cube is held now.
function questDrillAgain(){
  const d=qs.drill;if(!d)return;
  clearTimeout(d.timer);clearTimeout(d.tick);d.timer=d.tick=0;d.solved=false;
  d.setup=questDrillSetup(d.c.alg,qs.hold);d.p0=qs.real;
  questClear();questView(d.setup,true);questDrillDraw();
}
// Solved in the picture: "Solved" for qs.solvedMs and a count to the case again ("Sune in 2…",
// "Sune in 1…", half the time each), then the case again.
function questDrillCheck(){
  const d=qs.drill,c=qs.target||qs.shown;
  if(!d||d.solved||!c||!c.isSolved())return;
  d.solved=true;d.reps++;d.count=2;
  d.timer=setTimeout(d.scramble?questScramble:questDrillAgain,qs.solvedMs);d.tick=setTimeout(()=>{d.count=1;questDrillDraw();},qs.solvedMs/2);questDrillDraw();
}
function questDrillCount(){const d=qs.drill;return `${d.scramble?'New scramble':d.c.name} in ${d.count}…`;}
function questDrillWords(){const d=qs.drill;return !d?'':d.scramble?`Scramble · ${d.reps} solved`:`Drill: ${d.c.name} · ${d.reps} solved`;}
function questDrillDraw(){
  const d=qs.drill,b=$('#drill');
  b.setAttribute('aria-pressed',String(questDrilling()));b.textContent=questDrilling()?'Stop drill':'Drill mode';
  $('#real').disabled=!d;
  $('#drillNote').textContent=d?d.reps+' solved':'';
  $('#toast').hidden=!(d&&d.solved);
  if(d&&d.solved)$('#toastSub').textContent=questDrillCount();
}
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
  const p=questPanel({name:qs.name,battery:qs.battery,status:qs.status,stage:qs.stage,drill:questDrillWords(),moves:qs.moves,tilt:qs.tilt&&!!qs.q,
    hint:qs.drill&&questVoiceWords()||questHint()}); // in Drill mode, what the voice heard
  p.moves=p.moves.map((m,i)=>({m,color:qs.colors[qs.moves.length-p.moves.length+i]||'#8f8f97'}));
  return p;
}
function questHint(){
  const x=qs.xr;if(!x)return '';
  return x.hands?'Poke a button · pinch: carry · hold a pinch: bring here':'A tilt · B level · Stick size · Stick press: L exit, R hidden';
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
// The hold: no turn goes on the list; the moves to come read as held, and the picture turns to it.
function questHoldSet(h){
  qs.hold=h||QUEST_HOLD_FIRST;questSet('cw:questHold',qs.hold.id);qs.basis=null;if(qs.raw)questGyro(qs.raw);
  questStage();questHoldDraw();
  if(qs.drill)questDrillAgain(); // the case, set up for the new hold
}
function questHoldTile(place,c){questHoldSet(questHoldPick(qs.hold,place,c));}
function questHoldDraw(){
  for(const b of document.querySelectorAll('#hold .ht'))b.setAttribute('aria-pressed',String((b.parentNode.dataset.place==='up'?qs.hold.top:qs.hold.front)===+b.dataset.c));
}
function questHoldMount(){
  for(const [place,cs] of [['up',QUEST_TOPS],['front',QUEST_FRONTS]]){
    const g=$(`#hold .grp[data-place="${place}"]`);
    for(const c of cs){const b=document.createElement('button');b.type='button';b.className='ht';b.dataset.c=c;b.style.setProperty('--c',QUEST_HEX[c]);
      const t=QUEST_COLOR_NAMES[c].replace(/^./,a=>a.toUpperCase())+(place==='up'?' on top':' in front');
      b.title=t+'. Sets how you hold the cube. No turn goes on the list.';b.setAttribute('aria-label',t);
      b.onclick=()=>questHoldTile(place,c);g.appendChild(b);}
  }
}
// Hidden faces: the site's setting.
function questHidden(on){qs.hidden=!!on;questSet('cw:hidden',qs.hidden);const b=$('#hidden');b.setAttribute('aria-pressed',String(qs.hidden));}

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
  if(ev.type==='state'){conn.asked=false;if(conn.want){conn.want=false;questAsk();}
    if(conn.jump){conn.jump=false;questClear();questJump(ev.cube);}else questShow(ev.cube);}
}
function questDisconnect(){
  if(qs.conn){const c=qs.conn;qs.conn=null;c.close();}
  qs.name='';qs.battery=null;questButtons();questStatus('Disconnected. Press Connect to connect again.');
}

// ----- the page's buttons -----
function questButtons(){
  const live=!!qs.conn;
  $('#connect').disabled=live||qs.busy||!ganAvailable();$('#disconnect').hidden=!live;$('#connect').hidden=live;
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
  const dt=questTick(now);
  const gl=qs.gl,c=gl.canvas,dpr=Math.min(2,window.devicePixelRatio||1),w=Math.round(c.clientWidth*dpr),h=Math.round(c.clientHeight*dpr);
  if(w&&h&&(c.width!==w||c.height!==h)){c.width=w;c.height=h;}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,c.width,c.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const proj=m4Persp(36,c.width/Math.max(1,c.height),0.1,100);
  // the camera steps back while the hidden faces show, so the mirrors fit
  qs.zoom+=((qs.hidden?15:10)-qs.zoom)*Math.min(1,dt*10);
  const turn=quatMul(quatAxis([1,0,0],qs.view.pitch),quatAxis([0,1,0],qs.view.yaw));
  const view=m4Mul(m4Trs([0,0,-qs.zoom],null,1),m4Trs([0,0,0],turn,1)),model=m4Trs([0,0,0],questOrient(),1);
  const eye=quatApply([-turn[0],-turn[1],-turn[2],turn[3]],[0,0,qs.zoom]);
  qs.r.drawScene(proj,view,{cube:qs.anim?qs.anim.from:qs.shown,anim:qs.anim?{move:qs.anim.move,t:qs.anim.e}:null,model,hidden:qs.hidden?questHiddenFaces(model,eye):null});
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
// cm on an edge (about 2.7 times a real cube). Hands first, since the user holds the real cube: two
// rows of buttons under the cube (Tilt, Level, Clear, Hidden faces, Smaller, Larger, the panel;
// then the hold's Top and Front tiles, and Exit, which asks for a second poke; then Drill mode) take a poke of an
// index fingertip; a pinch near the cube carries it; a pinch held QUEST_HOLD_MS away from it, by a
// hand with no other hand near, brings it back in front (a short pinch does nothing, so a hand on
// the real cube sends nothing). The hands are not drawn. Controllers second: a grip near the cube
// carries it, a trigger away brings it back, A toggles the tilt, B levels it, the right stick sizes
// the cube and its press shows the hidden faces, X clears the moves, Y hides the panel, the left
// stick's press ends the session.
async function questEnterXR(mode){
  if(qs.xr||!qs.r)return;
  try{
    await qs.gl.makeXRCompatible();
    const session=await navigator.xr.requestSession(mode,{optionalFeatures:['local-floor','hand-tracking']});
    session.updateRenderState({baseLayer:new XRWebGLLayer(session,qs.gl,{alpha:true,antialias:true})});
    let ref;try{ref=await session.requestReferenceSpace('local-floor');}catch(e){ref=await session.requestReferenceSpace('local');}
    qs.xr={session,ref,mode,placed:false,pos:[0,1.1,-0.45],face:[0,0,0,1],edge:questGet('cw:questEdge',0.15),grab:null,pressed:new Map(),grabbed:new Set(),panel:true,hands:false,head:[0,1.5,0],t:0,pinch:null,pokes:new Map(),hover:-1,lit:-1,litT:0,exitT:0};
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
// What a button of the rows does: the same as its controller button, or the page's. Exit asks for
// a second poke within QUEST_EXIT_MS, so a stray fingertip does not end the session.
function questBarDo(id){
  const x=qs.xr,hold=id.match(/^(top|front)-(\w+)$/);
  if(id==='tilt')questTilt(!qs.tilt);else if(id==='level')questLevel();else if(id==='clear')questClear();
  else if(id==='smaller')questSize(x,0.8);else if(id==='larger')questSize(x,1.25);else if(id==='panel')x.panel=!x.panel;
  else if(id==='hidden')questHidden(!qs.hidden);
  else if(id==='drill')questDrillMode(!questDrilling());else if(id==='scramble')questScramble();else if(id==='real')questRealState();
  else if(hold)questHoldTile(hold[1]==='top'?'up':'front',QUEST_COLOR_NAMES.indexOf(hold[2]));
  else if(id==='exit'){if(questExitArmed(x))questExit();else x.exitT=x.t;}
  if(id!=='exit'&&x)x.exitT=0;
}
function questExitArmed(x){return !!x&&!!x.exitT&&x.t-x.exitT<QUEST_EXIT_MS;}
function questExit(){const x=qs.xr;if(!x)return;const p=x.session.end();if(p&&p.catch)p.catch(()=>{});}
function questBarState(){
  const x=qs.xr;
  return questBarButtons({tilt:qs.tilt,moves:qs.moves.length,panel:!x||x.panel,hidden:qs.hidden,top:qs.hold.top,front:qs.hold.front,exit:questExitArmed(x),
    drill:questDrilling(),over:!!qs.drill});
}
function questBarCenterNow(x){return questBarCenter(x.pos,x.edge,qs.hidden);}
function questJoint(frame,src,name,ref){const j=src.hand&&src.hand.get(name),p=j&&frame.getJointPose&&frame.getJointPose(j,ref);if(!p)return null;const t=p.transform.position;return [t.x,t.y,t.z];}
// The hands, each frame: a poke of an index fingertip on the rows, and a pinch held away from the cube.
function questHands(x,frame){
  const center=questBarCenterNow(x),rects=questBarLayout(questBarState()),tips=new Map();
  for(const src of x.session.inputSources)if(src.hand){const p=questJoint(frame,src,'index-finger-tip',x.ref);if(p)tips.set(src,p);}
  x.hover=-1;
  for(const [src,p] of tips){
    let st=x.pokes.get(src);if(!st){st={armed:false};x.pokes.set(src,st);}
    if(x.grab&&x.grab.src===src){st.armed=false;continue;}
    const r=questPoke(st,questBarLocal(p,center,x.face),rects);
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
      if(hit(3))questHidden(!qs.hidden);
      const ay=g.axes[3]||0;if(Math.abs(ay)>0.15){x.edge=Math.max(0.057,Math.min(0.6,x.edge*Math.exp(-ay*dt*1.2)));}
    }
    if(src.handedness==='left'){if(hit(4))questClear();if(hit(5))x.panel=!x.panel;if(hit(3)){questExit();return;}}
  }
}
function questXRFrame(now,frame){
  const x=qs.xr;if(!x)return;
  frame.session.requestAnimationFrame(questXRFrame);
  const dt=questTick(now);x.t=now;
  const pose=frame.getViewerPose(x.ref);if(!pose)return;
  const hp=pose.transform.position;x.head=[hp.x,hp.y,hp.z];
  if(!x.placed)questPlace(x,pose.transform);
  questPads(x,dt);if(qs.xr!==x)return; // the left stick's press ended the session
  questHands(x,frame);if(qs.xr!==x)return; // a second poke on Exit
  if(x.grab){const p=questInputPos(frame,x.grab.src,x.ref);if(p){x.pos=v3Add(p,x.grab.off);x.face=quatFacing(x.pos,x.head);}}
  const ar=x.mode==='immersive-ar',extras=[];
  // VR: the floor and the controllers. The hands are not drawn: they hold the real cube.
  if(!ar){
    extras.push({m:m4Trs([x.pos[0],0,x.pos[2]],null,[3,0.01,3]),c:[0.1,0.1,0.12]});
    for(const src of x.session.inputSources)if(!src.hand&&src.gripSpace){
      const gp=frame.getPose(src.gripSpace,x.ref);if(gp){const p=gp.transform.position,o=gp.transform.orientation;extras.push({m:m4Trs([p.x,p.y,p.z],[o.x,o.y,o.z,o.w],[0.035,0.03,0.11]),c:[0.3,0.3,0.34]});}}
  }
  if(x.exitT&&!questExitArmed(x))x.exitT=0;
  const model=m4Mul(m4Trs(x.pos,x.face,1),m4Trs([0,0,0],questOrient(),x.edge/3));
  const buttons=questBarState(),rects=questBarLayout(buttons),box=questBarBox(rects);
  const scene={cube:qs.anim?qs.anim.from:qs.shown,anim:qs.anim?{move:qs.anim.move,t:qs.anim.e}:null,
    model,hidden:qs.hidden?questHiddenFaces(model,x.head):null,extras,
    panel:x.panel?{model:m4Trs(v3Add(x.pos,[0,x.edge*0.85+0.08,0]),x.face,[0.3,0.117,1]),lines:questPanelLines()}:null,
    // a drill's Solved: a card in front of the cube, clear of it as it tilts
    toast:qs.drill&&qs.drill.solved?{model:m4Trs(v3Add(x.pos,quatApply(x.face,[0,0,x.edge*0.9])),x.face,[0.24,0.09,1]),lines:{text:'Solved!',sub:questDrillCount()}}:null,
    bar:{model:m4Mul(m4Trs(questBarCenterNow(x),x.face,1),m4Trs([(box.x0+box.x1)/2,(box.y0+box.y1)/2,0],null,[box.x1-box.x0,box.y1-box.y0,1])),rects,
      buttons:buttons.map((b,i)=>Object.assign({hover:i===x.hover,lit:i===x.lit&&x.t-x.litT<250},b))}};
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
  questHoldMount();
  questTilt(questGet('cw:questTilt',true));questHoldSet(questHoldFind(questGet('cw:questHold','white-green')));questHidden(questGet('cw:hidden',false)===true);
  $('#tilt').onchange=e=>questTilt(e.target.checked);$('#hidden').onclick=()=>questHidden(!qs.hidden);
  $('#drill').onclick=()=>questDrillMode(!questDrilling());$('#scramble').onclick=questScramble;$('#real').onclick=questRealState;questDrillDraw();
  $('#connect').onclick=()=>questConnect();$('#disconnect').onclick=questDisconnect;
  $('#level').onclick=questLevel;$('#clear').onclick=questClear;
  $('#enterAR').onclick=()=>questEnterXR('immersive-ar');$('#enterVR').onclick=()=>questEnterXR('immersive-vr');
  $('#macGo').onclick=questMacGo;$('#mac').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();questMacGo();}});
  document.addEventListener('cw:bridge',questButtons);
  questDragSetup();questMovesDraw();questStage();questFlatStart();questProbeXR();
  const ready=()=>{questButtons();
    if(questWB()){questStatus('Press Connect, then choose your cube in the list that the browser shows.');return;}
    if(!BRIDGE){questStatus('No way to a cube here. Run quest/run.sh on the Mac, then open http://localhost:27272/quest/ in the headset.');return;}
    const last=questGet('cw:questCube',null);
    questStatus(last?`Looking for ${last} by itself. Press Connect to choose another cube.`:'Choose your cube in the list. The page connects to it by itself next time.');
    questConnect(true);};
  Promise.all([bridgeStart(),questWBCheck().then(v=>{qs.wb=v;})]).then(ready);
}
questStart();
