// The Quest cube lab (quest/): the pure part (matrices, the cubies and stickers, every move's turn
// lands on the next state, the moves between states, the 24 holds and the tiles, the hidden faces'
// mirrors, the rows of buttons, the drill: every case in every hold), then the page over a fake bridge (the list, a connect, a turn
// on the list, the stage, the hold tiles, the tilt, Hidden faces, no demo and no keys, Drill mode: Sune solved
// on the cube and the case again, case names said to a fake speech recognizer), the voice through a fake
// Vosk (the grammar, a name, the model kept; no model, a blocked microphone), then a fake
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
  assert.strictEqual(buttons.map(b=>b.id).join(),'tilt,level,clear,hidden,smaller,larger,panel,top-white,top-yellow,front-green,front-orange,front-blue,front-red,exit,drill,scramble,real,listen');
  assert.ok(buttons.slice(-4).every(b=>b.row===2)&&buttons[buttons.length-4].label==='Drill mode','the third row starts a drill');
  assert.ok(buttons.find(b=>b.id==='listen').label==='Listen'&&run('questBarButtons')({listen:true}).find(b=>b.id==='listen').label==='Stop listening','Listen, and Stop listening while it hears');
  const app=run('questBarButtons')({app:true}).map(b=>b.id);
  assert.strictEqual(app.join(),'tilt,level,clear,hidden,smaller,larger,panel,top-white,top-yellow,front-green,front-orange,front-blue,front-red,here,follow,drill,scramble,real,listen,exit','in the app: Bring here and In my hands on the second row, Quit last');
  const appB=run('questBarButtons')({app:true,follow:true,exit:true});
  assert.ok(appB.find(b=>b.id==='follow').on&&appB.find(b=>b.id==='exit').label==='Poke again'&&appB.find(b=>b.id==='exit').row===2,'In my hands lit; Quit asks for a second poke');
  assert.strictEqual(run('questBarButtons')({tilt:true,still:true}).find(b=>b.id==='tilt').label,'No tilt yet','a live cube with no tilt reading yet');
  assert.ok(buttons.find(b=>b.id==='real').off&&!run('questBarButtons')({over:true}).find(b=>b.id==='real').off,'Real cube state: off on the real cube');
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
  voice();
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

