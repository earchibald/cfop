// Cross Trainer's Virtual scramble (js/crosstrain.js) on the Cross tab: the chip shows while Cross
// Trainer is on and is off at the start; on, a new cross scramble of the Length picked loads; your
// moves turn it; a new cross scramble while on is virtual too; off, or Cross Trainer off, the
// scramble from before with your moves before and since; Undo or a new scramble on another tab ends
// it. A smart cube turns the screen's scramble through the map (js/live.js): no fresh start while it
// is on, the Length menu works, the cube in your hands is kept, and off puts it back in step.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
function fakeStorage(seed){const m=new Map(Object.entries(seed||{}));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),map:m};}
function boot(seed){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
    beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};w.console.info=()=>{};Object.defineProperty(w,'localStorage',{value:fakeStorage(seed)});}});
  const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
  return new Promise(res=>w.addEventListener('load',()=>setTimeout(()=>res({w,d:w.document,errs}),400)));
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  const {w,d,errs}=await boot({'cw:method':'"cfop"','cw:cubeSrc':'"screen"','cw:tab':'"cross"','cw:crossTrain':'true','cw:crossDiff':'"4"'});
  const $=s=>d.querySelector(s);
  const run=s=>w.Function('return ('+s+')')();
  const until=async(f,ms=8000)=>{const t=Date.now();while(!run(f)){if(Date.now()-t>ms)return false;await sleep(50);}return true;};
  const key=s=>run(`cubeTabKey(${s})`);
  assert.deepStrictEqual(errs,[],'no script errors');
  run(`newScramble('t-cxo')`);await sleep(50);
  const g=$('#crossOverGrp'),b=$('#crossOverBtn');
  assert.ok(g&&b,'the chip');assert.ok(!g.hidden,'shown while Cross Trainer is on');
  assert.strictEqual(b.textContent,'Virtual scramble');assert.strictEqual(b.getAttribute('aria-pressed'),'false','off at the start');assert.ok(b.title,'titled');
  assert.strictEqual(g.previousElementSibling&&g.previousElementSibling.id,'crossTrainBtn','after the Cross Trainer button');
  // Your moves first: they are kept for Off.
  run(`cubePlayerTurn('R','screen')`);run(`cubePlayerTurn('U','screen')`);await sleep(0);
  const before=key('displayedCube');
  b.click();assert.ok(await until(`scr.seed!=='t-cxo'`),'a new scramble loads');await sleep(0);
  assert.strictEqual(b.getAttribute('aria-pressed'),'true','on');assert.ok(b.title.startsWith('Virtual scramble is on'),'the tooltip: '+b.title);
  assert.ok(/^x4w-/.test(run('scr.seed')),'a cross scramble of the Length picked: '+run('scr.seed'));
  assert.strictEqual(run('crossState.sol&&crossState.sol.optimal'),4,'its cross takes 4 moves');
  assert.ok(run(`applyAlg(applyAlg(new Cube(),scr.moves),crossRotation()?[crossRotation()]:[]).toFacelets().join()===displayedCube.toFacelets().join()`),'the player: the scramble and its grip');
  assert.ok(run(`CXO.real.seed==='t-cxo'`),'the scramble from before kept');
  // Your moves turn it; a new cross scramble while on is virtual too.
  run(`cubePlayerTurn('F','screen')`);await sleep(0);
  const v1=run('scr.seed');$('#crossNew').click();assert.ok(await until(`scr.seed!==${JSON.stringify(v1)}`),'New cross scramble');await sleep(0);
  assert.strictEqual(b.getAttribute('aria-pressed'),'true','still on');assert.ok(run(`CXO.seed===scr.seed&&CXO.real.seed==='t-cxo'`),'virtual, the scramble from before still kept');
  run(`cubePlayerTurn('D','screen')`);await sleep(0);
  // Off: the scramble from before, with your moves before (R U) and since, on each virtual scramble (F, D).
  b.click();await sleep(0);assert.strictEqual(b.getAttribute('aria-pressed'),'false','off');
  assert.strictEqual(run('scr.seed'),'t-cxo','the scramble from before');
  assert.strictEqual(key('displayedCube'),run(`cubeTabKey(applyAlg(applyAlg(applyAlg(new Cube(),scr.moves),crossRotation()?[crossRotation()]:[]),['R','U','F','D']))`),'with your moves before and since');
  run(`cubePlayerTurn('D\\'','screen')`);run(`cubePlayerTurn('F\\'','screen')`);await sleep(0);assert.strictEqual(key('displayedCube'),before,'the cube from before');
  // Cross Trainer off: the chip hides, and the Virtual scramble goes off to the scramble from before.
  b.click();assert.ok(await until(`CXO.seed&&scr.seed===CXO.seed`));
  $('#crossTrainBtn').click();await sleep(0);assert.ok(g.hidden,'hidden with Cross Trainer off');assert.strictEqual(run('scr.seed'),'t-cxo','the scramble from before');
  assert.ok(!run('CXO.on'));$('#crossTrainBtn').click();await sleep(0);assert.ok(!g.hidden,'shown again');assert.strictEqual(b.getAttribute('aria-pressed'),'false','and off');
  // Undo puts the scramble back: it ends.
  b.click();assert.ok(await until(`CXO.seed&&scr.seed===CXO.seed`));await sleep(20);assert.ok(run('undoRun()'),'something to undo');await sleep(0);
  assert.strictEqual(run('scr.seed'),'t-cxo','Undo: the scramble from before');assert.ok(!run('CXO.on'),'Undo: it ends');assert.strictEqual(b.getAttribute('aria-pressed'),'false');
  // Another tab: the same cube; a new scramble there ends it.
  b.click();assert.ok(await until(`CXO.seed&&scr.seed===CXO.seed`));const k1=key('displayedCube');
  run(`goTab('f2l')`);await sleep(0);assert.strictEqual(key('displayedCube'),k1,'the F2L tab: the same cube');
  run(`goTab('cross')`);await sleep(0);assert.strictEqual(b.getAttribute('aria-pressed'),'true','back on Cross: on');
  run(`goTab('ll')`);run(`newScramble('t-cxo-ll')`);await sleep(50);assert.strictEqual(run('scr.seed'),'t-cxo-ll','a new scramble on another tab is its own');
  assert.ok(!run('CXO.on'),'and it ends');run(`goTab('cross')`);await sleep(0);assert.strictEqual(b.getAttribute('aria-pressed'),'false');

  // ----- a smart cube: the map -----
  run(`newScramble('t-cxo-smart')`);await sleep(50);
  run(`setCubeSrc('smart')`);run(`cubeTab.conn={send:()=>Promise.resolve()}`);
  const P0=`applyAlg(new Cube(),wcaScramble('t-cxo-hands'))`;
  run(`cubeTabShow(${P0})`);await sleep(0);
  run(`$('#crossNew').click()`);await sleep(50);
  assert.ok(run('liveInStep(cubeTab.target)'),'New Cross: the page shows the cube in your hands');assert.ok(!run('LIVE.map'),'no map');
  assert.ok(run(`$('#crossDiff').disabled`),'no Length on a fresh start');
  const mine=run('scr.seed');
  b.click();assert.ok(await until(`CXO.seed&&scr.seed===CXO.seed`),'on with a smart cube');await sleep(0);
  assert.strictEqual(b.getAttribute('aria-pressed'),'true');assert.ok(/^x4w-/.test(run('scr.seed')),'a cross scramble of the Length picked');
  assert.ok(!!run('LIVE.map'),'a map');assert.ok(run('liveInStep(cubeTab.target)'),'the screen in step through the map');
  assert.ok(run(`liveReal(cubeTab.target).equals(${P0})`),'the real cube kept');
  assert.ok(!$('#liveNote')||$('#liveNote').hidden,'no note that the cube is not in step');
  assert.ok(!run(`$('#crossDiff').disabled`),'the Length menu works');assert.ok(!/^New Cross$/.test(run(`$('#crossNew').firstChild.textContent`)),'New makes a scramble: '+run(`$('#crossNew').firstChild.textContent`));
  // A turn of the cube in your hands goes on the player and turns the screen's cube.
  const n0=run('seqState.moves.length');
  run(`cubeTabShow(applyAlg(${P0},['R']))`);await sleep(0);
  assert.strictEqual(run('seqState.moves.length'),n0+1,'the turn on the player');
  assert.strictEqual(run(`cubeTabKey(liveNorm(displayedCube))`),run(`cubeTabKey(applyAlg(liveNorm(cubeAtSeq(${n0})),['R']))`),'the screen turned R');
  // New Cross while on: another virtual scramble, the map from the cube as it is.
  const v2=run('scr.seed');run(`$('#crossNew').click()`);assert.ok(await until(`scr.seed!==${JSON.stringify(v2)}`),'another scramble');await sleep(0);
  assert.ok(/^x4w-/.test(run('scr.seed'))&&run('CXO.seed===scr.seed'),'virtual');
  assert.ok(run(`liveReal(cubeTab.target).equals(applyAlg(${P0},['R']))`),'the cube in your hands kept');assert.ok(run('liveInStep(cubeTab.target)'),'in step');
  run(`cubeTabShow(applyAlg(${P0},['R','U']))`);await sleep(0);
  // Off: your own cube, in step, with the turns on it.
  b.click();await sleep(0);assert.ok(!run('LIVE.map'),'no map');assert.strictEqual(run('scr.seed'),mine,'the cube you marked');
  assert.ok(run(`cubeTab.target.equals(applyAlg(${P0},['R','U']))`),'the cube kept as it is in your hands');
  assert.ok(run('liveInStep(cubeTab.target)'),'the page shows the cube in your hands again');
  assert.ok(run(`$('#crossDiff').disabled`),'a fresh start again');assert.strictEqual(run(`$('#crossNew').firstChild.textContent`),'New Cross');
  // Use my cube while on: it ends, and the cube in your hands is the scramble.
  b.click();assert.ok(await until(`CXO.seed&&scr.seed===CXO.seed`));run('liveUse()');await sleep(0);
  assert.ok(!run('CXO.on')&&!run('LIVE.map'),'Use my cube ends it');assert.ok(run('liveInStep(cubeTab.target)'),'in step');
  assert.deepStrictEqual(errs,[],'no script errors at the end');
  console.log('crossoverlay: the chip, a scramble of the Length picked, your moves, New while on, off, Cross Trainer off, Undo, the tabs, a smart cube through the map, Use my cube ok');process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
