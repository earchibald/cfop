// The Quest cube lab (quest/): the pure part (matrices, the cubies and stickers, every move's turn
// lands on the next state, the moves between states, the hold), then the page over a fake bridge
// (the list, a connect, a turn on the list, the stage, the hold, the tilt, Demo cube, the keys),
// then a fake WebXR session (the cube placed in front of the head, a grip carries it, a select away
// brings it back, A toggles the tilt, the stick sizes the cube, the panel, VR draws the floor).
// The page's functions are on window; its state comes from questState().
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const {fakeDevice}=require('./fake-gan');
const {fakeBridge,bridgeInfo}=require('./fake-bridge');
const MAC='AB:12:34:5C:9D:E1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(f,ms=2000)=>{const t=Date.now();while(!f()){if(Date.now()-t>ms)return false;await sleep(10);}return true;};
const near=(a,b,e=1e-6)=>a.length===b.length&&[...a].every((v,i)=>Math.abs(v-b[i])<e);
const SOLVED={cp:[0,1,2,3,4,5,6,7],co:Array(8).fill(0),ep:[...Array(12).keys()],eo:Array(12).fill(0)};

function pure(){
  const run=require('./vm-load')('js/engine.js','js/draw.js','lab/smack.js','quest/core.js');
  const m4Trs=run('m4Trs'),m4Mul=run('m4Mul'),m4Point=run('m4Point'),quatMat=run('quatMat'),quatAxis=run('quatAxis'),quatApply=run('quatApply'),quatFacing=run('quatFacing'),quatNorm=run('quatNorm');
  // m4Trs turns as quatMat does, and m4Mul is "a after b"
  const q=quatNorm([0.3,-0.5,0.2,0.8]),M=m4Trs([1,2,3],q,2),R=quatMat(q);
  for(let r=0;r<3;r++)for(let c=0;c<3;c++)assert.ok(Math.abs(M[c*4+r]-2*R[r][c])<1e-6,'m4Trs holds quatMat, scaled');
  assert.ok(near(m4Point(M,[0,0,0]),[1,2,3]),'and the place');
  const A=m4Trs([0,1,0],quatAxis([0,0,1],30),1),B=m4Trs([2,0,0],quatAxis([1,0,0],50),1.5),p=[0.3,-0.7,1.1];
  assert.ok(near(m4Point(m4Mul(A,B),p),m4Point(A,m4Point(B,p)),1e-5),'m4Mul(a,b) is a after b');
  assert.ok(near(quatApply(q,p),[0,1,2].map(i=>R[i][0]*p[0]+R[i][1]*p[1]+R[i][2]*p[2])),'quatApply turns as quatMat');
  assert.ok(near(quatApply(quatFacing([0,0,0],[1,0,0]),[0,0,1]),[1,0,0]),'quatFacing points +z at the other point');
  assert.ok(near(quatApply(quatFacing([0,1,0],[0,5,-2]),[0,0,1]),[0,0,-1]),'seen from above');
  // the parts
  const cubies=run('QUEST_CUBIES'),st=run('QUEST_STICKERS'),FG=run('FACE_GEOM');
  assert.strictEqual(cubies.length,26,'26 cubies');assert.strictEqual(st.length,54,'54 stickers');
  for(const s of st){const g=FG[Math.floor(s.idx/9)],i=Math.floor(s.idx%9/3),j=s.idx%3;
    assert.ok(near(s.cubie.map((v,k)=>v+s.n[k]*0.5),[0,1,2].map(k=>g.n[k]*1.5+g.r[k]*(j-1)+g.d[k]*(i-1))),'sticker '+s.idx+' sits where draw.js puts it');
    assert.ok(near(s.up,s.d.map(v=>-v)),'its up is the face\'s up');}
  // every face move: the stickers of the turning layer, turned the whole way, land where the
  // facelets after the move put their colors
  const moveGeom=run('moveGeom'),questMoves=run('questMoves'),applyAlg=run('applyAlg'),Cube=run('Cube');
  const start=applyAlg(new Cube(),['R','U2',"F'",'L','D','B2']),f0=start.toFacelets();
  const key=(p,n)=>p.map(v=>Math.round(v*2)).join()+'|'+n.map(v=>Math.round(v)).join();
  const at=new Map(st.map(s=>[key(s.cubie.map((v,k)=>v+s.n[k]*0.5),s.n),s.idx]));
  for(const m of run('QUEST_FACE_MOVES')){
    const g=moveGeom(m,3),T=m4Trs([0,0,0],quatAxis(g.n,g.deg),1),f1=applyAlg(start,[m]).toFacelets();
    assert.strictEqual(cubies.filter(p=>questMoves(g,p)).length,9,m+' turns nine cubies');
    for(const s of st){
      const P=s.cubie.map((v,k)=>v+s.n[k]*0.5);
      const moved=questMoves(g,s.cubie),P1=moved?m4Point(T,P):P,n1=moved?m4Point(T,s.n):s.n;
      const to=at.get(key(P1,n1));assert.ok(to!=null,m+': sticker '+s.idx+' lands on a sticker');
      assert.strictEqual(f1[to],f0[s.idx],m+': sticker '+s.idx+' carries its color to '+to);
    }
  }
  // the moves between two states
  const J=JSON.stringify,eq=(x,y,msg)=>assert.strictEqual(J(x),J(y),msg);
  const questPath=run('questPath'),mk=a=>applyAlg(new Cube(),a);
  eq(questPath(new Cube(),new Cube()),[],'the same state: no moves');
  eq(questPath(new Cube(),mk(['R'])),['R'],'one move');
  eq(questPath(mk(['R']),mk(['R','U',"F'"])),['U',"F'"],'two moves from a state');
  assert.strictEqual(questPath(new Cube(),mk(['R','U','F','D','L'])),null,'five apart: none');
  const questMerge=run('questMerge');
  eq(questMerge(['R'],'R'),['R2'],'R R is R2');eq(questMerge(['U','R'],"R'"),['U'],'R R\' is nothing');
  eq(questMerge(['R2'],'R'),["R'"],'R2 R is R\'');eq(questMerge(['R'],'U'),['R','U']);
  // the hold
  const H=run('QUEST_HOLDS'),questRelabel=run('questRelabel'),questHeld=run('questHeld'),questMoveColor=run('questMoveColor');
  assert.strictEqual(questRelabel("U'",H.white),"U'");assert.strictEqual(questRelabel("U'",H.yellow),"D'",'white is down: a turn of white is D');
  assert.strictEqual(questRelabel('R2',H.yellow),'L2');assert.strictEqual(questRelabel('F',H.yellow),'F','green stays in front');
  const held=questHeld(new Cube(),H.yellow);assert.strictEqual(held.center[0],3,'yellow up');assert.strictEqual(held.center[2],2,'green in front');
  // the relabel agrees with the engine: a turn of the cube is the relabeled turn of the cube as held
  for(const m of run('QUEST_FACE_MOVES'))assert.ok(questHeld(mk([m]),H.yellow).equals(applyAlg(held,[questRelabel(m,H.yellow)])),m+' on the cube is '+questRelabel(m,H.yellow)+' as held');
  assert.ok(near(quatApply(H.yellow.q,[0,1,0]),[0,-1,0])&&near(quatApply(H.yellow.q,[0,0,1]),[0,0,1]),'the picture turns white down, green still in front');
  assert.strictEqual(questMoveColor('U',held),'#ffd21e','U as held is the yellow face');assert.strictEqual(questMoveColor('R',new Cube()),'#d8283b');
  const panel=run('questPanel')({name:'GAN12',battery:80,status:'Live.',stage:{name:'F2L',sub:'2 pairs'},moves:Array.from({length:15},()=>'R'),tilt:true,hint:'h'});
  assert.strictEqual(panel.head,'GAN12 · 80%');assert.strictEqual(panel.stage,'F2L · 2 pairs');assert.strictEqual(panel.moves.length,12,'the last twelve moves');assert.strictEqual(panel.count,15);
  console.log('quest pure ok');
}

