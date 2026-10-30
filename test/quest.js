// The Quest cube lab (quest/): the pure part (matrices, the cubies and stickers, every move's turn
// lands on the next state, the moves between states, the 24 holds and the tiles, the hidden faces'
// mirrors, the rows of buttons, the drill: every case in every hold), then the page over a fake bridge (the list, a connect, a turn
// on the list, the stage, the hold tiles, the tilt, Hidden faces, no demo and no keys, Drill Sune solved
// on the cube and the case again), then a fake
// WebXR session (the cube placed in front of the head, a grip carries it, a select away brings it
// back, A toggles the tilt, the stick sizes the cube, the panel, Hidden faces, the hold tiles, Exit
// by two pokes or the left stick, VR draws the floor and the controllers but not the hands).
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
  // the hold: all 24, each picture turn puts its top up and its front toward the viewer
  const H=run('QUEST_HOLDS'),questRelabel=run('questRelabel'),questHeld=run('questHeld'),questMoveColor=run('questMoveColor');
  assert.strictEqual(Object.keys(H).length,24,'24 holds');
  for(const h of Object.values(H)){
    assert.ok(near(quatApply(h.q,FG[h.top].n),[0,1,0],1e-6)&&near(quatApply(h.q,FG[h.front].n),[0,0,1],1e-6),h.id+': the picture shows its top up, its front toward you');
    for(const m of run('QUEST_FACE_MOVES'))assert.ok(questHeld(mk([m]),h).equals(applyAlg(questHeld(new Cube(),h),[questRelabel(m,h)])),h.id+': '+m+' on the cube is '+questRelabel(m,h)+' as held');
  }
  const Y=H['yellow-green'];
  assert.strictEqual(questRelabel("U'",H['white-green']),"U'");assert.strictEqual(questRelabel("U'",Y),"D'",'white is down: a turn of white is D');
  assert.strictEqual(questRelabel('R2',Y),'L2');assert.strictEqual(questRelabel('F',Y),'F','green stays in front');
  const held=questHeld(new Cube(),Y);assert.strictEqual(held.center[0],3,'yellow up');assert.strictEqual(held.center[2],2,'green in front');
  assert.strictEqual(questMoveColor('U',held),'#ffd21e','U as held is the yellow face');assert.strictEqual(questMoveColor('R',new Cube()),'#d8283b');
  const find=run('questHoldFind'),pick=run('questHoldPick');
  assert.strictEqual(find('yellow'),Y,'a hold kept before 0.4.0 still reads');assert.strictEqual(find('nonsense').id,'white-green');
  assert.strictEqual(pick(H['white-green'],'front',4).id,'white-orange','a front keeps the top');
  assert.strictEqual(pick(H['white-orange'],'up',3).id,'yellow-orange','a top keeps the front');
  assert.strictEqual(pick(Y,'front',1).id,'yellow-red','yellow stays on top');
  // the hidden faces: a mirror out along the face's normal, its stickers seen from behind
  const mirror=run('questMirror'),hiddenFaces=run('questHiddenFaces'),MR=run('QUEST_MIRROR');
  assert.ok(near(m4Point(mirror([0,-1,0]),[0.5,-1.5,1]),[0.5,-1.5-MR.dist,1]),'a point on the bottom face goes down by dist');
  assert.ok(near(m4Point(mirror([1,0,0]),[2.5,0,0]),[1.5+MR.dist+MR.flat,0,0]),'a point above the face keeps flat of its height');
  eq(hiddenFaces(m4Trs([0,0,0],null,1),[4,5,10]),[3,4,5],'seen from above, front and right: D, L and B are hidden');
  eq(hiddenFaces(m4Trs([0,0,-10],null,1),[0,0,0]),[5],'straight on: B alone');
  const panel=run('questPanel')({name:'GAN12',battery:80,status:'Live.',stage:{name:'F2L',sub:'2 pairs'},moves:Array.from({length:15},()=>'R'),tilt:true,hint:'h'});
  assert.strictEqual(panel.head,'GAN12 · 80%');assert.strictEqual(panel.stage,'F2L · 2 pairs');assert.strictEqual(panel.moves.length,12,'the last twelve moves');assert.strictEqual(panel.count,15);
  // the hands: the rows of buttons and the poke
  const BAR=run('QUEST_BAR'),hit=run('questBarHit'),poke=run('questPoke'),free=run('questHandFree');
  const buttons=run('questBarButtons')({tilt:true,moves:3,panel:true,hidden:false,top:0,front:2}),R6=run('questBarLayout')(buttons);
  assert.strictEqual(buttons.map(b=>b.id).join(),'tilt,level,clear,hidden,smaller,larger,panel,top-white,top-yellow,front-green,front-orange,front-blue,front-red,exit,drill');
  assert.strictEqual(buttons[buttons.length-1].label,'Drill Sune','the third row starts a drill');
  assert.strictEqual(run('questBarButtons')({drill:true}).find(b=>b.id==='drill').label,'Stop drill','and stops it');
  assert.ok(buttons.find(b=>b.id==='top-white').on&&buttons.find(b=>b.id==='front-green').on&&!buttons.find(b=>b.id==='front-red').on,'the hold\'s tiles are on');
  R6.forEach((r,i)=>assert.strictEqual(hit([r.x,r.y,0],R6),i,buttons[i].id+' under its center'));
  assert.ok(R6[7].y<R6[0].y-BAR.h,'the hold is on the second row');
  assert.ok(R6[R6.length-1].y<R6[7].y-BAR.h,'the drill is on the third row');
  const cx=i=>R6[i].x;
  assert.strictEqual(hit([cx(0)+BAR.w/2+BAR.gap/2,0,0],R6),-1,'nothing in the gap');
  assert.strictEqual(hit([cx(2),BAR.h,0],R6),-1,'nothing over the row');
  const box=run('questBarBox')(R6);assert.ok(box.x1-box.x0<0.42,'the rows are no wider than 42 cm: '+(box.x1-box.x0));
  const ps={armed:false},go=z=>poke(ps,[cx(1),0,z],R6);
  assert.strictEqual(go(0.08).press,-1,'far in front: no press');assert.strictEqual(go(0.08).hover,-1,'and no light');
  assert.strictEqual(go(0.02).hover,1,'near: the button lights');
  assert.strictEqual(go(-0.005).press,1,'through the face: a press');
  assert.strictEqual(go(-0.01).press,-1,'once per poke');go(0.005);assert.strictEqual(go(-0.005).press,-1,'not again without coming out');
  go(0.02);assert.strictEqual(go(-0.005).press,1,'out and in again: a second press');
  const s2={armed:false};poke(s2,[cx(4),0,-0.08],R6);assert.strictEqual(poke(s2,[cx(4),0,-0.01],R6).press,-1,'from behind: no press');
  const s3={armed:false};poke(s3,[0.5,0,-0.005],R6);assert.strictEqual(poke(s3,[cx(4),0,-0.005],R6).press,-1,'in from the side: no press');
  assert.strictEqual(poke({armed:false},null,R6).press,-1,'no fingertip: nothing');
  const center=run('questBarCenter');
  assert.ok(center([0,1,0],0.15,true)[1]<1-0.15/3*run('questMirrorReach')(),'with the hidden faces the rows sit under the mirrors');
  assert.ok(free([0,1,0],[]),'one hand is free');assert.ok(free([0,1,0],[[0.4,1,0]]),'a hand far from the other is free');
  assert.ok(!free([0,1,0],[[0.1,1,0]]),'two hands together hold the real cube');
  drill();
  console.log('quest pure ok');
}
// The drill: every case, set up in every hold, is solved by its algorithm done as held (a whole-cube
// turn of the algorithm's own is all that is left); the picture follows the real cube's moves.
function drill(){
  const run=require('./vm-load')('js/engine.js','js/algs.js','js/stage.js','js/draw.js','lab/smack.js','quest/core.js');
  const Cube=run('Cube'),applyAlg=run('applyAlg'),holds=Object.values(run('QUEST_HOLDS')),setup=run('questDrillSetup'),find=run('questDrillFind');
  const cases=run('questDrillCases')(),turns=holds.map(h=>h.cube);
  assert.ok(cases.length>=37,'the two-look OLL and PLL and the full PLL: '+cases.length);
  for(const c of cases)for(const h of holds){
    const s=setup(c.alg,h);assert.strictEqual(s.center.join(),'0,1,2,3,4,5',c.id+' in '+h.id+': the centers home');
    assert.ok(!s.isSolved(),c.id+' is no solved cube');
    const after=applyAlg(s.mul(h.cube),c.alg);
    assert.ok(turns.some(t=>after.equals(t)),c.id+' in '+h.id+': the algorithm as held solves it');
  }
  assert.strictEqual(find('Sune').id,'co-sune');assert.strictEqual(find('co-sune').name,'Sune');assert.strictEqual(find(' t PERM ').id,'pll-T','by name, in any case');
  assert.strictEqual(find('nothing'),null);
  // the case reads as itself on the cube as held
  const stage=run('cfopStage'),held=run('questHeld');
  for(const id of ['white-green','yellow-green','yellow-red'])assert.strictEqual(stage(held(setup("R U R' U R U2 R'",run('QUEST_HOLDS')[id]),run('QUEST_HOLDS')[id])).name,'Sune','Sune shows as Sune, held '+id);
  // the picture: the case, then the moves made on the real cube since the start
  const p0=applyAlg(new Cube(),"F R2 D' L B U2"),d={setup:setup("R U R' U R U2 R'"),p0};
  assert.ok(run('questDrillState')(d,p0).equals(d.setup),'at the start the picture is the case');
  const p1=applyAlg(p0,"R U R' U R U2 R'");assert.ok(run('questDrillState')(d,p1).isSolved(),'the Sune on the real cube solves the picture');
  assert.ok(run('questDrillState')(d,applyAlg(p0,['L'])).equals(applyAlg(d.setup,['L'])),'a turn of the real cube turns the picture');
  assert.strictEqual(run('questPanel')({drill:'Drill: Sune · 2 solved',stage:{name:'Cross'}}).stage,'Drill: Sune · 2 solved','the panel says the drill in place of the stage');
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
      if(opts.bluetooth)Object.defineProperty(w.navigator,'bluetooth',{value:opts.bluetooth});
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
  // the hold: the tiles, as on the Smart cube tab; yellow up names the white face D
  assert.strictEqual($$('#hold .ht').length,6,'six tiles: two tops, four fronts');
  const tile=(place,c)=>$(`#hold .grp[data-place="${place}"] .ht[data-c="${c}"]`);
  assert.strictEqual(tile('up',0).getAttribute('aria-pressed'),'true','white on top to start');
  click(tile('up',3));assert.strictEqual(storage.getItem('cw:questHold'),'"yellow-green"','the hold is kept');
  assert.ok(tile('up',3).getAttribute('aria-pressed')==='true'&&tile('front',2).getAttribute('aria-pressed')==='true','yellow on top, green in front');
  const c3=w.applyAlg(c2,['U']);set(c3);dev.notify(moveMsg());
  assert.ok(await until(()=>Q().moves.join()==='R2,D'),'a turn of white reads D as held: '+Q().moves.join());
  assert.strictEqual($$('#moves .mv')[1].style.getPropertyValue('--c'),'#f3f2ec','its bar is white');
  click($('#clear'));assert.strictEqual(Q().moves.length,0,'Clear moves');assert.ok($('#clear').disabled);
  // tilt
  assert.ok($('#tilt').checked,'Tilt with my cube is on by default');assert.ok($('#level').disabled,'Level waits for a tilt reading');
  w.questGyro([0,0.3826834,0,0.9238795]);assert.ok(!$('#level').disabled,'Level is on once the cube tilts');
  w.questTick(w.performance.now()+10);assert.ok(Q().q,'the picture follows the tilt');
  assert.ok(near(w.quatApply(Q().q,[0,0,1]),[0,0,1],1e-6),'the first reading is taken as the hold: green in front');
  change($('#tilt'),false);assert.ok(near(w.quatApply(w.questOrient(),[0,1,0]),[0,-1,0],1e-6),'tilt off: the picture shows the hold, white down');
  click(tile('front',1));assert.strictEqual(Q().hold.id,'yellow-red','a front tile keeps the top');
  // Hidden faces: the site's setting
  assert.strictEqual($('#hidden').getAttribute('aria-pressed'),'false','Hidden faces off to start');
  click($('#hidden'));assert.ok(Q().hidden&&$('#hidden').getAttribute('aria-pressed')==='true','Hidden faces on');
  assert.strictEqual(storage.getItem('cw:hidden'),'true','kept as the site keeps it');
  // no demo and no keys: the cube is the real one
  assert.ok(!$('#demo'),'no Demo cube');
  const before=Q().target;d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'F',bubbles:true}));assert.ok(Q().target.equals(before),'a key turns nothing');
  // Drill Sune: the picture is a Sune as held, whatever the real cube shows; the cube's turns turn it
  const real0=Q().real;assert.ok(real0&&real0.equals(c3)&&!real0.isSolved(),'the real cube is mixed');
  Q().solvedMs=80;assert.strictEqual($('#drill').textContent,'Drill Sune');
  click($('#drill'));const D=Q().drill;assert.ok(D&&D.c.id==='co-sune','Drill Sune starts');
  assert.ok(Q().shown.equals(D.setup)&&D.p0.equals(real0),'the picture is the Sune, from the cube as it is');
  assert.strictEqual(Q().moves.length,0,'the list starts empty');assert.strictEqual(Q().stage.name,'Sune','the stage reads Sune');
  assert.ok($('#drill').textContent==='Stop drill'&&$('#drill').getAttribute('aria-pressed')==='true','the chip stops it');
  // the Sune on the real cube, as held (yellow up, red in front): each held face is the real face the hold puts there
  const FN=['U','R','F','D','L','B'],real=m=>FN[Q().hold.cube.center[FN.indexOf(m[0])]]+m.slice(1);
  let r=real0;
  for(const m of "R U R' U R U2 R'".split(' ')){r=w.applyAlg(r,[real(m)]);set(r);dev.notify(moveMsg());assert.ok(await until(()=>Q().real.equals(r)),'the cube turns '+m);}
  assert.strictEqual(Q().moves.join(' '),"R U R' U R U2 R'",'the list reads the Sune as held');
  assert.ok(Q().target.isSolved()&&Q().drill.solved,'the picture is solved');
  assert.ok(!$('#toast').hidden&&/Sune comes again/.test($('#toast').textContent),'Solved shows: '+$('#toast').textContent);
  assert.strictEqual($('#drillNote').textContent,'1 solved','one solved');
  assert.ok(await until(()=>!Q().drill.solved),'then the case comes again');
  assert.ok($('#toast').hidden&&Q().shown.equals(D.setup)&&Q().drill.p0.equals(r)&&!Q().moves.length,'the Sune, from the cube as it is now, and an empty list');
  // a turn turns the picture, not the case
  r=w.applyAlg(r,[real('R')]);set(r);dev.notify(moveMsg());assert.ok(await until(()=>Q().moves.join()==='R'),'a turn goes on the list');
  assert.ok(Q().target.equals(w.applyAlg(D.setup,[real('R')])),'and turns the picture');
  // a new hold: the case again, set up for it
  click(tile('up',0));assert.strictEqual(Q().hold.id,'white-red');
  assert.ok(Q().shown.equals(w.questDrillSetup("R U R' U R U2 R'",Q().hold))&&!Q().moves.length,'the Sune as the new hold has it');
  assert.strictEqual(Q().stage.name,'Sune','and it reads Sune');
  // Stop drill: the real cube again
  click($('#drill'));assert.ok(!Q().drill&&Q().shown.equals(r),'Stop drill: the picture is the real cube');
  assert.strictEqual($('#drill').textContent,'Drill Sune');assert.strictEqual($('#drillNote').textContent,'');
  // any case by name, for the voice to come
  w.questDrill('T perm');assert.strictEqual(Q().drill.c.id,'pll-T','a drill by name');w.questDrill(null);assert.ok(!Q().drill&&Q().shown.equals(r));
  click($('#disconnect'));assert.ok(!Q().conn&&!$('#connect').hidden,'Disconnect');
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
  // a state as a cube sends it: one move from the last turns, and goes on the list
  Q().shown=Q().target=w.eval('new Cube()');w.questShow(w.applyAlg(Q().shown,['R']));
  assert.strictEqual(Q().moves.join(),'R','the move is on the list');assert.ok(Q().anim||Q().queue.length,'and turns');
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
  assert.strictEqual(scenes.length,1,'one view drawn');assert.ok(scenes[0].panel&&/A tilt/.test(scenes[0].panel.lines.hint),'the panel with the controller hints');
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
  // hands first: two tracked hands, the right one free, the left one on the real cube
  const tips={};const handOf=side=>{const j=new Map(['index-finger-tip','thumb-tip','wrist'].map(n=>[n,{side,n}]));return {handedness:side,hand:j,targetRaySpace:'ray'};};
  const R=handOf('right'),Lh=handOf('left');session.inputSources.length=0;session.inputSources.push(R,Lh);
  frame.getJointPose=(j)=>{const p=(tips[j.side]||{})[j.n];return p?{transform:{position:{x:p[0],y:p[1],z:p[2]},orientation:{x:0,y:0,z:0,w:1}},radius:0.008}:null;};
  const v3=(a,b)=>a.map((v,i)=>v+b[i]);
  const tip=(side,p)=>{tips[side]={'index-finger-tip':p,'thumb-tip':p,wrist:v3(p,[0,-0.05,0.1])};};
  x.placed=false;step();assert.ok(near(x.pos,[0,1.44,-0.45]),'back in front for the hands');
  tip('left',[0,1.1,-0.3]);tip('right',[0.3,1.3,-0.3]);step();
  const sc=()=>scenes[scenes.length-1];
  assert.ok(/Poke a button/.test(sc().panel.lines.hint),'the hint speaks to the hands: '+sc().panel.lines.hint);
  assert.ok(sc().bar&&sc().bar.buttons.length===15,'the rows of buttons are drawn');
  assert.strictEqual(sc().bar.buttons.slice(0,7).map(b=>b.id).join(),'tilt,level,clear,hidden,smaller,larger,panel');
  const ids=sc().bar.buttons.map(b=>b.id),at=id=>ids.indexOf(id);
  const barAt=(i,z)=>{const c=w.questBarCenterNow(x),r=sc().bar.rects[i];return [c[0]+r.x,c[1]+r.y,c[2]+z];};
  const press=i=>{tip('right',barAt(i,0.05));step();tip('right',barAt(i,-0.004));step();};
  assert.ok(barAt(0,0)[1]<x.pos[1]-w.questGrabRadius(x.edge),'the row is under the cube, clear of a pinch on it');
  // a poke on Tilt toggles it, once
  const t0=Q().tilt;tip('right',barAt(0,0.02));step();assert.ok(sc().bar.buttons[0].hover,'the fingertip lights Tilt');
  tip('right',barAt(0,-0.004));step();assert.strictEqual(Q().tilt,!t0,'a poke on Tilt toggles it');
  assert.ok(sc().bar.buttons[0].lit,'and flashes');
  step();assert.strictEqual(Q().tilt,!t0,'once per poke');
  press(0);assert.strictEqual(Q().tilt,t0,'a second poke toggles it back');
  // Larger and Smaller
  const e1=x.edge,y1=barAt(0,0)[1];press(at('larger'));assert.ok(Math.abs(x.edge-e1*1.25)<1e-9,'Larger: '+x.edge);
  assert.ok(barAt(0,0)[1]<y1,'the row moves down with a larger cube');
  press(at('smaller'));assert.ok(Math.abs(x.edge-e1)<1e-9,'Smaller: '+x.edge);
  // Clear
  assert.ok(Q().moves.length>0,'moves to clear');press(at('clear'));assert.strictEqual(Q().moves.length,0,'a poke on Clear clears the moves');
  assert.ok(sc().bar.buttons[at('clear')].off,'Clear is off with no moves');
  // the panel button hides and shows the panel
  press(at('panel'));assert.ok(!sc().panel,'Hide panel');
  assert.strictEqual(sc().bar.buttons[at('panel')].label,'Show panel','the button says what it does next');
  press(at('panel'));assert.ok(sc().panel,'Show panel');
  // Hidden faces: the mirrors of the faces turned away, and the rows step down clear of them
  assert.ok(!sc().hidden,'no mirrors to start');const y2=barAt(0,0)[1];
  press(at('hidden'));assert.ok(Q().hidden&&sc().hidden&&sc().hidden.includes(5),'Hidden faces: the back has a mirror: '+sc().hidden);
  assert.ok(barAt(0,0)[1]<y2,'the rows move down, under the mirrors');
  press(at('hidden'));assert.ok(!Q().hidden&&!sc().hidden,'and off again');
  // the hold's tiles
  press(at('top-yellow'));assert.strictEqual(Q().hold.id,'yellow-green','a poke on the yellow tile: yellow on top');
  assert.ok(sc().bar.buttons[at('top-yellow')].on,'its tile is on');
  press(at('front-blue'));assert.strictEqual(Q().hold.id,'yellow-blue','a front tile');
  press(at('top-white'));press(at('front-green'));assert.strictEqual(Q().hold.id,'white-green','back to white up, green front');
  // Drill Sune on the third row: the picture is the case; solved, a card shows, then the case again
  press(at('drill'));const DX=Q().drill;assert.ok(DX&&Q().shown.equals(DX.setup),'a poke on Drill Sune: the picture is a Sune');
  assert.strictEqual(sc().bar.buttons[at('drill')].label,'Stop drill');assert.ok(sc().bar.buttons[at('drill')].on);
  assert.strictEqual(sc().panel.lines.stage,'Drill: Sune · 0 solved','the panel says the drill');assert.ok(!sc().toast,'no card yet');
  const realY=DX.p0.mul(DX.setup.inverse()); // the real state that solves the picture
  Q().solvedMs=40;w.questShow(realY);step();
  assert.ok(Q().drill.solved&&sc().toast&&sc().toast.lines.text==='Solved!','solved in the picture: the card shows');
  assert.ok(w.m4Point(sc().toast.model,[0,0,0])[2]>x.pos[2],'in front of the cube, toward the user');
  assert.strictEqual(sc().panel.lines.stage,'Drill: Sune · 1 solved');
  await sleep(80);step();assert.ok(!sc().toast&&Q().shown.equals(DX.setup),'then the case again');
  press(at('drill'));assert.ok(!Q().drill&&Q().shown.equals(realY)&&Q().real.equals(realY),'Stop drill: the real cube');
  // Exit: the first poke asks, a second ends the session; another button in between, or a wait, takes the ask back
  press(at('exit'));assert.ok(Q().xr,'one poke on Exit does not end the session');
  assert.strictEqual(sc().bar.buttons[at('exit')].label,'Poke again','Exit asks for a second poke');
  press(at('level'));assert.strictEqual(sc().bar.buttons[at('exit')].label,'Exit','another button takes the ask back');
  press(at('exit'));for(let k=0;k<200;k++)step();assert.strictEqual(sc().bar.buttons[at('exit')].label,'Exit','the ask runs out');
  // a short pinch away from the cube does nothing; a held one by a free hand brings it back
  const hev=(type,src)=>(handlers[type]||[]).forEach(f=>f({type,inputSource:src,frame}));
  x.pos=[0.3,1.4,-0.6];x.placed=true;const away=[0.35,1.25,-0.25];
  tip('right',away);step();hev('selectstart',R);step();hev('selectend',R);hev('select',R);step();
  assert.ok(near(x.pos,[0.3,1.4,-0.6]),'a short pinch away leaves the cube where it is');
  hev('selectstart',R);for(let k=0;k<45;k++)step();
  assert.ok(near(x.pos,[0,1.44,-0.45]),'a pinch held by a free hand brings it back: '+x.pos);hev('selectend',R);hev('select',R);
  // two hands on the real cube: a held pinch does nothing
  x.pos=[0.3,1.4,-0.6];x.placed=true;tip('left',v3(away,[-0.08,0,0]));step();
  hev('selectstart',R);for(let k=0;k<45;k++)step();hev('selectend',R);hev('select',R);
  assert.ok(near(x.pos,[0.3,1.4,-0.6]),'a pinch with the other hand near (both on the real cube) leaves the cube');
  // a pinch on the cube carries it, and the carrying fingertip presses nothing
  tip('left',[0,1.1,-0.3]);tip('right',[0.3,1.4,-0.6]);step();hev('selectstart',R);assert.ok(x.grab,'a pinch on the cube takes it');
  tip('right',[0.2,1.4,-0.5]);step();assert.ok(near(x.pos,[0.2,1.4,-0.5]),'and carries it: '+x.pos);
  hev('selectend',R);hev('select',R);step();assert.ok(near(x.pos,[0.2,1.4,-0.5]),'and leaves it there');
  // two pokes on Exit end the session
  x.placed=false;step();press(at("exit"));press(at("exit"));assert.ok(!Q().xr,'Exit, then a second poke: the session ends');
  // VR: the floor and the controller drawn, the hands not
  $('#enterVR').click();assert.ok(await until(()=>!!Q().xr));scenes.length=0;step();
  assert.strictEqual(scenes[0].extras.length,1,'VR with hands: the floor alone, no hands drawn');
  session.inputSources.length=0;session.inputSources.push(ctrl);scenes.length=0;step();
  assert.strictEqual(scenes[0].extras.length,2,'VR: the floor and the controller');
  // the left stick's press ends the session
  const left={handedness:'left',gripSpace:'grip',targetRaySpace:'ray',gamepad:{buttons:Array.from({length:6},()=>({pressed:false})),axes:[0,0,0,0]}};
  session.inputSources.push(left);left.gamepad.buttons[3].pressed=true;step();assert.ok(!Q().xr,'the left stick press: the session ends');
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

