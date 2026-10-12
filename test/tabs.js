// The scramble stays the same across tabs, case drills keep it, and the OLL/PLL case cards
// have a status button and open the case window.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.confirm=()=>{w.confirm.called=true;return true;};w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
const w=dom.window;const d=w.document;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,what){for(let i=0;i<100;i++){if(f())return;await sleep(50);}throw new Error('timed out: '+what);}
const tab=n=>$(`#rail button[data-tab="${n}"]`).click();
const label=()=>$('#seqLabel').textContent;
const moves=()=>$$('#scramble .m').map(e=>e.textContent);
const drill=()=>!$('#drillNote').classList.contains('hidden');
const click=(el,opts)=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,...opts}));

w.addEventListener('load',async()=>{try{
  await sleep(100);
  const seed=$('#seed').value;assert.ok(seed,'a seed at boot');
  const scr=moves();assert.ok(label().includes('seed '+seed),'Solve shows the scramble');

  // F2L live works on the same scramble, with the solved part dashed.
  tab('f2l');await until(()=>moves().length>scr.length,'F2L state');
  assert.ok(label().includes('seed '+seed),'F2L keeps the seed');
  assert.deepStrictEqual(moves().slice(0,scr.length),scr,'F2L starts with the scramble moves');
  assert.ok($$('#scramble .m').slice(scr.length).every(e=>e.classList.contains('rot')),'solved moves are dashed');

  // Opening OLL/PLL does not start a drill or change the scramble.
  tab('ll');assert.ok(!drill(),'no drill on tab change');assert.deepStrictEqual(moves(),scr,'OLL/PLL shows the same moves');
  assert.ok(label().includes('seed '+seed),'OLL/PLL shows the scramble');

  // Next case starts a drill. Another tab keeps it. Back to scramble ends it.
  $('#llNext').click();assert.ok(drill(),'Next case starts a drill');assert.ok(/setup for case/.test(label()));
  tab('solve');assert.ok(drill(),'tab change keeps the drill');assert.ok(/setup for case/.test(label()));
  $('#drillBack').click();assert.ok(!drill(),'Back to scramble ends the drill');
  assert.deepStrictEqual(moves().slice(0,scr.length),scr,'the scramble is back');assert.ok(label().includes('seed '+seed));

  // Case cards: no algorithm on the card, an explicit status button, a click opens the case window.
  tab('ll');const card=$('#llGroups .case');const id=card.dataset.id;
  assert.ok(!$$('#llGroups .case').some(c=>/[RUFLDB]'/.test(c.title)),'no algorithm in card titles');
  const st=()=>$(`#llGroups .case[data-id="${id}"] .stbtn`);
  assert.strictEqual(st().textContent,'unlearned');
  click(st());assert.strictEqual(st().textContent,'learning','status button cycles');assert.ok(!$('#modalBg'),'status button does not open the window');
  click($(`#llGroups .case[data-id="${id}"] svg`));assert.ok($('#modalBg'),'card click opens the case window');
  const mb=()=>$('#modalBg .stbtn');assert.strictEqual(mb().textContent,'learning','window shows the status');
  click(mb());assert.strictEqual(mb().textContent,'finished','window button cycles');assert.strictEqual(st().textContent,'finished','card follows the window');
  $('#modalClose').click();assert.ok(!$('#modalBg'));
  const sel=()=>$(`#llGroups .case[data-id="${id}"]`).classList.contains('sel');const was=sel();
  click($(`#llGroups .case[data-id="${id}"] svg`),{shiftKey:true});assert.strictEqual(sel(),!was,'shift-click toggles selection');assert.ok(!$('#modalBg'));

  // F2L cases work like the OLL/PLL cards: status button, click opens the window, shift-click selects,
  // Next case starts a drill with a per-case timer scope, Reveal shows the answer.
  tab('f2l');$('#f2lMode button[data-m="cases"]').click();
  assert.ok(!$('#f2lCaseGrid').closest('.panel').classList.contains('hidden'),'F2L case grid shows');
  const fc=$('#f2lCaseGrid .case');const fn=fc.dataset.n;
  const fst=()=>$(`#f2lCaseGrid .case[data-n="${fn}"] .stbtn`);
  assert.strictEqual(fst().textContent,'unlearned','F2L card has a status button');
  click(fst());assert.strictEqual(fst().textContent,'learning','F2L status cycles');assert.ok(!$('#modalBg'));
  click($(`#f2lCaseGrid .case[data-n="${fn}"] svg`));assert.ok($('#modalBg'),'F2L card click opens the case window');
  assert.strictEqual($('#modalBg .stbtn').textContent,'learning','window shows the F2L status');
  assert.ok(/Why it works/.test($('#modalBg').textContent),'F2L window explains the case');
  $('#modalClose').click();
  const fsel=()=>$(`#f2lCaseGrid .case[data-n="${fn}"]`).classList.contains('sel');const fwas=fsel();
  click($(`#f2lCaseGrid .case[data-n="${fn}"] svg`),{shiftKey:true});assert.strictEqual(fsel(),!fwas,'F2L shift-click toggles selection');
  $('#f2lSelNone').click();assert.ok(!$('#f2lCaseGrid .case.sel'),'None clears the selection');
  $('#f2lRandomCase').click();assert.ok(/Select at least one/.test($('#f2lCaseOut').textContent),'no drill with nothing selected');
  $('#f2lSelAll').click();assert.strictEqual($$('#f2lCaseGrid .case.sel').length,41,'Select all');
  $('#f2lRandomCase').click();assert.ok(drill(),'Next case starts an F2L drill');assert.ok(/setup for case/.test(label()));
  assert.ok(/^Times: F2L case #\d+$/.test($('#timesScope').textContent),'timer scope is the case');
  assert.ok(/Answer hidden/.test($('#f2lCaseOut').textContent),'answer hidden before reveal');
  $('#f2lCaseReveal').click();assert.ok(/F2L case #\d+/.test($('#f2lCaseOut').textContent),'reveal names the case');assert.ok($('#f2lCasePlay'),'reveal offers to step through');
  $('#drillBack').click();assert.ok(!drill());assert.ok(/^Times: F2L$/.test($('#timesScope').textContent),'scope returns to the tab');

  assert.deepStrictEqual(errs,[],'no script errors');
  // The Clear button opens a themed dialog. Escape cancels, Enter confirms. Space does not reach the timer.
  tab('solve');w.recordTime(12340);w.recordTime(9870);assert.strictEqual($('#stN').textContent,'2','two times recorded');
  const key=(type,k,code)=>d.dispatchEvent(new w.KeyboardEvent(type,{key:k,code:code||k,bubbles:true,cancelable:true}));
  $('#clearTimes').click();assert.ok($('#askBg'),'Clear opens a dialog');assert.ok(!w.confirm.called,'no browser confirm');
  assert.ok($('#askTitle').textContent.includes('Clear'),'dialog names the action');
  key('keydown',' ','Space');key('keyup',' ','Space');assert.ok($('#askBg'),'Space leaves the dialog open');assert.ok(!$('#timer').classList.contains('run'),'Space does not start the timer');
  key('keydown','Escape');assert.ok(!$('#askBg'),'Escape closes the dialog');
  $('#clearTimes').click();key('keydown','Enter');assert.ok(!$('#askBg'),'Enter closes the dialog');assert.strictEqual($('#stN').textContent,'0','Enter clears the times');
  // The player's keys: arrows step, Shift jumps five, Home and End go to the ends.
  const n=w.seqState.moves.length;key('keydown','Home');assert.strictEqual(w.seqState.idx,0,'Home goes to the start');
  key('keydown','ArrowRight');assert.strictEqual(w.seqState.idx,1,'→ steps forward');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',shiftKey:true,bubbles:true,cancelable:true}));assert.strictEqual(w.seqState.idx,6,'Shift+→ jumps five');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',shiftKey:true,bubbles:true,cancelable:true}));assert.strictEqual(w.seqState.idx,1,'Shift+← jumps back five');
  key('keydown','End');assert.strictEqual(w.seqState.idx,n,'End goes to the end');key('keydown','ArrowRight');assert.strictEqual(w.seqState.idx,n,'→ stops at the end');
  assert.ok(!w.anim.move,'CFOP does not animate by default');
  // The "Drag to rotate" hint shows in the 3D view and goes away after the first drag of the session.
  const hint=()=>!$('#dragHint').classList.contains('hidden');const pev=(t,x,y)=>$('#cube').dispatchEvent(new w.MouseEvent(t,{clientX:x,clientY:y,bubbles:true,cancelable:true}));
  assert.ok(hint(),'hint shows at boot');$('#viewNet').click();assert.ok(!hint(),'no hint in the net view');$('#viewTop').click();assert.ok(hint(),'hint returns in the 3D view');
  pev('pointerdown',100,100);assert.ok(d.body.classList.contains('cube-drag'),'drag blocks text selection');pev('pointermove',101,100);assert.ok(hint(),'a tiny move keeps the hint');
  pev('pointermove',140,120);assert.ok(!hint(),'a drag hides the hint');pev('pointerup',140,120);assert.ok(!d.body.classList.contains('cube-drag'),'selection returns after the drag');
  $('#viewNet').click();$('#viewTop').click();assert.ok(!hint(),'the hint stays hidden for the session');
  console.log('tabs: scramble persists across tabs, drills, case cards, F2L cards, clear dialog, drag hint ok');process.exit(0);
}catch(e){console.error('tabs: FAIL',e.message,errs);process.exit(1);}});
