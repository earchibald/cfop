// The onboarding storyboard in the page: the virtual cube's keys (js/screencube.js), the cube in the
// section (js/place.js), the cube chip and menu (js/cubemenu.js), the getting-started pages of all
// five levels (js/start.js) and their parts in the site (js/start-app.js).
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
function fakeStorage(seed){const m=new Map(Object.entries(seed||{}));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),map:m};}
function boot(seed){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
    beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};Object.defineProperty(w,'localStorage',{value:fakeStorage(seed)});}});
  const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
  return new Promise(res=>w.addEventListener('load',()=>setTimeout(()=>res({w,d:w.document,errs}),450)));
}
const key=(w,d,code,shift)=>d.querySelector('#start h1')?d.querySelector('#start h1').dispatchEvent(new w.KeyboardEvent('keydown',{code,key:code.replace('Key','').toLowerCase(),shiftKey:!!shift,bubbles:true})):d.dispatchEvent(new w.KeyboardEvent('keydown',{code,shiftKey:!!shift,bubbles:true}));
(async()=>{try{
  let {w,d,errs}=await boot();
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)],st=()=>JSON.parse(w.localStorage.getItem('cw:llStatus')||'{}');
  assert.deepStrictEqual(errs,[],'no script errors');
  // ----- the virtual cube's keys: A W D X · S E and the numeric keypad, both at once -----
  assert.deepStrictEqual(Object.keys(w.eval('SCREEN_KEYMAPS')),['awdx','pad'],'two layouts');
  assert.strictEqual(w.screenKeyMove('KeyS',false),'F','S is the front, clockwise');
  assert.strictEqual(w.screenKeyMove('KeyD',true),"R'",'Shift turns the other way');
  assert.strictEqual(w.screenKeyMove('Numpad5',false),'F','keypad 5 is the front');
  assert.strictEqual(w.screenKeyMove('Numpad9',true),"B'",'keypad 9 is the back');
  assert.strictEqual(w.screenKeyMove('KeyK',false),null,'the old layouts are gone');assert.strictEqual(w.screenKeyMove('KeyQ',false),null,'a key of no face');
  assert.strictEqual(JSON.stringify(w.screenKeys('pad')),JSON.stringify({L:'4',U:'8',R:'6',D:'2',F:'5',B:'9'}));
  const ev=(code,k,shift,lock)=>({code,key:k,shiftKey:shift,getModifierState:m=>m==='NumLock'&&lock});
  assert.ok(!w.screenKeyShift(ev('Numpad4','4',false,true))&&w.screenKeyShift(ev('Numpad4','ArrowLeft',false,true)),'Shift on the keypad with Num Lock on');
  assert.ok(!w.screenKeyShift(ev('Numpad4','ArrowLeft',false,false)),'Num Lock off: no Shift');
  // ----- the cube in the section -----
  const slot=$('#cubeSlot');assert.ok(slot&&slot.parentNode===$('main.main'),'one cube slot beside the sections');
  assert.ok(slot.contains($('#player'))&&slot.contains($('#seedBar')),'the player and the seed bar are in it');
  assert.ok($('.page>footer.foot')===$('.page').lastElementChild,'the footer stays last');
  // ----- the first visit: the level picker -----
  assert.ok(d.body.classList.contains('starting'),'a first visit opens the level picker');
  assert.strictEqual($$('#start .st-level').length,4,'four levels');
  for(const b of $$('#start button'))assert.ok(b.title,'every control has a title: '+b.textContent.trim());
  // Level 1, I've never solved one: the basics first (no cube question, no move letter before the
  // moves page, no keys), then which cube, the virtual cube's keys, then the first solve.
  assert.ok(/I've never solved one!/.test($('#start [data-level="1"]').textContent)&&!$('#start [data-level="2"]'),'levels 1 and 2 are one level');
  assert.ok(/How do you feel about solving cubes\?/.test($('#start h1').textContent)&&/jump around later/.test($('#start .st-head p').textContent),'the level page heading');
  assert.ok(/not on purpose/.test($('#start [data-level="1"]').textContent),'the words of the first level');
  $('#start [data-level="1"]').click();assert.strictEqual($('#start').dataset.screen,'t1-what');
  const letters=/(^|[^\w])[UDFBRL]['′]?($|[^\w])/;
  for(const s of ['t1-what','t1-hold','t1-pieces']){
    if(s!=='t1-what'){$(`#start [data-go="${s}"]`).click();assert.strictEqual($('#start').dataset.screen,s);}
    assert.ok(!letters.test($('#start').textContent),'no move letter on '+s);
    assert.ok(!$('#start [data-src]')&&!$('#start .st-keys'),'no cube question on '+s);
    assert.ok(w.eval('SCREEN').active!==w.eval('START').sc,'the keys do not turn the picture on '+s);}
  key(w,d,'KeyS');assert.ok(w.eval('START').sc.cube.isSolved(),'a key does nothing in the basics');
  // Show me a turn: a random turn per click that stays; the log; Reset cube to Solved turns them back.
  w.startGo('t1-what');w.eval('ST_DEMO_T.turn=20;ST_DEMO_T.back=15');
  const off=sel=>$(sel).classList.contains('off');
  assert.ok(/^Show me a turn$/.test($('#stDemoLbl').textContent)&&off('#start [data-demoreset]')&&off('#stDemoLog'),'one button at first; the log keeps its room');
  assert.ok(/Drag to look around the cube/.test($('#start .st-hints').textContent)&&$$('#start .st-hints > span').length===2,'the two hints');
  assert.ok(/you can pick a regular cube, a smart cube or a virtual cube in the browser\./.test($('#start').textContent),'the virtual cube in the browser');
  assert.ok(/When the cube is Solved, each face is all one color/.test($('#start .st-rules').textContent)&&!/onto the faces next to it/.test($('#start').textContent),'the rules');
  await new Promise(r=>setTimeout(r,80));assert.deepStrictEqual($$('#start .gl').map(g=>g.dataset.gl).filter(g=>/cube$/.test(g)).sort(),['regular-cube','smart-cube','virtual-cube'],'each kind of cube has its tip');
  for(let i=0;i<6;i++)$('#start [data-demo]').click();
  const demo=w.eval('START.demo');assert.strictEqual(demo.length,6,'six clicks, six turns');
  assert.ok(demo.every(m=>!m.endsWith('2')),'no half turns: '+demo.join(' '));const axis=f=>'UDRLFB'.indexOf(f)>>1;assert.ok(demo.every((m,i)=>!i||axis(m[0])!==axis(demo[i-1][0])),'never the same axis twice in a row: '+demo.join(' '));
  assert.ok(!w.eval('START').sc.cube.isSolved(),'the turns stay');
  assert.strictEqual($('#stDemoLbl').textContent,'Show me another turn');assert.strictEqual($$('#stDemoChips .st-tchip').length,6,'the log');
  assert.ok(!letters.test($('#start').textContent),'no move letter in the log');
  $('#start [data-demoreset]').click();assert.ok($('#start [data-demo]').disabled,'no turn while it turns back');
  // The turns go back on a timer: wait for them, up to two seconds (a fixed wait failed under load).
  for(let t=0;t<40&&!(w.eval('START').sc.cube.isSolved()&&!w.eval('START.demo').length);t++)await new Promise(r=>setTimeout(r,50));
  assert.ok(w.eval('START').sc.cube.isSolved()&&!w.eval('START.demo').length,'Reset cube to Solved turns them back');
  assert.ok(off('#stDemoLog')&&off('#start [data-demoreset]')&&$('#stDemoLbl').textContent==='Show me a turn','and the page is as it was');
  $('#start [data-demo]').click();$('#start [data-demo]').click();$('#stCube').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));
  await new Promise(r=>setTimeout(r,150));assert.ok(w.eval('START').sc.cube.isSolved(),'a double-click turns them back too');
  // The hold: a line lifts its layer with a glow and lights its words; green, then red.
  w.startGo('t1-hold');assert.ok(!$('#start input[type=checkbox]'),'no checkboxes on the hold page');
  const hl=f=>$(`#start .st-hl[data-hl="${f}"]`).classList.contains('on');
  $('#start [data-hold="top"]').click();await new Promise(r=>setTimeout(r,200));
  assert.ok(hl('U')&&w.eval('START').sc.lift.dir.join()==='0,1,0','white on top lifts the top layer up and lights its words');
  $('#start [data-hold="front"]').click();await new Promise(r=>setTimeout(r,200));
  assert.ok(!hl('U')&&hl('F')&&!hl('R')&&w.eval('START').sc.lift.dir.join()==='0,0,1','green toward you: the front layer first');
  await new Promise(r=>setTimeout(r,2100));
  assert.ok(!hl('F')&&hl('R')&&w.eval('START').sc.lift.dir.join()==='1,0,0','then red on the right');
  assert.strictEqual($('#start').dataset.screen,'t1-hold','the page is not drawn again');
  // The fingers: each group's words light in turn, and its pads drop onto the picture; the picture
  // turns to show the back and the bottom, then turns back, and the pads go.
  assert.strictEqual($$('#start .st-pair').length,3,'the opposite colors as three pairs');
  assert.ok(/White.*Yellow/.test($$('#start .st-pair')[0].textContent)&&$$('#start .st-pair svg').length===3,'with an arrow between each');
  assert.ok(/Thumbs on the front face.*Index fingers on top.*Middle and ring fingers on the back.*Pinkies under the cube/.test($('#start [data-hold="hands"]').textContent),'the four finger lines');
  w.eval('ST_HANDS_T.view=40;ST_HANDS_T.in=40;ST_HANDS_T.gap=60;ST_HANDS_T.hold=150;ST_HANDS_T.out=40');
  const view=()=>w.eval('START').sc.view;
  $('#start [data-hold="hands"]').click();await new Promise(r=>setTimeout(r,60));
  assert.ok(hl('T')&&!hl('I')&&!hl('R')&&!w.eval('START').sc.lift,'the thumbs line lights first; the layers stay in');
  assert.strictEqual($$('#stCube .st-fingers .st-pad').length,2,'two thumb pads on the picture');
  const seen={};let maxYaw=-999;
  for(let t=0;t<80&&w.eval('START').sc.hands;t++){await new Promise(r=>setTimeout(r,15));maxYaw=Math.max(maxYaw,view().yaw);
    for(const g of 'TIMP')if(hl(g))seen[g]=true;}
  assert.ok(seen.I&&seen.M&&seen.P,'each line lights in turn');
  assert.ok(maxYaw>90,'the picture turns to show the back');
  assert.ok(!hl('P')&&!$('#stCube .st-pad')&&!w.eval('START').sc.hands,'then the pads go');
  assert.deepStrictEqual({...view()},{...w.eval('SCREEN_VIEW')},'and the picture is back: white on top, green toward you');
  $('#start [data-hold="hands"]').click();await new Promise(r=>setTimeout(r,30));$('#start [data-hold="top"]').click();
  assert.ok(!$('#stCube .st-pad')&&hl('U')&&!hl('T'),'another line takes the pads off');
  // The pieces: a kind lifts its pieces out with a glow and puts them back; a click finds the edge.
  w.startGo('t1-pieces');const sc=()=>w.eval('START').sc;
  $('#start [data-kind="corners"]').click();assert.strictEqual($('#start').dataset.screen,'t1-pieces','a kind does not draw the page again');
  assert.strictEqual($('#start [data-kind="corners"]').getAttribute('aria-pressed'),'true');assert.ok(sc().lift,'a kind lifts its pieces');
  await new Promise(r=>setTimeout(r,200));assert.ok(/cwLiftGlow/.test($('#stCube').innerHTML),'the lifted pieces glow');
  await new Promise(r=>setTimeout(r,2300));assert.ok(!sc().lift&&!/cwLiftGlow/.test($('#stCube').innerHTML),'and go back: a solved cube again');
  const pick=i=>{const p=$(`#stCube polygon.pk${i}`);assert.ok(p,'sticker '+i+' is on the picture');
    p.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true}));p.dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true}));};
  assert.ok(/Find and click on/.test($('#start .st-find').textContent));
  pick(4);assert.ok(/white center/.test($('#stFindSay').textContent)&&/Try again/.test($('#stFindSay').textContent),'a wrong piece is named');assert.ok(!$('#stFound'));
  pick(19);assert.ok($('#stFound')&&/You found it!/.test($('#stFound').textContent),'the white and green edge brings the callout');
  assert.ok($('#stFound [data-go="t1-moves"]')&&$('#stPiecesNext .primary'),'with a button to the next page');
  $('#stFound [data-go="t1-moves"]').click();assert.strictEqual($('#start').dataset.screen,'t1-moves');
  w.startGo('t1-pieces');assert.ok($('#stFound'),'found stays found');
  for(const s of ['t1-hold','t1-pieces','t1-moves']){$(`#start [data-go="${s}"]`).click();assert.strictEqual($('#start').dataset.screen,s);}
  assert.strictEqual($$('#start .st-faces li').length,6,'the moves page names the six faces');
  assert.strictEqual($$('#start .st-move').map(b=>b.textContent).join(' '),'U D F B R L U′ D′ F′ B′ R′ L′','and brings in the letters');
  assert.ok(/"R prime"/.test($('#start').textContent),'and names the prime');
  $('#start [data-go="t1-done"]').click();assert.strictEqual(st()['beg-0'],'finished','Basics is marked Learned');
  $('#start [data-go="t2-cube"]').click();assert.strictEqual($('#start').dataset.screen,'t2-cube','then the cube question');
  const picks=$$('#start .st-pick');assert.deepStrictEqual(picks.map(b=>b.dataset.src),['mine','smart','screen']);
  assert.ok(/^Regular cube/.test(picks[0].querySelector('b').textContent)&&picks[0].getAttribute('aria-pressed')==='true','a regular cube is the default');
  assert.ok(/Virtual cube/.test(picks[2].textContent)&&/keyboard or numeric keypad/.test(picks[2].textContent),'the virtual cube and its keys');
  assert.ok(/Chrome/.test(picks[1].textContent),'a browser names the browsers');
  // In the Mac app's window (its message handler is there) no browser is named.
  w.webkit={messageHandlers:{bridge:{postMessage:()=>Promise.resolve({})}}};assert.ok(w.smartInApp());w.startGo('t2-cube');
  assert.ok(!/Chrome|Safari|Edge|browser/.test($('#start').textContent),'the Mac app names no browser');
  $('#start .st-pick[data-src="smart"]').click();assert.ok(/app looks for your cube/.test($('#start').textContent),'the app looks for the cube');
  assert.ok(!/Chrome|Safari/.test(w.cubePopActions('smart').text+w.cubePopActions('smart').foot),'nor does the cube menu');
  delete w.webkit;assert.ok(!w.smartInApp());
  $('#start .st-pick[data-src="screen"]').click();$('#start [data-t2go]').click();assert.strictEqual($('#start').dataset.screen,'t1-keys');
  assert.strictEqual($$('#start .st-keyset').length,2,'the keyboard and the keypad');assert.ok(/numeric keypad/.test($('#start').textContent));
  key(w,d,'Numpad5');assert.ok(!w.eval('START').sc.cube.isSolved(),'the keypad turns the virtual cube');key(w,d,'Numpad5',true);
  assert.ok(w.eval('START').sc.cube.isSolved(),'Shift turns it back');
  key(w,d,'KeyS');key(w,d,'KeyD',true);
  assert.ok(!w.eval('START').sc.cube.isSolved(),'the keys turn the virtual cube');
  assert.strictEqual($('#stLast').textContent,'Right face, counterclockwise','the last turn shows in words');
  $('#start [data-turn="U"]').click();
  $('#start [data-go="t1-solve"]').click();await new Promise(r=>setTimeout(r,10));
  assert.ok(!d.body.classList.contains('starting'),'the pages close');
  assert.strictEqual(d.body.dataset.method,'beginner');assert.strictEqual(d.body.dataset.tab,'bsolve','straight to the first solve');
  assert.strictEqual(st()['beg-0'],'finished','Basics is marked Learned');
  assert.strictEqual(JSON.parse(w.localStorage.getItem('cw:level')),1);
  assert.strictEqual(JSON.parse(w.localStorage.getItem('cw:cubeSrc')),'screen','the virtual cube is the cube');
  assert.strictEqual($('#cubeChipName').textContent,'Virtual cube','the chip names it');
  // The guided solve opens on the hold: the virtual cube is yellow on top, green facing you, in the player.
  assert.ok($('#gdTurn')&&/The cube now has the YELLOW CENTER on top and the GREEN CENTER facing you/.test($('#gdTitle').textContent.replace(/\s+/g,' ')),'the hold screen first');
  assert.strictEqual(d.body.dataset.begview,'player','the cube is in the player');assert.strictEqual(w.cubeAtSeq(0).toFacelets()[4],3,'held yellow on top');
  $('#gdDone').click();
  assert.strictEqual(d.body.dataset.begview,'player','the mixed-up virtual cube is in the player, yellow on top');
  assert.strictEqual(w.cubeAtSeq(0).toFacelets()[4],3,'yellow on top');
  // The player takes the keys now: a key turns the cube in the section.
  const i0=w.seqState.idx;d.dispatchEvent(new w.KeyboardEvent('keydown',{code:'KeyS',bubbles:true}));
  assert.strictEqual(w.seqState.moves.length,i0+1,'a key adds a move to the player after the step in view');assert.strictEqual(w.seqState.moves[i0],'F');
  w.goTab('learn');assert.ok($('#begCubeLine')&&/Virtual cube/.test($('#begCubeLine').textContent),'the beginner home names the cube');
  // The moves page: two rows of buttons; a click turns the move, then the other way turns it back.
  w.startOpen('level');$('#start [data-level="1"]').click();w.startGo('t1-moves');
  assert.strictEqual($$('#start .st-move').length,12,'six moves and six the other way');assert.ok(!$('#start [data-prime]'),'no other-way switch');
  w.eval('ST_MOVE_T.glow=10;ST_MOVE_T.turn=30;ST_MOVE_T.next=150');const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const on=()=>$$('#start .st-move.on').map(b=>b.dataset.mv).join(),cube=()=>w.eval('START').sc.cube;
  for(const [m,back] of [['U',"U'"],["U'",'U'],['R',"R'"]]){
    $(`#start .st-move[data-mv="${m}"]`).click();assert.strictEqual(on(),m,m+' lights');
    assert.ok(/Up|Right/.test($('#stMoveSay').textContent)&&(m.length>1)===/counterclockwise/.test($('#stMoveSay').textContent),m+' in words');
    await wait(90);assert.ok(!cube().isSolved(),m+' turns the picture');
    await wait(120);assert.strictEqual(on(),back,'then '+back+' lights');
    await wait(240);assert.strictEqual(on(),'','the lights go out');assert.ok(cube().isSolved(),m+' then '+back+': solved again');
    assert.ok(/^Last moved:/.test($('#stMoveSay').textContent)&&$('#stMoveSay').textContent.includes(m.replace("'",'′')+' ·'),'the box names the last move: '+$('#stMoveSay').textContent);
    assert.ok(!/lit stickers/.test($('#stCap').textContent),'the caption of the turn goes');}
  // The caption goes by the way the picture is turned: the back is turned away at first; turned
  // round, it is in view, and the caption says the letters still go with the colors.
  $('#start .st-move[data-mv="B"]').click();assert.ok(/back face is turned away/.test($('#stCap').textContent),'B: the back is turned away');
  await wait(450);w.eval('START').sc.view.yaw=150;$('#start .st-move[data-mv="B"]').click();
  assert.ok(/lit stickers turn with B/.test($('#stCap').textContent)&&/Front is still the green face/.test($('#stCap').textContent),'turned round: the back is in view: '+$('#stCap').textContent);
  await wait(450);w.eval('START').sc.resetView();
  // A regular cube: Your first solve is one page: mix it up by hand, then scan or paint.
  w.startGo('t2-cube');assert.ok($('#start [data-go="t1-done"]'),'Back from the cube question goes to the basics');
  $('#start .st-pick[data-src="mine"]').click();$('#start [data-t2go]').click();assert.strictEqual($('#start').dataset.screen,'t1-ready');
  assert.ok(/Is your cube solved\?/.test($('#start h1').textContent)&&/scramble it up/.test($('#start').textContent),'is your cube solved? then scramble it up');
  assert.ok($('#start [data-ready="scan"]')&&$('#start [data-ready="paint"]')&&!$('#start [data-ready="mix"]'),'scan or paint, one page');
  assert.strictEqual($$('#start .st-readypic svg').length,1,'a small solved cube');assert.ok(!$('#start .st-flipnote')&&!/white on top/i.test($('#start').textContent),'no turn-over note');
  for(const b of $$('#start button'))assert.ok(b.title,'every control has a title: '+b.textContent.trim());
  $('#start [data-ready="paint"]').click();
  assert.ok(!d.body.classList.contains('starting'));assert.strictEqual(d.body.dataset.tab,'bsolve');assert.ok($('#paintBg'),'the paint window on Solve my cube');
  assert.strictEqual(JSON.parse(w.localStorage.getItem('cw:cubeSrc')),'mine');
  // The painted cube: the hold screen, yellow on top, green facing you, on the real cube.
  const painted=w.eval(`applyAlg(new Cube(),parseAlg("R U2 F' L D B2 R' U F2 L'"))`);w.scrambleFromCube(painted,'Painted cube');
  assert.ok($('#gdTurn')&&/Now, hold the cube with the YELLOW CENTER on top and the GREEN CENTER facing you\./.test($('#gdTitle').textContent.replace(/\s+/g,' ')),'then the hold screen');
  assert.strictEqual(JSON.stringify(w.cubeAtSeq(0).toFacelets()),JSON.stringify(w.applyAlg(painted,['z2']).toFacelets()),'the player shows the painted cube, held so');
  $('#paintCancel').click();
  // A saved level 2 (played but never solved) reads as level 1.
  assert.strictEqual(w.startLevel(2).n,1);assert.ok(/I've never solved one!/.test(w.startLevel(2).name));
  // ----- the cube menu -----
  w.setCubeSrc('screen');
  $('#cubeChip').click();assert.ok(!$('#cubePop').classList.contains('hidden'),'the chip opens the cube menu');
  assert.deepStrictEqual($$('#cubePop .csrc').map(b=>b.textContent),['Regular cube','Virtual cube','Smart cube'],'three sources');
  assert.strictEqual($$('#cubePop .cact').length,3,'three actions for the virtual cube: no key layouts');assert.ok(!$('#cubeKeys'));
  assert.ok(/keyboard or numeric keypad/.test($('#cubePop').textContent),'the keys in words');
  $('#cubePop .csrc[data-src="mine"]').click();assert.strictEqual(JSON.parse(w.localStorage.getItem('cw:cubeSrc')),'mine');
  assert.strictEqual($$('#cubePop .cact').length,4,'four actions for a regular cube');
  assert.ok(/Scan my cube/.test($('#cubePop').textContent),'a regular cube offers the scan');
  $('#cubePop .cact[data-act="solved"]').click();assert.ok($('#cubePop').classList.contains('hidden'),'an action closes the menu');
  assert.ok(w.eval('scr').cube.isSolved(),'My cube is solved loads a solved cube');
  // ----- the method menu: the level row; all nine Learned: Next on CFOP and the Progress card -----
  w.startMark([0,1,2,3,4,5,6,7,8].map(n=>'beg-'+n),'finished');
  $('#methodChip').click();assert.ok(/I've never solved one!/.test($('#methodLevel').textContent),'the level row');
  assert.ok($('#methodPop .mcard[data-method="cfop"] .mnext'),'CFOP has the Next mark');
  $('#methodChip').click();w.goTab('progress');assert.ok($('#begCfop')&&/Next: CFOP/.test($('#begCfop').textContent),'the Progress tab recommends CFOP');
  $('#begCfopGo').click();assert.strictEqual(d.body.dataset.method,'cfop');

  // ----- level 3: the check, the bridge, the Cross lesson -----
  ({w,d,errs}=await boot());
  $('#start [data-level="3"]').click();$('#start [data-way="memory"]').click();assert.strictEqual($('#start').dataset.screen,'t3-check');
  $('#start [data-step="7"][data-v="1"]').click();$('#start [data-step="8"][data-v="0"]').click();
  assert.ok(/7 of 9 learned/.test($('#start').textContent),'the count follows the marks');
  $('#start [data-check="cfop"]').click();assert.strictEqual($('#start').dataset.screen,'t3-bridge');
  assert.strictEqual(st()['beg-1'],'finished');assert.strictEqual(st()['beg-7'],'learning');assert.ok(!st()['beg-8'],'Not yet stays not started');
  $('#start [data-finish="cross"]').click();
  assert.strictEqual(d.body.dataset.tab,'cross');assert.ok($('#crossLesson'),'the Cross tab opens on its first lesson');
  assert.strictEqual(d.body.dataset.cube,'side','the cube is beside the Cross tab');
  $('#crossLesson [data-part="2"]').click();assert.ok($('#crossLessonReveal'),'Do it offers the moves');
  $('#crossLessonEnd').click();assert.ok(!$('#crossLesson'),'the lesson closes');
  w.goTab('ref');assert.strictEqual(d.body.dataset.cube,'none','no cube on Reference');
  w.goTab('solve');assert.strictEqual(d.body.dataset.cube,'wide','the Scramble tab has it across the top');
  assert.strictEqual($('#rail button[data-tab="solve"]').textContent.replace(/\d/,'').trim(),'Scramble','Solve is now Scramble');

  // ----- level 4: the sets, some cases, the quiz, then OLL · PLL on what is left -----
  ({w,d,errs}=await boot());
  $('#start [data-level="4"]').click();
  $('#start [data-set="3"][data-v="2"]').click();$('#start [data-set="4"][data-v="2"]').click();$('#start [data-set="5"][data-v="1"]').click();
  $('#start [data-cases="5"]').click();assert.strictEqual($$('#start .st-case').length,21,'the full PLL: 21 cases');
  $('#start [data-case="pllf-T"]').click();$('#start [data-case="pllf-T"]').click();assert.strictEqual(st()['pllf-T'],'finished','two taps: Learned');
  $('#start [data-sets-back]').click();$('#start [data-sets="quiz"]').click();
  assert.strictEqual(st()['eo-dot'],'finished','All marks the set');
  const Q=w.eval('START').quiz;assert.strictEqual(Q.qs.length,10,'ten questions');
  const c=Q.qs[0];const wrong=Q.choices.find(o=>o.id!==c.id);
  $(`#start [data-pick="${wrong.id}"]`).click();assert.strictEqual(st()[c.id],'learning','a miss goes back to Learning');
  $('#start [data-next]').click();$(`#start [data-pick="${Q.qs[1].id}"]`).click();assert.strictEqual(Q.right,1);
  $('#start [data-finish="ll"]').click();
  assert.strictEqual(d.body.dataset.tab,'ll');assert.strictEqual(JSON.parse(w.localStorage.getItem('cw:llShow')),'left','OLL · PLL opens on Still to learn');
  // The quiz picks at random: a full PLL card carries data-pll, the others data-id.
  const card=id=>$('#llGroups '+(id.startsWith('pllf-')?`.case[data-pll="${id.slice(5)}"]`:`.case[data-id="${id}"]`));
  assert.ok(card(c.id)&&!card(c.id).classList.contains('llhide'),'the missed case shows');
  assert.ok(card(Q.qs[1].id).classList.contains('llhide'),'a Learned case folds away');
  assert.strictEqual($$('#llGroups .case[data-pll]').length,21,'the full PLL is a group');
  assert.ok(/Finish/.test($('#llShowBar .llplan').textContent),'the plan in one line');
  $('#llShowBar [data-show="all"]').click();assert.ok(!$('#llGroups .llhide'),'All shows every case');

  // ----- level 5: one setup page, then the timer as home -----
  ({w,d,errs}=await boot());
  $('#start [data-level="5"]').click();$('#start [data-five="hide"]').click();$('#start [data-finish="timer"]').click();
  assert.strictEqual(d.body.dataset.tab,'solve');assert.ok(d.body.classList.contains('timerhome'),'the Scramble tab is home, with a large timer');
  assert.ok($('#weakSpots'),'Weak spots');assert.strictEqual(st()['f2l-1'],'finished','Full CFOP marks every case');
  assert.strictEqual(JSON.parse(w.localStorage.getItem('cw:hideTime')),true,'Hide the time is saved');
  // A second visit: no level page.
  ({w,d,errs}=await boot({'cw:method':'"cfop"','cw:level':'5'}));
  assert.ok(!d.body.classList.contains('starting'),'a returning visitor sees no level page');
  // A cube picked on the pages once does not come back at a later track's end: only a pick made on
  // the way changes the cube.
  w.eval("START.src='screen';START.picked=false;setCubeSrc('mine');startPick(4)");
  w.eval("startFinish('cfop','solve')");
  assert.strictEqual(w.eval('cubeSrc()'),'mine','the cube in the menu stays');
  assert.ok(!w.document.querySelector('#vcubeWin:not([hidden])'),'no virtual cube window');
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('start: the virtual cube, the cube slot, the cube menu, the four levels, the first solve, the level row, the CFOP card, the Cross lesson, Still to learn, the timer home ok');process.exit(0);
}catch(e){console.log('start: FAIL',e.message);console.log(e.stack.split('\n').slice(1,4).join('\n'));process.exit(1);}})();