const html=fs.readFileSync(path.join(__dirname,'..','quest','index.html'),'utf8');
const SHIM=fs.readFileSync(path.join(__dirname,'..','quest','android','shim.js'),'utf8');
// The Java side of the Quest app (BleBridge.java) as a page sees it: TwistwrightAndroid.post(json)
// answers hello with text, hands every other message to a fake bridge, and the events come back
// through window.bridgeEvent.
function fakeAndroid(bridge,opts={}){
  const ws=new bridge.FakeWebSocket('android');const sent=[];let win=null;
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.ev!=='hello'&&win&&win.bridgeEvent)win.bridgeEvent(m);};
  return {sent,install(w){win=w;w.TwistwrightAndroid={post(json){
    assert.strictEqual(typeof json,'string','the page sends text, as a JavascriptInterface takes it');
    const m=JSON.parse(json);sent.push(m);
    if(m.op==='hello')return JSON.stringify({version:'0.1.0',bluetooth:opts.bluetooth||'poweredOn'});
    ws.send(json);return null;}};}};
}
function fakeStorage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()};}
// opts.xr: a navigator.xr; opts.storage: a localStorage
function boot(bridge,opts={}){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  // In the Quest app the page gets shim.js first in its head, as MainActivity.withShim puts it.
  const src=opts.android?html.replace(/<head[^>]*>/i,h=>h+'<script>'+SHIM+'</script>'):html;
  const dom=new JSDOM(src,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','quest','index.html'),virtualConsole:vc,
    beforeParse(w){Object.defineProperty(w,'localStorage',{value:opts.storage||fakeStorage()});
      if(opts.xr)Object.defineProperty(w.navigator,'xr',{value:opts.xr});
      if(opts.android){opts.android.install(w);w.fetch=async()=>({ok:false});return;}
      w.BRIDGE_LOCAL=true;w.WebSocket=bridge.FakeWebSocket;w.fetch=async u=>u==='/bridge/info'?{ok:true,json:async()=>bridgeInfo()}:{ok:false};}});
  const w=dom.window;
  return new Promise(res=>w.addEventListener('load',()=>setTimeout(()=>res({w,d:w.document,errs}),300)));
}
const moveMsg=()=>Uint8Array.from([0x01,...Array(19).fill(0)]); // a gen 4 move message