// The drill's voice (quest/voice.js): every case of the drill by its names, the words Vosk is told,
// the commands, a tie between sets, talk.
function voice(){
  const run=require('./vm-load')('js/engine.js','js/algs.js','js/stage.js','js/draw.js','lab/smack.js','quest/core.js','js/listen-match.js','js/smart-words.js','quest/voice.js');
  const cat=run('questVoiceCatalog()'),g=run('questVoiceGrammar')(cat),act=run('questVoiceAction'),vcase=run('questVoiceCase'),cmd=run('questVoiceCommand');
  assert.ok(cat.length&&!cat.some(e=>e.set==='f2l'),'two-look OLL and PLL and the full PLL, no F2L');
  const ids=new Set(cat.map(e=>vcase(e).id));
  for(const c of run('questDrillCases()'))assert.ok(ids.has(c.id),'a name drills '+c.id);
  // every name of every case, as a dictation gives it, drills that case, with the drill in its set or the other
  let n=0;
  for(const e of cat)for(const s of e.say)for(const sec of [e.set,e.set==='oll'?'pll':'oll']){
    const text=e.set==='pll'?s+' perm':s;if(s.length===1&&e.set==='oll'&&sec!==e.set)continue; // a letter alone goes to the set drilled
    const a=act([text],null,sec,cat),h=a.hit;
    assert.ok(h&&vcase(h).id===vcase(e).id,`"${text}" (drilling ${sec}) drills ${vcase(e).id}: `+(h?vcase(h).id:JSON.stringify((a.choices||[]).map(c=>c.id))));n++;}
  assert.ok(n>100,'names checked: '+n);
  // the words Vosk is told: each one the small English model has, no letter alone, the commands
  for(const w of ['antisune','oll','sooney','chamelion'])assert.ok(!g.some(p=>p.split(' ').includes(w)),'no '+w+': the model has no such word');
  assert.ok(!g.some(p=>/^[a-z]$/.test(p)),'no letter alone');
  for(const p of ['sune','anti sune','headlights','chameleon','t perm','u a perm','g a perm','stop drill','again','[unk]'])assert.ok(g.includes(p),'the grammar has "'+p+'"');
  const cube=run('smartCommand'),phr=run('questVoiceCubePhrases()');
  for(const p of ['yellow up','green front','top yellow front green','x prime','turn y','clear moves','reset'])assert.ok(g.includes(p),'the grammar has "'+p+'"');
  for(const p of phr){const c=cube(p);assert.ok(c&&c.cmd!=='error','"'+p+'" is a cube command');const a=act([p],null,'oll',cat);assert.ok(a.cube&&!a.hit,'"'+p+'" names no case');}
  for(const p of g.filter(p=>p!=='[unk]'&&!cmd(p)&&!cube(p)&&!/^(first|second|third)$/.test(p))){const a=act([p],null,null,cat);assert.ok(a.hit||a.choices,'"'+p+'" names a case');}
  // commands
  for(const t of ['stop drill','Stop the drill please','end drill','exit drill mode'])assert.strictEqual(cmd(t),'stop',t);
  for(const t of ['again','next','one more'])assert.strictEqual(cmd(t),'again',t);
  assert.strictEqual(cmd('Reset'),null,'"reset" is a cube command');assert.strictEqual(act(['reset'],null,null,cat).cube.cmd,'reset');
  // the hold a command names, from the hold now, and a turn of the whole cube, as held
  const H=run('QUEST_HOLDS'),hold=(t,cur)=>{const h=run('questVoiceHold')(cube(t),H[cur]);return h&&h.id;},turn=run('questHoldTurn');
  assert.strictEqual(hold('yellow up','white-green'),'yellow-green','"yellow up": the front stays');
  assert.strictEqual(hold('yellow on top','white-red'),'yellow-red','from red in front too');
  assert.strictEqual(hold('green front','yellow-red'),'yellow-green','"green front": the top stays');
  assert.strictEqual(hold('top yellow front blue','white-green'),'yellow-blue','both');
  assert.strictEqual(hold('bottom white','white-green'),'yellow-green','"bottom white": yellow on top');
  assert.strictEqual(hold('white toward me','white-green'),null,'a front on top is no hold');
  assert.strictEqual(cube('top white bottom red').cmd,'error','a pair that is no pair');
  assert.deepStrictEqual(['x',"x'",'y','z','x2'].map(m=>turn(H['white-green'],m).id),['green-yellow','blue-white','white-red','orange-green','yellow-blue'],'x, y, z as held');
  assert.strictEqual(run('questHoldWords')(H['yellow-green']),'yellow up, green in front');
  for(const t of ['stop','T perm','again and again'])assert.strictEqual(cmd(t),null,'"'+t+'" is no command');
  assert.strictEqual(act(['stop drill'],null,'oll',cat).cmd,'stop');
  // "T" alone: the set drilled now; with none, the line asks, and the next words pick
  assert.strictEqual(vcase(act(['t'],null,'oll',cat).hit).id,'co-T','T while an OLL case: the T OLL');
  assert.strictEqual(vcase(act(['t'],null,'pll',cat).hit).id,'pll-T','T while a PLL case: the T perm');
  const ask=act(['t'],null,null,cat);assert.ok(!ask.hit&&ask.choices.length===2,'with no drill, T asks');
  assert.strictEqual(vcase(act(['the perm'],ask.choices,null,cat).pick).id,'pll-T','"the perm" picks');
  assert.ok(!act(['I have two dogs and a cat'],null,'oll',cat).hit,'talk names nothing');
  for(const sec of [null,'pll'])assert.strictEqual(vcase(act(['double sune a'],null,sec,cat).hit).id,'co-H','a stray word after "double sune": the longer name wins');
  assert.strictEqual(run('questVoiceClean')('[unk] t perm [unk]'),'t perm');
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
  const dom=new JSDOM(src,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','quest','index.html')+(opts.query||''),virtualConsole:vc,
    beforeParse(w){Object.defineProperty(w,'localStorage',{value:opts.storage||fakeStorage()});
      if(opts.speech)w.SpeechRecognition=opts.speech.R;
      if(opts.vosk)opts.vosk.install(w);
      if(opts.native)opts.native.install(w);
      if(opts.xr)Object.defineProperty(w.navigator,'xr',{value:opts.xr});
      if(opts.bluetooth)Object.defineProperty(w.navigator,'bluetooth',{value:opts.bluetooth});
      if(opts.android){opts.android.install(w);w.fetch=async()=>({ok:false});return;}
      w.BRIDGE_LOCAL=true;w.WebSocket=bridge.FakeWebSocket;w.fetch=async u=>u==='/bridge/info'?{ok:true,json:async()=>bridgeInfo()}:/model\.tar\.gz$/.test(u)&&opts.vosk&&opts.vosk.missing?{ok:false,status:404}:{ok:false};}});
  const w=dom.window;
  return new Promise(res=>w.addEventListener('load',()=>setTimeout(()=>res({w,d:w.document,errs}),300)));
}
// The browser's speech recognition: each new recognizer is kept; say() gives the last one a result.
function fakeSpeech(){
  const recs=[];
  class R{constructor(){recs.push(this);this.starts=0;this.stopped=false;}start(){this.starts++;}stop(){this.stopped=true;}}
  const say=(text,final=true)=>{const res=[{transcript:text}];res.isFinal=final;recs[recs.length-1].onresult({resultIndex:0,results:[res]});};
  return {R,recs,say};
}
// Vosk, the microphone and the page's audio. opts.missing: no model on the server; opts.blocked: the microphone is refused.
function fakeVosk(opts={}){
  const f={models:0,k:null,removed:0,stopped:0,...opts};
  f.install=w=>{
    if(!f.missing)w.Vosk={createModel:async url=>{f.models++;f.url=url;return {KaldiRecognizer:class{constructor(rate,g){f.rate=rate;f.grammar=JSON.parse(g);f.h={};f.k=this;}on(e,fn){f.h[e]=fn;}acceptWaveform(){}remove(){f.removed++;}}};}};
    Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia:async()=>{if(f.blocked)throw Object.assign(new Error('denied'),{name:'NotAllowedError'});return {getTracks:()=>[{stop(){f.stopped++;}}]};}}});
    w.AudioContext=class{constructor(){this.sampleRate=48000;this.state='running';this.destination={};}createMediaStreamSource(){return {connect(){},disconnect(){}};}
      createScriptProcessor(){return {connect(){},disconnect(){}};}close(){return Promise.resolve();}resume(){return Promise.resolve();}};};
  return f;
}
const moveMsg=()=>Uint8Array.from([0x01,...Array(19).fill(0)]); // a gen 4 move message

