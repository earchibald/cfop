// Stage view (js/stageview.js): CFOP on a computer puts the cube on a stage, the sections on a rail,
// and the panels of the section in view in a column of sheets. Checks: it is on only where the window
// is wider than a phone; the cube slot, the sections, Your moves and the timer move; each sheet has a
// strip; fold, close and Add; a float is kept and put back; the timer's phases drive focus and the
// Solved! card; the cube question with no cube; Scramble Info on the badge and its Restore scramble
// and Speedy Solve for each cube, with the Current Moves sheet; Undo by the button and Cmd+Z; Scan or
// paint for a regular cube; Maximize cube with its chips and tabs; and the page goes back as it was
// for the beginner method and for Settings > Layout. w.eval reaches the page's globals, as the other tests do.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
function fakeStorage(seed){const m=new Map(Object.entries(seed||{}));return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size;},_m:m};}
function open(seed,{wide=true}={}){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
    beforeParse(w){w.matchMedia=q=>({matches:/min-width/.test(q)?wide:/max-width/.test(q)?!wide:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};
      Object.defineProperty(w,'localStorage',{value:fakeStorage(seed)});}});
  return new Promise(res=>dom.window.addEventListener('load',()=>setTimeout(()=>res({w:dom.window,d:dom.window.document,errs}),100)));}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  const base={'cw:method':'"cfop"','cw:level':'4','cw:cubeSrc':'"mine"'};
  // A phone: no stage.
  {const {w,d}=await open(base,{wide:false});assert.ok(!d.body.classList.contains('sv'),'no stage on a phone');w.close();}
  const {w,d,errs}=await open(base);const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
  const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.ok(d.body.classList.contains('sv'),'the stage is on for CFOP on a computer');
  assert.strictEqual($('#cubeSlot').parentElement,$('.wrap'),'the cube slot is the stage');
  assert.ok($('#svMain main.main'),'the sections are in the column');
  assert.ok($('#svEvery .seqpanel')&&$('#svEvery .timerpanel'),'Your moves and the timer are sheets for every section');
  assert.ok(!$('#svCol #seedBar')&&!$('#svCol #scrPill'),'no scramble card in the column');
  assert.ok(!$('#rail button[data-tab="solve"]')&&!$('#tab-solve'),'no Scramble tab');
  assert.ok($('#svActs #animBtn')&&$('#svActs #hiddenBtn'),'the cube buttons are on the action bar');
  assert.strictEqual($('#svBadgeSec').textContent,'Cross','the badge names the section: Cross is first');
  assert.strictEqual($('#svBadge .svinfo').textContent,'Scramble Info','the badge offers Scramble Info');
  assert.ok($('#svAsk').hidden,'a cube is picked: no question');
  // Sheets: the CFOP plan, under Everywhere, keeps its strip in its summary and starts folded (it is a spoiler).
  const plan=$('#planFold');assert.ok(plan.classList.contains('svsheet')&&plan.closest('#svEvery'),'the plan is a sheet for every section');
  assert.ok(plan.querySelector(':scope>summary>.svbar'),'its strip is in the summary');assert.ok(!plan.open&&plan.classList.contains('svfolded'),'folded');
  click(plan.querySelector('.svbar [data-sv="fold"]'));assert.ok(plan.open,'the strip opens it');
  // A tab: its panels become sheets with their titles.
  $('#rail button[data-tab="f2l"]').click();await sleep(20);$('#rail button[data-tab="cross"]').click();await sleep(50);
  const sheets=$$('#tab-cross .svsheet');assert.strictEqual(sheets.length,3,'three sheets on Cross');
  assert.deepStrictEqual(sheets.map(p=>p.querySelector('.svname').textContent),['Check my plan','Cross tuning','What to look for']);
  assert.ok(sheets[0].querySelector('h2').classList.contains('svh'),'the panel heading hides under the strip');
  assert.strictEqual($('#svBadgeSec').textContent,'Cross');
  // Fold, close, Add.
  click(sheets[1].querySelector('[data-sv="fold"]'));assert.ok(sheets[1].classList.contains('svfold'),'folded');
  click(sheets[2].querySelector('[data-sv="close"]'));assert.ok(sheets[2].classList.contains('svclosed'),'closed');
  const add=$('#svAdd [data-svadd]');assert.ok(add&&/What to look for/.test(add.textContent),'Add brings it back');
  const st=JSON.parse(w.localStorage.getItem('cw:svSheets'));assert.deepStrictEqual(st['cross:p1'],{fold:true});assert.deepStrictEqual(st['cross:p2'],{closed:true});
  click(add);assert.ok(!sheets[2].classList.contains('svclosed'),'open again');
  // A float: kept by section, in a layer of its own, and back in its place on dock.
  w.eval(`svSet('cross:p0',{float:{x:200,y:120,w:340}})`);
  assert.strictEqual(sheets[0].parentElement.id,'svFloats','a floating sheet leaves the column');
  assert.strictEqual(sheets[0].style.left,'200px');
  $('#rail button[data-tab="f2l"]').click();await sleep(50);
  assert.strictEqual(sheets[0].parentElement.id,'tab-cross','another section: the float goes back to its section');
  $('#rail button[data-tab="cross"]').click();await sleep(50);
  assert.strictEqual(sheets[0].parentElement.id,'svFloats','and floats again on its own section');
  click(sheets[0].querySelector('[data-sv="dock"]'));assert.strictEqual(sheets[0].parentElement.id,'tab-cross','dock');assert.strictEqual(sheets[0].style.left,'');
  assert.strictEqual($('#svReset').textContent,'Restore panes');
  click($('#svReset'));assert.ok(!sheets[1].classList.contains('svfold'),'Restore panes opens every sheet of the section');
  // The timer: inspection and the solve set focus; the stop shows Solved!.
  const t=$('#timer');t.className='timer insp';t.textContent='12';await sleep(0);
  assert.strictEqual(d.body.dataset.svfocus,'inspect','inspection: focus');assert.ok(/12/.test($('#svBig').textContent),'the count');
  t.className='timer run';t.textContent='3.21';await sleep(0);assert.strictEqual(d.body.dataset.svfocus,'solve','the solve: focus');
  t.className='timer';await sleep(0);
  assert.ok(!d.body.dataset.svfocus,'the stop ends focus');assert.ok(/Solved!/.test($('#svBig').textContent)&&/3\.21/.test($('#svBig').textContent),'Solved! and the time');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.ok($('#svBig').hidden,'Esc closes the card');
  // ----- Scramble Info -----
  const info=$('#svInfo');click(info);let pane=$('#siPane');assert.ok(pane,'a click opens the pane');
  assert.strictEqual($('#siSeed').textContent,w.scr.seed,'the seed');assert.strictEqual($('#siCode').textContent,[...w.scr.moves].join(' '),'the moves');
  assert.deepStrictEqual($$('#siPane .siacts button').map(b=>b.textContent.replace(/N$/,'')),['New scramble','Restore scramble','Speedy Solve']);
  const seed0=w.scr.seed;click($('#siPane [data-si="new"]'));assert.notStrictEqual(w.scr.seed,seed0,'New scramble');assert.ok(!$('#siPane'),'and the pane closes');
  click(info);$('#siSeedIn').value='velvet-owl-39';click($('#siPane [data-si="seed"]'));assert.strictEqual(w.scr.seed,'velvet-owl-39','a seed name');
  // Regular cube: Restore asks where the cube is; It's solved lists the scramble's moves.
  click(info);click($('#siPane [data-si="restore"]'));assert.ok(/Where is your cube now/.test($('#siPane').textContent),'a regular cube: the question');
  click($('#siPane [data-si="solved-restore"]'));const cur=$('#siCur');assert.ok(cur&&cur.parentElement.id==='svCol','Current Moves at the top of the column');
  assert.ok(/Current Moves/.test(cur.querySelector('.svname').textContent)&&/Restore current scramble/.test(cur.querySelector('.sicurt b i').textContent));
  assert.strictEqual(cur.querySelectorAll('.sicurm .m').length,w.scr.moves.length,'from solved: the scramble itself');
  assert.strictEqual(w.seqState.idx,0,'the player holds them to step');assert.ok(w.seqState.drill,'as a drill');
  click(cur.querySelector('[data-cur="close"]'));assert.ok(!$('#siCur'),'Current Moves closes');
  // Scan or paint shows for a regular cube only.
  assert.ok(!$('#svScan').hidden,'Scan or paint: a regular cube');
  click($('#svScan'));assert.ok(!$('#svScanMenu').hidden,'Scan or paint opens its menu');click($('#svScanMenu [data-scan="paint"]'));
  assert.ok($('#paintBg'),'the painter opens');w.eval('closePaint()');
  // Virtual cube: Speedy Solve turns the moves fast, to solved.
  w.eval(`setCubeSrc('screen')`);assert.ok($('#svScan').hidden,'no Scan or paint for the virtual cube');
  w.eval(`showForTab()`);click(info);click($('#siPane [data-si="speedy"]'));assert.ok(!$('#siPane'),'Speedy Solve: no question');
  assert.ok(w.SI.run,'the run starts');for(let i=0;i<80&&w.SI.run;i++)await sleep(50);
  const atEnd=()=>w.cubeAtSeq(w.seqState.idx);
  assert.ok(!w.SI.run&&w.siSolvedLike(atEnd()).equals(atEnd())&&w.seqState.idx===w.seqState.moves.length,'the virtual cube is solved, held as it was');
  // Restore scramble brings the scramble back.
  click(info);click($('#siPane [data-si="restore"]'));click($('#siPane [data-si="go-restore"]'));for(let i=0;i<80&&w.SI.run;i++)await sleep(50);
  assert.ok(w.eval('cubeAtSeq(seqState.idx).equals(siScrambleShown())'),'the virtual cube is at the scramble again');
  // Smart cube: Restore lists the moves; each turn ticks one off; a turn off the list gives new moves.
  w.eval(`setCubeSrc('mine');smartConn={name:'GAN test'};cubeTab.target=applyAlg(new Cube(),['R','U']);siGo('restore')`);
  const sc=$('#siCur');assert.ok(sc&&/Restore current scramble/.test(sc.textContent),'a smart cube: Current Moves');
  const sp=w.eval('SI.cur.moves.slice()'),from=w.eval('SI.cur.from');assert.ok(w.applyAlg(from,sp).equals(w.scr.cube),'the moves take the cube to the scramble');
  const smart=to=>w.eval('document').dispatchEvent(new w.CustomEvent('cw:smartmoves',{detail:{moves:[],from,to}}));
  smart(w.applyAlg(from,sp.slice(0,1)));assert.strictEqual(w.eval('SI.cur.done'),1,'one move ticks off');
  assert.ok(sc.querySelector('.sicurm .m.done'),'and shows as made');
  smart(w.applyAlg(from,sp.slice(0,1).concat(['B','B'])));const re=w.eval('SI.cur');
  assert.strictEqual(re.done,0,'a turn off the list: new moves from there');assert.ok(w.applyAlg(re.from,re.moves).equals(w.scr.cube));
  smart(w.scr.cube);assert.ok(/Done/.test($('#siCur').textContent),'at the scramble: done');
  w.eval("siCurClose();smartConn=null;cubeTab.target=null;setCubeSrc('screen')");
  // siPath turns the whole cube first where the centers differ.
  const held=w.applyAlg(new (w.eval('Cube'))(),['R','y','U2','x']),p2=w.siPath(held,w.scr.cube);
  assert.ok(/^[xyz]/.test(p2[0])&&w.applyAlg(held,p2).equals(w.scr.cube),'siPath: a turn, then face moves');
  // ----- Undo -----
  w.eval('UNDO.list.length=0;undoDraw()');assert.ok($('#undoBtn').disabled,'nothing to undo');
  const s1=w.scr.seed;click(info);click($('#siPane [data-si="new"]'));await sleep(5);assert.notStrictEqual(w.scr.seed,s1);
  assert.ok(!$('#undoBtn').disabled&&/new scramble/.test($('#undoBtn').title),'Undo names the new scramble');
  click($('#undoBtn'));assert.strictEqual(w.scr.seed,s1,'Undo brings the scramble back');
  $('#rail button[data-tab="f2l"]').click();await sleep(5);assert.strictEqual(w.eval('curTab'),'f2l');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'z',metaKey:true,bubbles:true,cancelable:true}));assert.strictEqual(w.eval('curTab'),'cross','Cmd+Z: back to the section before');
  click($('#animBtn'));await sleep(5);const an=w.animOn();d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true,cancelable:true}));
  assert.strictEqual(w.animOn(),!an,'Ctrl+Z: Animate back');
  const n0=w.seqState.moves.length;d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'d',code:'KeyD',bubbles:true,cancelable:true}));await sleep(5);
  assert.strictEqual(w.seqState.moves.length,n0+1,'a virtual cube move');assert.ok(/the move R/.test($('#undoBtn').title),'Undo names the move: '+$('#undoBtn').title);
  click($('#undoBtn'));assert.strictEqual(w.seqState.moves.length,n0,'Undo takes the move back');
  w.eval('openSettings()');const anim0=w.animOn();$('#setAnim').checked=!anim0;click($('#setSave'));await sleep(5);
  assert.strictEqual(w.animOn(),!anim0);assert.ok(!/Animate/.test($('#undoBtn').title),'a change in Settings is not on the queue');
  w.eval(`setCubeSrc('mine')`);w.eval('UNDO.list.length=0;undoDraw()');
  // ----- Maximize cube -----
  const mx=$('#svMaxBtn');assert.ok(mx&&mx.previousElementSibling&&mx.previousElementSibling.id==='cubePop','Maximize Cube after the cube chip');
  assert.ok(/Maximize Cube/.test(mx.textContent));click(mx);await sleep(5);
  assert.ok(d.body.classList.contains('svmax')&&/Minimize Cube/.test(mx.textContent),'maximized');
  assert.strictEqual($('#rail button[data-tab="cross"]').title,'Cross','a chip names its section on hover');
  const tabs=$$('#svTabs .svtab');assert.ok(tabs.length>=5,'the sheets are tabs');
  assert.deepStrictEqual(tabs.slice(0,3).map(t=>t.textContent),['Check my plan','Cross tuning','What to look for']);
  assert.ok(tabs.every(t=>t.querySelector('.svgrip')),'each with its grip');
  click(tabs[0]);assert.ok(sheets[0].classList.contains('svopen'),'a click opens the sheet beside the tabs');
  click($$('#svTabs .svtab')[0]);assert.ok(!sheets[0].classList.contains('svopen'),'a second click closes it');
  w.eval(`svSet('cross:p1',{float:{x:200,y:120,w:340}})`);assert.ok(!$$('#svTabs .svtab').some(t=>t.textContent==='Cross tuning'),'a floating sheet is no tab');
  assert.strictEqual(sheets[1].parentElement.id,'svFloats','and floats as before');w.eval(`svSet('cross:p1',{float:null})`);
  click(mx);assert.ok(!d.body.classList.contains('svmax'),'Minimize Cube');assert.ok(/^Train the cross/.test($('#rail button[data-tab="cross"]').title),'the rail titles come back');
  assert.ok(!$('#svTabs .svtab'),'no tabs');
  // The beginner method: the page goes back as it was.
  w.eval(`setMethod('beginner')`);await sleep(50);
  assert.ok(!d.body.classList.contains('sv'),'off for the beginner method');
  assert.strictEqual($('#cubeSlot').parentElement,$('main.main'),'the cube slot is back in the sections');
  assert.ok($('#player .seqpanel')&&$('#player .timerpanel')&&$('.cubebox #animBtn'),'the player parts are back');
  assert.ok($('main.main').parentElement.classList.contains('wrap'),'the sections are back');
  w.eval(`setMethod('cfop')`);await sleep(50);assert.ok(d.body.classList.contains('sv'),'on again for CFOP');
  // Settings > Layout turns it off.
  w.eval('openSettings()');const box=$('#setStage');assert.ok(box&&box.checked,'the Layout box, on');
  box.checked=false;box.dispatchEvent(new w.Event('change',{bubbles:true}));assert.ok(!d.body.classList.contains('sv'),'off from Settings');
  assert.strictEqual(w.localStorage.getItem('cw:stageView'),'false');
  assert.deepStrictEqual(errs,[],'no script errors');w.close();
  // No cube yet: the stage asks; a pick answers.
  {const {w,d}=await open({'cw:method':'"cfop"','cw:level':'4'});const ask=d.querySelector('#svAsk');
    assert.ok(!ask.hidden,'no cube: the stage asks');d.querySelector('#svAsk [data-src="screen"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
    assert.ok(ask.hidden,'a pick answers');assert.strictEqual(w.localStorage.getItem('cw:cubeSrc'),'"screen"');w.close();}
  console.log('stageview: the stage, the sheets, fold, close, float, focus, Solved!, the question, Scramble Info, Restore and Speedy Solve on each cube, Current Moves, Undo, Scan or paint, Maximize, back again ok');
}catch(e){console.error(e);process.exit(1);}})();