async function page(){
  const cube={};const set=c=>Object.assign(cube,{cp:[...c.cp],co:[...c.co],ep:[...c.ep],eo:[...c.eo]});set(SOLVED);
  const dev=fakeDevice(4,MAC,cube,{name:'GAN12uiM_A1B2'});
  const storage=fakeStorage();
  const {w,d,errs}=await boot(fakeBridge([{id:'p1',gen:4,dev,mac:MAC}]),{storage});
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)],Q=()=>w.questState();
  const click=el=>{assert.ok(el,'element to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};
  const change=(el,v)=>{if(typeof v==='boolean')el.checked=v;else el.value=v;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
  assert.deepStrictEqual(errs,[],'the page loads with no script error');
  assert.ok(/^v\d+\.\d+\.\d+$/.test($('#ver').textContent),'the version shows: '+$('#ver').textContent);
  assert.ok(!$('#nogl').hidden,'no WebGL in jsdom: the page says so');
  assert.strictEqual($('#way').textContent,'Mac app bridge test','the way to the cube is the bridge');
  assert.strictEqual($('#xrAR').textContent,'no','no WebXR here');assert.ok($('#enterAR').disabled&&$('#enterVR').disabled,'the headset buttons wait');
  // the page looks by itself: the list shows the cube, a click connects
  assert.ok(!$('#list').hidden,'the list shows by itself');
  assert.ok(await until(()=>$$('#listItems button').length===1&&$('#listItems button').dataset.mac===MAC),'the cube is listed with its address');
  click($('#listItems button'));
  assert.ok(await until(()=>!!Q().conn),'the cube connects');
  assert.ok($('#connect').hidden&&!$('#disconnect').hidden,'Disconnect replaces Connect');
  assert.strictEqual(storage.getItem('cw:questCube'),'"GAN12uiM_A1B2"','the cube is remembered');
  assert.strictEqual(JSON.parse(storage.getItem('cw:ganMac'))['GAN12uiM_A1B2'],MAC,'with its address, in the site\'s map');
  assert.ok(/Live/.test($('#status').textContent),'the status: '+$('#status').textContent);
  const solved=Q().shown;assert.ok(solved.isSolved(),'the solved cube came through');
  // a turn: the move message asks for the state, the state turns the layer
  const c1=w.applyAlg(solved,['R']);set(c1);dev.notify(moveMsg());
  assert.ok(await until(()=>Q().target&&Q().target.equals(c1)),'the picture heads for the cube after R');
  assert.strictEqual(Q().moves.join(),'R','the move is on the list');assert.strictEqual($('#moves .mv').textContent,'R');
  assert.strictEqual($('#count').textContent,'1 move');assert.ok($('#stage').textContent.length>0,'the stage shows: '+$('#stage').textContent);
  // the queue turns in the page's clock (questTick); jsdom has no WebGL loop, so step it here
  const now=w.performance.now();w.questTick(now+1);assert.ok(Q().anim&&Q().anim.move==='R','the layer starts to turn');
  w.questTick(now+5000);assert.ok(!Q().anim&&Q().shown.equals(c1),'and lands on the new state');
  // a second turn on the same face merges
  const c2=w.applyAlg(c1,['R']);set(c2);dev.notify(moveMsg());
  assert.ok(await until(()=>Q().moves.join()==='R2'),'R then R reads R2: '+Q().moves.join());
  // the hold: yellow up names the white face D, and the moves read that way
  change($('#hold'),'yellow');assert.strictEqual(storage.getItem('cw:questHold'),'"yellow"','the hold is kept');
  const c3=w.applyAlg(c2,['U']);set(c3);dev.notify(moveMsg());
  assert.ok(await until(()=>Q().moves.join()==='R2,D'),'a turn of white reads D as held: '+Q().moves.join());
  assert.strictEqual($$('#moves .mv')[1].style.getPropertyValue('--c'),'#f3f2ec','its bar is white');
  click($('#clear'));assert.strictEqual(Q().moves.length,0,'Clear moves');assert.ok($('#clear').disabled);
  // tilt
  assert.ok($('#tilt').checked,'Tilt with my cube is on by default');assert.ok($('#level').disabled,'Level waits for a tilt reading');
  w.questGyro([0,0.3826834,0,0.9238795]);assert.ok(!$('#level').disabled,'Level is on once the cube tilts');
  w.questTick(w.performance.now()+10);assert.ok(Q().q,'the picture follows the tilt');
  assert.ok(near(w.quatApply(Q().q,[0,0,1]),[0,0,1],1e-6),'the first reading is taken as the hold: green in front');
  change($('#tilt'),false);assert.ok(near(w.questOrient(),[0,0,1,0]),'tilt off: the picture shows the hold');
  // Disconnect, then the keys and Demo cube
  click($('#disconnect'));assert.ok(!Q().conn&&!$('#connect').hidden,'Disconnect');
  const before=Q().target;d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'F',bubbles:true}));
  assert.ok(Q().target.equals(w.applyAlg(before,['F'])),'F turns the cube with no smart cube');assert.strictEqual(Q().moves.slice(-1)[0],'F');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'F',shiftKey:true,bubbles:true}));assert.ok(Q().target.equals(before),'Shift+F turns it back');
  click($('#demo'));assert.strictEqual($('#demo').textContent,'Stop demo');
  const n0=Q().moves.length;assert.ok(await until(()=>Q().moves.length!==n0,1600),'Demo cube turns by itself');
  click($('#demo'));assert.strictEqual($('#demo').textContent,'Demo cube');
  w.close();console.log('quest page ok');
}