async function page(){
  const cube={};const set=c=>Object.assign(cube,{cp:[...c.cp],co:[...c.co],ep:[...c.ep],eo:[...c.eo]});set(SOLVED);
  const dev=fakeDevice(4,MAC,cube,{name:'GAN12uiM_A1B2'});
  const storage=fakeStorage(),speech=fakeSpeech();
  const {w,d,errs}=await boot(fakeBridge([{id:'p1',gen:4,dev,mac:MAC}]),{storage,speech});
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
  // Drill mode: the picture is a Sune as held, whatever the real cube shows; the cube's turns turn it
  const real0=Q().real;assert.ok(real0&&real0.equals(c3)&&!real0.isSolved(),'the real cube is mixed');
  Q().solvedMs=80;assert.strictEqual($('#drill').textContent,'Drill mode');assert.ok($('#voice').hidden,'no voice line yet');
  click($('#drill'));const D=Q().drill;assert.ok(D&&D.c.id==='co-sune','Drill mode starts with Sune');
  assert.ok(speech.recs.length===1&&speech.recs[0].starts===1&&speech.recs[0].continuous,'and listens, until it ends');
  assert.ok(!$('#voice').hidden&&/Say a case name/.test($('#voice').textContent),'the line asks for a case name: '+$('#voice').textContent);
  assert.ok(Q().shown.equals(D.setup)&&D.p0.equals(real0),'the picture is the Sune, from the cube as it is');
  assert.strictEqual(Q().moves.length,0,'the list starts empty');assert.strictEqual(Q().stage.name,'Sune','the stage reads Sune');
  assert.ok($('#drill').textContent==='Stop drill'&&$('#drill').getAttribute('aria-pressed')==='true','the chip stops it');
  // the Sune on the real cube, as held (yellow up, red in front): each held face is the real face the hold puts there
  const FN=['U','R','F','D','L','B'],real=m=>FN[Q().hold.cube.center[FN.indexOf(m[0])]]+m.slice(1);
  let r=real0;
  for(const m of "R U R' U R U2 R'".split(' ')){r=w.applyAlg(r,[real(m)]);set(r);dev.notify(moveMsg());assert.ok(await until(()=>Q().real.equals(r)),'the cube turns '+m);}
  assert.strictEqual(Q().moves.join(' '),"R U R' U R U2 R'",'the list reads the Sune as held');
  assert.ok(Q().target.isSolved()&&Q().drill.solved,'the picture is solved');
  assert.ok(!$('#toast').hidden&&/Sune in 2…/.test($('#toast').textContent),'Solved shows a count: '+$('#toast').textContent);
  assert.ok(await until(()=>/Sune in 1…/.test($('#toast').textContent)),'the count goes to 1: '+$('#toast').textContent);
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
  // the voice: a case name drills it, as held, from the cube as it is
  speech.say('so what',false);assert.ok(/Heard so far/.test($('#voice').textContent)&&Q().drill.c.id==='co-sune','an early guess only shows');
  speech.say('T perm');assert.strictEqual(Q().drill.c.id,'pll-T','"T perm" drills the T perm');
  assert.ok(Q().shown.equals(w.questDrillSetup(Q().drill.c.alg,Q().hold))&&Q().drill.p0.equals(r)&&!Q().moves.length,'set up as held, from the cube as it is');
  assert.ok(/Drilling T perm\..*Heard: "T perm"/.test($('#voice').textContent),'the line: '+$('#voice').textContent);
  assert.strictEqual(storage.getItem('cw:questDrill'),'"pll-T"','the case is kept');
  assert.ok(/Drilling T perm/.test(w.questPanelLines().hint),'the panel says it too');
  speech.say('headlights');assert.strictEqual(Q().drill.c.id,'co-U','"headlights": the U OLL');
  speech.say('T');assert.strictEqual(Q().drill.c.id,'co-T','"T" while an OLL case: the T OLL');
  r=w.applyAlg(r,[real('R')]);set(r);dev.notify(moveMsg());assert.ok(await until(()=>Q().moves.length===1),'a turn');
  speech.say('again');assert.ok(Q().drill.c.id==='co-T'&&!Q().moves.length&&Q().drill.p0.equals(r),'"again": the case again, from the cube as it is');
  speech.say('I have two dogs');assert.ok(Q().drill.c.id==='co-T'&&/No case name heard/.test($('#voice').textContent),'talk changes nothing');
  speech.say('stop');assert.ok(Q().drill,'"stop" alone does not end the drill');
  // the Smart cube tab's cube commands: the hold, a turn, clear moves, reset
  speech.say('yellow up');assert.strictEqual(Q().hold.id,'yellow-red','"yellow up": the front stays red');
  assert.ok(Q().drill.c.id==='co-T'&&Q().shown.equals(w.questDrillSetup(Q().drill.c.alg,Q().hold)),'the case, set up for the new hold');
  assert.ok(/Held yellow up, red in front\. T \(chameleon\) is set up that way\./.test($('#voice').textContent),'the line: '+$('#voice').textContent);
  speech.say('green front');assert.strictEqual(Q().hold.id,'yellow-green','"green front": the top stays');
  speech.say('top yellow, front green');assert.ok(/Already held yellow up, green in front/.test($('#voice').textContent),'the same hold: '+$('#voice').textContent);
  speech.say('green toward me with white on top');assert.strictEqual(Q().hold.id,'white-green','a hold in other words');
  speech.say('x prime');assert.ok(Q().hold.id==='blue-white'&&/Turned x'\. Held blue up, white in front/.test($('#voice').textContent),'"x prime" turns the hold: '+$('#voice').textContent);
  speech.say('top white bottom red');assert.ok(Q().hold.id==='blue-white'&&/not opposite/.test($('#voice').textContent),'no such hold: the line says so');
  speech.say('top white front green');assert.strictEqual(Q().hold.id,'white-green');
  r=w.applyAlg(r,[real('R')]);set(r);dev.notify(moveMsg());assert.ok(await until(()=>Q().moves.length===1),'a turn');
  speech.say('clear moves');assert.ok(!Q().moves.length&&/The moves are cleared/.test($('#voice').textContent),'"clear moves"');
  speech.say('clear');assert.ok(/No moves to clear/.test($('#voice').textContent),'nothing to clear');
  r=w.applyAlg(r,[real('U')]);set(r);dev.notify(moveMsg());assert.ok(await until(()=>Q().moves.length===1),'a turn');
  speech.say('reset');assert.ok(!Q().moves.length&&Q().drill.p0.equals(r)&&/Reset\. T \(chameleon\) again\./.test($('#voice').textContent),'"reset": the case again: '+$('#voice').textContent);
  // "stop drill": the real cube again, and the microphone off
  speech.say('stop drill');assert.ok(!Q().drill&&Q().shown.equals(r),'"stop drill": the picture is the real cube');
  assert.ok(speech.recs[0].stopped&&!w.questVoiceOn(),'and the listening stops');
  assert.strictEqual($('#drill').textContent,'Drill mode');assert.strictEqual($('#drillNote').textContent,'');assert.ok($('#voice').hidden);
  // Drill mode again: the last case drilled, a new recognizer; the chip ends it
  click($('#drill'));assert.ok(Q().drill.c.id==='co-T'&&speech.recs.length===2,'Drill mode starts with the last case');
  click($('#drill'));assert.ok(!Q().drill&&speech.recs[1].stopped&&Q().shown.equals(r),'Stop drill: the real cube, the listening off');
  // any case by name, for the voice to come
  w.questDrill('T perm');assert.strictEqual(Q().drill.c.id,'pll-T','a drill by name');w.questDrill(null);assert.ok(!Q().drill&&Q().shown.equals(r));
  // New scramble: a scramble on the picture, over the real cube as it is; solved, another comes
  assert.ok($('#real').disabled,'Real cube state: off on the real cube');
  click($('#scramble'));const S=Q().drill;
  assert.ok(S&&S.scramble&&S.c.moves.split(' ').length===20&&Q().shown.equals(S.setup)&&S.p0.equals(r)&&!$('#real').disabled,'New scramble: the scramble on the picture');
  assert.ok(S.setup.equals(w.questDrillSetup(w.invertAlg(S.c.moves),Q().hold)),'as held');
  assert.strictEqual($('#drill').textContent,'Drill mode','it is no drill');assert.ok(!w.questVoiceOn(),'and nothing listens');
  assert.strictEqual(w.questPanelLines().stage,'Scramble · 0 solved','the panel says the scramble');
  for(const m of w.invertAlg(S.c.moves).split(' ')){r=w.applyAlg(r,[real(m)]);set(r);dev.notify(moveMsg());assert.ok(await until(()=>Q().real.equals(r)),'the cube turns '+m);}
  assert.ok(Q().drill.solved&&/New scramble in 2…/.test($('#toast').textContent),'solved: '+$('#toast').textContent);
  assert.ok(await until(()=>Q().drill!==S&&Q().drill.scramble),'then a new scramble');
  assert.ok(Q().drill.reps===1&&Q().drill.c.moves!==S.c.moves&&Q().drill.p0.equals(r)&&Q().shown.equals(Q().drill.setup),'the count goes on, from the cube as it is');
  // Drill mode from a scramble, then New scramble ends Drill mode
  click($('#drill'));assert.ok(Q().drill&&!Q().drill.scramble&&w.questVoiceOn()&&$('#drill').textContent==='Stop drill','Drill mode from a scramble: a drill');
  click($('#scramble'));assert.ok(Q().drill.scramble&&!w.questVoiceOn()&&$('#drill').textContent==='Drill mode','New scramble ends Drill mode');
  // Real cube state: the scramble ends, and the cube's own state is read again, with nothing on the list
  r=w.applyAlg(r,[real('R')]);set(r);dev.notify(moveMsg());assert.ok(await until(()=>Q().moves.length===1),'a turn');
  click($('#real'));assert.ok(!Q().drill&&$('#real').disabled,'Real cube state: the scramble ends');
  assert.ok(await until(()=>Q().shown.equals(r)&&!Q().moves.length),'the cube as it is, read again, nothing on the list');
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
  assert.ok(sc().bar&&sc().bar.buttons.length===18,'the rows of buttons are drawn');
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
  // Drill mode on the third row: the picture is the case; solved, a card shows, then the case again
  press(at('drill'));const DX=Q().drill;assert.ok(DX&&Q().shown.equals(DX.setup),'a poke on Drill mode: the picture is a Sune');
  step();assert.ok(/no microphone/.test(sc().panel.lines.hint),'no microphone here: the panel says so: '+sc().panel.lines.hint);
  assert.strictEqual(sc().bar.buttons[at('drill')].label,'Stop drill');assert.ok(sc().bar.buttons[at('drill')].on);
  assert.strictEqual(sc().panel.lines.stage,'Drill: Sune · 0 solved','the panel says the drill');assert.ok(!sc().toast,'no card yet');
  const realY=DX.p0.mul(DX.setup.inverse()); // the real state that solves the picture
  Q().solvedMs=40;w.questShow(realY);step();
  assert.ok(Q().drill.solved&&sc().toast&&sc().toast.lines.text==='Solved!','solved in the picture: the card shows');
  assert.ok(w.m4Point(sc().toast.model,[0,0,0])[2]>x.pos[2],'in front of the cube, toward the user');
  assert.strictEqual(sc().panel.lines.stage,'Drill: Sune · 1 solved');
  await sleep(80);step();assert.ok(!sc().toast&&Q().shown.equals(DX.setup),'then the case again');
  press(at('drill'));assert.ok(!Q().drill&&Q().shown.equals(realY)&&Q().real.equals(realY),'Stop drill: the real cube');
  assert.ok(sc().bar.buttons[at('real')].off,'Real cube state is off');
  press(at('scramble'));assert.ok(Q().drill&&Q().drill.scramble&&Q().shown.equals(Q().drill.setup)&&!sc().bar.buttons[at('real')].off,'a poke on New scramble: a scramble on the picture');
  step();assert.strictEqual(sc().panel.lines.stage,'Scramble · 0 solved');
  press(at('real'));assert.ok(!Q().drill&&Q().shown.equals(realY),'a poke on Real cube state: the real cube');
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

// The Quest app (quest/spatial/) as the page sees it: TwistwrightQuest takes the geometry and the
// frames; TwistwrightSpeech is the headset's speech service. opts.none: no speech service.
function fakeNative(opts={}){
  const f={geo:[],frames:[],starts:[],stops:0,w:null};
  f.install=w=>{f.w=w;
    w.TwistwrightQuest={geometry(j){assert.strictEqual(typeof j,'string');f.geo.push(JSON.parse(j));},frame(j){assert.strictEqual(typeof j,'string');f.frames.push(JSON.parse(j));},here(){if(f.here)f.here();},quit(){if(f.quit)f.quit();}};
    w.TwistwrightSpeech={start(j){f.starts.push(JSON.parse(j));return opts.none?'none':'ok';},stop(){f.stops++;}};};
  f.ev=e=>f.w.questSpeechEvent(e);
  return f;
}
// The page in the Quest app: the geometry once, a frame per change of the picture (a layer part way
// through, then the state after it), no preview of its own, and the voice through the app.
async function spatial(){
  const n=fakeNative(),{w,d,errs}=await boot(fakeBridge([]),{native:n});
  const $=s=>d.querySelector(s),Q=()=>w.questState();
  assert.deepStrictEqual(errs,[]);
  assert.ok(d.body.classList.contains('native')&&Q().r===null,'the app draws the cube: no preview here');
  assert.strictEqual(n.geo.length,1,'the geometry goes once');
  const g=n.geo[0];
  assert.ok(g.stickers.length===54&&g.cubies.length===26&&Object.keys(g.moves).length===18&&g.colors.length===6,'54 stickers, 26 cubies, 18 moves, 6 colors');
  assert.deepStrictEqual(g.moves.R,{n:[1,0,0],deg:-90,layers:[1]},'R: the right layer, a quarter turn');
  assert.ok(await until(()=>n.frames.length>0),'a first frame');
  assert.ok(n.frames[0].f===''&&n.frames[0].q.length===4,'no cube yet: no facelets');
  const C=w.eval('Cube'),R=w.applyAlg(new C(),['R']);
  w.questJump(new C());w.questShow(R);
  assert.ok(await until(()=>n.frames.some(f=>f.m==='R'&&f.t>0&&f.t<1)),'R part way through');
  assert.ok(await until(()=>{const f=n.frames[n.frames.length-1];return f.m===''&&f.f===R.toFacelets().join('');}),'then the state after R');
  const k=n.frames.length;await sleep(80);assert.strictEqual(n.frames.length,k,'no frame while nothing changes');
  // the rows of buttons under the app's cube, and what a press on them does
  const last=()=>n.frames[n.frames.length-1],btn=id=>last().bar.find(b=>b.id===id);
  assert.ok(g.faces===undefined&&g.mirror&&g.mirror.dist===2.4&&g.mirror.reach>4,'the mirrors\' sizes go with the geometry');
  assert.ok(last().bar&&btn('here')&&btn('follow')&&btn('exit').label==='Quit'&&btn('listen'),'the app\'s rows: Bring here, In my hands, Listen, Quit');
  assert.ok(last().panel===true&&last().edge===0.12,'the panel shows; the cube is 12 cm');
  assert.ok(last().follow===true&&btn('follow').on&&last().live===false&&last().voice==='','In my hands is on at the start; no cube; the voice is off');
  w.questNativeDo('follow');assert.ok(await until(()=>last().follow===false&&!btn('follow').on),'In my hands, off');
  assert.strictEqual(w.localStorage.getItem('cw:questFollow'),'false','and kept');w.questNativeDo('follow');
  w.questNativeDo('panel');w.questNativeDo('menu');assert.ok(await until(()=>last().panel===true),'the left hand\'s menu pinch shows the panel');
  let quits=0;n.quit=()=>quits++;
  w.questNativeDo('exit');assert.ok(await until(()=>btn('exit').label==='Poke again')&&quits===0,'Quit asks for a second poke');
  w.questNativeDo('exit');assert.strictEqual(quits,1,'the second poke closes the app');
  w.questNativeDo('exit');w.questNativeDo('larger');w.questNativeDo('exit');assert.strictEqual(quits,1,'another button between the two pokes starts over');w.questNativeDo('smaller');
  w.questNativeDo('larger');assert.ok(await until(()=>last().edge===0.15),'Larger: the cube grows');
  w.questNativeDo('smaller');assert.ok(await until(()=>last().edge===0.12),'Smaller');
  w.questNativeDo('panel');assert.ok(await until(()=>last().panel===false&&btn('panel').label==='Show panel'),'Hide panel');
  w.questNativeDo('panel');assert.ok(await until(()=>last().panel===true),'Show panel');
  w.questNativeDo('hidden');assert.ok(await until(()=>last().hidden&&btn('hidden').on),'Hidden faces');
  assert.ok(!$('#hidden').hidden&&w.getComputedStyle($('#hidden')).display!=='none'&&$('#hidden').getAttribute('aria-pressed')==='true','the page\'s Hidden faces too');
  w.questNativeDo('hidden');w.questNativeDo('top-yellow');assert.ok(await until(()=>btn('top-yellow').on),'a hold tile');w.questNativeDo('top-white');
  let heres=0;n.here=()=>heres++;w.questNativeDo('here');$('#here').click();assert.strictEqual(heres,2,'Bring here goes to the app, from the rows and from the page');
  // Listen: the voice without a drill; a case name starts one; the end of the drill keeps listening
  w.questNativeDo('listen');assert.ok(n.starts.length===1&&!Q().drill&&$('#listen').textContent==='Stop listening','Listen starts the voice, with no drill');
  assert.ok(await until(()=>btn('listen').on),'and the rows show it');
  assert.ok(await until(()=>/Asking for the microphone/.test(last().voice)),'the voice\'s line goes to the app: '+last().voice);
  n.ev({type:'ready'});n.ev({type:'final',texts:['sune']});assert.ok(Q().drill&&Q().drill.c.name==='Sune','a case name starts Drill mode');
  assert.ok(await until(()=>/Drilling Sune.*Heard: "sune"/.test(last().voice)),'what was heard, under the cube: '+last().voice);
  n.ev({type:'final',texts:['stop drill']});assert.ok(!Q().drill&&n.stops===0&&/drill is stopped/.test($('#voice').textContent),'"stop drill": the voice listens on');
  n.ev({type:'final',texts:['yellow up']});assert.ok(Q().hold.top===3,'a hold with no drill');n.ev({type:'final',texts:['white up']});
  $('#listen').click();assert.ok(n.stops===1&&$('#listen').textContent==='Listen','Stop listening');
  n.starts.length=0;n.stops=0;
  // the voice
  $('#drill').click();
  assert.strictEqual(n.starts.length,1,'Drill mode starts the app\'s recognizer');
  const bias=n.starts[0].bias;assert.ok(n.starts[0].lang==='en-US'&&bias.includes('sune')&&bias.includes('t perm')&&bias.includes('stop drill'),'biased to the names and the commands');
  assert.ok(!bias.some(b=>b.length<2),'no letter alone');
  assert.ok(/Asking for the microphone/.test($('#voice').textContent));
  n.ev({type:'ready'});assert.ok(/Say a case name/.test($('#voice').textContent),'listening');
  n.ev({type:'partial',texts:['tea']});assert.ok(/Heard so far.*tea/.test($('#voice').textContent));
  n.ev({type:'final',texts:['tea perm','t perm']});assert.strictEqual(Q().drill.c.id,'pll-T','an alternative names the T perm');
  n.ev({type:'ready'});assert.ok(/Drilling T perm/.test($('#voice').textContent),'the next sentence keeps the line');
  n.ev({type:'final',texts:['yellow up']});assert.ok(Q().hold.top===3,'a hold command');
  n.ev({type:'error',msg:'busy'});assert.ok(/The voice stopped: busy/.test($('#voice').textContent)&&Q().drill,'an error: the drill runs on');
  n.ev({type:'final',texts:['stop drill']});assert.ok(!Q().drill&&n.stops===1,'"stop drill": the recognizer stops');
  n.ev({type:'final',texts:['sune']});assert.ok(!Q().drill,'nothing heard after the stop counts');
  $('#drill').click();n.ev({type:'blocked'});assert.ok(/microphone is blocked/.test($('#voice').textContent),'no microphone: the line says so');
  $('#drill').click();w.close();
  const m=fakeNative({none:true}),b=await boot(fakeBridge([]),{native:m});
  b.d.querySelector('#drill').click();
  assert.ok(/no speech service/.test(b.d.querySelector('#voice').textContent)&&b.w.questState().drill,'no speech service: the drill runs without voice');
  b.w.close();
  // the WebView app with no speech of its own says where the voice is
  const a=await boot(null,{android:fakeAndroid(fakeBridge([]))});
  a.d.querySelector('#drill').click();
  assert.ok(/does not hear case names/.test(a.d.querySelector('#voice').textContent),a.d.querySelector('#voice').textContent);
  a.w.close();console.log('quest spatial ok');
}

// The voice through Vosk (?voice=vosk, as on the Quest Browser): the microphone, the model told the
// phrases, a name, the model kept for the next drill; a server with no model; a blocked microphone.
async function vosk(){
  const f=fakeVosk(),{w,d,errs}=await boot(fakeBridge([]),{vosk:f,query:'?voice=vosk'});
  const $=s=>d.querySelector(s),Q=()=>w.questState();
  assert.deepStrictEqual(errs,[]);
  $('#drill').click();assert.ok(Q().drill&&Q().drill.c.id==='co-sune');
  assert.ok(await until(()=>!!f.k),'the recognizer starts');
  assert.ok(/voice\/model\.tar\.gz$/.test(f.url)&&f.rate===48000,'the model from quest/voice/, at the audio rate');
  assert.ok(f.grammar.includes('sune')&&f.grammar.includes('[unk]')&&f.grammar.includes('t perm'),'told the phrases');
  assert.ok(/Say a case name/.test($('#voice').textContent),$('#voice').textContent);
  f.h.partialresult({result:{partial:'g a'}});assert.ok(/Heard so far.*g a/.test($('#voice').textContent));
  f.h.result({result:{text:'[unk] g a perm'}});assert.strictEqual(Q().drill.c.id,'pll-Ga','"G a perm" drills the Ga perm');
  f.h.result({result:{text:''}});assert.strictEqual(Q().drill.c.id,'pll-Ga','nothing heard: nothing changes');
  $('#drill').click();assert.ok(!Q().drill&&f.removed===1&&f.stopped===1,'Stop drill: the recognizer goes, the microphone off');
  const k1=f.k;$('#drill').click();assert.ok(await until(()=>f.k!==k1),'again');assert.strictEqual(f.models,1,'the model is loaded once');
  assert.strictEqual(Q().drill.c.id,'pll-Ga','with the last case');
  $('#drill').click();w.close();
  const m=fakeVosk({missing:true}),b=await boot(fakeBridge([]),{vosk:m,query:'?voice=vosk'});
  b.d.querySelector('#drill').click();
  assert.ok(await until(()=>/No speech model here/.test(b.d.querySelector('#voice').textContent)),'no model: the line says how to get it: '+b.d.querySelector('#voice').textContent);
  assert.ok(b.w.questState().drill&&m.stopped===1,'the drill runs on, the microphone off');b.w.close();
  const k=fakeVosk({blocked:true}),c=await boot(fakeBridge([]),{vosk:k,query:'?voice=vosk'});
  c.d.querySelector('#drill').click();
  assert.ok(await until(()=>/microphone is blocked/.test(c.d.querySelector('#voice').textContent)),'a blocked microphone: the line says so');
  c.w.close();console.log('quest vosk ok');
}

(async()=>{pure();await page();await vosk();await xr();await notAsked();await questBrowser();await android();await spatial();console.log('quest ok');})().catch(e=>{console.error(e);process.exit(1);});
