// The onboarding storyboard in the page: the screen cube's keys (js/screencube.js), the cube in the
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
  // ----- the screen cube's keys -----
  assert.strictEqual(w.screenKeyMove('awdx','KeyS',false),'F','S is the front, clockwise');
  assert.strictEqual(w.screenKeyMove('awdx','KeyD',true),"R'",'Shift turns the other way');
  assert.strictEqual(w.screenKeyMove('jil','Comma',false),'D','the J I L , layout');
  assert.strictEqual(w.screenKeyMove('awdx','KeyQ',false),null,'a key of no face');
  assert.strictEqual(JSON.stringify(w.screenKeys('kol')),JSON.stringify({L:'K',U:'O',R:';',D:'.',F:'L',B:'P'}));
  // ----- the cube in the section -----
  const slot=$('#cubeSlot');assert.ok(slot&&slot.parentNode===$('main.main'),'one cube slot beside the sections');
  assert.ok(slot.contains($('#player'))&&slot.contains($('#seedBar')),'the player and the seed bar are in it');
  assert.ok($('.page>footer.foot')===$('.page').lastElementChild,'the footer stays last');
  // ----- the first visit: the level picker -----
  assert.ok(d.body.classList.contains('starting'),'a first visit opens the level picker');
  assert.strictEqual($$('#start .st-level').length,5,'five levels');
  for(const b of $$('#start button'))assert.ok(b.title,'every control has a title: '+b.textContent.trim());
  // Level 1 with the screen cube: the keys turn it, the basics, then the beginner method.
  $('#start [data-level="1"]').click();assert.strictEqual($('#start').dataset.screen,'t1-have');
  $('#start [data-have="screen"]').click();assert.strictEqual($('#start').dataset.screen,'t1-keys');
  key(w,d,'KeyS');key(w,d,'KeyD',true);
  assert.ok(!w.eval('START').sc.cube.isSolved(),'the keys turn the screen cube');
  assert.strictEqual($('#stLast').textContent,'R′','the last turn shows');
  $('#start [data-turn="U"]').click();
  for(const s of ['t1-hold','t1-pieces','t1-moves','t1-done']){$(`#start [data-go="${s}"]`).click();assert.strictEqual($('#start').dataset.screen,s);}
  $('#start [data-finish="beg"]').click();
  assert.ok(!d.body.classList.contains('starting'),'the pages close');
  assert.strictEqual(d.body.dataset.method,'beginner');assert.strictEqual(d.body.dataset.tab,'learn');
  assert.strictEqual(st()['beg-0'],'finished','Basics is marked Learned');
  assert.strictEqual(JSON.parse(w.localStorage.getItem('cw:level')),1);
  assert.strictEqual(JSON.parse(w.localStorage.getItem('cw:cubeSrc')),'screen','the screen cube is the cube');
  assert.strictEqual($('#cubeChipName').textContent,'Screen cube','the chip names it');
  assert.strictEqual(d.body.dataset.begview,'player','the mixed-up screen cube is in the player');
  // The player takes the keys now: a key turns the cube in the section.
  const n0=w.seqState.moves.length;d.dispatchEvent(new w.KeyboardEvent('keydown',{code:'KeyS',bubbles:true}));
  assert.strictEqual(w.seqState.moves.length,n0+1,'a key adds a move to the player');assert.strictEqual(w.seqState.moves[n0],'F');
  assert.ok($('#begCubeLine')&&/Screen cube/.test($('#begCubeLine').textContent),'the beginner home names the cube');
  // ----- the cube menu -----
  $('#cubeChip').click();assert.ok(!$('#cubePop').classList.contains('hidden'),'the chip opens the cube menu');
  assert.strictEqual($$('#cubePop .csrc').length,3,'three sources');assert.strictEqual($$('#cubePop .cact').length,4,'four actions');
  $('#cubePop .csrc[data-src="mine"]').click();assert.strictEqual(JSON.parse(w.localStorage.getItem('cw:cubeSrc')),'mine');
  assert.ok(/Scan my cube/.test($('#cubePop').textContent),'My cube offers the scan');
  $('#cubePop .cact[data-act="solved"]').click();assert.ok($('#cubePop').classList.contains('hidden'),'an action closes the menu');
  assert.ok(w.eval('scr').cube.isSolved(),'My cube is solved loads a solved cube');
  // ----- the method menu: the level row; all nine Learned: Next on CFOP and the Progress card -----
  w.startMark([0,1,2,3,4,5,6,7,8].map(n=>'beg-'+n),'finished');
  $('#methodChip').click();assert.ok(/Never touched one/.test($('#methodLevel').textContent),'the level row');
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
  assert.ok($('#llGroups .case[data-id="'+c.id+'"]')&&!$('#llGroups .case[data-id="'+c.id+'"]').classList.contains('llhide'),'the missed case shows');
  const learned=Q.qs[1].id.startsWith('pllf-')?`.case[data-pll="${Q.qs[1].id.slice(5)}"]`:`.case[data-id="${Q.qs[1].id}"]`;
  assert.ok($('#llGroups '+learned).classList.contains('llhide'),'a Learned case folds away');
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
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('start: the screen cube, the cube slot, the cube menu, the five levels, the level row, the CFOP card, the Cross lesson, Still to learn, the timer home ok');process.exit(0);
}catch(e){console.log('start: FAIL',e.message);console.log(e.stack.split('\n').slice(1,4).join('\n'));process.exit(1);}})();
