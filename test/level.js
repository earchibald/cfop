// Your level, kept and in reach (js/levelmenu.js, js/start.js, js/guide.js): the level is kept the
// moment it is picked; the place in the getting-started pages survives a reload and Leave for now;
// the level chip in the top bar and its menu bring the user back from any page; a guided solve comes
// back to its part after a reload; the landing card; the status words and the section crumb.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
function fakeStorage(seed){const m=new Map(Object.entries(seed||{}));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),map:m};}
function boot(seed){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
    beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};Object.defineProperty(w,'localStorage',{value:fakeStorage(seed)});}});
  const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
  return new Promise(res=>w.addEventListener('load',()=>setTimeout(()=>{const d=w.document;
    res({w,d,errs,$:s=>d.querySelector(s),$$:s=>[...d.querySelectorAll(s)],get:k=>JSON.parse(w.localStorage.getItem('cw:'+k)),saved:()=>Object.fromEntries(w.localStorage.map),close:()=>w.close()});},450)));
}
(async()=>{try{
  // ----- a first visit: the level picker, and the level kept at once -----
  let p=await boot();const run=s=>p.w.eval(s);
  assert.deepStrictEqual(p.errs,[],'no script errors');
  assert.ok(run('START.on')&&run('START.screen')==='level','a first visit opens the level picker');
  assert.ok(p.$('#levelChip'),'the level chip is in the top bar');
  assert.ok(p.$('#levelChip').nextElementSibling.id==='levelPop'&&p.$('#levelPop').nextElementSibling.id==='methodChip','the chip comes before the method chip');
  p.$('#start [data-level="1"]').click();
  assert.strictEqual(p.get('level'),1,'the level is kept the moment it is picked');
  assert.strictEqual(run('START.screen'),'t1-what');
  assert.strictEqual(p.get('startAt').screen,'t1-what','the place is kept');assert.ok(p.get('startAt').open&&p.get('startAt').first);
  p.$('#start [data-go="t1-hold"]').click();assert.strictEqual(p.get('startAt').screen,'t1-hold');
  assert.ok(p.$('#start .st-leave'),'every page of a track can be left');
  // ----- a reload in the middle of the basics comes back to the same page -----
  let seed=p.saved();p.close();p=await boot(seed);
  assert.deepStrictEqual(p.errs,[],'no script errors after the reload');
  assert.ok(p.w.eval('START.on'),'the pages open again after a reload');
  assert.strictEqual(p.w.eval('START.screen'),'t1-hold','on the page they were on');
  assert.strictEqual(p.w.eval('START.level'),1,'with the level');
  assert.ok(/Hold it like this/.test(p.$('#start h1').textContent));
  // ----- Leave for now: the place stays, the chip brings it back -----
  p.$('#start .st-leave').click();
  assert.ok(!p.w.eval('START.on'),'Leave for now closes the pages');
  assert.strictEqual(p.get('startAt').screen,'t1-hold','the place is kept');assert.strictEqual(p.get('startAt').open,false,'and marked closed');
  assert.strictEqual(p.w.eval('method'),'beginner','a first visit at level 1 lands on the beginner method');
  assert.ok(p.$('#levelChip').classList.contains('resume'),'the chip marks a place to come back to');
  assert.ok(/New to the cube/.test(p.$('#levelChip').textContent),'the chip names the level');
  seed=p.saved();p.close();p=await boot(seed);
  assert.ok(!p.w.eval('START.on'),'a closed place does not open by itself after a reload');
  p.$('#levelChip').click();assert.ok(!p.$('#levelPop').classList.contains('hidden'),'the chip opens the level menu');
  assert.ok(/Hold it like this/.test(p.$('#levelPop .lvresume').textContent),'Pick up where you left off names the page');
  assert.strictEqual(p.$$('#levelPop .lvrow').length,4,'the four levels');assert.ok(p.$('#levelPop .lvrow.on[data-n="1"]'),'the level in use is lit');
  assert.ok(p.$$('#levelPop .cact[data-lv="track"]').length>=3,'the pages and places of the track');
  p.$('#levelPop .lvresume').click();
  assert.ok(p.w.eval('START.on')&&p.w.eval('START.screen')==='t1-hold','Pick up where you left off');
  assert.ok(p.$('#levelPop').classList.contains('hidden'),'the menu closes');
  // Escape and a click elsewhere close the menu.
  p.$('#start .st-leave').click();p.$('#levelChip').click();
  p.d.dispatchEvent(new p.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.ok(p.$('#levelPop').classList.contains('hidden'),'Escape closes the menu');
  p.$('#levelChip').click();p.$('main.main').click();assert.ok(p.$('#levelPop').classList.contains('hidden'),'a click elsewhere closes it');
  // A track page from the menu: The basics.
  p.$('#levelChip').click();p.$('#levelPop .cact[data-lv="track"][data-i="0"]').click();
  assert.strictEqual(p.w.eval('START.screen'),'t1-what','The basics opens the first page');
  assert.ok(!p.w.eval('START.first'),'opened from the menu: the method is the user\'s own');
  // ----- the end of a track: the place goes, the landing card comes -----
  p.w.eval("START.src='screen';startGo('t1-keys')");
  p.$$('#start [data-go]').filter(b=>b.dataset.go==='t1-solve').forEach(b=>b.click());
  if(p.w.eval('START.on'))p.w.eval('startFirstSolve()');
  await new Promise(r=>setTimeout(r,30));
  assert.ok(!p.w.eval('START.on'),'the track is over');
  assert.strictEqual(p.get('startAt'),null,'the place is cleared at the end of a track');
  assert.ok(!p.$('#levelChip').classList.contains('resume'));
  assert.strictEqual(p.w.eval('curTab'),'bsolve');
  assert.ok(p.$('#landing')&&p.$('#landing').dataset.tab==='bsolve','the landing card names the section');
  assert.ok(/You are on Solve my cube/.test(p.$('#landing').textContent));
  // ----- the guided solve comes back to its part after a reload -----
  assert.strictEqual(p.w.eval('guideState.view'),'guide','the first solve is the guided solve');
  p.$('#gdDone').click();p.$('#gdDone').click();
  const at=p.w.eval('guideState.i'),scrSeed=p.w.eval('scr.seed'),scrMoves=p.w.eval("scr.moves.join(' ')");
  assert.strictEqual(p.get('guide').i,at,'the part is kept');assert.strictEqual(p.get('guide').moves,scrMoves,'with the scramble');
  p.w.eval("goTab('learn')");assert.ok(!p.$('#landing'),'another tab closes the landing card');
  seed=p.saved();p.close();p=await boot(seed);
  assert.deepStrictEqual(p.errs,[],'no script errors after the reload');
  assert.strictEqual(p.w.eval('guideState.view'),'guide','the guided solve is back');
  assert.strictEqual(p.w.eval('guideState.i'),at,'at the same part');
  assert.strictEqual(p.w.eval("scr.moves.join(' ')"),scrMoves,'on the same cube');
  assert.strictEqual(p.w.eval('scr.seed'),scrSeed);
  p.w.eval("goTab('bsolve')");assert.ok(p.$('#gdDone'),'Solve my cube shows the part');
  // Back to the entry: nothing kept.
  p.w.eval('gdToEntry()');assert.strictEqual(p.get('guide'),null,'the entry clears the kept part');
  // ----- one set of status words; the crumb over the section -----
  p.w.eval("goTab('learn');openLesson(1)");
  assert.strictEqual(p.$('#tab-learn .stbtn').textContent,'Not started','the status words of the Learn home');
  assert.ok(/Lesson · Step 1 of 8/.test(p.$('#tab-learn .ln-of').textContent),'the lesson eyebrow');
  assert.strictEqual(p.$('#tab-learn').dataset.crumb,'3×3 Beginner · Learn','the crumb over the section');
  p.w.eval("setMethod('cfop');goTab('cross')");assert.strictEqual(p.$('#tab-cross').dataset.crumb,'3×3 CFOP · Cross');
  // A level from the menu starts its own track, from any method.
  p.$('#levelChip').click();p.$('#levelPop .lvrow[data-n="4"]').click();
  assert.strictEqual(p.get('level'),4);assert.strictEqual(p.w.eval('START.screen'),'t4-sets','level 4 starts with the sets');
  p.$('#start .st-leave').click();assert.strictEqual(p.w.eval('method'),'cfop','leaving keeps the method');
  assert.ok(/Know algorithms/.test(p.$('#levelChip').textContent));
  assert.deepStrictEqual(p.errs,[],'no script errors');
  p.close();
  console.log('level: kept at once, a reload in a track, Leave for now, the chip and its menu, the end of a track, the landing card, the guided solve after a reload, status words, the crumb ok');
  process.exit(0);
}catch(e){console.error('level: FAIL',e);process.exit(1);}})();
