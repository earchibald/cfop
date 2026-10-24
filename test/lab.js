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
  const quatDelta=run('quatDelta'),quatMul=run('quatMul'),resetBasis=run('resetBasis'),quatMat=run('quatMat'),smackDetector=run('smackDetector'),turnDetector=run('turnDetector'),turnName=run('turnName'),twistDetector=run('twistDetector'),quatSlerp=run('quatSlerp');
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
  // whole-cube turns: start past 15 degrees from rest, an update every 250 ms, finish after 300 ms still
  assert.strictEqual(turnName([-1,0,0],90),'x');assert.strictEqual(turnName([0,0.9,0.1],80),"y'");assert.strictEqual(turnName([0,0,-1],170),'z2','the name from the axis');
  const td=turnDetector({}),tev=[],tf=(t,q)=>{tev.push(...td.feed(t,q));};
  for(let t=0;t<=300;t+=50)tf(t,I);
  assert.strictEqual(tev.length,0,'still: nothing');assert.ok(!td.state.turning);
  const X=[-Math.SQRT1_2,0,0,Math.SQRT1_2]; // the whole cube turned x
  for(let i=1;i<=10;i++)tf(300+i*50,quatSlerp(I,X,i/10));
  assert.strictEqual(tev[0].type,'tstart','the turn starts: '+JSON.stringify(tev));assert.strictEqual(tev[0].name,'x');assert.ok(tev[0].deg>15&&tev[0].deg<30,'past start: '+tev[0].deg);
  assert.ok(tev.filter(e=>e.type==='tupdate').length>=1,'updates on the way');assert.ok(td.state.turning);
  for(let t=850;t<=1200;t+=50)tf(t,X);
  const fin=tev.filter(e=>e.type==='tfinish');assert.strictEqual(fin.length,1,'one finish: '+JSON.stringify(tev.map(e=>e.type)));
  assert.strictEqual(fin[0].name,'x');assert.ok(Math.abs(fin[0].deg-90)<1,'a quarter turn (the rest pose followed the first degrees): '+fin[0].deg);assert.ok(fin[0].ms>=300,'with its length');assert.ok(!td.state.turning);
  tev.length=0;for(let t=1250;t<=2000;t+=50)tf(t,X);assert.strictEqual(tev.length,0,'at rest again: nothing');
  const wob=quatMul(turn([0,1,0],8),X);tf(2050,wob);tf(2100,X);tf(2150,X);assert.strictEqual(tev.length,0,'a wobble under start is nothing');
  tf(2200,quatMul(turn([0,1,0],25),X));tf(2250,quatMul(turn([0,1,0],25),X));for(let t=2300;t<=2700;t+=50)tf(t,X);
  assert.deepStrictEqual(tev.map(e=>e.type),['tstart','tupdate','tfinish'],'a turn that comes back: start, update, finish: '+JSON.stringify(tev.map(e=>e.type)));assert.ok(tev[2].deg<2,'back at rest: '+tev[2].deg);
  // six twists of one face: quarter turns, each undone by the next; anything else starts the count over
  const tw=twistDetector({}),twf=ms=>ms.split(' ').map(m=>tw.feed(m));
  assert.deepStrictEqual(twf("R R' R R' R R'"),[false,false,false,false,false,true],'R R\' three times over is a hit');
  assert.strictEqual(tw.state.moves.length,0,'and the count starts over');
  assert.deepStrictEqual(twf("U' U U' U U' U"),[false,false,false,false,false,true],'either direction first');
  assert.deepStrictEqual(twf("R R' R R' R R R' R R' R R'"),[false,false,false,false,false,false,false,false,false,false,true],'the same turn twice starts over');
  assert.deepStrictEqual(twf("R R' R R' R2 R R' R R' R R'"),[false,false,false,false,false,false,false,false,false,false,true],'a half turn starts over');
  assert.deepStrictEqual(twf("R R' R U U' U U' U U'"),[false,false,false,false,false,false,false,false,true],'another face starts over');
  assert.deepStrictEqual(twf("R R' R R' R x R' R R' R R' R"),[false,false,false,false,false,false,false,false,false,false,false,true],'a whole-cube turn starts over');
  // crossSolutions (js/engine.js): every solution of the D cross up to a length, each counted once,
  // against a brute force with the same rules (no face twice, commuting moves in one order, no move
  // that leaves the cross as it was, stop where the cross is solved)
  const eng=require('./vm-load')('js/engine.js');
  const brute=eng(`(()=>{function solved(c){for(let e=4;e<8;e++)if(c.ep[e]!==e||c.eo[e]!==0)return false;return true;}
    return function(cube,maxLen){const by={};function rec(c,left,path,lf,la){if(path.length&&solved(c)){(by[path.length]||(by[path.length]=[])).push(path.join(' '));return;}if(!left)return;
      for(let i=0;i<18;i++){const m=FACE_MOVES[i],f=m[0];if(f===lf)continue;const ax=axisOf(m);if(ax===la&&'DLB'.includes(f))continue;const n=c.mul(MOVE_LIST[i]);if(crossIndex(n)===crossIndex(c))continue;path.push(m);rec(n,left-1,path,f,ax);path.pop();}}
      rec(cube,maxLen,[],'',-1);return by;};})()`);
  const cs=eng('crossSolutions'),mk=eng('m=>applyAlg(new Cube(),parseAlg(m))'),counts=by=>Object.fromEntries(Object.entries(by).map(([k,v])=>[k,v.length])),all=by=>Object.values(by).flat().sort();
  for(const m of ['F R','R D L2',"F' D R U B",'L2 B D F']){const a=brute(mk(m),5),b=cs(mk(m),5);
    assert.deepStrictEqual(counts(b.byLen),counts(a),'the count by length for '+m+': '+JSON.stringify(counts(b.byLen)));assert.deepStrictEqual(all(b.byLen),all(a),'and the same solutions');
    assert.strictEqual(b.optimal,Math.min(...Object.keys(a).map(Number)),'the shortest length');}
  assert.strictEqual(JSON.stringify(cs(eng('new Cube()'),7)),'{"optimal":0,"byLen":{}}','a solved cross: nothing to count');
  assert.strictEqual(JSON.stringify(cs(mk('R L'),2).byLen),'{"2":["L\' R\'"]}','L\' R\' and R\' L\' are one solution');
  assert.deepStrictEqual(counts(cs(mk('F'),2).byLen),{1:1},'U F\' is no second solution: a U turn leaves the cross as it was');
  const big=cs(mk(eng('randomMoveScramble("granite-wren-41",22).join(" ")')),7);assert.ok(big.optimal>=4&&big.optimal<=8,'a real scramble: '+big.optimal);assert.ok(Object.keys(big.byLen).every(k=>+k>=big.optimal&&+k<=7),'lengths from the shortest to 7');
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
  // the camera: straight on by default, so one face shows; the Isometric box (I) shows three, and is kept
  const flat=$$('#cube polygon').length;assert.ok(!L().iso&&!$('#iso').checked,'straight on by default');
  key('i');assert.ok(L().iso&&$('#iso').checked,'I turns Isometric on');assert.ok($$('#cube polygon').length>flat,'three faces show: '+flat+' -> '+$$('#cube polygon').length);
  assert.strictEqual(w.localStorage.getItem('cw:labIso'),'1','Isometric is kept');
  $('#iso').checked=false;$('#iso').dispatchEvent(new w.Event('change',{bubbles:true}));assert.ok(!L().iso,'the box turns it off');assert.strictEqual($$('#cube polygon').length,flat,'one face again');
  // a drag on the picture spins the view: half a degree per pixel, pitch within 80 degrees; a double click puts it back
  {const PE=w.PointerEvent||w.MouseEvent,pev=(t,x,y,extra={})=>new PE(t,Object.assign({bubbles:true,cancelable:true,clientX:x,clientY:y,pointerId:1,button:0},extra));
    const cube=$('#cube');cube.dispatchEvent(pev('pointerdown',100,100));assert.ok(L().drag&&w.document.body.classList.contains('cube-drag'),'the drag starts');
    cube.dispatchEvent(pev('pointermove',160,120));assert.strictEqual(JSON.stringify(L().view),'{"yaw":30,"pitch":10}','the view follows the pointer: '+JSON.stringify(L().view));
    assert.ok($$('#cube polygon').length>flat,'more faces show once the view turns');
    cube.dispatchEvent(pev('pointerup',160,120));assert.ok(!L().drag&&!w.document.body.classList.contains('cube-drag'),'the drag ends');
    cube.dispatchEvent(pev('pointermove',0,0));assert.strictEqual(JSON.stringify(L().view),'{"yaw":30,"pitch":10}','no drag, no change');
    cube.dispatchEvent(pev('pointerdown',100,100,{button:2}));assert.ok(!L().drag,'a right button starts no drag');
    cube.dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));assert.strictEqual(JSON.stringify(L().view),'{"yaw":0,"pitch":0}','a double click puts the view back');assert.strictEqual($$('#cube polygon').length,flat,'one face again after the double click');
    cube.dispatchEvent(pev('pointerdown',100,100));cube.dispatchEvent(pev('pointermove',100,400));cube.dispatchEvent(pev('pointerup',100,400));assert.strictEqual(L().view.pitch,150,'the offset is kept as dragged');
    key('i');assert.strictEqual(JSON.stringify(L().view),'{"yaw":0,"pitch":0}','the Isometric box puts the view back');key('i');assert.ok(!L().iso,'off again');}
  // Hidden faces (H): the faces turned away, as in a mirror behind the cube, one setting with the site's (cw:hidden)
  {assert.ok(!L().hidden&&!$('#hiddenFaces').checked,'off by default');key('i');const iso=$$('#cube polygon').length;
    key('h');assert.ok(L().hidden&&$('#hiddenFaces').checked,'H turns Hidden faces on');assert.strictEqual(w.localStorage.getItem('cw:hidden'),'true','kept as the site keeps it');
    assert.strictEqual($$('#cube polygon').length-iso,27,'three hidden faces show: '+iso+' -> '+$$('#cube polygon').length);
    assert.ok($$('#cube polygon').slice(0,27).every(p=>p.getAttribute('opacity')==='0.6'),'drawn first, faded, behind the cube');
    $('#hiddenFaces').checked=false;$('#hiddenFaces').dispatchEvent(new w.Event('change',{bubbles:true}));assert.ok(!L().hidden,'the box turns it off');
    assert.strictEqual(w.localStorage.getItem('cw:hidden'),'false');assert.strictEqual($$('#cube polygon').length,iso,'no hidden faces');key('i');}
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
  assert.ok(await until(()=>!$('#batt').hidden&&$('#batt').textContent==='77%'),'the bar shows the charge: '+$('#batt').textContent);
  assert.ok($$('#log div').some(x=>/Charge 77%/.test(x.textContent)),'the log notes the charge');
  // the address in the bar, with a copy button: the clipboard gets it and the icon turns to a check
  assert.ok(!$('#macShow').hidden,'the address shows');assert.strictEqual($('#macText').textContent,MAC,'the MAC address of the cube');
  let copied=null;Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async t=>{copied=t;}},configurable:true});
  click($('#macCopy'));assert.ok(await until(()=>copied===MAC),'the address is copied');
  assert.ok(await until(()=>$('#macCopy').classList.contains('copied')),'the button says Copied');assert.strictEqual($('#macCopy').title,'Copied');assert.strictEqual($('#macCopy').getAttribute('aria-label'),'Copied');
  assert.ok(await until(()=>!$('#macCopy').classList.contains('copied'),2500),'and goes back after a moment');assert.strictEqual($('#macCopy').title,'Copy the MAC address');
  assert.ok(/Copied the MAC address AB:12:34:5C:9D:E1/.test($('#log .link').textContent||$$('#log .link').map(e=>e.textContent).join()),'the copy is logged');
  assert.ok(L().shown&&L().shown.isSolved(),'the solved cube came through');assert.ok(!$('#solved').disabled,'My cube is solved is on');
  // Copy state: the state as 54 letters to the clipboard, the button says Copied for a moment, the log keeps it
  assert.ok(!$('#copyState').disabled,'Copy state is on once the lab has a state');
  copied=null;click($('#copyState'));
  assert.ok(await until(()=>copied==='WWWWWWWWW RRRRRRRRR GGGGGGGGG YYYYYYYYY OOOOOOOOO BBBBBBBBB'),'the state is copied as letters: '+copied);
  assert.strictEqual(copied,w.stateText(L().target),'the same text stateText writes');
  assert.ok(await until(()=>$('#copyState').textContent==='Copied'&&$('#copyState').classList.contains('copied')),'the button says Copied');
  assert.ok(await until(()=>$('#copyState').textContent==='Copy state',2500),'and goes back after a moment');
  assert.ok($$('#log .link').some(e=>/Copied the state WWWWWWWWW RRRRRRRRR GGGGGGGGG YYYYYYYYY OOOOOOOOO BBBBBBBBB \(solved\)/.test(e.textContent)),'the copy is logged');
  assert.ok(!/My cube is solved/.test($('#status').textContent),'a solved cube gets no hint: '+$('#status').textContent);
  assert.ok(/State read: WWWWWWWWW RRRRRRRRR GGGGGGGGG YYYYYYYYY OOOOOOOOO BBBBBBBBB \(solved\)/.test($('#log .state').textContent),'the state read is logged as letters: '+$('#log').textContent);
  // a turn: the move message asks for the state, the state turns the layer
  const c1=w.applyAlg(new Cube(),['R']);set(c1);
  dev.notify(Uint8Array.from([0x01,...Array(19).fill(0)])); // a gen 4 move message
  assert.ok(await until(()=>L().target&&L().target.equals(c1)),'the picture heads for the cube after R');
  assert.ok(await until(()=>!L().anim&&L().shown.equals(c1)),'the layer turned');
  assert.strictEqual(L().moves.join(),'R','the move is on the list');assert.strictEqual($('#moves .mv').textContent,'R');
  assert.ok($('#moves .mv').classList.contains('head'),'the one move is the head');
  // the box of its own: the count in the head, Clear moves, the triangle past ten moves
  assert.ok($('#movesBox')&&$('#movesBox').contains($('#moves'))&&$('#movesBox').contains($('#movesClear')),'the moves sit in a box with Clear moves');
  assert.strictEqual($('#movesCount').textContent,'1 move','the head counts the moves');assert.ok(!$('#movesClear').disabled,'Clear moves is on');
  let cN=c1;const faces=['U','F','L','D','B','R'];
  for(let i=0;i<10;i++){cN=w.applyAlg(cN,[faces[i%6]]);set(cN);dev.notify(Uint8Array.from([0x01,...Array(19).fill(0)]));
    assert.ok(await until(()=>L().target&&L().target.equals(cN)),'move '+(i+2)+' is heard');}
  assert.ok(await until(()=>L().moves.length===11),'eleven moves: '+L().moves.join(' '));
  assert.strictEqual($$('#moves .mv').length,10,'the last ten show');assert.strictEqual($$('#moves .mv.head').length,1,'one head move');assert.ok($$('#moves .mv')[9].classList.contains('head')&&$$('#moves .mv')[9].title==='Your last move','the newest move is the head');assert.strictEqual($$('#moves .mv')[0].textContent,'U','the first move fell off the readout');
  assert.ok($('#moves .more'),'the triangle says there are more');assert.strictEqual($('#moves .more').getAttribute('aria-label'),'1 more');assert.strictEqual($('#moves .more').title,'11 moves in all');
  assert.strictEqual($('#movesCount').textContent,'11 moves');
  // Clear last (Shift+C): the last move alone comes off; the button does the same; the log stays
  const logBefore=$('#log').children.length,tenth=L().moves[9];
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'C',shiftKey:true,bubbles:true,cancelable:true}));
  assert.strictEqual(L().moves.length,10,'Shift+C takes the last move off: '+L().moves.join(' '));assert.strictEqual(L().moves[9],tenth,'the rest stays');
  assert.strictEqual($$('#moves .mv').length,10);assert.ok(!$('#moves .more'),'no triangle at ten');assert.strictEqual($('#movesCount').textContent,'10 moves');
  assert.ok($('#movesLast').textContent.startsWith('Clear last'),'the button: '+$('#movesLast').textContent);assert.ok(!$('#movesLast').disabled);
  click($('#movesLast'));assert.strictEqual(L().moves.length,9,'the button takes one more off');
  assert.strictEqual($('#log').children.length,logBefore,'Clear last leaves the log alone');
  click($('#movesClear'));
  assert.strictEqual(L().moves.length,0,'Clear moves empties the list');assert.strictEqual($('#moves .none').textContent,'No moves yet');assert.ok(!$('#moves .more'),'and the triangle');
  assert.strictEqual($('#movesCount').textContent,'','no count with no moves');assert.ok($('#movesClear').disabled,'Clear moves is off again');assert.ok($('#movesLast').disabled,'and Clear last');
  assert.strictEqual($('#log').children.length,logBefore,'Clear moves leaves the log alone');
  cN=w.applyAlg(cN,['R']);set(cN);dev.notify(Uint8Array.from([0x01,...Array(19).fill(0)]));
  assert.ok(await until(()=>L().moves.join()==='R'),'the list fills again after Clear moves');
  // experiment 3: six twists of one face (that R, then R' R R' R R') do Reset cube after the wait
  assert.ok($('#twistOn').checked,'Reset with twists is on');assert.strictEqual($('#twistMs').value,'45','the wait is 45 ms');assert.strictEqual(L().twistMs,45);
  const resets=$$('#log .reset').length;
  for(const m of ["R'",'R',"R'",'R',"R'"]){cN=w.applyAlg(cN,[m]);set(cN);dev.notify(Uint8Array.from([0x01,...Array(19).fill(0)]));assert.ok(await until(()=>L().target&&L().target.equals(cN)),'twist '+m+' is heard');}
  assert.strictEqual(L().moves.length,0,'the twists undo each other on the list: '+L().moves.join(' '));
  assert.ok($('#log .twist')&&/^\S+ R turned and turned back six times: Reset cube in 45 ms$/.test($('#log .twist').textContent),'the gesture is logged: '+$('#log').textContent);
  assert.strictEqual($$('#log .reset').length,resets,'the reset waits');
  assert.ok(await until(()=>$$('#log .reset').length===resets+1,500),'Reset cube follows the wait: '+$('#log').textContent);
  $('#twistMs').value='200';$('#twistMs').dispatchEvent(new w.Event('input',{bubbles:true}));assert.strictEqual(L().twistMs,200,'the knob sets the wait');assert.strictEqual($('#twistMs').parentNode.querySelector('output').value,'200');
  $('#twistOn').checked=false;
  for(const m of ['U',"U'",'U',"U'",'U',"U'"]){cN=w.applyAlg(cN,[m]);set(cN);dev.notify(Uint8Array.from([0x01,...Array(19).fill(0)]));assert.ok(await until(()=>L().target&&L().target.equals(cN)),'twist '+m+' is heard');}
  await sleep(250);assert.strictEqual($$('#log .twist').length,1,'off: six twists are nothing');assert.strictEqual($$('#log .reset').length,resets+1);
  $('#twistOn').checked=true;
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
  // patterns: a two-look case the cube shows goes in the Patterns window, newest first, with its moves as held
  assert.ok($('#pat').hidden,'the Patterns window starts closed');assert.strictEqual(L().pats.length,0);assert.ok($('#patList .none'),'and empty');
  const ALG_DB=w.eval('ALG_DB'),inv=a=>w.invertAlg(w.parseAlg(a)),show=async c=>{set(c);dev.notify(Uint8Array.from([0x01,...Array(19).fill(0)]));assert.ok(await until(()=>L().target&&L().target.equals(c)),'the state is heard');};
  let pc=w.applyAlg(new Cube(),inv(ALG_DB.co[0].alg));await show(pc);
  assert.strictEqual(L().pats.length,1,'the case is listed');assert.strictEqual(L().pats[0].step,'OLL corners');assert.strictEqual(L().pats[0].name,'Sune');assert.strictEqual(L().pats[0].moves,"R U R' U R U2 R'",'with the moves: '+L().pats[0].moves);
  key('p');assert.ok(!$('#pat').hidden,'P opens the window');assert.strictEqual($('#patBtn').getAttribute('aria-pressed'),'true');
  assert.strictEqual($$('#patList .ent').length,1);assert.ok(/^\d\d:\d\d:\d\dOLL cornersSuneR U R' U R U2 R'Reveal 6 more moves$/.test($('#patList .ent').textContent),'the entry: '+$('#patList .ent').textContent);
  assert.strictEqual($('#patCount').textContent,'1 pattern');
  // the moves show their first move only: a cover on each move after it; a click reveals the next, Reveal the rest, a click on an open line covers again
  let sp=$('#patList .ent code .spoil');assert.ok(sp,'the moves are a covered line');assert.strictEqual(sp.querySelectorAll('.sp-m').length,6,'six moves covered after the first');assert.strictEqual(sp.querySelectorAll('.sp-m.on').length,0,'all covered');assert.ok(!sp.classList.contains('open'));
  assert.strictEqual(sp.firstChild.textContent,'R','the first move shows');assert.strictEqual(sp.querySelector('.sp-btn').textContent,'Reveal 6 more moves');
  click(sp.querySelector('.sp-m'));assert.strictEqual(sp.querySelectorAll('.sp-m.on').length,1,'a click reveals one');assert.strictEqual(sp.querySelector('.sp-m.on').textContent,'U','the next move');assert.strictEqual(sp.querySelector('.sp-btn').textContent,'Reveal 5 more moves');
  click(sp);assert.strictEqual(sp.querySelectorAll('.sp-m.on').length,2,'and the next');
  click(sp.querySelector('.sp-btn'));assert.strictEqual(sp.querySelectorAll('.sp-m:not(.on)').length,0,'Reveal uncovers the rest');assert.ok(sp.classList.contains('open'),'the line is open');
  click(sp);assert.strictEqual(sp.querySelectorAll('.sp-m.on').length,0,'a click on an open line covers it again');assert.ok(!sp.classList.contains('open'));
  click(sp);click(sp);assert.strictEqual(sp.querySelectorAll('.sp-m.on').length,2,'two revealed');
  // the window moves: a drag of its head, kept for the next open; a button in the head is no drag
  const PE=w.PointerEvent||w.MouseEvent,pev=(t,x,y,extra={})=>new PE(t,Object.assign({bubbles:true,cancelable:true,clientX:x,clientY:y,pointerId:1,button:0},extra));
  const head=$('#pat .head');assert.strictEqual(head.title,'Drag to move the window');
  head.dispatchEvent(pev('pointerdown',40,80));assert.ok($('#pat').classList.contains('drag'),'the drag starts');
  head.dispatchEvent(pev('pointermove',140,230));assert.strictEqual(JSON.stringify(L().patPos),'{"x":100,"y":150}','the window follows the pointer: '+JSON.stringify(L().patPos));
  assert.strictEqual($('#pat').style.left,'100px');assert.strictEqual($('#pat').style.top,'150px');
  head.dispatchEvent(pev('pointerup',140,230));assert.ok(!$('#pat').classList.contains('drag'),'the drag ends');
  assert.deepStrictEqual(JSON.parse(storage.getItem('cw:labPat')),{x:100,y:150},'the place is kept');
  head.dispatchEvent(pev('pointerdown',140,230));head.dispatchEvent(pev('pointermove',-500,5000));assert.strictEqual(JSON.stringify(L().patPos),JSON.stringify({x:8,y:w.innerHeight-48}),'clamped to the screen: '+JSON.stringify(L().patPos));head.dispatchEvent(pev('pointerup',-500,5000));
  $('#patClose').dispatchEvent(pev('pointerdown',150,160));assert.ok(!$('#pat').classList.contains('drag'),'a button in the head starts no drag');
  pc=w.applyAlg(pc,['U']);await show(pc);assert.strictEqual(L().pats.length,1,'a U turn is the same case: no new entry');
  pc=w.applyAlg(pc,["U'",...w.parseAlg(ALG_DB.co[0].alg)]);assert.ok(pc.isSolved());await show(pc);assert.strictEqual(L().pats.length,1,'solved: nothing listed');
  await show(w.applyAlg(new Cube(),inv(ALG_DB.co[0].alg)));assert.strictEqual(L().pats.length,2,'the same case after a solve is found again');
  await show(w.applyAlg(new Cube(),inv(ALG_DB.ep[0].alg)));assert.strictEqual(L().pats.length,3,'a PLL case');
  sp=$$('#patList .ent')[2].querySelector('code .spoil');assert.strictEqual(sp.querySelectorAll('.sp-m.on').length,2,'the redraw keeps what was revealed on the Sune line');
  assert.strictEqual($$('#patList .ent')[0].querySelectorAll('.sp-m.on').length,0,'the new entry is covered');
  assert.strictEqual(L().pats[0].step,'PLL edges');assert.strictEqual(L().pats[0].name,'Ua perm');assert.strictEqual($$('#patList .ent')[0].querySelector('.name').textContent,'Ua perm','newest first');
  assert.strictEqual(JSON.parse(storage.getItem('cw:labPatterns')).length,3,'the list is kept');
  key('Escape');assert.ok($('#pat').hidden,'Esc closes the window');key('p');assert.ok(!$('#pat').hidden);key('p');assert.ok($('#pat').hidden,'P closes it too');
  click($('#patBtn'));assert.ok(!$('#pat').hidden,'the button opens it');click($('#patClose'));assert.ok($('#pat').hidden,'Close closes it');
  await show(new Cube());click($('#patClear'));assert.strictEqual(L().pats.length,0,'Clear empties the list');
  // New scramble (N): no moves are made. The cube in the hands is the scramble: the entry holds the cross on the
  // bottom as held (white up, so yellow), its shortest length, the count by length up to 7 and the shortest
  // solutions; the matcher starts over with that cross as its goal and lists it, with the moves, when it is made
  const scr=w.parseAlg("R U F' D L2 B U' R2 F D' L U2 B' R F2 U D' L' B2 R' U F"),sc0=w.applyAlg(new Cube(),scr);await show(sc0);
  assert.strictEqual(L().pats.length,0,'a scramble is no pattern');
  const sc1=w.applyAlg(sc0,['R']);await show(sc1);const at=L().moves.length;assert.strictEqual(L().moves[at-1],'R','the turn is on the list');
  click($('#patNew'));assert.ok(!$('#pat').hidden,'New scramble opens the window');
  assert.strictEqual(L().pats.length,1,'the scramble is an entry');const sc=L().pats[0];assert.strictEqual(sc.step,'Scramble');assert.strictEqual(sc.name,'Cross first');assert.strictEqual(sc.moves,'','no moves are made');
  assert.ok(L().target.equals(sc1),'the cube is as it was');assert.strictEqual(L().moves.length,at,'and so is the list');
  const cr=w.crossSolutions(sc1,7);assert.ok(cr.optimal>0,'the cross is to make');assert.strictEqual(sc.cross.optimal,cr.optimal,'the shortest length');assert.strictEqual(sc.cross.color,'yellow','the cross on the bottom as held: white up, so yellow');
  const want=[];for(let n=cr.optimal;n<=7;n++)want.push(n+' moves: '+(cr.byLen[n]||[]).length);assert.strictEqual(sc.cross.counts,want.join(' · '),'the count by length: '+sc.cross.counts);
  assert.deepStrictEqual(sc.cross.sols,cr.byLen[cr.optimal],'the shortest solutions');
  assert.strictEqual(JSON.stringify(L().goal),JSON.stringify({color:'yellow',optimal:cr.optimal,at}),'the cross is the goal');
  const ent=$$('#patList .ent')[0];assert.strictEqual(ent.querySelector('.name').textContent,'Cross first');assert.ok(!ent.querySelector(':scope > code'),'no scramble moves to show');
  assert.ok(ent.querySelector('.data').textContent.startsWith('Yellow cross: shortest '+cr.optimal),'the data line: '+ent.querySelector('.data').textContent);
  assert.deepStrictEqual([...ent.querySelectorAll('.data .len')].map(x=>x.textContent),want,'one count per line');
  // up to three of the shortest, one per line, each with its first move shown and the rest covered; the count of the others
  const best=cr.byLen[cr.optimal],lines=[...ent.querySelectorAll('.sols code')];assert.strictEqual(lines.length,Math.min(3,best.length),'up to three lines: '+lines.length);
  lines.forEach((l,i)=>{const s=l.querySelector('.spoil'),t=best[i].split(' ');assert.strictEqual(s.firstChild.textContent,t[0],'line '+i+' shows its first move');
    assert.deepStrictEqual([...s.querySelectorAll('.sp-m')].map(x=>x.textContent),t.slice(1),'and covers the rest: '+best[i]);assert.strictEqual(s.querySelectorAll('.sp-m.on').length,0);});
  const more=ent.querySelector('.sols .more');if(best.length>3)assert.strictEqual(more.textContent,'+'+(best.length-3)+' more','the others are counted');else assert.ok(!more,'no note when all show');
  click(lines[0].querySelector('.spoil'));assert.strictEqual(lines[0].querySelectorAll('.sp-m.on').length,1,'a click on a solution reveals its next move');assert.strictEqual(lines[lines.length-1].querySelectorAll('.sp-m.on').length,lines.length>1?0:1,'the other lines are as they were');
  assert.ok(/^\S+ New scramble, as held white up, green toward you\. yellow cross: shortest \d; \d moves: \d+/.test($('#log .scramble').textContent),'logged: '+$('#log .scramble').textContent);
  // the first move after it is not merged into the one before: R then R reads R R, not R2
  await show(w.applyAlg(sc1,['R']));assert.strictEqual(L().moves.slice(at-1).join(' '),'R R','the boundary holds: '+L().moves.slice(at-1));
  await show(sc1);assert.strictEqual(L().moves.length,at,'back: the R\' merges away');assert.strictEqual(L().pats.length,1,'the cross is not made yet');assert.ok(L().goal,'the goal stands');
  // the cross made: a Cross entry with the moves it took, and the goal is spent
  const sol=w.parseAlg(cr.byLen[cr.optimal][0]);let c=sc1;for(let i=0;i<sol.length;i+=3){c=w.applyAlg(c,sol.slice(i,i+3));await show(c);}
  assert.strictEqual(L().pats.length,2,'the cross is an entry');assert.strictEqual(L().pats[0].step,'Cross');assert.strictEqual(L().pats[0].name,sol.length+' moves');assert.strictEqual(L().pats[0].moves,sol.join(' '),'the moves it took: '+L().pats[0].moves);
  assert.strictEqual(L().goal,null,'the goal is spent');assert.ok(/^\S+ Cross: yellow in \d moves \(shortest \d\): /.test($('#log .cross').textContent),'logged: '+$('#log .cross').textContent);
  await show(w.applyAlg(c,['U']));assert.strictEqual(L().pats.length,2,'a move after it adds nothing');
  // N with the cross made: the entry says so, and there is no goal
  key('Escape');key('n');assert.ok(!$('#pat').hidden,'N opens the window');assert.strictEqual(L().pats.length,3,'another entry');assert.strictEqual(L().pats[0].name,'Cross made');assert.strictEqual(L().pats[0].cross.counts,'already made');assert.strictEqual(L().goal,null,'no goal');
  assert.ok(/Yellow cross: already made$/.test($$('#patList .ent')[0].querySelector('.data').textContent),'the data line: '+$$('#patList .ent')[0].querySelector('.data').textContent);
  assert.strictEqual(JSON.parse(storage.getItem('cw:labPatterns')).length,3,'kept');
  click($('#patClear'));assert.strictEqual(L().pats.length,0,'Clear empties the list');assert.ok($('#patList .none'));assert.strictEqual(storage.getItem('cw:labPatterns'),'[]');
  // the F2L guide (F): before the cross, the cross line alone with one shortest cross covered; with the cross, the
  // chips, the step card with the hint covered after its first move, Then, and the solved pairs; a turn along the hint
  // marks the move made, a turn off a begun hint keeps it with the way back and New hint from here; a chip click, the mode and the
  // order arrows change the target; combinations; Esc closes the window in front; New scramble starts it over
  {const SL=w.eval('SLOTS'),F=L().f2l,step=()=>L().f2l.step,ready=()=>until(()=>{const s=L().f2l.step;return !L().f2l.working&&!!s&&s.moves.length>0;},4000);
    const spoilMoves=sp=>[sp.firstChild.textContent,...[...sp.querySelectorAll('.sp-m')].map(x=>x.textContent)].join(' ').trim().split(/\s+/);
    // a hint line as a drill: every move in the text, the moves made dim (.f2l-did), the first in clear (.f2l-first) until
    // it is made, every other move covered (.sp-m) until it is made
    const hintMoves=h=>h.textContent.trim().split(/\s+/),hintShape=h=>({did:[...h.querySelectorAll('.f2l-did')].map(x=>x.textContent),clear:[...h.querySelectorAll('.f2l-first')].map(x=>x.textContent),covered:h.querySelectorAll('.sp-m').length});
    click($('#patClose'));assert.ok($('#f2l').hidden&&!F.open,'the F2L guide starts closed');assert.strictEqual($('#f2lBtn').textContent,'F2L guideF','the button names its key');
    await show(sc1);
    key('f');assert.ok(!$('#f2l').hidden&&L().f2l.open,'F opens the guide');assert.strictEqual($('#f2lBtn').getAttribute('aria-pressed'),'true');
    assert.ok(/^Make the yellow cross first\. Shortest: \d moves?\./.test($('#f2lCross').textContent),'the cross line: '+$('#f2lCross').textContent);
    let cs=$('#f2lCross .hint');assert.ok(cs,'one shortest cross, as a drill');const cm=hintMoves(cs);
    assert.deepStrictEqual(hintShape(cs),{did:[],clear:[cm[0]],covered:cm.length-1},'its first move in clear, the rest covered');
    assert.ok(w.crossSolved(w.applyAlg(sc1,cm)),'the line makes the cross');assert.strictEqual(cs.querySelector('.sp-btn'),null,'no Reveal');
    assert.ok($('#f2lMain').hidden,'nothing below it before the cross');assert.strictEqual($('#f2lCount').textContent,'');
    // a click uncovers nothing
    click(cs);click(cs.querySelector('.sp-m'));assert.deepStrictEqual(hintShape($('#f2lCross .hint')),{did:[],clear:[cm[0]],covered:cm.length-1},'a click uncovers nothing');
    // the first move made: it turns dim, and the next stays covered; a wrong move: nothing more shows, the line says how far
    // off and the way back; back on it, and back at its start, the line is as it was
    {const c0=L().f2l.cross;assert.deepStrictEqual([...c0.moves],cm);let cur=w.applyAlg(sc1,[cm[0]]);await show(cur);
      assert.strictEqual(L().f2l.cross,c0,'the cross hint stays');assert.strictEqual(c0.n,1);
      assert.deepStrictEqual(hintShape($('#f2lCross .hint')),{did:[cm[0]],clear:[],covered:cm.length-1},'the move made is dim, the next is still covered');
      assert.ok(/^Make the yellow cross first\. Shortest: \d moves?, 1 made\./.test($('#f2lCross').textContent),'the count: '+$('#f2lCross').textContent);
      // a wrong move: one that puts the cube on no shortest cross, by the guide's own tests (a quarter of a half turn, or
      // another shortest cross, counts as on one)
      const onHint=c=>{const X=w.reframe(w.eval('labHeld')(c));return w.f2lDone(c0.base,c0.moves,X)>=0||w.f2lPart(c0.base,c0.moves,X)>=0||!!w.f2lAlong(c0.base,c0.moves,c0.sols,X);};
      const wrong=['U','R','F','D','L','B',"U'","R'","F'","D'","L'","B'"].find(m=>!onHint(w.applyAlg(cur,[m])));assert.ok(wrong,'a move off every shortest cross');
      cur=w.applyAlg(cur,[wrong]);await show(cur);await sleep(300);
      assert.strictEqual(L().f2l.cross,c0,'a wrong move keeps the hint');assert.ok(c0.away,'away');assert.strictEqual(c0.n,1);
      assert.deepStrictEqual(hintShape($('#f2lCross .hint')),{did:[cm[0]],clear:[],covered:cm.length-1},'nothing more shows');
      assert.strictEqual($('#f2lCross .off b').textContent,'Off the hint by 1 move.');assert.strictEqual($('#f2lCross .off code').textContent,w.invertAlg([wrong]),'the way back');
      assert.strictEqual($('#f2lCross [data-renew]').textContent,'New hint from here');
      cur=w.applyAlg(sc1,[cm[0]]);await show(cur);assert.strictEqual(L().f2l.cross,c0);assert.ok(!c0.away,'on the hint again');assert.strictEqual($('#f2lCross .off'),null);
      // the second move made: it shows too
      if(cm.length>2){cur=w.applyAlg(cur,[cm[1]]);await show(cur);assert.strictEqual(c0.n,2);assert.deepStrictEqual(hintShape($('#f2lCross .hint')),{did:cm.slice(0,2),clear:[],covered:cm.length-2},'the second move made shows');
        cur=w.applyAlg(sc1,[cm[0]]);await show(cur);}
      // off again, New hint from here: a new cross hint from the cube as it is
      cur=w.applyAlg(cur,[wrong]);await show(cur);await sleep(300);assert.ok(c0.away);click($('#f2lCross [data-renew]'));
      const c1=L().f2l.cross;assert.notStrictEqual(c1,c0,'a new cross hint');assert.ok(c1.base.equals(w.reframe(w.eval('labHeld')(cur))),'from the cube as it is');assert.strictEqual(c1.n,0);
      assert.ok(w.crossSolved(w.applyAlg(c1.base,c1.moves)),'it makes the cross');assert.deepStrictEqual(hintShape($('#f2lCross .hint')),{did:[],clear:[c1.moves[0]],covered:c1.moves.length-1});
      // back at the scramble: a hint not begun follows the cube
      await show(sc1);assert.strictEqual(L().f2l.cross.n,0);assert.ok(!L().f2l.cross.away);assert.ok(w.crossSolved(w.applyAlg(L().f2l.cross.base,L().f2l.cross.moves)));}
    assert.ok($('#f2l').style.zIndex==='7','the window opened last is in front');
    // the cross made, the pairs out: R U R' and its kin keep the cross
    const F0=w.applyAlg(new Cube(),w.parseAlg("R U R' U' L' U2 L B U' B' U2 F' U F"));assert.ok(w.crossSolved(F0));
    await show(w.applyAlg(sc1,['U']));const lenCross=L().moves.length; // a move while the cross is apart is not the step's
    await show(F0);assert.ok(await ready(),'a hint comes after the wait');
    assert.strictEqual(step().at,lenCross,'the step begins at the move that made the cross');
    assert.strictEqual($('#f2lCross').textContent,'Yellow cross on the bottom: made.');assert.ok(!$('#f2lMain').hidden,'the rest shows');
    const open0=['FR','FL','BL','BR'].filter(n=>!w.slotSolved(F0,SL.find(s=>s.name===n)));assert.ok(open0.length>=2,'two pairs or more to make: '+open0);
    assert.strictEqual($('#f2lCount').textContent,(4-open0.length)+' of 4 pairs');
    const chips=$$('#f2lChips .f2l-chip');assert.deepStrictEqual(chips.map(c=>c.dataset.chip),['FR','FL','BL','BR'],'four chips, in the order');
    assert.strictEqual(chips[0].textContent,'Front right · green red yellow','white up: the front right corner is green, red, yellow');
    let s=step();assert.ok(open0.includes(s.slot),'the target is an open pair');assert.strictEqual(L().f2l.mode,'shortest','shortest by default');
    assert.strictEqual($$('#f2lChips .target').length,1);assert.strictEqual($('#f2lChips .target').dataset.chip,s.slot,'the target chip has the accent');
    assert.strictEqual($$('#f2lChips .solved').length,4-open0.length,'the solved chips have the check');
    const pos={FR:'front right',FL:'front left',BL:'back left',BR:'back right'};
    assert.ok($('#f2lCard .tgt').textContent.startsWith('Target: '+pos[s.slot]+' ('),'the step card names the target: '+$('#f2lCard .tgt').textContent);
    let hs=$('#f2lCard .hint');assert.deepStrictEqual(hintMoves(hs),[...s.moves],'the hint is the step\'s moves');
    assert.deepStrictEqual(hintShape(hs),{did:[],clear:[s.moves[0]],covered:s.moves.length-1},'its first move in clear, the rest covered');assert.strictEqual($('#f2lCard .cnt').textContent,s.moves.length+' moves');
    assert.strictEqual($('#f2lCard .cross'),null);assert.strictEqual(L().f2l.cross,null,'no cross hint with the cross made');
    const X0=w.reframe(F0),best=w.f2lPairSolutions(X0,s.slot,w.f2lStatus(X0,[]).solved).optimal;assert.strictEqual(s.moves.length,best,'a shortest hint');
    assert.ok(await until(()=>!$('#f2lThen').hidden),'Then follows');assert.ok(/^Then (front|back) (right|left), \d+ moves?/.test($('#f2lThen').textContent),'Then: '+$('#f2lThen').textContent);
    // no click uncovers a move, and there is no Reveal
    click(hs);click(hs.querySelector('.sp-m'));assert.deepStrictEqual(hintShape($('#f2lCard .hint')),{did:[],clear:[s.moves[0]],covered:s.moves.length-1},'a click uncovers nothing');assert.strictEqual($('#f2lCard .sp-btn'),null,'no Reveal');
    // a turn along the hint: the move is made, plain and dim; the next one stays covered until it is made
    let cur=w.applyAlg(F0,[s.moves[0]]);await show(cur);
    assert.strictEqual(step().n,1,'one move made');
    assert.deepStrictEqual(hintShape($('#f2lCard .hint')),{did:[s.moves[0]],clear:[],covered:s.moves.length-1},'the move made is dim, the next is still covered');
    assert.ok(/, 1 made$/.test($('#f2lCard .cnt').textContent),'the count: '+$('#f2lCard .cnt').textContent);
    assert.strictEqual(L().moves[L().moves.length-1],s.moves[0],'the move is on the list');
    // a turn off the hint, one move in: the hint stays (no new one under the user), the card says how far off and the
    // way back, and the move is on the list
    const slot0=s.slot,s1=step(),len1=L().moves.length,on1=cur,off=['U','R','F','D','L','B'].find(f=>f!==s.moves[1][0]&&f!==s.moves[0][0]);
    cur=w.applyAlg(cur,[off]);await show(cur);await sleep(300);
    assert.strictEqual(step(),s1,'the step stays');assert.ok(step().away,'away from the hint');assert.ok(!L().f2l.working,'nothing is computed');assert.strictEqual(step().n,1,'one move made still');
    assert.deepStrictEqual([...step().off],[off],'the moves since the hint was left');
    assert.deepStrictEqual(hintShape($('#f2lCard .hint')),{did:[s.moves[0]],clear:[],covered:s.moves.length-1},'a wrong move shows nothing more');
    assert.strictEqual($('#f2lCard .off b').textContent,'Off the hint by 1 move.');assert.strictEqual($('#f2lCard .off code').textContent,w.invertAlg([off]),'the way back');
    assert.strictEqual($('#f2lCard [data-renew]').textContent,'New hint from here');assert.strictEqual(L().moves.length,len1+1,'the move is on the list');
    assert.strictEqual($('#f2lCross').textContent,w.crossSolved(cur)?'Yellow cross on the bottom: made.':'The yellow cross is apart.','the cross line: '+$('#f2lCross').textContent);
    // the way back: the undo merges away on the list, and the cube is on the hint again
    cur=on1;await show(cur);assert.strictEqual(L().moves.length,len1,'the undo merges away');assert.strictEqual(step(),s1);assert.ok(!step().away,'on the hint again');assert.ok(!$('#f2lCard .off'),'no off line');
    // off again: New hint from here asks for a new hint from the cube as it is, the same target, counted from the same start
    cur=w.applyAlg(cur,[off]);await show(cur);await sleep(300);assert.ok(step().away);const at1=step().at;
    click($('#f2lCard [data-renew]'));
    assert.ok(await until(()=>{const t=step();return t&&!L().f2l.working&&t.base.equals(w.reframe(cur));},4000),'a new hint from here');
    assert.strictEqual(step().slot,slot0,'the target stays');assert.strictEqual(step().n,0);assert.ok(!step().away&&!step().begun,'a fresh step');assert.strictEqual(step().at,at1,'counted from the same start');
    // follow it to the end: the pair goes in the solved list with the moves made
    const at0=step().at;for(const m of step().moves.slice()){cur=w.applyAlg(cur,[m]);await show(cur);}
    assert.ok(w.slotSolved(w.reframe(cur),SL.find(x=>x.name===slot0)),'the pair is solved');
    assert.strictEqual(L().f2l.log.length,1,'a solved step');const e0=L().f2l.log[0];assert.strictEqual(e0.slots[0],slot0);assert.strictEqual(e0.best,best,'the shortest when it began');
    assert.strictEqual(e0.moves,L().moves.slice(at0).join(' '),'the moves the user made: '+e0.moves);
    assert.ok(L().f2l.done.includes(slot0),'the pair is done');
    assert.ok(new RegExp('^\\d\\d:\\d\\d:\\d\\d'+pos[slot0][0].toUpperCase()+pos[slot0].slice(1)+'.*: '+e0.n+' moves \\(shortest was '+best+'\\)').test($('#f2lDone .ent').textContent),'the solved list: '+$('#f2lDone .ent').textContent);
    assert.strictEqual($('#f2lDone .ent code').textContent,e0.moves,'with the moves, plain');
    assert.ok(/^\S+ F2L: /.test($('#log .f2l').textContent),'logged: '+$('#log .f2l').textContent);
    // the next step: the mode switch to By corner picks the first open pair of the order, at once (no move yet)
    assert.ok(await ready());const openNow=()=>['FR','FL','BL','BR'].filter(n=>!w.slotSolved(w.reframe(cur),SL.find(x=>x.name===n)));
    click($('#f2lCorner'));assert.strictEqual(L().f2l.mode,'corner');assert.strictEqual(storage.getItem('cw:labF2LMode'),'corner','the mode is kept');
    assert.strictEqual($('#f2lCorner').getAttribute('aria-pressed'),'true');assert.strictEqual($('#f2lShortest').getAttribute('aria-pressed'),'false');
    assert.ok(await ready());assert.strictEqual(step().slot,openNow()[0],'by corner: the first open pair in the order');
    // the order: the arrows move a pair; the target follows the order; the focus stays on the arrow
    assert.ok($('#f2lOrder').hidden,'the order row is closed');click($('#f2lOrderBtn'));assert.ok(!$('#f2lOrder').hidden,'Order opens it');assert.strictEqual($('#f2lOrderBtn').getAttribute('aria-expanded'),'true');
    assert.deepStrictEqual($$('#f2lOrder .f2l-ord span').map(x=>x.textContent),['1. Front right','2. Front left','3. Back left','4. Back right']);
    const last=openNow()[openNow().length-1];
    while(L().f2l.order[0]!==last){const b=$(`#f2lOrder [data-ord="${last}"][data-dir="-1"]`);assert.ok(!b.disabled);b.focus();click(b);} // as the keyboard does: the focus on the arrow, then Enter
    assert.strictEqual(d.activeElement&&d.activeElement.dataset.ord,last,'the focus stays on the pair moved');
    assert.ok($(`#f2lOrder [data-ord="${last}"][data-dir="-1"]`).disabled,'first: no earlier');
    assert.strictEqual(JSON.parse(storage.getItem('cw:labF2LOrder'))[0],last,'the order is kept');
    assert.ok(await ready());assert.strictEqual(step().slot,last,'the target follows the order');
    assert.deepStrictEqual($$('#f2lChips .f2l-chip').map(c=>c.dataset.chip),[...L().f2l.order],'the chips follow the order');
    // a chip click: that pair is the target now; Shortest keeps it
    const other=openNow().find(n=>n!==last);
    if(other){click($(`#f2lChips [data-chip="${other}"]`));assert.strictEqual(L().f2l.target,other);assert.ok(await ready());assert.strictEqual(step().slot,other,'the clicked pair is the target');
      click($('#f2lShortest'));assert.ok(await ready());assert.strictEqual(step().slot,other,'Shortest keeps a clicked target');
      click($(`#f2lChips [data-chip="${last}"]`));assert.ok(await ready());assert.strictEqual(step().slot,last);}
    click($(`#f2lChips [data-chip="${openNow().length===4?'zz':SL.map(x=>x.name).find(n=>!openNow().includes(n))}"]`)||$('#f2lChips .solved'));assert.ok(await ready());assert.ok(openNow().includes(step().slot),'a solved chip is no target');
    // combinations: off by default; on, they come under the card, and Use this puts one in the card
    assert.ok(!$('#f2lCombo').checked&&$('#f2lCombos').hidden,'no combinations by default');
    $('#f2lCombo').checked=true;$('#f2lCombo').dispatchEvent(new w.Event('change',{bubbles:true}));assert.strictEqual(storage.getItem('cw:labF2LCombo'),'1','kept');
    assert.ok(!$('#f2lCombos').hidden,'the box shows');
    assert.ok(await until(()=>step().combos&&!step().combos.busy,8000),'the combinations come');
    assert.ok(/Also makes|Sets up|No combinations/.test($('#f2lCombos').textContent),'the box: '+$('#f2lCombos').textContent);
    const alt=$('#f2lCombos .f2l-alt');
    if(alt){const mv=spoilMoves(alt.querySelector('.spoil'));const use=alt.querySelector('button[data-use]');assert.strictEqual(use.textContent,'Use this');click(use);assert.deepStrictEqual([...step().moves],mv,'Use this puts it in the card');
      assert.ok(/a combination$/.test($('#f2lCard .cnt').textContent),'the count says so');assert.strictEqual($('#f2lCombos .f2l-alt button[data-use]').textContent,'In use','its button says In use');
      click($('#f2lCombos [data-use="plain"]'));assert.strictEqual(step().moves.join(' '),step().plain.join(' '),'the plain hint again');}
    $('#f2lCombo').checked=false;$('#f2lCombo').dispatchEvent(new w.Event('change',{bubbles:true}));assert.ok($('#f2lCombos').hidden);
    // a solved pair that comes apart: the step card says so, and the pair is open again
    assert.ok(w.slotSolved(w.reframe(cur),SL.find(x=>x.name===slot0)),'the first pair is still in');
    cur=w.applyAlg(cur,w.parseAlg(w.invertAlg(e0.moves)));await show(cur);
    assert.ok(await until(()=>!L().f2l.working),'a new hint');
    assert.ok(!L().f2l.done.includes(slot0),'the pair is open again');assert.strictEqual($('#f2lCard .warn').textContent,`The ${pos[slot0]} pair came out.`,'the card says so');
    assert.ok(!$(`#f2lChips [data-chip="${slot0}"]`).classList.contains('solved'),'its chip has no check');
    // a turn the tilt detector finds that puts another color on the bottom does not move the guide: the user
    // tipped the cube to look. The hold back, or one the user picks, is taken.
    assert.ok(await ready(),'a hint before the tilt');
    {const hold0=L().hold,line0=$('#f2lCross').textContent,s0=step(),setHold=w.eval('labSetHold');
      const tipped=w.eval('LAB_HOLDS').find(h=>h.cube.center[3]!==hold0.cube.center[3]&&h.cube.center[0]!==hold0.cube.center[0]);
      setHold(tipped,'turn');assert.strictEqual(L().hold,tipped,'the bar took the hold');
      assert.strictEqual(step(),s0,'the guide keeps its step');assert.strictEqual($('#f2lCross').textContent.slice(0,line0.length),line0,'and its cross line: '+$('#f2lCross').textContent);
      assert.ok(/Read as held/.test($('#f2lCross').textContent),'the line says how the guide reads');
      assert.strictEqual($$('#log .f2l').filter(x=>/the tilt moved the hold/.test(x.textContent)).length,1,'logged once');
      setHold(hold0,'turn');assert.strictEqual(step(),s0,'the hold back: the step stays');assert.ok(!/Read as held/.test($('#f2lCross').textContent),'and the line is plain again');
      setHold(tipped,'user');
      assert.ok(!/Read as held/.test($('#f2lCross').textContent)&&!/Yellow cross on the bottom/.test($('#f2lCross').textContent),'a hold the user picks is taken: '+$('#f2lCross').textContent);
      setHold(hold0,'user');assert.ok(await ready(),'a hint again in the hold the user picked back');}
    // the hint does not change under the user: the step stays while the cube is on it;
    // two opposite faces in the other order, or another shortest solution, go on from there with no new hint
    {let s1=step();const X1=w.reframe(cur);assert.ok(s1.base.equals(X1),'the step starts from here');
      cur=w.applyAlg(cur,[s1.moves[0]]);await show(cur);assert.strictEqual(step(),s1);assert.strictEqual(step().n,1);
      click($('#f2lCorner'));click($('#f2lShortest'));await sleep(300);assert.strictEqual(step(),s1,'a mode change keeps a step the user has begun');assert.strictEqual(step().n,1);
      cur=w.applyAlg(cur,w.parseAlg(w.invertAlg(s1.moves[0])));await show(cur);await sleep(300);assert.strictEqual(step(),s1,'a move made and unmade keeps the step');assert.strictEqual(step().n,0);
      assert.deepStrictEqual(hintShape($('#f2lCard .hint')),{did:[],clear:[s1.moves[0]],covered:s1.moves.length-1},'the first move in clear again, the rest covered');
      const opp={U:'D',D:'U',R:'L',L:'R',F:'B',B:'F'},i=s1.moves.findIndex((m,k)=>k+1<s1.moves.length&&opp[m[0]]===s1.moves[k+1][0]);
      if(i>=0){for(const m of s1.moves.slice(0,i)){cur=w.applyAlg(cur,[m]);await show(cur);}cur=w.applyAlg(cur,[s1.moves[i+1]]);await show(cur);await sleep(300);
        assert.strictEqual(step(),s1,'the other order of two opposite faces keeps the step');assert.strictEqual(step().n,i+1);assert.strictEqual(step().moves[i],s1.moves[i+1],'the hint reads in the order made');
        for(const m of step().moves.slice(i+1)){cur=w.applyAlg(cur,[m]);await show(cur);}
        assert.ok(await until(()=>!L().f2l.working&&step()!==s1,4000),'the pair is solved and the next step comes');assert.ok(w.slotSolved(w.reframe(cur),SL.find(x=>x.name===s1.slot)));}
      else{const alt=(s1.sols||[]).find(x=>x!==s1.moves.join(' '));
        if(alt){const am=alt.split(' ');cur=w.applyAlg(cur,[am[0]]);await show(cur);await sleep(300);
          assert.strictEqual(step(),s1,'another shortest solution keeps the step');assert.strictEqual(step().moves.join(' '),alt,'and the hint is now that one');assert.strictEqual(step().n,1);
          for(const m of am.slice(1)){cur=w.applyAlg(cur,[m]);await show(cur);}assert.ok(await until(()=>!L().f2l.working&&step()!==s1,4000),'solved, and the next step comes');}
        else{for(const m of s1.moves){cur=w.applyAlg(cur,[m]);await show(cur);}assert.ok(await until(()=>!L().f2l.working&&step()!==s1,4000));}}
      assert.ok(await ready());
      // an undo across the step's end: the last move of the hint comes off the list with its undo (not "F' F"), the next
      // step begins at the new end; made again, the list is as it was
      const lastM=L().moves[L().moves.length-1],lenS=L().moves.length;assert.strictEqual(L().f2l.at,lenS,'the next step begins at the end');
      cur=w.applyAlg(cur,w.parseAlg(w.invertAlg([lastM])));await show(cur);
      assert.strictEqual(L().moves.length,lenS-1,'the undo merges away across the step end: '+L().moves.slice(-3));assert.strictEqual(L().f2l.at,lenS-1,'the next step begins at the new end');
      assert.ok(!w.slotSolved(w.reframe(cur),SL.find(x=>x.name===s1.slot)),'the pair is out');
      cur=w.applyAlg(cur,[lastM]);await show(cur);assert.strictEqual(L().moves.length,lenS,'made again: the list is as it was');assert.strictEqual(L().moves[lenS-1],lastM);
      assert.ok(w.slotSolved(w.reframe(cur),SL.find(x=>x.name===s1.slot)),'the pair is in again');
      assert.ok(await ready());}
    // the cross comes apart off the hint: the step stays, with a hint that makes the cross again
    {const s1=step(),labHeld=w.eval('labHeld');
      const brk=['R','L','F','B','U','D'].find(f=>f!==s1.moves[0][0]&&!w.crossSolved(w.reframe(labHeld(w.applyAlg(cur,[f])))));assert.ok(brk,'a move that takes the cross apart');
      const broken=w.applyAlg(cur,[brk]);await show(broken);
      assert.ok(await until(()=>!L().f2l.working&&step()&&step().base.equals(w.reframe(broken)),4000),'a hint from the cube with the cross apart');
      assert.ok(step().moves.length>0&&!$('#f2lMain').hidden,'the chips and the card stay');
      assert.ok(w.crossSolved(w.applyAlg(step().base,step().moves)),'the hint makes the cross again');
      assert.strictEqual($('#f2lCross').textContent,'The yellow cross is apart. The hint makes it again.','the cross line: '+$('#f2lCross').textContent);
      await show(cur);assert.ok(await until(()=>!L().f2l.working&&step()&&(step().base.equals(w.reframe(cur))||step().n>0),4000),'the cross made again: the guide goes on');}
    // Esc closes the window in front, then the other; F closes too
    key('p');assert.ok(!$('#pat').hidden&&$('#pat').style.zIndex==='7','Patterns in front');
    $('#f2l').dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true}));assert.strictEqual($('#f2l').style.zIndex,'7','a press brings the guide to the front');
    key('Escape');assert.ok($('#f2l').hidden&&!$('#pat').hidden,'Esc closes the window in front');key('Escape');assert.ok($('#pat').hidden,'then the other');
    key('f');assert.ok(!$('#f2l').hidden);
    // the window moves by its head, and the place is kept
    const PE2=w.PointerEvent||w.MouseEvent,pv=(t,x,y)=>new PE2(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,pointerId:2,button:0});
    const fh=$('#f2l .head');fh.dispatchEvent(pv('pointerdown',500,80));fh.dispatchEvent(pv('pointermove',560,130));fh.dispatchEvent(pv('pointerup',560,130));
    assert.deepStrictEqual(JSON.parse(storage.getItem('cw:labF2LWin')),{...L().f2lPos},'the place is kept');assert.strictEqual($('#f2l').style.top,L().f2lPos.y+'px');
    // New scramble starts the guide over
    key('n');assert.strictEqual(L().f2l.log.length,0,'the solved list is empty');assert.strictEqual(L().f2l.done.length,0);assert.strictEqual(L().f2l.target,null);
    assert.ok($('#f2lDone').hidden);key('Escape');key('Escape');
    // My cube is solved too
    L().f2l.done=['FR'];key('s');assert.ok(await until(()=>!L().busy&&L().f2l.done.length===0),'My cube is solved starts it over');
    key('f');assert.ok(!$('#f2l').hidden,'F opens it');key('f');assert.ok($('#f2l').hidden,'F closes the guide');click($('#patClear'));
    // the defaults back for the tests after this one
    click($('#f2lBtn'));click($('#f2lShortest'));click($('#f2lOrderBtn'));L().f2l.order=['FR','FL','BL','BR'];click($('#f2lClose'));}
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
  assert.ok($('#confirm').hidden,'Reset closes the dialog');assert.ok($$('#log .reset').length===resets+2,'Reset cube is logged (the twist reset, then this one): '+$('#log').textContent);
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
  $('#holdUp').focus();assert.strictEqual(d.activeElement,$('#holdUp'),'the select has the focus');
  $('#holdUp').value='3';$('#holdUp').dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.notStrictEqual(d.activeElement,$('#holdUp'),'the select lets the focus go after a choice, so the keys reach the page');
  assert.deepStrictEqual($$('#holdFront option').map(o=>o.textContent),['red','green','orange','blue'],'yellow up: white is out');
  assert.strictEqual($('#holdFront').value,'2','green stays in front');
  assert.strictEqual(L().hold.cube.center[0],3,'the hold is yellow up');assert.strictEqual(L().hold.cube.center[2],2);
  key('f');assert.ok(/white cross/i.test($('#f2lCross').textContent),'the F2L guide reads the cube as held: the white cross on the bottom: '+$('#f2lCross').textContent);
  assert.ok(!L().f2l.held||L().f2l.held.center[3]===0,'the bottom as held is white');key('f');
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
  // experiment 2: a turn of the whole cube from the tilt. The page's frame from the cube's: x the same, cube y = -page z, cube z = page y
  key('c');send(rest);await sleep(30);key('r');
  assert.ok(!$('#turnOn').checked&&$('#turnOn').closest('.bar'),'Turn with the tilt is in the bar, off by default');
  $('#turnOn').checked=true;$('#turnOn').dispatchEvent(new w.Event('change',{bubbles:true}));assert.strictEqual(storage.getItem('cw:labTurn'),'1','on, and kept');
  assert.ok(/Turn with the tilt: on/.test($('#log .hold').textContent),'logged');assert.strictEqual($('#turnNow').textContent,'–','the rest pose starts over at Reset cube');
  const page=q=>({w:q[3],x:q[0],y:-q[2],z:q[1]}),hold0=L().hold;
  const target=w.quatMul([-Math.SQRT1_2,0,0,Math.SQRT1_2],hold0.q),rawFor=q=>w.quatMul(w.quatConj(L().basis),q); // the whole cube turned x, as a reading
  send(rest);await sleep(50);assert.ok(/still, 0\.0° from rest/.test($('#turnNow').textContent),'the live line: '+$('#turnNow').textContent);
  for(let i=1;i<=8;i++){send(page(rawFor(w.quatSlerp(L().hold.q,target,i/8))));await sleep(45);}
  assert.ok($('#log .tstart'),'turn start is logged: '+$('#log').textContent);assert.ok(/turn start: x, \d+\.\d°, axis x -/.test($('#log .tstart').textContent),'named x: '+$('#log .tstart').textContent);
  assert.ok($('#log .tupdate')&&/turn update: x, \d+\.\d° at \d+ ms/.test($('#log .tupdate').textContent),'turn update is logged: '+$('#log').textContent);
  assert.ok(/turning/.test($('#turnNow').textContent),'the live line says turning: '+$('#turnNow').textContent);
  for(let i=0;i<9;i++){send(page(rawFor(target)));await sleep(45);}
  assert.ok($('#log .tmove'),'turn finish with a move is logged: '+$('#log').textContent);
  assert.ok(/turn finish: x, [89]\d\.\d° in \d+ ms, axis .* → x, \d+° off\. Hold: green up, yellow toward you\./.test($('#log .tmove').textContent),'the finish names the turn and the new hold: '+$('#log .tmove').textContent);
  assert.strictEqual($('#holdUp').value+'/'+$('#holdFront').value,'2/3','the hold followed the turn');assert.strictEqual(L().moves.join(' '),'x','the turn is on the list');assert.ok($('#moves .mv.rot.head'),'dashed, and the head');
  assert.strictEqual($$('#log .reset').length,1,'a detected turn is no Reset cube (the one reset is the key press above)');
  const n1=$('#log').children.length;for(let i=0;i<8;i++){send(page(rawFor(target)));await sleep(45);}assert.strictEqual($('#log').children.length,n1,'at rest: no more events');
  // a turn that comes back, and one that rests between holds, change nothing
  const part=deg=>{const s=Math.sin(deg/2*Math.PI/180),c=Math.cos(deg/2*Math.PI/180);return w.quatMul([0,-s,0,c],target);};
  send(page(rawFor(part(25))));await sleep(45);send(page(rawFor(part(25))));await sleep(45);for(let i=0;i<9;i++){send(page(rawFor(target)));await sleep(45);}
  assert.ok(/back at the hold/.test($('#log .tfinish').textContent),'back: '+$('#log .tfinish').textContent);assert.strictEqual(L().moves.join(' '),'x','no move for a turn that comes back');
  for(let i=1;i<=4;i++){send(page(rawFor(part(i*11))));await sleep(45);}for(let i=0;i<9;i++){send(page(rawFor(part(44))));await sleep(45);}
  assert.ok(/between holds \(nearest (green up, yellow toward you|green up, red toward you), 4\d° off\); the hold stays/.test($('#log .tfinish').textContent),'between: '+$('#log .tfinish').textContent);
  assert.strictEqual(L().hold.cube.center[0],2,'the hold stays');
  for(let i=1;i<=4;i++){send(page(rawFor(part(44+i*11))));await sleep(45);}for(let i=0;i<9;i++){send(page(rawFor(part(88))));await sleep(45);}
  assert.ok(/Hold: green up, red toward you/.test($('#log .tmove').textContent),'the rest of the way snaps to the next hold: '+$('#log .tmove').textContent);
  assert.strictEqual(L().moves.join(' '),'x y',"the second turn, y, is on the list: "+L().moves.join(' '));
  $('#turnOn').checked=false;send(page(rawFor(target)));await sleep(45);send(page(rawFor(target)));await sleep(45);for(let i=0;i<9;i++){send(page(rawFor(target)));await sleep(45);}
  assert.strictEqual(L().moves.join(' '),'x y','off: the tilt makes no turn');$('#turnOn').checked=true;
  $('#turnOn').checked=false;$('#turnOn').dispatchEvent(new w.Event('change',{bubbles:true}));assert.strictEqual(storage.getItem('cw:labTurn'),'','off is kept too');$('#turnOn').checked=true;
  $('#holdUp').value='0';$('#holdUp').dispatchEvent(new w.Event('change',{bubbles:true}));$('#holdFront').value='2';$('#holdFront').dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.strictEqual(L().hold,w.eval('LAB_HOLDS')[0],'the plain hold again');
  // keys and buttons
  key('l');assert.ok($('#side').hidden,'L hides the panel');key('l');assert.ok(!$('#side').hidden);
  key('c');assert.strictEqual($('#log').children.length,0,'C clears the log');assert.strictEqual(L().moves.length,0,'and the moves');assert.ok($('#movesClear').disabled);
  click($('#disconnect'));assert.ok(!L().conn,'Disconnect');assert.ok($('#reset').disabled);
  assert.ok($('#macShow').hidden,'the address goes with the cube');
  await sleep(50);assert.ok($('#list').hidden,'Disconnect by hand starts no look');
  assert.deepStrictEqual(errs,[],'no script errors on the way');
  console.log('lab page ok');
  set(w.applyAlg(new Cube(),['R'])); // the cube's count is off at the next connect
  await corrected(bridge,dev,storage,cube);
  await again(bridge,dev,storage);
  await chrome(storage);
}
// The site's correction (cw:ganFix, from Scan my cube or Paint my cube) applies to the lab's link
// too: the picture shows the real state. My cube is solved drops it.
async function corrected(bridge,dev,storage,cube){
  const {w,d,errs}=await boot(bridge,{storage});
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)],L=()=>w.eval('lab'),Cube=w.eval('Cube');
  const click=el=>{assert.ok(el,'element to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};
  assert.ok(await until(()=>!!L().conn),'the remembered cube connects');
  const raw=new Cube([...cube.cp],[...cube.co],[...cube.ep],[...cube.eo]),actual=w.applyAlg(new Cube(),['R','U']);
  assert.ok(!raw.isSolved(),'the fake cube is off from solved for this test');
  assert.ok(await until(()=>L().shown&&L().shown.equals(raw)),'without a fix, the picture is the cube\'s own state');
  w.eval('labDisconnect()');assert.ok(await until(()=>!L().conn));
  storage.setItem('cw:ganFix',JSON.stringify({GAN12uiM_A1B2:{fix:w.ganFixSave(w.ganFixFor(actual,raw)),from:'scan',at:Date.now()}}));
  click($('#connect'));assert.ok(await until(()=>$$('#listItems button').length===1),'the list shows');click($('#listItems button'));
  assert.ok(await until(()=>!!L().conn),'connects again');
  assert.ok(await until(()=>L().shown&&L().shown.equals(actual)),'with the fix, the picture is the real state');
  assert.ok(/corrected from the colors/.test($('#log').textContent),'the log says so');
  click($('#solved'));
  assert.ok(await until(()=>L().shown&&L().shown.isSolved()),'My cube is solved: the picture is solved');
  assert.ok(!JSON.parse(storage.getItem('cw:ganFix')).GAN12uiM_A1B2,'and the saved fix is gone');
  // Paint my cube in the lab: the painted colors are the real state, the picture jumps there with
  // no moves added, and the fix goes to the site's map
  assert.ok(!$('#paint').disabled&&!$('#scan').disabled,'Scan my cube and Paint my cube are on while connected');
  assert.ok(!w.eval('typeof openScan=="function"'),'the camera scanner is not loaded in the lab');
  const real=w.applyAlg(new Cube(),['F','D2','L']),cubeOf=()=>new Cube([...cube.cp],[...cube.co],[...cube.ep],[...cube.eo]);
  assert.ok(cubeOf().isSolved(),'the fake cube counts from solved after the reset');
  click($('#paint'));assert.ok($('#paintBg'),'Paint my cube opens the painter over the lab');
  assert.strictEqual($('#paintGo').textContent,'Use this cube');assert.ok(L().busy,'the lab is busy while the painter is open');
  const held=w.applyAlg(real,['z2']).toFacelets();
  for(let i=0;i<54;i++){if(i%9===4)continue;click($(`#paintPalette .pt-swatch[data-c="${held[i]}"]`));click($(`#paintNet button[data-i="${i}"]`));}
  assert.ok(!$('#paintGo').disabled,'every tile is painted');click($('#paintGo'));assert.ok(!$('#paintBg'),'Use this cube closes the painter');
  assert.ok(await until(()=>!L().busy&&L().shown&&L().shown.equals(real)),'the picture is the painted cube');
  assert.strictEqual(L().moves.length,0,'no moves were added for the jump');
  const saved=JSON.parse(storage.getItem('cw:ganFix')).GAN12uiM_A1B2;assert.ok(saved&&saved.from==='paint'&&saved.fix,'the fix is saved as painted, in the site\'s shape');
  assert.ok(L().conn.fix,'the link carries the fix');
  assert.ok(/corrected from the colors painted/.test($('#log').textContent),'the log says so');
  assert.ok(/shows your cube as painted/.test($('#status').textContent),'the status says so: '+$('#status').textContent);
  // a turn after the correction moves the real state the same way, and goes on the list
  Object.assign(cube,{cp:[0,1,2,3,4,5,6,7],co:Array(8).fill(0),ep:[...Array(12).keys()],eo:Array(12).fill(0)});
  const turned=w.applyAlg(cubeOf(),['R']);Object.assign(cube,{cp:[...turned.cp],co:[...turned.co],ep:[...turned.ep],eo:[...turned.eo]});
  dev.notify(Uint8Array.from([0x01,...Array(19).fill(0)]));
  assert.ok(await until(()=>L().target&&L().target.equals(w.applyAlg(real,['R']))),'R on the cube is R on the painted state');
  assert.ok(await until(()=>L().moves.length===1),'and the move is listed: '+L().moves.join(' '));
  assert.ok(await until(()=>!L().anim),'the turn is drawn');
  // Scan my cube reads the state from the cube, as at connect: a turn the lab never saw (no move
  // message) brings the picture there with no move added, through the fix; a read that matches
  // the picture changes nothing
  const unseen=w.applyAlg(cubeOf(),['U']);Object.assign(cube,{cp:[...unseen.cp],co:[...unseen.co],ep:[...unseen.ep],eo:[...unseen.eo]});
  const reads=()=>($('#log').textContent.match(/State read: /g)||[]).length,before=reads();
  click($('#scan'));assert.ok(L().busy,'the lab is busy while it reads');
  assert.ok(await until(()=>!L().busy&&L().shown&&L().shown.equals(w.applyAlg(real,['R','U']))),'Scan my cube: the picture jumps to the state the cube reads');
  assert.strictEqual(L().moves.length,1,'no move was added for the jump');
  assert.ok(reads()>before,'the log shows the read');
  assert.ok(/shows the cube as it reads/.test($('#status').textContent),'the status says so: '+$('#status').textContent);
  assert.ok(L().conn.fix&&JSON.parse(storage.getItem('cw:ganFix')).GAN12uiM_A1B2,'the fix stays');
  click($('#scan'));assert.ok(await until(()=>!L().busy),'the second read ends');
  assert.ok(/reads as the picture shows/.test($('#status').textContent),'a read that matches changes nothing: '+$('#status').textContent);
  assert.strictEqual(L().moves.length,1,'and adds no move');assert.ok(!$('#scanBg'),'no camera scanner opens in the lab');
  // leave the fake cube off from solved again, as `again` expects
  const back=w.applyAlg(new Cube(),['R']);Object.assign(cube,{cp:[...back.cp],co:[...back.co],ep:[...back.ep],eo:[...back.eo]});
  assert.deepStrictEqual(errs,[]);
  console.log('lab corrected ok');
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