// A fake WebXR: one session with one view, a right controller, events and frames by hand.
async function xr(){
  const handlers={},frames=[];let baseLayer=null;
  const pad={buttons:Array.from({length:6},()=>({pressed:false})),axes:[0,0,0,0]};
  const ctrl={handedness:'right',gripSpace:'grip',targetRaySpace:'ray',gamepad:pad},poses={grip:[0,1.2,-0.3]};
  const session={inputSources:[ctrl],get renderState(){return {baseLayer};},updateRenderState(s){baseLayer=s.baseLayer;},
    requestReferenceSpace:async t=>({t}),addEventListener:(t,f)=>{(handlers[t]=handlers[t]||[]).push(f);},requestAnimationFrame:f=>{frames.push(f);return frames.length;},
    end(){(handlers.end||[]).forEach(f=>f());for(const k in handlers)delete handlers[k];frames.length=0;}};
  const fakeXR={isSessionSupported:async m=>m==='immersive-ar'||m==='immersive-vr',requestSession:async(mode,o)=>{session.mode=mode;session.opts=o;return session;}};
  const {w,d,errs}=await boot(fakeBridge([]),{xr:fakeXR});
  const $=s=>d.querySelector(s),Q=()=>w.questState();
  assert.deepStrictEqual(errs,[]);
  assert.strictEqual($('#xrAR').textContent,'yes','passthrough is there');assert.strictEqual($('#xrVR').textContent,'yes');
  // with no cube ever connected, the first key turns from solved and goes on the list
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'r',bubbles:true}));
  assert.strictEqual(Q().moves.join(),'R','the first move is on the list');assert.ok(Q().anim||Q().queue.length,'and turns');
  // stand in for WebGL: the renderer records each scene
  const scenes=[];
  w.XRWebGLLayer=class{constructor(s,gl,o){this.o=o;this.framebuffer='fb';}getViewport(){return {x:0,y:0,width:100,height:100};}};
  Q().gl={makeXRCompatible:async()=>{},bindFramebuffer(){},clearColor(){},clear(){},viewport(){},COLOR_BUFFER_BIT:1,DEPTH_BUFFER_BIT:2,FRAMEBUFFER:3};
  Q().r={drawScene:(p,v,s)=>scenes.push(s)};w.questButtons();
  assert.ok(!$('#enterAR').disabled,'Enter passthrough is on');
  $('#enterAR').click();assert.ok(await until(()=>!!Q().xr),'the session starts');
  assert.strictEqual(session.mode,'immersive-ar');assert.deepStrictEqual([...session.opts.optionalFeatures],['local-floor','hand-tracking'],'hands and the floor asked for');
  assert.strictEqual(Q().xr.ref.t,'local-floor');
  const pose=(p)=>({transform:{position:{x:p[0],y:p[1],z:p[2]},orientation:{x:0,y:0,z:0,w:1}}});
  const frame={session,getViewerPose:()=>({transform:pose([0,1.6,0]).transform,views:[{projectionMatrix:new Float32Array(16),transform:{inverse:{matrix:new Float32Array(16)}}}]}),getPose:s=>poses[s]?pose(poses[s]):null};
  let t=1000;const step=()=>{const f=frames.shift();assert.ok(f,'a frame is asked for');t+=16;f(t,frame);};
  step();
  const x=Q().xr;assert.ok(near(x.pos,[0,1.44,-0.45]),'the cube floats in front of the head, a little below: '+x.pos);
  assert.ok(near(w.quatApply(x.face,[0,0,1]),[0,0,1]),'facing the user');
  assert.strictEqual(scenes.length,1,'one view drawn');assert.ok(scenes[0].panel&&/Grip/.test(scenes[0].panel.lines.hint),'the panel with the controller hints');
  assert.strictEqual(scenes[0].extras.length,0,'passthrough: no floor, no drawn controllers');
  // a grip near the cube carries it
  const ev=(type)=>(handlers[type]||[]).forEach(f=>f({type,inputSource:ctrl,frame}));
  poses.grip=[0.03,1.45,-0.43];ev('squeezestart');assert.ok(x.grab,'the grip takes the cube');
  poses.grip=[0.23,1.5,-0.33];step();assert.ok(near(x.pos,[0.2,1.49,-0.35]),'the cube follows the hand: '+x.pos);
  ev('squeezeend');assert.ok(!x.grab,'and lets go');
  // a trigger away from the cube brings it back in front
  poses.grip=[0.5,1.0,0];ev('selectstart');assert.ok(!x.grab,'too far to take');ev('selectend');ev('select');
  step();assert.ok(near(x.pos,[0,1.44,-0.45]),'the cube is back in front: '+x.pos);
  // a trigger on the cube carries it and does not send it back
  poses.grip=[0,1.44,-0.45];ev('selectstart');assert.ok(x.grab);poses.grip=[0.1,1.44,-0.45];step();ev('selectend');ev('select');step();
  assert.ok(near(x.pos,[0.1,1.44,-0.45]),'a carry by trigger stays where it is put: '+x.pos);
  // A toggles the tilt, the stick sizes the cube
  const tilt=Q().tilt;pad.buttons[4].pressed=true;step();assert.strictEqual(Q().tilt,!tilt,'A toggles the tilt');step();assert.strictEqual(Q().tilt,!tilt,'once per press');
  pad.buttons[4].pressed=false;step();
  const e0=x.edge;pad.axes[3]=-1;step();step();assert.ok(x.edge>e0,'the stick up makes the cube larger');pad.axes[3]=0;
  // VR: the floor and the controller drawn
  session.end();assert.ok(!Q().xr,'the session ends');
  $('#enterVR').click();assert.ok(await until(()=>!!Q().xr));scenes.length=0;step();
  assert.strictEqual(scenes[0].extras.length,2,'VR: the floor and the controller');
  w.close();console.log('quest xr ok');
}

