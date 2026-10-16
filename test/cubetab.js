// The cube tab in the top bar (js/cubetab.js), with a fake GAN cube (test/fake-gan.js): the tab
// appears on connect with the cube's name, the first-time callout waits for the dialog to close,
// the window shows a live cube that turns the layer for each turn (turns queue, up to four moves
// between two states, further away snaps), the turn buttons (x, y, z and their primes: the picture
// turns, the turn goes on the list, the moves and the stage read as the cube is held), the moves
// under the picture (merged, the last ten, a triangle for more), the head drags the window, Close
// (Esc) collapses it, a dropped link dims the tab, Disconnect removes it.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const {fakeDevice,mfDataFor,gyroMsg,stateMsg}=require('./fake-gan');
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
  const bt={requestDevice:async()=>{if(!dev)throw Object.assign(new Error('cancelled'),{name:'NotFoundError'});return dev;}};
  const {w,d,errs}=await boot({},bt);
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
  const click=el=>{assert.ok(el,'element to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};
  const esc=()=>d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  const ev=s=>w.eval(s),Cube=ev('Cube');
  const winColors=()=>$$('#cubeWinSvg polygon').map(p=>p.getAttribute('fill'));
  const picOf=c=>[...new w.DOMParser().parseFromString('<svg>'+w.renderCube3D(c.toFacelets(),{yaw:-32,pitch:28,n:3})+'</svg>','text/html').querySelectorAll('polygon')].map(p=>p.getAttribute('fill'));
  // ----- names -----
  assert.strictEqual(w.smartNiceName('GAN12uiM_A1B2'),'GAN 12 ui Maglev');
  assert.strictEqual(w.smartNiceName('GAN14ui_7F3C'),'GAN 14 ui');
  assert.strictEqual(w.smartNiceName('GAN356i3_AB12'),'GAN 356 i3');
  assert.strictEqual(w.smartNiceName('GAN356iC_AB12'),'GAN 356 i Carry');
  assert.strictEqual(w.smartNiceName('GAN356iCarry2_AB12'),'GAN 356 i Carry 2');
  assert.strictEqual(w.smartNiceName('MG_AB12'),'MG');
  assert.strictEqual(w.smartNiceName(''),'GAN cube');
  // ----- before a cube: no tab -----
  assert.ok(!$('#cubeTab'),'no tab before a cube connects');
  // ----- connect: the tab appears in the top bar; the callout waits for the dialog -----
  const c1=w.applyAlg(new Cube(),['R','U',"F'",'L2','D','B',"R'"]);set(c1);
  dev=fakeDevice(4,MAC,cube,{mfData:mfDataFor(MAC),name:'GAN12uiM_A1B2'});
  click($('#smartBtn'));await sleep(20);click($('#smartConnect'));
  assert.ok(await until(()=>!$('#smartUse').disabled),'connected: '+$('#smartStatus').textContent);
  ev('cubeTab.holdMs=30;cubeTab.stillMs=150;cubeTab.revealMs=120'); // short waits for the hold and the stage
  const tab=$('#cubeTab');assert.ok(tab,'the tab is there');
  assert.ok(tab.closest('header.top'),'in the top bar');
  assert.strictEqual(tab.querySelector('.nm').textContent,'GAN 12 ui Maglev','named after the cube');
  assert.ok(!tab.classList.contains('off'));assert.strictEqual(tab.getAttribute('aria-expanded'),'false');
  assert.ok(!$('#cubeSpot'),'the callout waits while the dialog is open');
  assert.strictEqual(w.localStorage.getItem('cw:cubeTip'),null);
  esc();assert.ok(!$('#smartBg'),'Esc closes the dialog');
  const spot=$('#cubeSpot');assert.ok(spot,'the page dims once the dialog is closed');
  assert.strictEqual(spot.querySelectorAll('.sh').length,4,'four shades around the tab');
  assert.strictEqual(spot.querySelector('.callout').textContent,'Click your smart cube to open the Smart Cube interface!');
  assert.strictEqual(w.localStorage.getItem('cw:cubeTip'),'1','seen once');
  assert.ok($('#cubeTab'),'the tab itself is not under a shade');
  click(spot.querySelector('.sh'));assert.ok(!$('#cubeSpot'),'a click on the shade ends it');
  // ----- the tab opens the window with the live cube -----
  click($('#cubeTab'));
  assert.ok($('#cubeWin'),'the window opens');assert.strictEqual($('#cubeTab').getAttribute('aria-expanded'),'true');
  assert.strictEqual($('#cubeWin .nm').textContent,'GAN 12 ui Maglev');
  assert.ok(/Esc/.test($('#cubeWinClose').textContent),'Close (Esc)');
  assert.ok(await until(()=>winColors().join()===picOf(c1).join()),'the window shows the cube');
  assert.ok(/Live/.test($('#cubeWinNote').textContent));
  assert.ok($('#cubeWinAgain').classList.contains('hidden'));
  await sleep(30);assert.strictEqual(d.activeElement,$('#cubeWinClose'),'Close has the focus');
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
  const Cube_=w.Cube;const c5=w.applyAlg(c4,['R','U',"R'","U'"]);set(c5);dev.notify(mv);
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
  const turns=$('#cubeWinTurns');assert.ok(turns&&turns.previousElementSibling===$('#cubeWinSvg'),'the turn buttons sit under the picture');
  assert.deepStrictEqual($$('#cubeWinTurns button').map(b=>b.textContent),['x',"x'",'y',"y'",'z',"z'"],'six turns');
  assert.strictEqual($$('#cubeWinTurns .grp').length,3,'in three pairs');
  for(const b of $$('#cubeWinTurns button')){assert.ok(/turn the whole cube/.test(b.title),b.title);assert.ok(!b.disabled);}
  assert.ok(/Turn the cube/.test(turns.textContent));
  assert.ok(!$('#cubeWinFollow')&&!$('#cubeWinHome')&&!$('#cubeWinIso'),'no tilt controls');
  assert.ok(!ev('cubeTab.hold')&&!ev('cubeTab.q'),'held as the cube names its faces until a press');
  assert.ok(same(winPolys(),fixed(c6)),'the fixed view');
  assert.ok(/press the same turn/.test($('#cubeWinNote').textContent),'the note says to press the turns');
  // A tilt message from the cube changes nothing.
  dev.notify(gyroMsg(4,{w:0,x:0,y:0,z:1}));await sleep(30);
  assert.ok(!ev('cubeTab.q')&&!ev('cubeTab.hold')&&same(winPolys(),fixed(c6)),'the tilt is ignored');
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
  // ----- the head drags the window -----
  const win=$('#cubeWin'),head=win.querySelector('.cw-head');
  assert.ok(/Drag/.test(head.title),'the head says it drags');
  const PE=w.PointerEvent||w.MouseEvent;
  const pe=(type,x,y,target)=>target.dispatchEvent(new PE(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,pointerId:1}));
  Object.defineProperty(w,'innerWidth',{value:1200,configurable:true});Object.defineProperty(w,'innerHeight',{value:800,configurable:true});
  win.getBoundingClientRect=()=>({left:860,top:70,width:320,height:400,right:1180,bottom:470});
  pe('pointerdown',900,80,head);assert.ok(win.classList.contains('drag'),'a press on the head starts the drag');
  pe('pointermove',600,300,head);
  assert.strictEqual(win.style.left,'560px','the window follows the pointer');assert.strictEqual(win.style.top,'290px');assert.strictEqual(win.style.right,'auto');
  pe('pointermove',-500,2000,head);
  assert.strictEqual(win.style.left,'8px','kept on the screen on the left');assert.strictEqual(win.style.top,'752px','the head stays in view at the bottom');
  pe('pointermove',600,300,head);pe('pointerup',600,300,head);
  assert.ok(!win.classList.contains('drag'));
  assert.deepStrictEqual(JSON.parse(w.localStorage.getItem('cw:cubeWin')),{x:560,y:290},'the place is kept');
  pe('pointermove',100,100,head);assert.strictEqual(win.style.left,'560px','no drag after the release');
  // A press on Close is not a drag.
  pe('pointerdown',1100,80,$('#cubeWinClose'));assert.ok(!win.classList.contains('drag'));
  // Reopened, the window is where it was left.
  esc();click($('#cubeTab'));assert.strictEqual($('#cubeWin').style.left,'560px','the place survives a close');assert.strictEqual($('#cubeWin').style.top,'290px');
  // ----- the moves under the picture -----
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
  // In the window: every move seen so far, in order, as held. The five-move jump was not known.
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
  // The window closed, the moves still count: a turn asks the cube for its state all the same.
  esc();assert.ok(!$('#cubeWin'));
  cc=w.applyAlg(cc,['B']);set(cc);dev.notify(mv);
  assert.ok(await until(()=>ev('cubeTab.moves').length===12,1500),'a move with the window closed is kept');
  click($('#cubeTab'));assert.ok(readout().endsWith('L B'),'and shows on reopen: '+readout());
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
      ev('cubeTab.hold='+(h.moves.length?'CUBE_TAB_HOLDS['+HOLDS.indexOf(h)+']':'null'));
      w.cubeTabTurn(m);const g=ev('cubeTab.hold')||HOLDS[0];assert.ok(g.cube.equals(w.applyAlg(h.cube,[m])),'after '+m+' from '+h.moves.join(' '));
      w.cubeTabTurn(m+"'");assert.strictEqual(ev('cubeTab.hold')||HOLDS[0],h,'and back');}
    ev('cubeTabStopView();cubeTab.hold=null;cubeTab.q=cubeTab.qTo=null;cubeTab.moves='+JSON.stringify(saved)+';cubeTabMovesDraw();cubeTabDraw();cubeTabSettle();');}
  // ----- the stage above the picture -----
  const stage=()=>$('#cubeWinStage'),stName=()=>stage().querySelector('.st-name').textContent,stSub=()=>stage().querySelector('.st-sub').textContent;
  const stMoves=()=>$$('#cubeWinStage .st-alg .mv').map(s=>s.classList.contains('hid')?'•':s.textContent),stDone=()=>$$('#cubeWinStage .st-alg .mv.done').length;
  assert.ok(stage()&&stage().nextElementSibling===$('#cubeWinSvg'),'the stage panel is above the picture');
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
  // fade, and the reveals go on. One move shows every revealMs.
  for(let i=0;i<3;i++){dev.notify(stateMsg(4,cube,200+i));await sleep(25);}
  assert.ok(!stage().classList.contains('stale'),'a state read again with no turn does not fade the stage');
  assert.ok(await until(()=>stMoves()[0]==='z2',600),'the first move shows: '+stMoves().join(' '));assert.strictEqual(stMoves()[1],'•');
  assert.ok($('#cubeWinStage .mv.rot'),'a turn of the cube is marked');
  assert.ok(await until(()=>stMoves()[1]!=='•',600),'then the second');
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
  // A T perm, set up in the hands. Its moves hide; a wrong move part way reads as another stage;
  // back on the case, the moves hide again. A U turn on the same case keeps what was revealed.
  const tp=ev('ALG_DB').cp[0],setup=w.parseAlg(w.invertAlg(tp.alg));
  for(let i=0;i<setup.length;i+=4){user(setup.slice(i,i+4));await until(()=>!ev('cubeTab.anim')&&ev('cubeTab.target').equals(cur),1500);}
  assert.ok(await until(()=>stName()==='T perm',2500),'T perm: '+stName());assert.strictEqual(stSub(),'Yellow up, green in front');
  assert.ok(await until(()=>stMoves().filter(m=>m!=='•').length===2,800),'two moves shown');
  user(['U']);assert.ok(await until(()=>stage().classList.contains('stale'),300));
  assert.ok(await until(()=>!stage().classList.contains('stale'),1500));assert.strictEqual(stName(),'T perm');
  assert.ok(stMoves().filter(m=>m!=='•').length>=2,'the same case keeps its reveals: '+stMoves().join(' '));
  user(['F']);
  assert.ok(await until(()=>!stage().classList.contains('stale')&&stName()!=='T perm',1500),'off the case: '+stName());
  user(["F'"]);
  assert.ok(await until(()=>stName()==='T perm'&&!stage().classList.contains('stale'),1500),'back on the case');
  assert.strictEqual(stMoves().filter(m=>m!=='•').length,0,'hidden again after another stage');
  // The hold stays through a close and a reopen.
  esc();click($('#cubeTab'));assert.strictEqual(ev('cubeTab.hold'),holdOf('z2'),'the hold survives a close');
  assert.ok(same(winPolys(),fixed(w.applyAlg(cur,['z2']))),'and so does the picture');
  // ----- Esc collapses the window back into the tab -----
  esc();assert.ok(!$('#cubeWin'),'Esc closes the window');assert.ok($('#cubeTab'),'the tab stays');
  assert.strictEqual($('#cubeTab').getAttribute('aria-expanded'),'false');assert.strictEqual(d.activeElement,$('#cubeTab'),'the tab has the focus');
  // A modal takes Esc first.
  click($('#cubeTab'));click($('#smartBtn'));await sleep(20);assert.ok($('#smartBg')&&$('#cubeWin'));
  esc();assert.ok(!$('#smartBg')&&$('#cubeWin'),'Esc closes the dialog, not the window');
  assert.ok(!$('#cubeSpot'),'no second callout');
  click($('#cubeWinClose'));assert.ok(!$('#cubeWin'),'the Close button closes');
  // ----- the link drops: the tab dims, the window offers the way back -----
  dev.gatt.disconnect();await sleep(10);
  assert.ok($('#cubeTab').classList.contains('off'),'a dropped link dims the tab');
  assert.strictEqual(ev('cubeTab.hold'),holdOf('z2'),'the hold stays while the link is down');
  click($('#cubeTab'));assert.ok(/no longer connected/.test($('#cubeWinNote').textContent));
  assert.ok($$('#cubeWinTurns button').every(b=>b.disabled),'the turn buttons wait for the link');
  assert.ok(!$('#cubeWinAgain').classList.contains('hidden'),'Connect again shows');
  click($('#cubeWinConnect'));assert.ok($('#smartBg')&&!$('#cubeWin'),'Connect again opens the dialog');
  dev=fakeDevice(4,MAC,cube,{mfData:mfDataFor(MAC),name:'GAN12uiM_A1B2'});
  click($('#smartConnect'));assert.ok(await until(()=>!$('#smartUse').disabled),'connected again');
  assert.ok(!$('#cubeTab').classList.contains('off'),'the tab is live again');
  assert.strictEqual(ev('cubeTab.moves').length,0,'a new connection starts the move list again');
  assert.ok(!ev('cubeTab.hold'),'and holds the cube white up, green front');
  esc();assert.ok(!$('#cubeSpot'),'the callout shows only once');
  // ----- Disconnect removes the tab -----
  click($('#cubeTab'));assert.ok($('#cubeWin'));
  click($('#smartBtn'));await sleep(20);click($('#smartDisconnect'));
  assert.ok(!$('#cubeTab'),'Disconnect removes the tab');assert.ok(!$('#cubeWin'),'and the window');
  assert.ok(!ev('cubeTab.hold')&&!ev('cubeTab.q'),'Disconnect forgets the hold');
  esc();
  assert.deepStrictEqual(errs,[],'no script errors');
  // ----- a browser that has seen the callout -----
  const b2=await boot({'cw:cubeTip':'1'},bt);const d2=b2.d,w2=b2.w;
  set(c1);dev=fakeDevice(4,MAC,cube,{mfData:mfDataFor(MAC),name:'GAN356iC_0001'});
  const click2=el=>el.dispatchEvent(new w2.MouseEvent('click',{bubbles:true}));
  click2(d2.querySelector('#smartBtn'));await sleep(20);click2(d2.querySelector('#smartConnect'));
  assert.ok(await until(()=>!d2.querySelector('#smartUse').disabled));
  assert.strictEqual(d2.querySelector('#cubeTab .nm').textContent,'GAN 356 i Carry');
  d2.dispatchEvent(new w2.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.ok(!d2.querySelector('#cubeSpot'),'no callout the second time');
  console.log('cubetab ok');process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
