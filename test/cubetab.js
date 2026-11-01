// The smart cube sheet (js/cubetab.js), with a fake GAN cube (test/fake-gan.js). No Smart cube tab
// (1.64): five CFOP sections, and the sheet in #everyMore (an Everywhere sheet of the stage view,
// under the timer elsewhere): a Connect card while Smart cube is picked and no cube is connected,
// the page stays on its section when a cube connects, the sheet with the cube's name and charge and
// no picture of its own (the cube on the page is the live cube), the moves (merged, the last ten, a
// range for more) as the cube on the page holds it (the hold follows the player's picture and its
// hold row; a whole-cube turn said to Listen turns the picture), the stage of the solve, another
// section (the moves still count), a dropped link offers Connect again, Disconnect puts the Connect
// card back, and the beginner method keeps its tabs. No top-bar tab, no floating window, no callout.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const {fakeDevice,mfDataFor,stateMsg,batteryMsg}=require('./fake-gan');
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
  const win=()=>$('#cubeWin'),home=()=>$('#smartHome'),shown=el=>!el.classList.contains('hidden');
  // ----- names -----
  assert.strictEqual(w.smartNiceName('GAN12uiM_A1B2'),'GAN 12 ui Maglev');
  assert.strictEqual(w.smartNiceName('GAN14ui_7F3C'),'GAN 14 ui');
  assert.strictEqual(w.smartNiceName('GAN356i3_AB12'),'GAN 356 i3');
  assert.strictEqual(w.smartNiceName('GAN356iC_AB12'),'GAN 356 i Carry');
  assert.strictEqual(w.smartNiceName('GAN356iCarry2_AB12'),'GAN 356 i Carry 2');
  assert.strictEqual(w.smartNiceName('MG_AB12'),'MG');
  assert.strictEqual(w.smartNiceName(''),'GAN cube');
  // ----- no Smart cube tab: five CFOP sections; the sheet only while Smart cube is the cube -----
  assert.strictEqual($$('#rail button').length,5,'five CFOP sections');
  assert.ok(!$('#rail button[data-tab="smart"]')&&!$('#tab-smart'),'no Smart cube tab');
  assert.ok(!shown(win())&&!shown(home()),'no cube picked: no smart cube sheet');
  assert.ok(win().closest('#everyMore')&&home().closest('#everyMore'),'the sheet is in #everyMore, for every section');
  w.setCubeSrc('smart');assert.ok(!shown(win())&&shown(home()),'Smart cube picked: the Connect card shows, the live sheet is hidden');
  assert.strictEqual($('#smartHome h2').textContent,'Smart cube');
  assert.strictEqual(picks,0,'no known cube, no getDevices: the sheet does not look by itself');
  click($('#smartTabConnect'));assert.ok(!$('#smartBg'),'Connect a smart cube opens no dialog');assert.strictEqual(picks,1,'it opens the browser\'s chooser at once');
  assert.ok(await until(()=>/No cube was chosen/.test($('#smartTabStatus').textContent)),'no cube chosen: the card says so: '+$('#smartTabStatus').textContent);
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'6',bubbles:true}));assert.strictEqual(ev('curTab'),'cross','no sixth section');
  // ----- connect: the page stays; the sheet carries the name and the charge -----
  const c1=w.applyAlg(new Cube(),['R','U',"F'",'L2','D','B',"R'"]);set(c1);
  dev=fakeDevice(4,MAC,cube,{mfData:mfDataFor(MAC),name:'GAN12uiM_A1B2'});
  click($('#smartBtn'));await sleep(20);click($('#smartConnect'));
  assert.ok(await until(()=>!$('#smartUse').disabled),'connected: '+$('#smartStatus').textContent);
  run('cubeTab.stillMs=150;cubeTab.revealMs=120'); // short waits for the stage
  assert.strictEqual(ev('curTab'),'cross','a cube connects: the page stays on its section');
  assert.ok(shown(win())&&!shown(home()),'the live sheet shows, the Connect card is hidden');
  assert.strictEqual($('#cubeWin .cw-head .nm').textContent,'GAN 12 ui Maglev','named after the cube');
  assert.ok(await until(()=>!$('#cubeWinBatt').hidden&&$('#cubeWinBatt').textContent==='77%'),'the head shows the charge: '+$('#cubeWinBatt').textContent);
  assert.ok(!$('#cubeSpot')&&w.localStorage.getItem('cw:cubeTip')===null,'no callout');
  esc();assert.ok(!$('#smartBg'),'Esc closes the dialog');assert.ok(!$('#cubeSpot'),'and still no callout');
  dev.notify(batteryMsg(4,15));await sleep(20);
  assert.strictEqual($('#cubeWinBatt').textContent,'15%','a new reading changes the charge');assert.ok($('#cubeWinBatt').classList.contains('low'),'a low charge is marked');assert.strictEqual($('#cubeWinBatt').querySelector('.batt-fill').style.width,'15%');
  dev.notify(batteryMsg(4,77));await sleep(20);assert.ok(!$('#cubeWinBatt').classList.contains('low'));
  assert.ok(await until(()=>ev('cubeTab.target')&&ev('cubeTab.target').equals(c1)),'the sheet reads the cube');
  assert.ok(/^Live\. The moves and the stage read with /.test($('#cubeWinNote').textContent),$('#cubeWinNote').textContent);
  assert.ok($('#cubeWinAgain').classList.contains('hidden'));
  assert.ok($('#cubeWinOptions'),'Options opens the dialog');click($('#cubeWinOptions'));assert.ok($('#smartBg'));esc();
  // ----- the cube on the page is the live cube: no picture, hold row, turn buttons, tilt or Front view here -----
  for(const id of ['cubeWinSvg','cubeWinTurns','cubeWinHold','cubeWinWarn','cubeWinLock','cubeWinReset','cubeWinFront','cubeWinHidden'])assert.ok(!$('#'+id),'no #'+id);
  assert.ok($('#cubeWinStage').closest('.cw-aside')&&$('#cubeWinListen').closest('.cw-aside')&&$('#cubeWinHints').closest('.cw-aside'),'the stage, Listen and its hints in the sheet');
  // ----- the hold follows the player's picture -----
  const HOLDS=ev('CUBE_TAB_HOLDS'),holdOf=ms=>HOLDS.find(h=>h.moves.join(' ')===ms);
  assert.strictEqual(ev('cubeTab.hold'),holdOf('z2'),'a white cross: the picture shows yellow up, and so the sheet reads');
  const tile=(place,cb)=>$$(`#viewHold .grp[data-place="${place}"] .ht`).find(b=>b.dataset.cb===cb);
  click(tile('up','W'));assert.strictEqual(ev('cubeTab.hold'),null,'a tile of the hold row: white up, green in front');
  // ----- turns: the state follows, up to four moves known between two states -----
  const readout=()=>$$('#cubeWinMoves .mv').map(s=>s.textContent).join(' ');
  const mv=new Uint8Array(20);mv[0]=0x01;
  const c2=w.applyAlg(c1,['U']);set(c2);dev.notify(mv);
  assert.ok(await until(()=>ev('cubeTab.target').equals(c2),500),'a turn: the sheet reads the new cube');assert.strictEqual(readout(),'U');
  const c3=w.applyAlg(c2,['R','F']);set(c3);dev.notify(mv);
  assert.ok(await until(()=>ev('cubeTab.target').equals(c3),500),'two turns between two states');
  const c4=w.applyAlg(c3,["U'"]);set(c4);dev.notify(mv);
  assert.ok(await until(()=>ev('cubeTab.target').equals(c4),500));
  const c5=w.applyAlg(c4,['R','U',"R'","U'"]);set(c5);dev.notify(mv);
  assert.ok(await until(()=>ev('cubeTab.target').equals(c5),500),'four turns');
  const c6=w.applyAlg(c5,['R','U','F','D','L']);set(c6);dev.notify(mv);
  assert.ok(await until(()=>ev('cubeTab.target').equals(c6),500),'five turns: the cube, with the moves not known');
  assert.strictEqual(readout(),"U R F U' R U R' U'",'the moves known: '+readout());
  // A whole-cube turn said to Listen (cubeTabTurn): the turn goes on the list, the hold moves on,
  // and the picture on the page turns with it. A layer turn is then named by where its face sits.
  w.cubeTabTurn('z');w.cubeTabTurn('z');
  assert.strictEqual(ev('cubeTab.hold'),holdOf('z2'),'turned over: z2');
  assert.deepStrictEqual({...ev('PLAYER.hold')},{top:3,front:2},'the picture on the page turns with it');
  assert.ok(readout().endsWith('z2'),'the two turns merge on the list: '+readout());
  assert.strictEqual($('#cubeWinMoves .mv.rot').textContent,'z2','the turn of the cube is marked');
  const c7=w.applyAlg(c6,['R']);set(c7);dev.notify(mv);
  assert.ok(await until(()=>readout().endsWith('z2 L'),1500),"the cube's R sat on the left: "+readout());
  // ----- the moves -----
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
  // In the sheet: every move seen so far, in order, as held. The five-move jump was not known.
  assert.strictEqual(readout(),"U R F U' R U R' U' z2 L",'the moves so far: '+readout());
  assert.ok(!$('#cubeWinMoves .more'),'no triangle at ten moves');
  // Back to white up: the turns go on the list too. The list is what was done; the hold is a view.
  w.cubeTabTurn("z'");w.cubeTabTurn("z'");
  assert.ok(!ev('cubeTab.hold'),'white up, green front again');
  assert.strictEqual(ev('cubeTab.moves').length,11,'eleven moves: '+ev('cubeTab.moves').join(' '));assert.ok($('#cubeWinMoves .more'),'and the triangle');
  // Clear moves empties the list.
  assert.ok(!$('#cubeWinClear').disabled);click($('#cubeWinClear'));
  assert.ok(!readout()&&$('#cubeWinMoves .none'),'Clear moves empties the list');assert.strictEqual($('#cubeWinMoves .none').textContent,'No moves yet');
  assert.ok($('#cubeWinClear').disabled,'and has nothing more to clear');
  assert.ok($('#cubeWinClear').closest('.cw-side')&&$('#cubeWinView').previousElementSibling===$('#cubeWinMoves'),'Clear moves sits under the moves');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'v',bubbles:true}));assert.ok(!w.localStorage.getItem('cw:smartFront'),'no V key');
  // Four moves, then turned back move by move: the list shrinks.
  let cc=w.applyAlg(c7,['R','U',"R'","U'"]);set(cc);dev.notify(mv);
  assert.ok(await until(()=>readout()==="R U R' U'",1500),'four moves: '+readout());
  assert.ok(!$('#cubeWinClear').disabled,'Clear moves is live again');
  // The player's hold row sets the hold the sheet reads, and no turn goes on the list.
  click(tile('up','Y'));assert.strictEqual(ev('cubeTab.hold'),holdOf('z2'),'yellow on top: z2, green stays in front');
  assert.strictEqual(readout(),"R U R' U'",'no turn goes on the list');
  click(tile('front','R'));assert.deepStrictEqual([...ev('cubeTab.hold').cube.center.slice(0,3)],[3,2,1],'yellow on top, red in front');
  run('PLAYER.hold={top:0,front:2};drawMain();playerHoldDraw()');assert.ok(!ev('cubeTab.hold'),'white on top, green in front: the cube\'s own frame');
  assert.strictEqual(readout(),"R U R' U'",'the list never changed');
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
  assert.strictEqual(more.textContent.trim(),'1','the hidden move as a range');assert.ok($('#cubeWinMoves .z-now .mv'),'the last move in the Now zone');assert.ok(!more.onclick,'nothing happens on a click yet');
  // ----- another section: the sheet is there too, and the moves still count -----
  w.goTab('ll');assert.strictEqual(ev('curTab'),'ll');assert.ok(shown(win()),'the sheet is in every section');
  cc=w.applyAlg(cc,['B']);set(cc);dev.notify(mv);
  assert.ok(await until(()=>ev('cubeTab.moves').length===12,1500),'a move on another section is kept');
  assert.ok(readout().endsWith('L B'),'and shows: '+readout());
  // ----- the holds -----
  // Pure: the 24 holds, each from at most two turns, and each one's turn of the body draws the
  // cube as its moves do; a move named by where its face sits.
  const polysOf=svg=>[...svg.querySelectorAll('polygon')].map(p=>{const q=p.getAttribute('points').split(' ').map(v=>v.split(',').map(Number));return {x:q.reduce((a,v)=>a+v[0],0)/q.length,y:q.reduce((a,v)=>a+v[1],0)/q.length,fill:p.getAttribute('fill')};});
  const same=(A,B)=>{if(A.length!==B.length)return false;const used=new Set();for(const a of A){const i=B.findIndex((b,j)=>!used.has(j)&&b.fill===a.fill&&Math.hypot(a.x-b.x,a.y-b.y)<0.3);if(i<0)return false;used.add(i);}return true;};
  const fixed=(c,o)=>polysOf(new w.DOMParser().parseFromString('<svg>'+w.renderCube3D(c.toFacelets(),Object.assign({yaw:-32,pitch:28,n:3},o||{}))+'</svg>','text/html'));
  assert.strictEqual(HOLDS.length,24);assert.strictEqual(HOLDS[0].moves.length,0);
  for(const h of HOLDS){assert.ok(h.moves.length<=2,h.moves.join(' '));
    assert.ok(same(fixed(c7,{rot:w.quatMat(h.q)}),fixed(w.applyAlg(c7,h.moves))),'the turn of the body is the picture after its moves: '+h.moves.join(' '));}
  assert.strictEqual(w.cubeTabRelabel('R',holdOf('z2')),'L');assert.strictEqual(w.cubeTabRelabel("U'",holdOf('z2')),"D'");assert.strictEqual(w.cubeTabRelabel('F2',holdOf('z2')),'F2');
  assert.strictEqual(w.cubeTabRelabel('R',holdOf('y')),'F','after y the cube\'s right face is in front');assert.strictEqual(w.cubeTabRelabel('R',null),'R');assert.strictEqual(w.cubeTabRelabel('x',holdOf('y')),'x');
  // Each turn from each hold lands on a hold, and the picture with it; x x' and the like land back where they were.
  {const saved=ev('cubeTab.moves');
    for(const h of HOLDS)for(const m of ['x','y','z']){
      run('cubeTab.hold='+(h.moves.length?'CUBE_TAB_HOLDS['+HOLDS.indexOf(h)+']':'null'));
      w.cubeTabTurn(m);const g=ev('cubeTab.hold')||HOLDS[0];assert.ok(g.cube.equals(w.applyAlg(h.cube,[m])),'after '+m+' from '+h.moves.join(' '));
      const P=ev('PLAYER.hold');assert.ok(P.top===g.cube.center[0]&&P.front===g.cube.center[2],'the picture follows: '+m+' from '+h.moves.join(' '));
      w.cubeTabTurn(m+"'");assert.strictEqual(ev('cubeTab.hold')||HOLDS[0],h,'and back');}
    run('PLAYER.hold={top:0,front:2};drawMain();playerHoldDraw();cubeTab.moves='+JSON.stringify(saved)+';cubeTabMovesDraw();cubeTabSettle();');}
  assert.ok(!ev('cubeTab.hold'));
  // ----- the stage -----
  const stage=()=>$('#cubeWinStage'),stName=()=>stage().querySelector('.st-name').textContent,stSub=()=>stage().querySelector('.st-sub').textContent;
  const stMoves=()=>$$('#cubeWinStage .st-alg .mv').map(s=>s.classList.contains('hid')?'•':s.textContent),stDone=()=>$$('#cubeWinStage .st-alg .mv.done').length;
  assert.ok(stage()&&stage().parentNode.classList.contains('cw-aside')&&stage()===stage().parentNode.firstElementChild,'the stage heads the sheet');
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
  // The cube turned over in the hands, z said twice: the hold is z2, the turn goes on the list,
  // and the z2 of the case is done.
  click($('#cubeWinClear'));
  w.cubeTabTurn('z');w.cubeTabTurn('z');
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
  user(st.moves.slice(2,5));await until(()=>ev('cubeTab.target').equals(cur),1500);
  assert.ok(await until(()=>stDone()===5,1500),'five done: '+stDone());
  user(st.moves.slice(5));
  assert.ok(await until(()=>stName()==='Solved',2500),'the case done: '+stName());
  assert.strictEqual(readout(),st.moves.join(' '),'the list is the case as held: '+readout());
  // A T perm, set up in the hands. Its moves hide. A U turn on the same case keeps what was
  // revealed. A wrong move part way breaks the cross, but the stage never falls back on its own:
  // the case stays with no move marked, and the slip put right keeps the reveals.
  const tp=ev('ALG_DB').cp[0],setup=w.parseAlg(w.invertAlg(tp.alg));
  for(let i=0;i<setup.length;i+=4){user(setup.slice(i,i+4));await until(()=>ev('cubeTab.target').equals(cur),1500);}
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
  for(let i=0;i<tpm.length;i+=4){user(tpm.slice(i,i+4));await until(()=>ev('cubeTab.target').equals(cur),1500);}
  assert.ok(await until(()=>stName()==='Solved',2500),'the T perm done: '+stName());
  user(['R','U']);assert.ok(await until(()=>stName()==='Cross',1500),'a solved cube turned is not kept: '+stName());
  user(["U'","R'"]);assert.ok(await until(()=>stName()==='Solved',1500));
  // A Sune set up, then a new scramble: the case is kept for a while (the user may be part way
  // through), and once more moves have gone by than the algorithm twice and four, the cross shows.
  const sset=w.parseAlg(w.invertAlg(sune.alg));
  for(let i=0;i<sset.length;i+=4){user(sset.slice(i,i+4));await until(()=>ev('cubeTab.target').equals(cur),1500);}
  assert.ok(await until(()=>stName()==='Sune',2500),'Sune again: '+stName());
  const n=ev('cubeTab.stage').moves.length,budget=Math.max(12,2*n+4),scr=w.parseAlg("F L D B R U F' L' D' B' R' U' F2 L2 D2 B2 R2 U2 F L D B R U");
  assert.ok(scr.length>budget,'the scramble is longer than the budget');
  let i=0;for(;i<budget-3;i+=4){user(scr.slice(i,i+4));await until(()=>ev('cubeTab.target').equals(cur),1500);}
  assert.ok(await until(()=>!stage().classList.contains('stale')&&!ev('cubeTab.stillTimer'),1500));
  assert.strictEqual(stName(),'Sune','the case is kept through '+ev('cubeTab.since')+' moves: '+stName());
  for(;i<scr.length;i+=4){user(scr.slice(i,i+4));await until(()=>ev('cubeTab.target').equals(cur),1500);}
  assert.ok(await until(()=>stName()==='Cross',2500),'past the budget, the cross: '+stName());
  // The hold stays through a change of section.
  w.goTab('cross');assert.strictEqual(ev('cubeTab.hold'),holdOf('z2'),'the hold survives a change of section');
  // ----- a modal takes Esc; the sheet has no Esc of its own -----
  click($('#smartBtn'));await sleep(20);assert.ok($('#smartBg'));
  esc();assert.ok(!$('#smartBg')&&shown(win())&&ev('curTab')==='cross','Esc closes the dialog; the sheet stays');
  // ----- the link drops: the sheet dims and offers the way back -----
  dev.gatt.disconnect();await sleep(10);
  assert.ok(win().classList.contains('off')&&shown(win()),'a dropped link dims the sheet');
  assert.ok($('#cubeWinBatt').hidden,'the charge goes with the link');
  assert.strictEqual(ev('cubeTab.hold'),holdOf('z2'),'the hold stays while the link is down');
  assert.ok(/no longer connected/.test($('#cubeWinNote').textContent));
  assert.ok($('#cubeWinListen').disabled,'Listen waits for the link');
  assert.ok(!$('#cubeWinAgain').classList.contains('hidden'),'Connect again shows');
  assert.ok(ev('smartLook')===null,'no getDevices: no look by itself');
  dev=fakeDevice(4,MAC,cube,{mfData:mfDataFor(MAC),name:'GAN12uiM_A1B2'});
  click($('#cubeWinConnect'));assert.ok(!$('#smartBg'),'Connect again opens no dialog');
  assert.ok(await until(()=>!!ev('smartConn')),'the chooser, then connected again');assert.ok(!$('#smartBg')&&ev('curTab')==='cross','on the same section, with no dialog');
  assert.ok(!win().classList.contains('off'),'the sheet is live again');
  assert.ok(await until(()=>!$('#cubeWinBatt').hidden&&$('#cubeWinBatt').textContent==='77%'),'and the charge is read again');
  assert.strictEqual(ev('cubeTab.moves').length,0,'a new connection starts the move list again');
  assert.strictEqual(ev('cubeTab.hold'),holdOf('z2'),'and reads with the hold the picture shows');
  // ----- Disconnect puts the Connect card back -----
  click($('#smartBtn'));await sleep(20);click($('#smartDisconnect'));
  assert.ok(!shown(win())&&shown(home()),'Disconnect: the Connect card is back');
  esc();assert.strictEqual(ev('curTab'),'cross','the page stays');
  assert.deepStrictEqual(errs,[],'no script errors');
  // ----- a second page: the beginner method keeps its tabs; CFOP shows the sheet -----
  const b2=await boot({},bt);const d2=b2.d,w2=b2.w,ev2=s=>new w2.Function('return ('+s+')')();
  const click2=el=>el.dispatchEvent(new w2.MouseEvent('click',{bubbles:true}));
  w2.setMethod('beginner');assert.strictEqual(ev2('curTab'),'learn');
  set(c1);dev=fakeDevice(4,MAC,cube,{mfData:mfDataFor(MAC),name:'GAN356iC_0001'});
  click2(d2.querySelector('#smartBtn'));await sleep(20);click2(d2.querySelector('#smartConnect'));
  assert.ok(await until(()=>!d2.querySelector('#smartUse').disabled));
  d2.dispatchEvent(new w2.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.strictEqual(ev2('curTab'),'learn','a beginner stays on the Learn tab');assert.ok(!d2.querySelector('#cubeSpot'),'no callout');
  assert.strictEqual(d2.querySelector('#cubeWin .cw-head .nm').textContent,'GAN 356 i Carry','the sheet is ready all the same');
  w2.setMethod('cfop');assert.ok(!d2.querySelector('#cubeWin').classList.contains('hidden'),'CFOP: the live sheet');
  assert.ok(!d2.querySelector('#rail button[data-tab="smart"]'),'and no tab');
  assert.deepStrictEqual(b2.errs,[],'no script errors on the second page');
  console.log('cubetab ok');process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