// A Mac app that has never asked for Bluetooth: the look with no click says to press Connect, and
// the press scans (the app asks, the fake says yes).
async function notAsked(){
  const dev=fakeDevice(4,MAC,Object.assign({},SOLVED),{name:'GAN12uiM_A1B2'});
  const bridge=fakeBridge([{id:'p1',gen:4,dev,mac:MAC}],{bluetooth:'notAsked'});
  const {w,d,errs}=await boot(bridge);const $=s=>d.querySelector(s);
  assert.deepStrictEqual(errs,[]);
  assert.ok(await until(()=>/Press Connect\. macOS then asks/.test($('#status').textContent)),'the status says to press Connect: '+$('#status').textContent);
  assert.ok($('#list').hidden,'no list with no way to scan');
  $('#connect').click();
  assert.ok(await until(()=>d.querySelectorAll('#listItems button').length===1),'the press scans and lists the cube');
  await sleep(50);w.close(); // the fake scan sends the address a moment later: let it land first
  console.log('quest notAsked ok');
}

// The Quest app (quest/android/): with no DOM, shim.js puts the Java object behind the message
// handler that bridge.js looks for, and a cube reads and writes through it; then the page in the
// app, before the headset has asked for Bluetooth: the words name the headset, and Connect asks.
async function android(){
  const bare=require('./vm-load')();bare('this.window=this');bare(SHIM);
  assert.strictEqual(bare('typeof webkit'),'undefined','no Java object: the shim does nothing');
  const run=require('./vm-load')('js/engine.js','js/gan.js');
  const g=run('this');Object.assign(g,{setTimeout,clearTimeout,AbortController});g.window=g;
  const Cube=run('Cube'),applyAlg=run('applyAlg');
  const c1=applyAlg(new Cube(),['R','U2',"B'"]);
  const dev=fakeDevice(4,MAC,{cp:[...c1.cp],co:[...c1.co],ep:[...c1.ep],eo:[...c1.eo]},{name:'GAN12uiM_A1B2'});
  const and=fakeAndroid(fakeBridge([{id:'AB:12:34:5C:9D:E1',gen:4,dev,mac:MAC}]));and.install(g);
  g.fetch=()=>{throw new Error('the app asks no server');};
  run(SHIM);run(fs.readFileSync(path.join(__dirname,'..','js','bridge.js'),'utf8'));
  const link=await run('bridgeStart')();
  assert.ok(link&&link.native,'bridge.js takes the shim as the app\'s message handler');
  assert.strictEqual(link.version,'0.1.0','hello\'s text answer is read');assert.strictEqual(link.bluetooth,'poweredOn');
  assert.strictEqual(JSON.stringify(and.sent[0]),'{"op":"hello"}','hello first');
  const found=[];const stop=link.scan(d=>found.push(d));
  assert.ok(await until(()=>found.some(d=>d.mac===MAC)),'the scan comes back through bridgeEvent');stop();
  const conn=await run('ganOpen')(run('bridgeDevice')(link,{id:'AB:12:34:5C:9D:E1',name:'GAN12uiM_A1B2',mac:MAC}),MAC,()=>{});
  assert.ok((await conn.readState(2000)).equals(c1),'the state comes through the app');
  await conn.send('reset');assert.ok(and.sent.some(m=>m.op==='write'&&/^[0-9a-f]+$/.test(m.data)),'a write goes to the app as hex');
  conn.close();
  // the page in the app
  const dev2=fakeDevice(4,MAC,Object.assign({},SOLVED),{name:'GAN12uiM_A1B2'});
  const and2=fakeAndroid(fakeBridge([{id:'p1',gen:4,dev:dev2,mac:MAC}],{bluetooth:'notAsked'}),{bluetooth:'notAsked'});
  const {w,d,errs}=await boot(null,{android:and2});const $=s=>d.querySelector(s);
  assert.deepStrictEqual(errs,[]);
  assert.strictEqual($('#way').textContent,'Quest app 0.1.0','the way names the app');
  assert.ok(await until(()=>/The headset then asks/.test($('#status').textContent)),'the status names the headset: '+$('#status').textContent);
  assert.ok(!and2.sent.some(m=>m.op==='scan'&&!m.auto),'no scan that asks before a press');
  $('#connect').click();
  assert.ok(await until(()=>and2.sent.some(m=>m.op==='scan'&&!m.auto)),'Connect sends the scan that asks');
  assert.ok(await until(()=>d.querySelectorAll('#listItems button').length===1),'and the cube is listed');
  await sleep(50);w.close();
  console.log('quest android ok');
}

(async()=>{pure();await page();await xr();await notAsked();await android();console.log('quest ok');})().catch(e=>{console.error(e);process.exit(1);});
