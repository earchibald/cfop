// The tilt of a smart cube (js/tilt.js, js/live.js): the arithmetic first (a reset squares the
// picture to the hold; drift while still is taken out; a cube at rest near square eases to square,
// a slant on purpose stays; a real turn shows; adopt takes the nearest hold; the gestures X X' X X' and
// X' X X' X within the gap), then the page with a fake GAN cube: the Tilt chip once a reading comes,
// the picture follows the reading, the line in the smart cube sheet, L L' L L' makes the way the cube
// sits the hold, R R' R R' squares the picture to the hold even with the heading drifted, Tilt off, the
// View chip (Isometric view, Player view, the V key, cw:cubeView) and a disconnect.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/cubetab.js','js/tilt.js');
const J=code=>JSON.parse(run(`JSON.stringify(${code})`));
// ----- the arithmetic -----
run(`var Ry=d=>tiltAbout([0,1,0],d),Rx=d=>tiltAbout([1,0,0],d);
  var hold=ms=>CUBE_TAB_HOLDS.find(h=>h.moves.join(' ')===ms);
  // readings every 20 ms from a start pose, each turned a little more by step(i)
  var drive=(tr,t0,n,stepOf,from)=>{let q=from,t=t0;for(let i=0;i<n;i++){q=tiltMul(stepOf(i),q);t+=20;tr.feed(t,q);}return {q,t};};`);
const deg=c=>+run(`(${c}).toFixed(3)`);
// a reset squares the picture to the hold, at any slant of the reading
assert.ok(deg(`(()=>{const tr=tiltTracker({holds:CUBE_TAB_HOLDS});const raw=tiltMul(tiltMul(Rx(25),Ry(70)),hold('z2').q);tr.feed(0,raw);tr.reset(hold('z2').q);return tiltAngle(tr.pose(),hold('z2').q);})()`)<0.01,'a reset: the cube held yellow up, tipped 25 and turned 70: the picture shows the hold, squared');
// the correction is a heading and a small tilt, so a turn of the cube shows as the same turn after a
// reset to any hold: tip the cube toward you and the picture's top tips toward you
{const r=J(`(()=>{const tr=tiltTracker({holds:CUBE_TAB_HOLDS});const raw=tiltMul(Ry(70),hold('z2').q);tr.feed(0,raw);tr.reset(hold('z2').q);
  const p0=tr.pose();tr.feed(100,tiltMul(tiltMul(Ry(70),tiltMul(Rx(20),Ry(-70))),raw)); /* about your left-right axis, which the reading sees turned by the heading */const p1=tr.pose(),d=tiltMul(p1,tiltConj(p0));return [tiltTwist(d,[1,0,0]),tiltAngle(d,Rx(20))];})()`);
  assert.ok(Math.abs(r[0]-20)<0.5&&r[1]<0.5,'held yellow up: a tip of 20 toward you shows as 20 toward you: '+r);}
// gravity wins: the cube lies white up, the hold says yellow up; the picture shows white up
{const r=J(`(()=>{const tr=tiltTracker({holds:CUBE_TAB_HOLDS});tr.feed(0,Ry(40));tr.reset(hold('z2').q);return [tiltApply(tr.pose(),[0,1,0])[1],tr.state.level];})()`);
  assert.ok(r[0]>0.999&&r[1]===true,'the cube white up, the hold yellow up: the picture shows white up, as it is: '+r);}
