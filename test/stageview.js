// Stage view (js/stageview.js): CFOP on a computer puts the cube on a stage, the sections on a rail,
// and the panels of the section in view in a column of sheets. Checks: it is on only where the window
// is wider than a phone; the cube slot, the sections, Your moves and the timer move; each sheet has a
// strip; fold, close and Add; a float is kept and put back; the timer's phases drive focus and the
// Solved! card; the cube question with no cube; and the page goes back as it was for the beginner
// method and for Settings > Layout. w.eval reaches the page's globals, as the other tests do.
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
  assert.ok($('#svActs #animBtn')&&$('#svActs #hiddenBtn'),'the cube buttons are on the action bar');
  assert.strictEqual($('#svBadgeSec').textContent,'Scramble','the badge names the section');
  assert.ok($('#svAsk').hidden,'a cube is picked: no question');
  // Sheets: the CFOP plan keeps its strip in its summary and starts folded (it is a spoiler).
  const plan=$('#planFold');assert.ok(plan.classList.contains('svsheet'),'the plan is a sheet');
  assert.ok(plan.querySelector(':scope>summary>.svbar'),'its strip is in the summary');assert.ok(!plan.open&&plan.classList.contains('svfolded'),'folded');
  click(plan.querySelector('.svbar [data-sv="fold"]'));assert.ok(plan.open,'the strip opens it');
  // A tab: its panels become sheets with their titles.
  $('#rail button[data-tab="cross"]').click();await sleep(50);
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
  click($('#svReset'));assert.ok(!sheets[1].classList.contains('svfold'),'Put back opens every sheet of the section');
  // The timer: inspection and the solve set focus; the stop shows Solved!.
  const t=$('#timer');t.className='timer insp';t.textContent='12';await sleep(0);
  assert.strictEqual(d.body.dataset.svfocus,'inspect','inspection: focus');assert.ok(/12/.test($('#svBig').textContent),'the count');
  t.className='timer run';t.textContent='3.21';await sleep(0);assert.strictEqual(d.body.dataset.svfocus,'solve','the solve: focus');
  t.className='timer';await sleep(0);
  assert.ok(!d.body.dataset.svfocus,'the stop ends focus');assert.ok(/Solved!/.test($('#svBig').textContent)&&/3\.21/.test($('#svBig').textContent),'Solved! and the time');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.ok($('#svBig').hidden,'Esc closes the card');
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
  console.log('stageview: the stage, the sheets, fold, close, float, focus, Solved!, the question, back again ok');
}catch(e){console.error(e);process.exit(1);}})();