// The Quest Browser: navigator.bluetooth is there, but getAvailability() says no and requestDevice
// fails with "Bluetooth Low Energy not available." The page takes the bridge. Where Web Bluetooth
// works, a NotFoundError that is no cancel shows its words; a cancel is quiet.
async function questBrowser(){
  const nf=m=>Object.assign(new Error(m),{name:'NotFoundError'});
  const dev=fakeDevice(4,MAC,Object.assign({},SOLVED),{name:'GAN12uiM_A1B2'});
  const quest={getAvailability:async()=>false,requestDevice:async()=>{throw nf('Bluetooth Low Energy not available.');}};
  let r=await boot(fakeBridge([{id:'p1',gen:4,dev,mac:MAC}]),{bluetooth:quest});let $=s=>r.d.querySelector(s);
  assert.deepStrictEqual(r.errs,[]);
  assert.ok(await until(()=>$('#way').textContent==='Mac app bridge test'),'Web Bluetooth with no Bluetooth: the bridge: '+$('#way').textContent);
  assert.ok(await until(()=>r.d.querySelectorAll('#listItems button').length===1),'the bridge lists the cube');
  await sleep(50);r.w.close();
  let fail='Bluetooth adapter not available.';
  const chrome={getAvailability:async()=>true,requestDevice:async()=>{throw nf(fail);}};
  r=await boot(fakeBridge([]),{bluetooth:chrome});$=s=>r.d.querySelector(s);
  assert.ok(await until(()=>$('#way').textContent==='Web Bluetooth'),'Web Bluetooth that works is the way');
  $('#connect').click();
  assert.ok(await until(()=>$('#status').textContent===fail),'no Bluetooth: the status says so: '+$('#status').textContent);
  fail='User cancelled the requestDevice() chooser.';$('#connect').click();
  assert.ok(await until(()=>$('#status').textContent==='Press Connect to look for your cube.'),'a cancel is quiet: '+$('#status').textContent);
  r.w.close();
  console.log('quest browser ok');
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

(async()=>{pure();await page();await xr();await notAsked();await questBrowser();await android();console.log('quest ok');})().catch(e=>{console.error(e);process.exit(1);});