assert.strictEqual(run(`tiltTracker().feed(0,[0,0,0,1])`),null,'no reset yet: no pose');
// drift while still: 3 degrees a second about the vertical for 10 s is taken out
assert.ok(deg(`(()=>{const tr=tiltTracker({holds:CUBE_TAB_HOLDS});tr.feed(0,[0,0,0,1]);tr.reset([0,0,0,1]);drive(tr,0,500,()=>Ry(0.06),[0,0,0,1]);return tiltAngle(tr.pose(),[0,0,0,1]);})()`)<0.5,'30 degrees of drift over 10 s: the picture stays square');
assert.ok(deg(`(()=>{const tr=tiltTracker();tr.feed(0,[0,0,0,1]);tr.reset([0,0,0,1]);drive(tr,0,500,()=>Ry(0.06),[0,0,0,1]);return tr.state.drift;})()`)>29,'the drift is counted');
// a real turn shows: a y turn of the cube at 450 degrees a second
assert.ok(deg(`(()=>{const tr=tiltTracker({holds:CUBE_TAB_HOLDS});tr.feed(0,[0,0,0,1]);tr.reset([0,0,0,1]);drive(tr,0,10,()=>Ry(-9),[0,0,0,1]);return tiltAngle(tr.pose(),hold('y').q);})()`)<0.5,'a quick y turn in the hands: the picture turns with it');
// square at rest: 8 degrees off square, at rest, eases back, no faster than snapDps
{const r=J(`(()=>{const tr=tiltTracker({holds:CUBE_TAB_HOLDS});tr.feed(0,[0,0,0,1]);tr.reset([0,0,0,1]);let s=drive(tr,0,4,()=>Ry(2),[0,0,0,1]);
  const a0=tiltAngle(tr.pose(),[0,0,0,1]);s=drive(tr,s.t,50,()=>[0,0,0,1],s.q);const a1=tiltAngle(tr.pose(),[0,0,0,1]);drive(tr,s.t,250,()=>[0,0,0,1],s.q);
  return [a0,a1,tiltAngle(tr.pose(),[0,0,0,1])];})()`);
  assert.ok(Math.abs(r[0]-8)<0.1,'a quick turn of 8 degrees shows: '+r[0]);
  assert.ok(r[1]>8-3*1.0-0.1,'it eases no faster than 3 degrees a second: '+r[1]);
  assert.ok(r[2]<0.1,'after a few seconds at rest the picture is square again: '+r[2]);}
// a slant on purpose stays: tipped 30 degrees toward you, at rest for 5 s
assert.ok(Math.abs(deg(`(()=>{const tr=tiltTracker({holds:CUBE_TAB_HOLDS});tr.feed(0,[0,0,0,1]);tr.reset([0,0,0,1]);const s=drive(tr,0,6,()=>Rx(5),[0,0,0,1]);drive(tr,s.t,250,()=>[0,0,0,1],s.q);return tiltAngle(tr.pose(),[0,0,0,1]);})()`)-30)<0.1,'a cube held at a slant stays at its slant');
// adopt: the nearest hold becomes the pose, squared
{const r=J(`(()=>{const tr=tiltTracker({holds:CUBE_TAB_HOLDS});tr.feed(0,[0,0,0,1]);tr.reset([0,0,0,1]);drive(tr,0,10,()=>tiltMul(Ry(-8),Rx(1.5)),[0,0,0,1]);const h=tr.adopt();return [h.moves.join(' '),tiltAngle(tr.pose(),h.q)];})()`);
  assert.strictEqual(r[0],'y','turned 80 degrees and tipped 15: the nearest hold is y');assert.ok(r[1]<0.01,'and the picture squares to it');}
// the faces toward the right and the left
assert.deepStrictEqual(J(`[tiltFaceToward([0,0,0,1],[1,0,0]),tiltFaceToward([0,0,0,1],[-1,0,0]),tiltFaceToward(hold('y').q,[1,0,0]),tiltFaceToward(hold('y').q,[-1,0,0])]`),[1,4,5,2],
  'white up, green front: R right, L left; after y: B on the right, F on the left');
// the gestures
const gest=(seq,gap=300)=>J(`(()=>{const g=tiltGesture();let t=0,out=[];for(const m of ${JSON.stringify(seq)}){t+=${gap};out.push(g.feed(t,m));}return out.filter(Boolean);})()`);
assert.deepStrictEqual(gest(['R',"R'",'R',"R'"]),['R'],"R R' R R'");
assert.deepStrictEqual(gest(['R',"R'",'R']),[],"R R' R: three turns are not enough");
assert.deepStrictEqual(gest(["L'",'L',"L'",'L']),['L'],"L' L L' L");
assert.deepStrictEqual(gest(['U','R',"R'",'R',"R'"]),['R'],'a move before it does not count');
assert.deepStrictEqual(gest(['R',"R'",'R','U',"R'"]),[],'another face starts over');
assert.deepStrictEqual(gest(['R','R','R','R']),[],'R R R R is no gesture');
assert.deepStrictEqual(gest(['R',"R'",'R','R2']),[],'a half turn starts over');
assert.deepStrictEqual(gest(['R',"R'",'R',"R'"],900),[],'too slow: no gesture');
assert.deepStrictEqual(gest(['R',"R'",'R',"R'",'R',"R'",'R',"R'"]),['R','R'],'eight turns: two gestures');
console.log('tilt: arithmetic ok');

