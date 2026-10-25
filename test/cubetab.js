// The Smart cube tab (js/cubetab.js), with a fake GAN cube (test/fake-gan.js): the seventh tab of
// the CFOP rail, a Connect card before a cube, the page on the tab when a cube connects, the live
// panel with the cube's name and charge, a live cube that turns the layer for each turn (turns
// queue, up to four moves between two states, further away snaps), the turn buttons (x, y, z and
// their primes: the picture turns, the turn goes on the list, the moves and the stage read as the
// cube is held), the tilt (the picture follows the cube in the hands; a cube held unlike the hold
// brings the band with Read as held and Keep this hold; before the first layer turn the heading
// lines up on its own), the moves beside the picture (merged, the last ten, a triangle for more),
// another tab (the turns stop, the moves still count), a dropped link dims the rail's dot and
// offers Connect again, Disconnect puts the Connect card back. No top-bar tab, no floating window,
// no callout.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const {fakeDevice,mfDataFor,gyroMsg,stateMsg,batteryMsg}=require('./fake-gan');
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
  let picks=0;const bt={requestDevice:async()=>{picks++;if(!dev)throw Object.assign(new Error('cancelled'),{name:'NotFoundError'});return dev;}};
  const {w,d,errs}=await boot({},bt);
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
  const click=el=>{assert.ok(el,'element to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};
  const esc=()=>d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  // The page's script-level bindings (const, let) are not on the window: a function made in the page's realm reads them.
  const ev=s=>new w.Function('return ('+s+')')(),run=s=>new w.Function(s)(),Cube=ev('Cube');
  const winColors=()=>$$('#cubeWinSvg polygon').map(p=>p.getAttribute('fill'));
  const picOf=c=>[...new w.DOMParser().parseFromString('<svg>'+w.renderCube3D(c.toFacelets(),{yaw:-32,pitch:28,n:3})+'</svg>','text/html').querySelectorAll('polygon')].map(p=>p.getAttribute('fill'));
  const tab=()=>$('#rail button[data-tab="smart"]'),win=()=>$('#cubeWin'),home=()=>$('#smartHome');
  // ----- names -----
  assert.strictEqual(w.smartNiceName('GAN12uiM_A1B2'),'GAN 12 ui Maglev');
  assert.strictEqual(w.smartNiceName('GAN14ui_7F3C'),'GAN 14 ui');
  assert.strictEqual(w.smartNiceName('GAN356i3_AB12'),'GAN 356 i3');
  assert.strictEqual(w.smartNiceName('GAN356iC_AB12'),'GAN 356 i Carry');
  assert.strictEqual(w.smartNiceName('GAN356iCarry2_AB12'),'GAN 356 i Carry 2');
  assert.strictEqual(w.smartNiceName('MG_AB12'),'MG');
  assert.strictEqual(w.smartNiceName(''),'GAN cube');
  // ----- before a cube: the seventh tab, with the Connect card -----
  assert.strictEqual($$('#rail button').length,7,'seven CFOP tabs');
  assert.ok(tab()&&tab()===$$('#rail button')[6],'Smart cube is the seventh');assert.strictEqual(tab().querySelector('.k').textContent,'7');
  assert.strictEqual(tab().lastChild.textContent,'Smart cube');assert.ok(tab().querySelector('.dot'),'with a dot for the link');
  assert.ok(!tab().classList.contains('live')&&!$('#cubeTab'),'no cube: no dot, and no tab in the top bar');
  assert.ok(win().hidden&&!home().hidden,'the Connect card shows, the live panel is hidden');
  click(tab());assert.strictEqual(ev('curTab'),'smart','the tab opens');assert.ok($('#tab-smart').classList.contains('on'));
  assert.strictEqual($('#smartHome h2').textContent,'Smart cube');
  assert.strictEqual(picks,0,'no known cube, no getDevices: the tab does not look by itself');
  click($('#smartTabConnect'));assert.ok(!$('#smartBg'),'Connect a smart cube opens no dialog');assert.strictEqual(picks,1,'it opens the browser\'s chooser at once');
  assert.ok(await until(()=>/No cube was chosen/.test($('#smartTabStatus').textContent)),'no cube chosen: the card says so: '+$('#smartTabStatus').textContent);
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'7',bubbles:true}));assert.strictEqual(ev('curTab'),'smart','the 7 key is the tab');
  w.goTab('solve');assert.strictEqual(ev('curTab'),'solve');
  // ----- connect: the page goes to the tab; the panel carries the name and the charge -----
  const c1=w.applyAlg(new Cube(),['R','U',"F'",'L2','D','B',"R'"]);set(c1);
  dev=fakeDevice(4,MAC,cube,{mfData:mfDataFor(MAC),name:'GAN12uiM_A1B2'});
  click($('#smartBtn'));await sleep(20);click($('#smartConnect'));
  assert.ok(await until(()=>!$('#smartUse').disabled),'connected: '+$('#smartStatus').textContent);
  run('cubeTab.stillMs=150;cubeTab.revealMs=120'); // short waits for the stage
  assert.strictEqual(ev('curTab'),'smart','a cube connects: the page goes to the tab');
  assert.ok(!win().hidden&&home().hidden,'the live panel shows, the Connect card is hidden');
  assert.ok(tab().classList.contains('live')&&!tab().classList.contains('off'),'the dot is live');assert.ok(/GAN 12 ui Maglev/.test(tab().title));
  assert.strictEqual($('#cubeWin .cw-head .nm').textContent,'GAN 12 ui Maglev','named after the cube');
  assert.ok(await until(()=>!$('#cubeWinBatt').hidden&&$('#cubeWinBatt').textContent==='77%'),'the head shows the charge: '+$('#cubeWinBatt').textContent);
  assert.ok(!$('#cubeSpot')&&w.localStorage.getItem('cw:cubeTip')===null,'no callout');
  esc();assert.ok(!$('#smartBg'),'Esc closes the dialog');assert.ok(!$('#cubeSpot'),'and still no callout');
  dev.notify(batteryMsg(4,15));await sleep(20);
  assert.strictEqual($('#cubeWinBatt').textContent,'15%','a new reading changes the charge');assert.ok($('#cubeWinBatt').classList.contains('low'),'a low charge is marked');assert.strictEqual($('#cubeWinBatt').querySelector('.batt-fill').style.width,'15%');
  dev.notify(batteryMsg(4,77));await sleep(20);assert.ok(!$('#cubeWinBatt').classList.contains('low'));
  assert.ok(await until(()=>winColors().join()===picOf(c1).join()),'the panel shows the cube');
  assert.ok(/Live/.test($('#cubeWinNote').textContent));
  assert.ok($('#cubeWinAgain').classList.contains('hidden'));
  assert.ok($('#cubeWinOptions'),'Options opens the dialog');click($('#cubeWinOptions'));assert.ok($('#smartBg'));esc();
  // ----- the layout: the picture, the band and the turns on one side; the stage, the moves and the buttons beside them -----
  assert.ok($('#cubeWinSvg').closest('.cw-main')&&$('#cubeWinStage').closest('.cw-aside'),'the picture on one side, the stage on the other');
  assert.ok($('#cubeWinListen').closest('.cw-aside')&&$('#cubeWinHints').closest('.cw-aside'),'Listen and its hints beside the picture');
  // ----- a turn: the layer turns, then the picture is the new cube -----
  const c2=w.applyAlg(c1,['U']);set(c2);
  const mv=new Uint8Array(20);mv[0]=0x01;dev.notify(mv);
  assert.ok(await until(()=>ev('cubeTab.anim&&cubeTab.anim.move')==='U',500),'the U layer turns');
  assert.ok(await until(()=>!ev('cubeTab.anim')&&winColors().join()===picOf(c2).join(),1500),'the picture ends on the new cube');
  // Two turns between two states: both layers turn, one after the other.
  const c3=w.applyAlg(c2,['R','F']);set(c3);dev.notify(mv);
  assert.ok(await until(()=>ev('cubeTab.anim&&cubeTab.anim.move')==='R',500),'the R layer turns first');
  assert.strictEqual(ev('cubeTab.queue').join(),'F','F waits in the queue');
  assert.ok(ev('cubeTab.target').equals(c3),'the target is the real cube');
  // A state that lands during a turn joins the queue; the running turn is not cut.
  const c4=w.applyAlg(c3,["U'"]);set(c4);dev.notify(mv);
  assert.ok(await until(()=>ev('cubeTab.queue').length===2,300),'the new turn joins the queue: '+JSON.stringify(ev('cubeTab.queue')));
  assert.strictEqual(ev('cubeTab.anim.move'),'R','the R turn goes on');
  assert.ok(await until(()=>ev('cubeTab.anim&&cubeTab.anim.move')==='F',800),'then F');
  assert.ok(await until(()=>ev('cubeTab.anim&&cubeTab.anim.move')==="U'",800),"then U'");
  assert.ok(await until(()=>!ev('cubeTab.anim')&&winColors().join()===picOf(c4).join(),1500),'the picture ends on the real cube');
  // Four moves still turn; five snap.
  const c5=w.applyAlg(c4,['R','U',"R'","U'"]);set(c5);dev.notify(mv);
  assert.ok(await until(()=>ev('cubeTab.anim'),500),'four moves turn');
  assert.strictEqual(ev('cubeTab.queue').length+1,4,'four turns');
  assert.ok(await until(()=>!ev('cubeTab.anim')&&winColors().join()===picOf(c5).join(),2500),'ends on the cube after four');
  const c6=w.applyAlg(c5,['R','U','F','D','L']);set(c6);dev.notify(mv);
  assert.ok(await until(()=>winColors().join()===picOf(c6).join(),500),'five turns show at once');
  assert.ok(!ev('cubeTab.anim')&&!ev('cubeTab.queue').length);
  // Turns speed up as the queue grows.
  assert.strictEqual(w.cubeTabDur('R',0),260);assert.strictEqual(w.cubeTabDur('R2',0),360);
  assert.ok(w.cubeTabDur('R',1)<w.cubeTabDur('R',0)&&w.cubeTabDur('R',3)<w.cubeTabDur('R',1)&&w.cubeTabDur('R',9)>=90);
  // ----- the turn buttons: the picture, the moves and the stage read as the cube is held -----
  // Stickers as their center and color, matched within a pixel: a turned body lists the corners of
  // a sticker from another start, and a center can round either way.
  const polysOf=svg=>[...svg.querySelectorAll('polygon')].map(p=>{const q=p.getAttribute('points').split(' ').map(v=>v.split(',').map(Number));return {x:q.reduce((a,v)=>a+v[0],0)/q.length,y:q.reduce((a,v)=>a+v[1],0)/q.length,fill:p.getAttribute('fill')};});
  const same=(A,B)=>{if(A.length!==B.length)return false;const used=new Set();for(const a of A){const i=B.findIndex((b,j)=>!used.has(j)&&b.fill===a.fill&&Math.hypot(a.x-b.x,a.y-b.y)<0.3);if(i<0)return false;used.add(i);}return true;};
  const winPolys=()=>polysOf($('#cubeWinSvg'));
  const fixed=(c,o)=>polysOf(new w.DOMParser().parseFromString('<svg>'+w.renderCube3D(c.toFacelets(),Object.assign({yaw:-32,pitch:28,n:3},o||{}))+'</svg>','text/html'));
  const readout=()=>$$('#cubeWinMoves .mv').map(s=>s.textContent).join(' ');
  const turnBtn=m=>$('#cubeWinTurns button[data-turn="'+m+'"]');
  const turns=$('#cubeWinTurns');assert.ok(turns&&turns.previousElementSibling===$('#cubeWinWarn')&&$('#cubeWinWarn').previousElementSibling===$('#cubeWinSvg'),'the turn buttons sit under the picture, with the band between');
  assert.deepStrictEqual($$('#cubeWinTurns button').map(b=>b.textContent),['x',"x'",'y',"y'",'z',"z'"],'six turns');
  assert.strictEqual($$('#cubeWinTurns .grp').length,3,'in three pairs');
  for(const b of $$('#cubeWinTurns button')){assert.ok(/turn the whole cube/.test(b.title),b.title);assert.ok(!b.disabled);}
  assert.ok(/Turn the cube/.test(turns.textContent));
  assert.ok(!ev('cubeTab.hold')&&!ev('cubeTab.q'),'held as the cube names its faces until a press');
  assert.ok(same(winPolys(),fixed(c6)),'the fixed view');
  // Hidden faces: the site's setting (cw:hidden) and a button in the panel; both draw the mirror faces
  {const hb=$('#cubeWinHidden'),n0=winPolys().length;assert.ok(hb&&hb.getAttribute('aria-pressed')==='false','Hidden faces is off');
    click(hb);assert.strictEqual(hb.getAttribute('aria-pressed'),'true','the button turns it on');assert.strictEqual(w.localStorage.getItem('cw:hidden'),'true','one setting with the site');
    assert.ok(same(winPolys(),fixed(c6,{hidden:true,scale:40})),'the faces turned away show behind the cube');assert.strictEqual(winPolys().length-n0,27);
    w.setHidden(false);assert.strictEqual(hb.getAttribute('aria-pressed'),'false','the site\'s button turns it off here too');assert.ok(same(winPolys(),fixed(c6)),'the fixed view again');}
  assert.ok(/press the same turn/.test($('#cubeWinNote').textContent),'the note says to press the turns');
  assert.ok($('#cubeWinWarn').classList.contains('hidden')&&$('#cubeWinWarn').previousElementSibling===$('#cubeWinSvg'),'the band under the picture is hidden until the cube is held unlike the hold');
  assert.ok(!ev('cubeTab.gyro'),'no tilt yet: a press turns the picture');
  // y: the picture turns, then rests on the cube after y. y again: the back is in front, and the
  // two presses read y2 on the list.
  click(turnBtn('y'));
  assert.ok(await until(()=>ev('cubeTab.q')&&w.quatAngle(ev('cubeTab.q'),[0,0,0,1])>1,500),'the picture starts to turn');
  const mid=w.quatAngle(ev('cubeTab.q'),[0,0,0,1]);assert.ok(mid>1&&mid<89,'part way round: '+mid);
  assert.ok(await until(()=>!ev('cubeTab.qraf'),1500),'then it rests');
  assert.ok(same(winPolys(),fixed(w.applyAlg(c6,['y']))),'the right face is in front');
  assert.strictEqual(ev('cubeTab.hold').moves.join(' '),'y','the hold is y');
  click(turnBtn('y'));
  assert.ok(await until(()=>!ev('cubeTab.qraf')&&same(winPolys(),fixed(w.applyAlg(c6,['y2']))),1500),'y again: the back is in front');
  assert.strictEqual(ev('cubeTab.hold').moves.join(' '),'y2','the hold is y2');
  assert.ok(readout().endsWith('y2'),'the two presses merge on the list: '+readout());
  assert.strictEqual($('#cubeWinMoves .mv.rot').textContent,'y2','the turn of the cube is marked');
  // y' twice: back to white up, green front, and the turns come off the list.
  click(turnBtn("y'"));assert.ok(readout().endsWith(' y'),"y2 then y' is y: "+readout());
  click(turnBtn("y'"));assert.ok(!/[xyz]/.test(readout()),"y then y' is nothing: "+readout());
  assert.ok(!ev('cubeTab.hold'),'white up, green front again');
  assert.ok(await until(()=>!ev('cubeTab.qraf')&&same(winPolys(),fixed(c6)),1500),'the picture is back');
  // z twice: the cube turned over, white down. A layer turn is then named by where its face sits.
  click(turnBtn('z'));click(turnBtn('z'));
  assert.strictEqual(ev('cubeTab.hold').moves.join(' '),'z2');
  assert.ok(await until(()=>!ev('cubeTab.qraf')&&same(winPolys(),fixed(w.applyAlg(c6,['z2']))),1500),'the picture is the cube turned over');
  const c7=w.applyAlg(c6,['R']);set(c7);dev.notify(mv);
  assert.ok(await until(()=>ev('cubeTab.anim&&cubeTab.anim.move')==='R',500),'the R layer turns');
  assert.ok(await until(()=>!ev('cubeTab.anim')&&same(winPolys(),fixed(w.applyAlg(c7,['z2']))),1500),'and lands on the new cube, still turned over');
  assert.ok(readout().endsWith('z2 L'),"the cube's R sat on the left: "+readout());
  // ----- the moves beside the picture -----
  // Pure: the same face merges, and no turns left takes the move off.
  assert.deepStrictEqual(w.cubeTabMerge([],'R'),['R']);
  assert.deepStrictEqual(w.cubeTabMerge(['R'],'R'),['R2']);
  assert.deepStrictEqual(w.cubeTabMerge(['R2'],'R'),["R'"]);
  assert.deepStrictEqual(w.cubeTabMerge(['R2'],'R2'),[]);
  assert.deepStrictEqual(w.cubeTabMerge(['U','R'],"R'"),['U']);
  assert.deepStrictEqual(w.cubeTabMerge(['U',"R'"],"R'"),['U','R2']);
  assert.deepStrictEqual(w.cubeTabMerge(['U'],"R'"),['U',"R'"]);
  let h=[];for(const m of ['R','U2','L',"D'",'D',"L'",'U2',"R'"])h=w.cubeTabMerge(h,m);
  assert.deepStrictEqual(h,[],"R U2 L D' then D L' U2 R': every move taken back");
  // In the panel: every move seen so far, in order, as held. The five-move jump was not known.
  // The y turns above came and went. z2 is on the list, and the R turned while the cube was held
  // that way reads L.
  assert.strictEqual(readout(),"U R F U' R U R' U' z2 L",'the moves so far: '+readout());
  assert.ok(!$('#cubeWinMoves .more'),'no triangle at ten moves');
  // Back to white up: the turns go on the list too. The list is what was done; the hold is a view.
  click(turnBtn("z'"));click(turnBtn("z'"));
  assert.ok(!ev('cubeTab.hold'),'white up, green front again');
  assert.strictEqual(ev('cubeTab.moves').length,11,'eleven moves: '+ev('cubeTab.moves').join(' '));assert.ok($('#cubeWinMoves .more'),'and the triangle');
  await until(()=>!ev('cubeTab.qraf'),1500);
  // Clear moves empties the list.
  assert.ok(!$('#cubeWinClear').disabled);click($('#cubeWinClear'));
  assert.ok(!readout()&&$('#cubeWinMoves .none'),'Clear moves empties the list');assert.strictEqual($('#cubeWinMoves .none').textContent,'No moves yet');
  assert.ok($('#cubeWinClear').disabled,'and has nothing more to clear');
  assert.ok($('#cubeWinClear').closest('.cw-side')&&$('#cubeWinView').previousElementSibling===$('#cubeWinMoves'),'Clear moves sits under the moves');
  // Four moves, then turned back move by move: the list shrinks.
  let cc=w.applyAlg(c7,['R','U',"R'","U'"]);set(cc);dev.notify(mv);
  assert.ok(await until(()=>readout()==="R U R' U'",1500),'four moves: '+readout());
  assert.ok(!$('#cubeWinClear').disabled,'Clear moves is live again');
  cc=w.applyAlg(cc,['U','R']);set(cc);dev.notify(mv);
  assert.ok(await until(()=>readout()==="R U",1500),'two turns back: '+readout());
  cc=w.applyAlg(cc,["U'"]);set(cc);dev.notify(mv);
  assert.ok(await until(()=>readout()==="R",1500),'one more back: '+readout());
  // R then R reads R2; R' then makes it R; R' again takes it off.
  cc=w.applyAlg(cc,['R']);set(cc);dev.notify(mv);
  assert.ok(await until(()=>readout()==="R2",1500),'R then R is R2: '+readout());
  cc=w.applyAlg(cc,["R'"]);set(cc);dev.notify(mv);
  assert.ok(await until(()=>readout()==="R",1500),"R2 then R' is R: "+readout());
  cc=w.applyAlg(cc,["R'"]);set(cc);dev.notify(mv);
  assert.ok(await until(()=>!readout()&&$('#cubeWinMoves .none'),1500),"R then R' is nothing: "+readout());
  // Past ten moves, the last ten show and a triangle says there are more. All of them are kept.
  let want=[];
  for(const batch of [['R','U','F','D'],['L','B','R','U'],['F','D','L']]){
    for(const m of batch)want=w.cubeTabMerge(want,m);
    cc=w.applyAlg(cc,batch);set(cc);dev.notify(mv);
    assert.ok(await until(()=>ev('cubeTab.moves').join()===want.join(),1500),'moves: '+ev('cubeTab.moves').join(' '));
    if(want.length<=10)assert.ok(!$('#cubeWinMoves .more'),'no triangle up to ten moves');
  }
  assert.strictEqual(ev('cubeTab.moves').length,11,'all eleven are kept');
  assert.strictEqual(readout(),want.slice(-10).join(' '),'the last ten show: '+readout());
  const more=$('#cubeWinMoves .more');assert.ok(more,'the triangle says there are more');
  assert.strictEqual(more.getAttribute('aria-label'),'1 more');assert.strictEqual(more.title,'11 moves in all');
  assert.ok(more.querySelector('svg polygon'),'a plain triangle');assert.ok(!more.onclick,'nothing happens on a click yet');
  // ----- another tab: the turns stop and the picture lands; the moves still count -----
  w.goTab('solve');assert.strictEqual(ev('curTab'),'solve');assert.ok(!ev('cubeTabShown()'));
  cc=w.applyAlg(cc,['B']);set(cc);dev.notify(mv);
  assert.ok(await until(()=>ev('cubeTab.moves').length===12,1500),'a move on another tab is kept');
  assert.ok(!ev('cubeTab.anim')&&!ev('cubeTab.queue').length,'no turn plays out of view');
  assert.ok(ev('cubeTab.shown').equals(cc),'the picture is on the real cube');
  w.goTab('smart');assert.ok(readout().endsWith('L B'),'and shows on return: '+readout());
  assert.ok(same(winPolys(),fixed(cc)),'the picture is drawn afresh on return');
  // ----- the hold: the cube as it sits in the hands -----
  // Pure: the 24 holds, each from at most two turns, and each one's turn of the body draws the
  // cube as its moves do; a move named by where its face sits.
  const HOLDS=ev('CUBE_TAB_HOLDS'),holdOf=ms=>HOLDS.find(h=>h.moves.join(' ')===ms);
  assert.strictEqual(HOLDS.length,24);assert.strictEqual(HOLDS[0].moves.length,0);
  for(const h of HOLDS){assert.ok(h.moves.length<=2,h.moves.join(' '));
    assert.ok(same(fixed(c7,{rot:w.quatMat(h.q)}),fixed(w.applyAlg(c7,h.moves))),'the turn of the body is the picture after its moves: '+h.moves.join(' '));}
  assert.strictEqual(w.cubeTabRelabel('R',holdOf('z2')),'L');assert.strictEqual(w.cubeTabRelabel("U'",holdOf('z2')),"D'");assert.strictEqual(w.cubeTabRelabel('F2',holdOf('z2')),'F2');
  assert.strictEqual(w.cubeTabRelabel('R',holdOf('y')),'F','after y the cube\'s right face is in front');assert.strictEqual(w.cubeTabRelabel('R',null),'R');assert.strictEqual(w.cubeTabRelabel('x',holdOf('y')),'x');
  // Each turn from each hold lands on a hold; x x' and the like land back where they were.
  {const saved=ev('cubeTab.moves');
    for(const h of HOLDS)for(const m of ['x','y','z']){
      run('cubeTab.hold='+(h.moves.length?'CUBE_TAB_HOLDS['+HOLDS.indexOf(h)+']':'null'));
      w.cubeTabTurn(m);const g=ev('cubeTab.hold')||HOLDS[0];assert.ok(g.cube.equals(w.applyAlg(h.cube,[m])),'after '+m+' from '+h.moves.join(' '));
      w.cubeTabTurn(m+"'");assert.strictEqual(ev('cubeTab.hold')||HOLDS[0],h,'and back');}
    run('cubeTabStopView();cubeTab.hold=null;cubeTab.q=cubeTab.qTo=null;cubeTab.moves='+JSON.stringify(saved)+';cubeTabMovesDraw();cubeTabDraw();cubeTabSettle();');}
  // ----- the stage beside the picture -----
  const stage=()=>$('#cubeWinStage'),stName=()=>stage().querySelector('.st-name').textContent,stSub=()=>stage().querySelector('.st-sub').textContent;
  const stMoves=()=>$$('#cubeWinStage .st-alg .mv').map(s=>s.classList.contains('hid')?'•':s.textContent),stDone=()=>$$('#cubeWinStage .st-alg .mv.done').length;
  assert.ok(stage()&&stage().parentNode.classList.contains('cw-aside')&&stage()===stage().parentNode.firstElementChild,'the stage heads the column beside the picture');
  assert.ok(await until(()=>stName()==='Cross',2500),'a scrambled cube reads as the cross: '+stName());
  assert.ok(/^\d of 4 white edges$/.test(stSub()),stSub());assert.strictEqual(stMoves().length,0,'no moves for the cross');
  assert.ok(!ev('cubeTab.hold'),'held as the cube names its faces');
  // A Sune on the cube's yellow face, white cross whole: the cube's white face is U, so held as the
  // cube names its faces, the cross is on top.
  const sune=ev('ALG_DB').co[0],X=w.applyAlg(new Cube(),w.invertAlg(sune.alg)),cs=w.afterRotation(X,'z2');
  let cur=cs;set(cur);dev.notify(mv);
  assert.ok(await until(()=>stage().classList.contains('stale'),300),'a turn fades the stage');assert.strictEqual(stName(),'Cross','but leaves it there');
  assert.ok(await until(()=>stName()==='Sune'&&!stage().classList.contains('stale'),2000),'still again: the stage is read: '+stName());
  const st=ev('cubeTab.stage');assert.strictEqual(st.moves[0],'z2','the cross is on top: turn the cube over first');
  assert.strictEqual(stSub(),'Turn z2: Yellow up, green in front');
  assert.strictEqual(stMoves().join(''),'•'.repeat(st.moves.length),'every move hidden at first: '+stMoves().join(' '));
  assert.ok(st.moves.length>=8,'z2 and the seven moves of Sune');
  // The cube sends its state again with no turn (a real cube does, on its own): the stage does not
  // fade, and the reveals go on. One move shows every revealMs: longer here, so a slow machine does
  // not show the second move before the check of the first.
  run('cubeTab.revealMs=500');
  for(let i=0;i<3;i++){dev.notify(stateMsg(4,cube,200+i));await sleep(25);}
  assert.ok(!stage().classList.contains('stale'),'a state read again with no turn does not fade the stage');
  assert.ok(await until(()=>stMoves()[0]==='z2',600),'the first move shows: '+stMoves().join(' '));assert.strictEqual(stMoves()[1],'•');
  assert.ok($('#cubeWinStage .mv.rot'),'a turn of the cube is marked');
  assert.ok(await until(()=>stMoves()[1]!=='•',1200),'then the second');
  run('cubeTab.revealMs=120');
  // The cube turned over in the hands, z pressed twice: the hold is z2, the turn goes on the list,
  // and the z2 of the case is done.
  click($('#cubeWinClear'));
  click(turnBtn('z'));click(turnBtn('z'));
  assert.strictEqual(ev('cubeTab.hold'),holdOf('z2'),'the hold is z2');
  assert.strictEqual(readout(),'z2','the turn is on the list');
  assert.ok(await until(()=>stDone()===1,500),'the z2 of the case is done: '+stDone());assert.strictEqual(stName(),'Sune');
  // The user's moves, in the hands: the cube reports each by its own face. `user` plays them on
  // the fake cube that way.
  const user=(ms)=>{const hold=ev('cubeTab.hold')||HOLDS[0],held=w.applyAlg(w.applyAlg(cur,hold.moves),ms);const B=HOLDS.find(h=>h.cube.center.join()===held.center.join());
    assert.strictEqual(B,hold,'face moves keep the hold');cur=held.mul(B.cube.inverse());set(cur);dev.notify(mv);};
  user([st.moves[1]]);
  assert.ok(await until(()=>stDone()===2,1500),'a move done in the hands counts: '+stDone());assert.strictEqual(stName(),'Sune');
  assert.strictEqual(readout(),'z2 '+st.moves[1],'the list names the face as held: '+readout());
  assert.ok(stMoves()[1]===st.moves[1]&&stMoves()[2]==='•','done moves show; the rest stay hidden');
  // The rest of the case, a few at a time: the cube ends solved.
  user(st.moves.slice(2,5));await until(()=>!ev('cubeTab.anim')&&ev('cubeTab.target').equals(cur),1500);
  assert.ok(await until(()=>stDone()===5,1500),'five done: '+stDone());
  user(st.moves.slice(5));
  assert.ok(await until(()=>stName()==='Solved',2500),'the case done: '+stName());
  assert.strictEqual(readout(),st.moves.join(' '),'the list is the case as held: '+readout());
  // A T perm, set up in the hands. Its moves hide. A U turn on the same case keeps what was
  // revealed. A wrong move part way breaks the cross, but the stage never falls back on its own:
  // the case stays with no move marked, and the slip put right keeps the reveals.
  const tp=ev('ALG_DB').cp[0],setup=w.parseAlg(w.invertAlg(tp.alg));
  for(let i=0;i<setup.length;i+=4){user(setup.slice(i,i+4));await until(()=>!ev('cubeTab.anim')&&ev('cubeTab.target').equals(cur),1500);}
  assert.ok(await until(()=>stName()==='T perm',2500),'T perm: '+stName());assert.strictEqual(stSub(),'Yellow up, green in front');
  assert.ok(await until(()=>stMoves().filter(m=>m!=='•').length===2,800),'two moves shown');
  user(['U']);assert.ok(await until(()=>stage().classList.contains('stale'),300));
  assert.ok(await until(()=>!stage().classList.contains('stale'),1500));assert.strictEqual(stName(),'T perm');
  assert.ok(stMoves().filter(m=>m!=='•').length>=2,'the same case keeps its reveals: '+stMoves().join(' '));
  user(['F']);assert.ok(await until(()=>stage().classList.contains('stale'),300),'the slip fades the stage');
  assert.ok(await until(()=>!stage().classList.contains('stale'),1500));assert.strictEqual(stName(),'T perm','the cross is broken, but the case stays: '+stName());
  assert.strictEqual(stDone(),0,'no move marked off the algorithm');
  assert.strictEqual(w.cfopStage(w.applyAlg(cur,ev('cubeTab.hold').moves),'white').stage,'cross','(the cube itself reads as the cross)');
  user(["F'"]);
  assert.ok(await until(()=>stName()==='T perm'&&!stage().classList.contains('stale'),1500),'back on the case');
  assert.ok(stMoves().filter(m=>m!=='•').length>=2,'the slip put right keeps the reveals: '+stMoves().join(' '));
  // The case done: Solved. A solved cube is not kept: two turns read as the cross at once. (One
  // turn is AUF: the cube held with the turned layer up is one U turn from solved.)
  const tpm=ev('cubeTab.stage').moves;
  for(let i=0;i<tpm.length;i+=4){user(tpm.slice(i,i+4));await until(()=>!ev('cubeTab.anim')&&ev('cubeTab.target').equals(cur),1500);}
  assert.ok(await until(()=>stName()==='Solved',2500),'the T perm done: '+stName());
  user(['R','U']);assert.ok(await until(()=>stName()==='Cross',1500),'a solved cube turned is not kept: '+stName());
  user(["U'","R'"]);assert.ok(await until(()=>stName()==='Solved',1500));
  // A Sune set up, then a new scramble: the case is kept for a while (the user may be part way
  // through), and once more moves have gone by than the algorithm twice and four, the cross shows.
  const sset=w.parseAlg(w.invertAlg(sune.alg));
  for(let i=0;i<sset.length;i+=4){user(sset.slice(i,i+4));await until(()=>!ev('cubeTab.anim')&&ev('cubeTab.target').equals(cur),1500);}
  assert.ok(await until(()=>stName()==='Sune',2500),'Sune again: '+stName());
  const n=ev('cubeTab.stage').moves.length,budget=Math.max(12,2*n+4),scr=w.parseAlg("F L D B R U F' L' D' B' R' U' F2 L2 D2 B2 R2 U2 F L D B R U");
  assert.ok(scr.length>budget,'the scramble is longer than the budget');
  let i=0;for(;i<budget-3;i+=4){user(scr.slice(i,i+4));await until(()=>!ev('cubeTab.anim')&&ev('cubeTab.target').equals(cur),1500);}
  assert.ok(await until(()=>!stage().classList.contains('stale')&&!ev('cubeTab.stillTimer'),1500));
  assert.strictEqual(stName(),'Sune','the case is kept through '+ev('cubeTab.since')+' moves: '+stName());
  for(;i<scr.length;i+=4){user(scr.slice(i,i+4));await until(()=>!ev('cubeTab.anim')&&ev('cubeTab.target').equals(cur),1500);}
  assert.ok(await until(()=>stName()==='Cross',2500),'past the budget, the cross: '+stName());
  // The hold stays through a change of tab.
  w.goTab('solve');w.goTab('smart');assert.strictEqual(ev('cubeTab.hold'),holdOf('z2'),'the hold survives a change of tab');
  assert.ok(same(winPolys(),fixed(w.applyAlg(cur,['z2']))),'and so does the picture');
  // ----- the tilt: the picture follows the cube in the hands; the hold stays with the buttons -----
  // Pure: the heading lines a reading up with the hold about the vertical, and only about the
  // vertical: a lean stays. A reading snaps to the nearest hold. The turns between two holds.
  const near=(a,b)=>w.quatAngle(a,b)<0.01,yawQ=d=>[0,Math.sin(d*Math.PI/360),0,Math.cos(d*Math.PI/360)];
  const lean=[Math.sin(10*Math.PI/180),0,0,Math.cos(10*Math.PI/180)]; // 20 degrees toward the viewer
  for(const h of [HOLDS[0],holdOf('y'),holdOf('z2'),holdOf('x'),holdOf("x'"),holdOf('z')])for(const deg of [0,-130,90,37]){
    const raw=w.quatMul(yawQ(deg),h.q);assert.ok(near(w.quatMul(w.cubeTabYawBasis(raw,h.q),raw),h.q),'the heading lines up '+h.moves.join(' ')+' at '+deg);
    const leaned=w.quatMul(yawQ(deg),w.quatMul(lean,h.q));assert.ok(near(w.quatMul(w.cubeTabYawBasis(leaned,h.q),leaned),w.quatMul(lean,h.q)),'a lean stays: '+h.moves.join(' ')+' at '+deg);}
  for(const h of HOLDS)assert.strictEqual(w.cubeTabSnap(h.q),h,'snapped to itself: '+h.moves.join(' '));
  assert.strictEqual(w.cubeTabSnap(w.quatMul(lean,holdOf('y').q)),holdOf('y'),'a lean snaps to its hold');
  assert.strictEqual(w.cubeTabHoldDelta(null,holdOf('z2')).join(' '),'z2');assert.strictEqual(w.cubeTabHoldDelta(holdOf('z2'),null).join(' '),'z2');
  assert.strictEqual(w.cubeTabHoldDelta(holdOf('y'),holdOf('y2')).join(' '),'y');assert.strictEqual(w.cubeTabHoldDelta(holdOf('z2'),holdOf('y2')).join(' '),'x2');
  for(const h of HOLDS)for(const g of HOLDS)assert.ok(w.applyAlg(h.cube,w.cubeTabHoldDelta(h,g)).equals(g.cube),'the turns between two holds');
  // In the panel. The cube reports its tilt in its own frame; `tilt` sends the turn of the body
  // the picture should show, through the heading the tab has set.
  const rawOf=q=>({x:q[0],y:-q[2],z:q[1],w:q[3]}),tilt=q=>dev.notify(gyroMsg(4,rawOf(w.quatMul(w.quatConj(ev('cubeTab.basis')||[0,0,0,1]),q))));
  const warn=()=>$('#cubeWinWarn'),warnOn=()=>!warn().classList.contains('hidden'),warnText=()=>warn().querySelector('.txt').textContent;
  const CN=ev('COLOR_NAMES'),words=h=>CN[h.cube.center[0]]+' up, '+CN[h.cube.center[2]]+' in front';
  run('cubeTab.awayMs=60');
  assert.ok(!ev('cubeTab.gyro')&&!warnOn(),'no tilt yet, no band');
  assert.ok($('#cubeWinReset').classList.contains('hidden'),'no tilt yet: no Reset view');
  // The first reading: the heading lines the cube up with the hold (z2). Held as the hold says:
  // no band, and the picture is the cube held z2.
  tilt(holdOf('z2').q);await sleep(30);
  assert.ok(ev('cubeTab.gyro'),'the tilt is on');assert.ok(/tilts with the cube/.test($('#cubeWinNote').textContent),'the note says so');
  assert.ok(!$('#cubeWinReset').classList.contains('hidden')&&!$('#cubeWinReset').disabled,'the tilt is live: Reset view shows');
  assert.ok($('#cubeWinReset').closest('.cw-side')&&$('#cubeWinReset').nextElementSibling===$('#cubeWinClear'),'beside Clear moves');
  assert.strictEqual($('#cubeWinReset').title,'Hold the cube with yellow up, green in front, then press. The picture lines up with your cube.');
  assert.ok(!warnOn()&&!ev('cubeTab.away'),'held as the hold says: no band');assert.ok(!tab().classList.contains('warn'));
  assert.ok(await until(()=>!ev('cubeTab.qraf')&&same(winPolys(),fixed(w.applyAlg(cur,['z2']))),1500),'the picture is the cube held z2');
  // A small lean: the picture leans, the hold stays, no band.
  tilt(w.quatMul(lean,holdOf('z2').q));
  assert.ok(await until(()=>!ev('cubeTab.qraf')&&same(winPolys(),fixed(cur,{rot:w.quatMat(w.quatMul(lean,holdOf('z2').q))})),1500),'the picture leans with the cube');
  await sleep(100);assert.ok(!warnOn()&&!ev('cubeTab.away'),'a lean is not a turn');assert.strictEqual(ev('cubeTab.hold'),holdOf('z2'),'the hold stays');
  // The cube turned y in the hands, the button not pressed: after awayMs the band says how the
  // cube sits and how the moves read. The picture shows the cube as it sits; the hold stays.
  const z2y=HOLDS.find(h=>h.cube.equals(w.applyAlg(holdOf('z2').cube,['y'])));
  tilt(z2y.q);
  assert.ok(await until(()=>ev('cubeTab.away')===z2y,500),'away: the hold the cube sits in');
  assert.ok(!warnOn(),'the band waits');
  assert.ok(await until(()=>warnOn(),500),'then shows');
  assert.ok(tab().classList.contains('warn'),'the rail\'s dot warns too');assert.ok(/held differently/.test(tab().title));
  assert.strictEqual(warnText(),`Your cube sits with ${words(z2y)}. The moves and the stage read with ${words(holdOf('z2'))}.`);
  assert.ok(!$('#cubeWinKeep').classList.contains('hidden'),'the same face up: Keep this hold is offered');
  assert.strictEqual($('#cubeWinMatch').title,'Turn the hold to match the cube: y. The turn goes on the list.');
  assert.strictEqual(ev('cubeTab.hold'),holdOf('z2'),'the hold did not move');
  assert.ok(await until(()=>!ev('cubeTab.qraf')&&same(winPolys(),fixed(w.applyAlg(cur,z2y.moves))),1500),'the picture shows the cube as it sits');
  // Read as held: y is pressed for the user. The hold is z2 then y, the turn is on the list, and
  // the band goes.
  click($('#cubeWinClear'));click($('#cubeWinMatch'));
  assert.strictEqual(ev('cubeTab.hold'),z2y,'the hold matches the cube');assert.strictEqual(readout(),'y','the turn is on the list');
  assert.ok(!warnOn()&&!ev('cubeTab.away'),'the band goes');assert.ok(!tab().classList.contains('warn'));
  assert.ok(await until(()=>!ev('cubeTab.qraf'),1500));assert.ok(same(winPolys(),fixed(w.applyAlg(cur,z2y.moves))),'the picture did not move: the cube did not');
  // y pressed with the cube not turned: the band again, the other way round. Keep this hold: the
  // heading is taken again, the band goes, and the picture lines up with the hold.
  click(turnBtn('y'));
  assert.ok(await until(()=>warnOn(),500),'pressed but not turned: the band');
  assert.strictEqual(ev('cubeTab.away'),z2y,'the cube still sits as before');
  const z2y2=ev('cubeTab.hold');assert.ok(z2y2.cube.equals(w.applyAlg(z2y.cube,['y'])));
  assert.strictEqual($('#cubeWinMatch').title,"Turn the hold to match the cube: y'. The turn goes on the list.");
  const basis0=ev('cubeTab.basis');
  click($('#cubeWinKeep'));
  assert.ok(!warnOn()&&!ev('cubeTab.away'),'Keep this hold: the band goes');assert.strictEqual(ev('cubeTab.hold'),z2y2,'the hold stays');
  assert.ok(w.quatAngle(ev('cubeTab.basis'),basis0)>80,'the heading moved a quarter turn');
  assert.ok(await until(()=>!ev('cubeTab.qraf')&&same(winPolys(),fixed(w.applyAlg(cur,z2y2.moves))),1500),'the picture lines up with the hold');
  assert.strictEqual(readout(),'y2','the press stays on the list: the user said the cube turned');
  // Picked up white up while the moves read yellow up: the band, with no Keep this hold. A
  // different face up is what gravity says, not drift.
  tilt(HOLDS[0].q);
  assert.ok(await until(()=>warnOn(),500),'the band for a different face up');
  assert.strictEqual(ev('cubeTab.away'),HOLDS[0]);
  assert.ok($('#cubeWinKeep').classList.contains('hidden'),'no Keep this hold for a different face up');
  assert.ok(/^Your cube sits with white up, green in front\. The moves and the stage read with yellow up/.test(warnText()),warnText());
  click($('#cubeWinMatch'));
  assert.ok(!ev('cubeTab.hold'),'Read as held: white up, green front');assert.ok(!warnOn());
  assert.ok(readout().endsWith(w.cubeTabHoldDelta(z2y2,null).join(' ')),'the turn is on the list: '+readout());
  assert.ok(await until(()=>!ev('cubeTab.qraf')&&same(winPolys(),fixed(cur)),1500),'the picture is the cube as it sits');
  // On another tab the tilt still tracks, and the rail's dot warns. Turned back, the band goes.
  w.goTab('solve');tilt(holdOf('x').q);
  assert.ok(await until(()=>tab().classList.contains('warn'),500),'the dot warns on another tab');
  w.goTab('smart');assert.ok(warnOn(),'the band is there on return');assert.ok(same(winPolys(),fixed(w.applyAlg(cur,['x']))),'and the picture is the cube as it sits');
  tilt(HOLDS[0].q);assert.ok(await until(()=>!warnOn()&&!tab().classList.contains('warn'),500),'turned back: the band goes');
  // Turned over to z2 and read as held, for the rest of the test.
  tilt(holdOf('z2').q);assert.ok(await until(()=>warnOn(),500));click($('#cubeWinMatch'));
  assert.strictEqual(ev('cubeTab.hold'),holdOf('z2'));assert.ok(!warnOn());
  // Reset view: the heading drifted (the cube reads a quarter turn away, no button pressed, and
  // the band is up). The user holds the cube as the moves read and presses: the heading is taken
  // again, the band goes, the hold and the list stay, and the picture lines up with the hold.
  tilt(z2y.q);assert.ok(await until(()=>warnOn(),500),'drifted: the band');
  const basis1=ev('cubeTab.basis'),list1=readout();
  click($('#cubeWinReset'));
  assert.ok(!warnOn()&&!ev('cubeTab.away')&&!tab().classList.contains('warn'),'Reset view: the band goes');
  assert.strictEqual(ev('cubeTab.hold'),holdOf('z2'),'the hold stays');assert.strictEqual(readout(),list1,'nothing goes on the list');
  assert.ok(w.quatAngle(ev('cubeTab.basis'),basis1)>80,'the heading moved a quarter turn');
  assert.ok(await until(()=>!ev('cubeTab.qraf')&&same(winPolys(),fixed(w.applyAlg(cur,['z2']))),1500),'the picture lines up with the hold');
  tilt(holdOf('z2').q);await sleep(100);assert.ok(!warnOn(),'the cube as the hold says: no band');
  // ----- a modal takes Esc; the tab has no Esc of its own -----
  click($('#smartBtn'));await sleep(20);assert.ok($('#smartBg'));
  esc();assert.ok(!$('#smartBg')&&!win().hidden&&ev('curTab')==='smart','Esc closes the dialog; the tab stays');
  // ----- the link drops: the dot dims, the panel offers the way back -----
  dev.gatt.disconnect();await sleep(10);
  assert.ok(tab().classList.contains('off')&&tab().classList.contains('live'),'a dropped link dims the dot');
  assert.ok($('#cubeWinBatt').hidden,'the charge goes with the link');
  assert.strictEqual(ev('cubeTab.hold'),holdOf('z2'),'the hold stays while the link is down');
  assert.ok(/no longer connected/.test($('#cubeWinNote').textContent));
  assert.ok($$('#cubeWinTurns button').every(b=>b.disabled),'the turn buttons wait for the link');
  assert.ok(!$('#cubeWinAgain').classList.contains('hidden'),'Connect again shows');
  assert.ok(ev('smartLook')===null,'no getDevices: no look by itself');
  dev=fakeDevice(4,MAC,cube,{mfData:mfDataFor(MAC),name:'GAN12uiM_A1B2'});
  click($('#cubeWinConnect'));assert.ok(!$('#smartBg'),'Connect again opens no dialog');
  assert.ok(await until(()=>!!ev('smartConn')),'the chooser, then connected again');assert.ok(!$('#smartBg')&&ev('curTab')==='smart','on the tab, with no dialog');
  assert.ok(!tab().classList.contains('off'),'the dot is live again');
  assert.ok(await until(()=>!$('#cubeWinBatt').hidden&&$('#cubeWinBatt').textContent==='77%'),'and the charge is read again');
  assert.strictEqual(ev('cubeTab.moves').length,0,'a new connection starts the move list again');
  assert.ok(!ev('cubeTab.hold')&&!ev('cubeTab.gyro'),'and holds the cube white up, green front, with the tilt to come');
  // ----- Disconnect puts the Connect card back -----
  click($('#smartBtn'));await sleep(20);click($('#smartDisconnect'));
  assert.ok(win().hidden&&!home().hidden,'Disconnect: the Connect card is back');assert.ok(!tab().classList.contains('live'),'and the dot goes');
  assert.ok(!ev('cubeTab.hold')&&!ev('cubeTab.q')&&!ev('cubeTab.gyro')&&!ev('cubeTab.basis'),'Disconnect forgets the hold and the tilt');
  esc();assert.strictEqual(ev('curTab'),'smart','the tab stays');
  assert.deepStrictEqual(errs,[],'no script errors');
  // ----- a second page: the beginner method keeps its tabs; CFOP goes to the Smart cube tab -----
  const b2=await boot({},bt);const d2=b2.d,w2=b2.w,ev2=s=>new w2.Function('return ('+s+')')(),run2=s=>new w2.Function(s)();
  const click2=el=>el.dispatchEvent(new w2.MouseEvent('click',{bubbles:true}));
  w2.setMethod('beginner');assert.strictEqual(ev2('curTab'),'learn');
  set(c1);dev=fakeDevice(4,MAC,cube,{mfData:mfDataFor(MAC),name:'GAN356iC_0001'});
  click2(d2.querySelector('#smartBtn'));await sleep(20);click2(d2.querySelector('#smartConnect'));
  assert.ok(await until(()=>!d2.querySelector('#smartUse').disabled));
  d2.dispatchEvent(new w2.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.strictEqual(ev2('curTab'),'learn','a beginner stays on the Learn tab');assert.ok(!d2.querySelector('#cubeSpot'),'no callout');
  assert.strictEqual(d2.querySelector('#cubeWin .cw-head .nm').textContent,'GAN 356 i Carry','the panel is ready all the same');
  w2.setMethod('cfop');assert.ok(d2.querySelector('#rail button[data-tab="smart"]').classList.contains('live'),'CFOP: the dot is live');
  w2.goTab('smart');assert.ok(!d2.querySelector('#cubeWin').hidden,'the live panel');
  // Before the first layer turn, a y turn of the cube follows on the picture and brings the band,
  // as any turn does: nothing lines the heading up on its own (1.11.0 did, and the picture turned
  // back the other way part way through the turn). Reset view lines it up.
  run2('cubeTab.awayMs=60');
  const tilt2=q=>dev.notify(gyroMsg(4,rawOf(w2.quatMul(w2.quatConj(ev2('cubeTab.basis')||[0,0,0,1]),q))));
  const warn2=()=>!d2.querySelector('#cubeWinWarn').classList.contains('hidden');
  tilt2([0,0,0,1]);await sleep(30);assert.ok(ev2('cubeTab.gyro'));
  const yq=w2.quatMul(yawQ(90),[0,0,0,1]);tilt2(yq);
  assert.ok(await until(()=>warn2(),500),'a y turn before the first layer turn brings the band');
  assert.ok(w2.quatAngle(ev2('cubeTab.qTo'),yq)<1,'the picture follows the cube');
  click2(d2.querySelector('#cubeWinReset'));
  assert.ok(!ev2('cubeTab.away')&&!warn2(),'Reset view: the band goes');
  assert.ok(w2.quatAngle(ev2('cubeTab.qTo'),[0,0,0,1])<1,'the picture lines up with the hold');
  tilt2(ev2('CUBE_TAB_HOLDS').find(h=>h.moves.join(' ')==='x').q);
  assert.ok(await until(()=>warn2(),500),'a different face up warns too');
  assert.ok(d2.querySelector('#cubeWinKeep').classList.contains('hidden'));
  assert.deepStrictEqual(b2.errs,[],'no script errors on the second page');
  console.log('cubetab ok');process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
