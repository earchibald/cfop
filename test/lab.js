// The smart cube lab (lab/): the quaternion helpers and the smack detector without a DOM, then the
// page over a fake bridge: a connect, the live picture, a turn of the cube, three smacks on the
// right face that bring the Reset dialog, Reset cube itself, and My cube is solved (the cube's own
// count is off: the reset command puts it right and the picture jumps, with no moves added), and the
// move box: the count, the last ten with a triangle for more, Clear moves, and the hold (yellow up,
// green toward you: the moves read as held, Reset cube takes the cube as held that way).
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const {fakeDevice,gyroMsg,mfDataFor}=require('./fake-gan');
const {fakeBridge,bridgeInfo}=require('./fake-bridge');
const MAC='AB:12:34:5C:9D:E1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(f,ms=2000)=>{const t=Date.now();while(!f()){if(Date.now()-t>ms)return false;await sleep(10);}return true;};
// A turn of `deg` about the unit axis [x,y,z], as [x,y,z,w].
const turn=(axis,deg)=>{const h=deg/2*Math.PI/180,s=Math.sin(h);return [axis[0]*s,axis[1]*s,axis[2]*s,Math.cos(h)];};
const unit=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
function pure(){
  const run=require('./vm-load')('lab/smack.js');
  const quatDelta=run('quatDelta'),quatMul=run('quatMul'),resetBasis=run('resetBasis'),quatMat=run('quatMat'),smackDetector=run('smackDetector');
  const I=[0,0,0,1];
  // quatDelta: the turn from a to b
  const d=quatDelta(I,turn([0,1,0],30));assert.ok(Math.abs(d.deg-30)<1e-9&&Math.abs(d.axis[1]-1)<1e-9,'quatDelta gives the angle and the axis');
  const a=turn([1,0,0],20),b=quatMul(turn([0,0,1],15),a);const d2=quatDelta(a,b);assert.ok(Math.abs(d2.deg-15)<1e-9&&Math.abs(d2.axis[2]-1)<1e-9,'quatDelta is the turn after a');
  // resetBasis: yaw keeps the tilt gravity gives, full takes the whole reading
  const raw=quatMul(turn([1,0,0],20),turn([0,1,0],50)); // yawed 50, then tipped 20 about x
  const y=quatMul(resetBasis(raw,'yaw'),raw),M=quatMat(y);
  assert.ok(Math.abs(M[0][2])<1e-6&&M[2][2]>0.9,'yaw reset brings green to the front');
  assert.ok(Math.abs(M[1][1]-quatMat(raw)[1][1])<1e-9&&quatDelta(I,y).deg>19,'and keeps the tip gravity gives');
  const f=quatMul(resetBasis(raw,'full'),raw);assert.ok(quatDelta(I,f).deg<1e-6,'full reset is square');
  // the detector: a jolt that comes back is a smack on the face across its axis
  let det=smackDetector({}),evs=[];const feed=(t,q)=>{evs.push(...det.feed(t,q));};
  for(let t=0;t<=300;t+=50)feed(t,I);
  const jolt=(t0,axis,deg)=>{feed(t0,turn(axis,deg));feed(t0+50,turn(axis,deg*0.4));feed(t0+100,I);feed(t0+150,I);feed(t0+200,I);};
  jolt(400,unit([0,0.6,0.8]),9);
  assert.strictEqual(evs.length,1);assert.strictEqual(evs[0].type,'smack');assert.strictEqual(evs[0].face,0,'a jolt across x is the right or left face: '+JSON.stringify(evs[0]));
  assert.ok(Math.abs(evs[0].deg-9)<1e-6&&evs[0].ms===100,'the peak and the length');
  assert.strictEqual(det.state.series.length,1);
  jolt(800,unit([0.8,0,0.6]),9);
  assert.strictEqual(evs[1].face,1,'a jolt across y is the top or bottom');assert.strictEqual(det.state.series.length,0,'another face breaks the series');
  jolt(1200,unit([0.1,0.7,0.7]),7);jolt(1600,unit([0,1,0]),12);jolt(2000,unit([0,0,1]),6);
  const series=evs.filter(e=>e.type==='series');assert.strictEqual(series.length,1,'three on the side face make a series');assert.strictEqual(series[0].smacks.length,3);
  assert.strictEqual(det.state.series.length,0,'the series is spent');
  // a jolt that stays is a turn, and a jolt past the gap starts over
  evs=[];feed(2400,turn([0,1,0],30));feed(2450,turn([0,1,0],30));feed(2500,turn([0,1,0],30));feed(2550,turn([0,1,0],30));
  assert.strictEqual(evs[0].type,'turn','a turn that stays: '+JSON.stringify(evs));assert.ok(evs[0].deg>29);
  const Q=turn([0,1,0],30);for(let t=2600;t<=3000;t+=50)feed(t,Q);
  evs=[];const jolt2=(t0,deg)=>{feed(t0,quatMul(turn(unit([0,0.6,0.8]),deg),Q));feed(t0+50,Q);feed(t0+100,Q);feed(t0+150,Q);};
  jolt2(3100,8);jolt2(3400,8);jolt2(5400,8);
  assert.strictEqual(evs.filter(e=>e.type==='smack').length,3);assert.strictEqual(evs.filter(e=>e.type==='series').length,0,'a gap of two seconds starts the count over');
  assert.strictEqual(det.state.series.length,1);
  // a wide jolt is a turn; any face counts with face null
  det=smackDetector({face:null,count:2});evs=[];
  for(let t=0;t<=200;t+=50)feed(t,I);
  feed(300,turn([0,1,0],60));feed(350,I);feed(400,I);feed(450,I);
  assert.strictEqual(evs[0].type,'turn','past maxDeg is a turn');
  jolt(600,unit([0.8,0,0.6]),9);jolt(900,unit([0,0.6,0.8]),9);
  assert.ok(evs.some(e=>e.type==='series'),'any face counts');
  // a slow lean follows the rest pose with no event
  det=smackDetector({});evs=[];for(let t=0;t<=4000;t+=50)feed(t,turn([1,0,0],t/4000*40));
  assert.strictEqual(evs.length,0,'a slow lean is no event: '+JSON.stringify(evs));
  console.log('lab pure ok');
}
const html=fs.readFileSync(path.join(__dirname,'..','lab','index.html'),'utf8');
function fakeStorage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()};}
// opts.storage: a localStorage to keep between two boots. opts.bluetooth: a navigator.bluetooth,
// for the Web Bluetooth path; the bridge is then absent (no /bridge/info).
function boot(bridge,opts={}){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','lab','index.html'),virtualConsole:vc,
    beforeParse(w){w.matchMedia=q=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};Object.defineProperty(w,'localStorage',{value:opts.storage||fakeStorage()});
      if(opts.bluetooth){Object.defineProperty(w.navigator,'bluetooth',{value:opts.bluetooth});w.fetch=async()=>({ok:false});return;}
      w.BRIDGE_LOCAL=true;w.WebSocket=bridge.FakeWebSocket;w.fetch=async u=>u==='/bridge/info'?{ok:true,json:async()=>bridgeInfo()}:{ok:false};}});
  const w=dom.window;
  return new Promise(res=>w.addEventListener('load',()=>setTimeout(()=>res({w,d:w.document,errs}),300)));
}
async function page(){
  const cube={};const set=c=>Object.assign(cube,{cp:[...c.cp],co:[...c.co],ep:[...c.ep],eo:[...c.eo]});
  const dev=fakeDevice(4,MAC,cube,{name:'GAN12uiM_A1B2'});
  const bridge=fakeBridge([{id:'p1',gen:4,dev,mac:MAC}]);
  const storage=fakeStorage();
  const {w,d,errs}=await boot(bridge,{storage});
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)],L=()=>w.eval('lab'); // a const in a classic script is not on window
  const click=el=>{assert.ok(el,'element to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};
  const key=k=>d.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
  assert.deepStrictEqual(errs,[],'the lab loads with no script error');
  const Cube=w.eval('Cube');set(new Cube());
  assert.ok(w.eval('BRIDGE'),'the lab found the app');assert.ok(!$('#connect').disabled,'Connect is on');
  const ver=w.eval('LAB_VERSION');assert.ok(/^\d+\.\d+\.\d+$/.test(ver),'the lab has a version');
  assert.strictEqual($('#ver').textContent,'lab '+ver+' · app test','the bar shows the lab and app versions: '+$('#ver').textContent);
  assert.strictEqual(d.title,'Smart cube lab '+ver,'the title carries the version');
  assert.ok($('#reset').disabled,'Reset cube waits for a cube');assert.ok($('#solved').disabled,'My cube is solved waits for a cube');
  assert.ok($$('#cube polygon').length>0,'the picture is drawn before a cube connects');
  // the lab opens as if Connect were pressed: the list is up with no click
  assert.ok(!$('#list').hidden,'the list shows by itself');assert.ok(/Looking for cubes|Choose your cube/.test($('#listNote').textContent),'the note: '+$('#listNote').textContent);
  assert.ok(/remembers it/.test($('#status').textContent),'the status says the lab remembers the cube: '+$('#status').textContent);
  assert.ok(await until(()=>$$('#listItems button').length===1&&$('#listItems button').dataset.mac===MAC),'the cube is listed with its address');
  click($('#connect'));assert.ok(!$('#list').hidden,'Connect during the look keeps one list up');
  await sleep(20);assert.ok(!/No cube was chosen/.test($('#status').textContent),'the ended look leaves no stale status: '+$('#status').textContent);
  assert.ok(await until(()=>$$('#listItems button').length===1&&$('#listItems button').dataset.mac===MAC),'the cube is listed again');
  click($('#listItems button'));
  assert.ok(await until(()=>!!L().conn),'the cube connects');
  const known=JSON.parse(storage.getItem('cw:labCubes'));
  assert.strictEqual(known['GAN12uiM_A1B2'].mac,MAC,'the cube is remembered with its address');assert.strictEqual(known['GAN12uiM_A1B2'].id,'p1');
  assert.strictEqual($('#name').textContent,'GAN12uiM_A1B2');assert.ok(!$('#reset').disabled,'Reset cube is on');
  assert.ok(L().shown&&L().shown.isSolved(),'the solved cube came through');assert.ok(!$('#solved').disabled,'My cube is solved is on');
  assert.ok(!/My cube is solved/.test($('#status').textContent),'a solved cube gets no hint: '+$('#status').textContent);
  assert.ok(/State read: WWWWWWWWW RRRRRRRRR GGGGGGGGG YYYYYYYYY OOOOOOOOO BBBBBBBBB \(solved\)/.test($('#log .state').textContent),'the state read is logged as letters: '+$('#log').textContent);
  // a turn: the move message asks for the state, the state turns the layer
  const c1=w.applyAlg(new Cube(),['R']);set(c1);
  dev.notify(Uint8Array.from([0x01,...Array(19).fill(0)])); // a gen 4 move message
  assert.ok(await until(()=>L().target&&L().target.equals(c1)),'the picture heads for the cube after R');
  assert.ok(await until(()=>!L().anim&&L().shown.equals(c1)),'the layer turned');
  assert.strictEqual(L().moves.join(),'R','the move is on the list');assert.strictEqual($('#moves .mv').textContent,'R');
  // the box of its own: the count in the head, Clear moves, the triangle past ten moves
  assert.ok($('#movesBox')&&$('#movesBox').contains($('#moves'))&&$('#movesBox').contains($('#movesClear')),'the moves sit in a box with Clear moves');
  assert.strictEqual($('#movesCount').textContent,'1 move','the head counts the moves');assert.ok(!$('#movesClear').disabled,'Clear moves is on');
  let cN=c1;const faces=['U','F','L','D','B','R'];
  for(let i=0;i<10;i++){cN=w.applyAlg(cN,[faces[i%6]]);set(cN);dev.notify(Uint8Array.from([0x01,...Array(19).fill(0)]));
    assert.ok(await until(()=>L().target&&L().target.equals(cN)),'move '+(i+2)+' is heard');}
  assert.ok(await until(()=>L().moves.length===11),'eleven moves: '+L().moves.join(' '));
  assert.strictEqual($$('#moves .mv').length,10,'the last ten show');assert.strictEqual($$('#moves .mv')[0].textContent,'U','the first move fell off the readout');
  assert.ok($('#moves .more'),'the triangle says there are more');assert.strictEqual($('#moves .more').getAttribute('aria-label'),'1 more');assert.strictEqual($('#moves .more').title,'11 moves in all');
  assert.strictEqual($('#movesCount').textContent,'11 moves');
  const logBefore=$('#log').children.length;
  click($('#movesClear'));
  assert.strictEqual(L().moves.length,0,'Clear moves empties the list');assert.strictEqual($('#moves .none').textContent,'No moves yet');assert.ok(!$('#moves .more'),'and the triangle');
  assert.strictEqual($('#movesCount').textContent,'','no count with no moves');assert.ok($('#movesClear').disabled,'Clear moves is off again');
  assert.strictEqual($('#log').children.length,logBefore,'Clear moves leaves the log alone');
  cN=w.applyAlg(cN,['R']);set(cN);dev.notify(Uint8Array.from([0x01,...Array(19).fill(0)]));
  assert.ok(await until(()=>L().moves.join()==='R'),'the list fills again after Clear moves');
  // the cube's count is off: the real cube is solved, the cube says R U F. My cube is solved sends the
  // reset, the cube takes its state as solved, the picture jumps there and the move list is unchanged
  set(w.applyAlg(new Cube(),['R','U','F']));
  dev.notify(Uint8Array.from([0x01,...Array(19).fill(0)]));
  assert.ok(await until(()=>!L().anim&&L().shown.equals(w.applyAlg(new Cube(),['R','U','F']))),'the picture follows the cube\'s count');
  const movesBefore=L().moves.join();
  key('s');
  assert.ok(await until(()=>L().shown.isSolved()&&!L().busy),'My cube is solved brings the picture to solved');
  assert.ok(new Cube().equals(new Cube(cube.cp,cube.co,cube.ep,cube.eo)),'the cube itself took the reset');
  assert.strictEqual(L().moves.join(),movesBefore,'no moves were added for the jump');
  assert.ok($$('#log .solved').length===1&&/took its state as solved/.test($('#log .solved').textContent),'the reset is logged: '+$('#log').textContent);
  assert.ok(/counts from solved/.test($('#status').textContent),'the status says so: '+$('#status').textContent);
  assert.ok(!$('#solved').disabled,'the button is on again');
  // the tilt: the first reading sets the heading; the smacks come as jolts that go back
  const send=q=>dev.notify(gyroMsg(4,q)); // the cube's own frame: w,x,y,z, where the page's y is the cube's z and the page's z is minus the cube's y
  const rest={w:1,x:0,y:0,z:0};
  send(rest);await sleep(60);send(rest);await sleep(60);
  assert.ok(await until(()=>L().gyro),'the tilt is live');assert.ok(L().basis,'the first reading set the heading');
  assert.ok(/Reset cube/.test($('#status').textContent),'the status names Reset cube');
  const h=9/2*Math.PI/180; // a jolt of 9 degrees about the page axis (0,.6,.8): the cube's (0,-.8,.6)
  const jolt=async()=>{send({w:Math.cos(h),x:0,y:-0.8*Math.sin(h),z:0.6*Math.sin(h)});await sleep(60);send(rest);await sleep(60);send(rest);await sleep(60);send(rest);await sleep(60);};
  await jolt();
  assert.ok(await until(()=>$$('#log .smack').length===1),'a smack is logged: '+$('#log').textContent);
  assert.ok(/right or left/.test($('#log .smack').textContent),'on the right or left face');
  assert.strictEqual($$('#dots span.on').length,1,'one dot is lit');
  await jolt();await jolt();
  assert.ok(await until(()=>!$('#confirm').hidden),'three smacks bring the Reset dialog');
  assert.ok(/right or left face three times/.test($('#confirmText').textContent));
  key('Escape');assert.ok($('#confirm').hidden,'Esc cancels');assert.ok($$('#log .cancel').length===1,'the cancel is logged');
  assert.strictEqual($$('#dots span.on').length,0,'the count starts over');
  await jolt();await jolt();await jolt();
  assert.ok(await until(()=>!$('#confirm').hidden),'the dialog comes again');
  const before=L().basis.slice();
  click($('#confirmYes'));
  assert.ok($('#confirm').hidden,'Reset closes the dialog');assert.ok($$('#log .reset').length===1,'Reset cube is logged: '+$('#log').textContent);
  assert.ok(/\(yaw\)/.test($('#log .reset').textContent),'yaw only by default');
  // Reset cube by hand with the cube yawed: the picture lines up again
  send({w:Math.cos(Math.PI/8),x:0,y:0,z:Math.sin(Math.PI/8)}); // 45 degrees about the cube's z: the page's y
  await sleep(30);
  const M=w.quatMat(L().qTo);assert.ok(Math.abs(M[0][2])>0.6,'the picture turned with the cube');
  key('r');
  const M2=w.quatMat(L().qTo);assert.ok(Math.abs(M2[0][2])<1e-6&&M2[2][2]>0.99,'Reset cube brings green back to the front');
  assert.ok(L().basis.join()!==before.join());
  $('#full').checked=true;key('r');assert.ok(/\(full\)/.test($('#log .reset').textContent),'Full reset is logged');
  assert.ok(/white up, green toward you/.test($('#log .reset').textContent),'the reset names the hold: '+$('#log .reset').textContent);
  // the hold: yellow up, green toward you. The selects say so; the turn from the old hold goes on
  // the list, the moves after it read as held, and Reset cube takes the cube as held that way
  $('#full').checked=false;send(rest);await sleep(30);
  assert.strictEqual($('#holdUp').value,'0');assert.strictEqual($('#holdFront').value,'2','white up, green in front at first');
  assert.deepStrictEqual($$('#holdFront option').map(o=>o.textContent),['red','green','orange','blue'],'the front choices leave out the top and its opposite');
  click($('#movesClear'));
  $('#holdUp').value='3';$('#holdUp').dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.deepStrictEqual($$('#holdFront option').map(o=>o.textContent),['red','green','orange','blue'],'yellow up: white is out');
  assert.strictEqual($('#holdFront').value,'2','green stays in front');
  assert.strictEqual(L().hold.cube.center[0],3,'the hold is yellow up');assert.strictEqual(L().hold.cube.center[2],2);
  assert.strictEqual($$('#moves .mv.rot').map(s=>s.textContent).join(),'z2','the turn to the new hold is on the list, dashed');
  assert.ok(/Hold: yellow up, green toward you/.test($('#log .hold').textContent),'the hold is logged: '+$('#log').textContent);
  assert.deepStrictEqual(JSON.parse(storage.getItem('cw:labHold')),{up:3,front:2},'the hold is kept');
  assert.ok(/\(yaw\): yellow up, green toward you/.test($('#log .reset').textContent),'a change of the hold is a Reset cube: '+$('#log .reset').textContent);
  let M3=w.quatMat(L().qTo);assert.ok(M3[1][1]>0.99,'yaw only: the cube is still white up by gravity');
  const cur=()=>new Cube(cube.cp,cube.co,cube.ep,cube.eo);
  set(w.applyAlg(cur(),['R']));dev.notify(Uint8Array.from([0x01,...Array(19).fill(0)]));
  assert.ok(await until(()=>L().moves[L().moves.length-1]==='L'),"the cube's R reads as L with yellow up, green toward you: "+L().moves.join(' '));
  assert.strictEqual(L().moves.join(' '),'z2 L');
  send({w:0,x:0,y:1,z:0});await sleep(30); // the cube turned over, z2 in the page's frame: the cube's y
  M3=w.quatMat(L().qTo);assert.ok(M3[1][1]<-0.99&&M3[2][2]>0.99,'the picture follows: yellow up, green in front');
  key('r');M3=w.quatMat(L().qTo);assert.ok(M3[1][1]<-0.99&&M3[2][2]>0.99,'Reset cube keeps yellow up, green in front: '+M3.map(r=>r.map(v=>v.toFixed(2)).join(',')).join(' / '));
  send({w:0,x:1,y:0,z:0});await sleep(30); // turned over the other way, x2: yellow up, blue in front
  key('r');M3=w.quatMat(L().qTo);assert.ok(M3[1][1]<-0.99&&M3[2][2]>0.99,'the hold wins: Reset cube says green is in front');
  send(rest);await sleep(30);$('#full').checked=true;key('r');
  M3=w.quatMat(L().qTo);assert.ok(M3[1][1]<-0.99&&M3[2][2]>0.99,'Full reset takes the cube as held: yellow up');
  $('#full').checked=false;
  $('#holdFront').value='5';$('#holdFront').dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.strictEqual(L().hold.cube.center[2],5,'blue in front');assert.strictEqual($$('#moves .mv.rot').map(s=>s.textContent).join(' '),'z2 y2','the turn to the new hold');
  $('#holdUp').value='0';$('#holdUp').dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.strictEqual(L().hold.cube.center[0]+'/'+L().hold.cube.center[2],'0/5','white up: blue stays in front, where it can');
  $('#holdFront').value='2';$('#holdFront').dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.strictEqual(L().hold.cube.center.join(),'0,1,2,3,4,5','white up, green in front again');assert.strictEqual(L().hold,w.eval('LAB_HOLDS')[0]);
  $('#holdUp').value='2';$('#holdUp').dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.strictEqual(L().hold.cube.center[0]+'/'+L().hold.cube.center[2],'2/1','green up: green cannot stay in front, so red');
  $('#holdUp').value='0';$('#holdUp').dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.strictEqual(L().hold.cube.center[0]+'/'+L().hold.cube.center[2],'0/1','white up: red stays in front');
  $('#holdFront').value='2';$('#holdFront').dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.strictEqual(L().hold,w.eval('LAB_HOLDS')[0],'white up, green in front: the plain hold');
  // keys and buttons
  key('l');assert.ok($('#side').hidden,'L hides the panel');key('l');assert.ok(!$('#side').hidden);
  key('c');assert.strictEqual($('#log').children.length,0,'C clears the log');assert.strictEqual(L().moves.length,0,'and the moves');assert.ok($('#movesClear').disabled);
  click($('#disconnect'));assert.ok(!L().conn,'Disconnect');assert.ok($('#reset').disabled);
  await sleep(50);assert.ok($('#list').hidden,'Disconnect by hand starts no look');
  assert.deepStrictEqual(errs,[],'no script errors on the way');
  console.log('lab page ok');
  set(w.applyAlg(new Cube(),['R'])); // the cube's count is off at the next connect
  await again(bridge,dev,storage);
  await chrome(storage);
}
// A second open with the cube remembered: it connects with no click, and again after the link drops.
async function again(bridge,dev,storage){
  const {w,d,errs}=await boot(bridge,{storage});
  const $=s=>d.querySelector(s),L=()=>w.eval('lab');
  assert.deepStrictEqual(errs,[]);
  assert.ok(await until(()=>!!L().conn),'the remembered cube connects by itself');
  assert.strictEqual($('#name').textContent,'GAN12uiM_A1B2');assert.ok($('#list').hidden,'the list is gone');
  assert.strictEqual($('#holdUp').value+'/'+$('#holdFront').value,'0/2','the hold is kept from last time');
  assert.ok(/looks for GAN12uiM_A1B2 by itself/.test($('#status').textContent)||/Live/.test($('#status').textContent),'the status: '+$('#status').textContent);
  assert.ok(await until(()=>/press My cube is solved/.test($('#status').textContent)),'an unsolved cube at connect gets the hint: '+$('#status').textContent);
  dev.gatt.disconnect();
  assert.ok(await until(()=>!L().conn),'the link dropped');
  assert.ok(await until(()=>!!L().conn),'the cube connects again by itself after the drop');
  assert.ok(/Connected to/.test($('#log .link').textContent),'the connect is logged again');
  assert.deepStrictEqual(errs,[]);
  console.log('lab again ok');
}
// Web Bluetooth, as Chrome: no bridge. A remembered cube among getDevices connects with no click;
// with none remembered, the chooser needs a click, so the status asks for Connect.
async function chrome(storage){
  const cube={cp:[0,1,2,3,4,5,6,7],co:Array(8).fill(0),ep:[...Array(12).keys()],eo:Array(12).fill(0)};
  const dev=fakeDevice(4,MAC,cube,{name:'GAN12uiM_A1B2',mfData:mfDataFor(MAC)});
  const bluetooth={getDevices:async()=>[dev],requestDevice:async()=>dev};
  let b=await boot(null,{bluetooth,storage});
  assert.deepStrictEqual(b.errs,[]);
  assert.ok(await until(()=>!!b.w.eval('lab').conn),'the remembered cube connects over Web Bluetooth by itself');
  assert.ok(!b.w.eval('BRIDGE'),'no bridge');
  assert.strictEqual(b.d.querySelector('#ver').textContent,'lab '+b.w.eval('LAB_VERSION'),'no app version without the bridge');
  b=await boot(null,{bluetooth,storage:fakeStorage()});
  await sleep(50);
  assert.ok(!b.w.eval('lab').conn,'nothing remembered: no connect');
  assert.ok(/Press Connect/.test(b.d.querySelector('#status').textContent),'the status asks for Connect: '+b.d.querySelector('#status').textContent);
  assert.deepStrictEqual(b.errs,[]);
  console.log('lab chrome ok');
}
(async()=>{pure();await page();process.exit(0);})().catch(e=>{console.error(e);process.exit(1);});