// ----- the page -----
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');
const {fakeDevice,mfDataFor,gyroMsg}=require('./fake-gan');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
function fakeStorage(seed){const m=new Map(Object.entries(seed||{}));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),map:m};}
const MAC='AB:12:34:5C:9D:E1';
function boot(seed,bt){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
    beforeParse(w){w.matchMedia=q=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};Object.defineProperty(w,'localStorage',{value:fakeStorage(seed)});
      if(bt)Object.defineProperty(w.navigator,'bluetooth',{value:bt});}});
  const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
  return new Promise(res=>w.addEventListener('load',()=>setTimeout(()=>res({w,d:w.document,errs}),400)));
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(f,ms=2000)=>{const t=Date.now();while(!f()){if(Date.now()-t>ms)return false;await sleep(10);}return true;};
(async()=>{try{
  let dev=null;const cube={};
  const set=c=>Object.assign(cube,{cp:[...c.cp],co:[...c.co],ep:[...c.ep],eo:[...c.eo]});
  const bt={requestDevice:async()=>dev};
  const {w,d,errs}=await boot({'cw:method':'"cfop"','cw:smartAsk':'false'},bt);
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
  const click=el=>{assert.ok(el,'element to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};
  const key=k=>d.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
  const ev=s=>new w.Function('return ('+s+')')(),Cube=ev('Cube');
  const shown=el=>!el.classList.contains('hidden');
  // ----- the View chip: Isometric view and Player view, for every cube -----
  const vb=$('#viewBtn');assert.ok(vb&&shown(vb),'the View chip on the cube');
  assert.ok(/Isometric view/.test(vb.textContent)&&vb.getAttribute('aria-pressed')==='false','Isometric view by default');
  assert.deepStrictEqual([ev('view.yaw'),ev('view.pitch')],[-32,28]);
  click(vb);assert.ok(/Player view/.test(vb.textContent),'a press: Player view');
  assert.deepStrictEqual([ev('view.yaw'),ev('view.pitch')],[0,0],'straight on');assert.strictEqual(w.localStorage.getItem('cw:cubeView'),'"player"','kept');
  w.setHidden(true);assert.ok(!ev('viewMirrors()'),'Player view with no tilt: no mirrors, they sit behind the cube');assert.ok($('#hiddenBtn').classList.contains('dim'));
  key('v');assert.ok(/Isometric view/.test(vb.textContent),'V: back to Isometric view');assert.ok(ev('viewMirrors()'),'the mirrors again');w.setHidden(false);
  click($('#viewNet'));assert.ok(!shown(vb),'no View chip on the net');click($('#viewNet'));
  assert.ok(!shown($('#tiltBtn')),'no cube: no Tilt chip');
  // ----- connect -----
  const c1=w.applyAlg(new Cube(),['R','U',"F'",'L2','D','B',"R'"]);set(c1);
  dev=fakeDevice(4,MAC,cube,{mfData:mfDataFor(MAC),name:'GAN12uiM_A1B2'});
  click($('#smartBtn'));await sleep(20);click($('#smartConnect'));
  assert.ok(await until(()=>!$('#smartUse').disabled),'connected');
  click($('#smartUse'));assert.ok(await until(()=>ev('liveInStep(cubeTab.target)')),'the player shows the cube');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  const tile=(place,cb)=>$$(`#viewHold .grp[data-place="${place}"] .ht`).find(b=>b.dataset.cb===cb);
  click(tile('up','W'));
  assert.strictEqual(ev('cubeTab.hold'),null,'white up, green in front');
  assert.ok(!shown($('#tiltBtn')),'no reading yet: no Tilt chip');
  // ----- the tilt: the reading in the cube's own frame (w, x, y, z; the page's y is the cube's z) -----
  const send=q=>dev.notify(gyroMsg(4,q)),s=Math.SQRT1_2;
  const rest={w:1,x:0,y:0,z:0},turnedY={w:s,x:0,y:0,z:-s}; // a y turn: -90 degrees about the page's vertical
  new w.Function('TILT.awayMs=80;TILT.saidMs=400;')();
  send(rest);assert.ok(await until(()=>ev('liveTiltLive()')),'a reading: the picture follows the tilt');
  assert.ok(shown($('#tiltBtn'))&&$('#tiltBtn').getAttribute('aria-pressed')==='true','the Tilt chip shows, on');
  assert.ok(ev('tiltAngle(TILT.q,[0,0,0,1])')<0.01,'the first reading squares the picture to the hold');
  assert.ok(/R R' R R' squares it/.test($('#cubeWinTilt').textContent)&&shown($('#cubeWinTilt')),'the sheet names the gestures: '+$('#cubeWinTilt').textContent);
  const HOLDS=ev('CUBE_TAB_HOLDS'),holdOf=ms=>HOLDS.find(h=>h.moves.join(' ')===ms);
  for(let i=0;i<4;i++){send(turnedY);await sleep(40);}
  assert.ok(await until(()=>ev(`tiltAngle(TILT.q,CUBE_TAB_HOLDS.find(h=>h.moves.join(' ')==='y').q)`)<1),'a y turn in the hands: the picture turns with it');
  assert.ok(ev('liveTiltRot(displayedCube)'),'drawn with the tilt');
  assert.ok(await until(()=>$('#cubeWinTilt').classList.contains('away')),'the sheet says the cube sits another way');
  assert.ok(/sits with white up, red in front\. The moves read with white up, green in front/.test($('#cubeWinTilt').textContent),$('#cubeWinTilt').textContent);
  assert.strictEqual(ev('cubeTab.hold'),null,'the tilt never moves the hold by itself');
  // L L' L L': the face on your left is the cube's F now
  const mv=new Uint8Array(20);mv[0]=0x01;
  let c=c1;const turn=async m=>{c=w.applyAlg(c,[m]);set(c);dev.notify(mv);assert.ok(await until(()=>ev('cubeTab.target').equals(c),800),'the turn '+m);};
  await turn('F');await turn("F'");await turn('F');
  assert.strictEqual(ev('cubeTab.hold'),null,'three turns: no gesture yet');await turn("F'");
  assert.ok(ev('cubeTab.target').equals(c1),'the four turns cancel: the cube is as it was');
  assert.ok(await until(()=>ev('cubeTab.hold')===holdOf('y')),"L L' L L': the hold is the way the cube sits");
  assert.deepStrictEqual({...ev('PLAYER.hold')},{top:0,front:1},'the picture: white up, red in front');
  assert.ok(/^L L' L L': the moves now read with white up, red in front/.test($('#cubeWinTilt').textContent),$('#cubeWinTilt').textContent);
  assert.ok($('#cubeWinTilt').classList.contains('done'));
  assert.ok(ev(`tiltAngle(TILT.tr.pose(),CUBE_TAB_HOLDS.find(h=>h.moves.join(' ')==='y').q)`)<0.01,'squared to it');
  // R R' R R' with the heading drifted 100 degrees: the hold's right face (the cube's B) still counts
  new w.Function('TILT.tr.state.psi+=100;')();send(turnedY);await sleep(30);
  assert.ok(ev(`tiltAngle(TILT.tr.pose(),CUBE_TAB_HOLDS.find(h=>h.moves.join(' ')==='y').q)`)>90,'drifted');
  await turn('B');await turn("B'");await turn('B');await turn("B'");
  assert.ok(await until(()=>/^R R' R R': the picture is square, white up, red in front/.test($('#cubeWinTilt').textContent)),$('#cubeWinTilt').textContent);
  assert.ok(ev(`tiltAngle(TILT.tr.pose(),CUBE_TAB_HOLDS.find(h=>h.moves.join(' ')==='y').q)`)<0.01,"R R' R R': square to the hold again");
  assert.strictEqual(ev('cubeTab.hold'),holdOf('y'),'the hold stays');
  // a tile squares the picture to the new hold
  click(tile('front','G'));assert.ok(ev('tiltAngle(TILT.tr.pose(),[0,0,0,1])')<0.01,'a tile: the picture squares to white up, green in front');
  // Player view with the tilt: the mirrors show again
  click(vb);w.setHidden(true);assert.ok(ev('viewMirrors()'),'Player view with the tilt: the mirrors show');w.setHidden(false);click(vb);
  // Tilt off
  click($('#tiltBtn'));assert.ok(!ev('liveTiltLive()')&&!ev('liveTiltRot(displayedCube)'),'Tilt off: the picture stays on the hold');
  assert.strictEqual(w.localStorage.getItem('cw:smartTilt'),'false','kept');assert.ok(!shown($('#cubeWinTilt')),'no tilt line');
  send(turnedY);await sleep(30);await turn('F');await turn("F'");await turn('F');await turn("F'");
  assert.deepStrictEqual({...ev('PLAYER.hold')},{top:0,front:2},'Tilt off: no gesture');
  click($('#tiltBtn'));assert.ok(ev('liveTiltLive()'),'Tilt on again');
  // a disconnect forgets the heading
  w.smartNotify({type:'disconnect'});assert.ok(!ev('TILT.q')&&!shown($('#tiltBtn')),'disconnected: no tilt, no chip');
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('tilt: the chip, the picture, the line, L L\' L L\', R R\' R R\' with drift, a tile, Tilt off, the View chip, disconnect ok');
  process.exit(0);
}catch(e){console.error('tilt: FAIL',e);process.exit(1);}})();
