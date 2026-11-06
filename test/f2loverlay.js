// F2L Trainer's Overlay (js/f2ltrain.js) on the F2L tab: the chip shows while F2L Trainer is on and
// is off at the start; on, the cube on the page becomes a scramble of its own: the moves from solved
// that make the cube with the cross solved, the F2L pieces where they were, every sticker in color;
// the player, the picture and the picks read that one cube; your moves turn it; a new scramble on
// the F2L tab gets the cross put in too, on another tab it ends Overlay; another cross color puts
// that cross in; off, or F2L Trainer off, the scramble from before with your moves before and
// since. A smart cube turns the screen's cube through the map (js/live.js): the page's cube is
// M · the cube in your hands, its turns go on the player, and off puts your own cube back in step.
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
  const {w,d,errs}=await boot({'cw:method':'"cfop"','cw:cubeSrc':'"screen"','cw:tab':'"f2l"','cw:f2lTrain':'true','cw:f2lStyle':'1'});
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
  const run=s=>w.Function('return ('+s+')')();
  const until=async(f,ms=8000)=>{const t=Date.now();while(!run(f)){if(Date.now()-t>ms)return false;await sleep(50);}return true;};
  assert.deepStrictEqual(errs,[],'no script errors');
  // A scramble with an F2L edge in a cross place: Overlay still shows every pair.
  const seed=run(`(()=>{for(let i=0;i<200;i++){const s='t-ov-'+i,c=applyAlg(new Cube(),wcaScramble(s));
    const o=f2ltOverlay(c,crossColorIndex());if(o.skip.length===1&&buildCrossTable()[crossIndex(f2ltFrame(c,crossColorIndex()).X)]>3)return s;}})()`);
  assert.ok(seed,'a scramble with one F2L edge in the cross');
  run(`newScramble(${JSON.stringify(seed)})`);await sleep(50);
  const g=$('#f2lOverGrp'),b=$('#f2lOverBtn');
  assert.ok(g&&b,'the chip');assert.ok(!g.hidden,'shown while F2L Trainer is on');assert.ok(!$('#f2lStyle').contains(b),'not one of the style chips');
  assert.strictEqual($$('#f2lStyle button').length,3,'the three style chips as they were');
  assert.strictEqual(b.textContent,'Overlay');assert.strictEqual(b.getAttribute('aria-pressed'),'false','off at the start');assert.ok(b.title,'titled');
  const crossIn=()=>run(`(()=>{const f=displayedCube.toFacelets(),ci=crossColorIndex();return edgeFacelet.filter(e=>e.some(i=>f[i]===ci)).every(e=>e.every(i=>f[i]===f[i-i%9+4]));})()`);
  const key=s=>run(`cubeTabKey(${s})`);
  assert.ok(!crossIn(),'the cross is not solved');
  // Your moves first: they are kept for Off.
  run(`cubePlayerTurn('R','screen')`);run(`cubePlayerTurn('U','screen')`);await sleep(0);
  const before=key('displayedCube'),f2l=run(`(()=>{const f=displayedCube.toFacelets(),ci=crossColorIndex();return cornerFacelet.filter(c=>c.some(i=>f[i]===ci)).map(c=>c.map(i=>f[i]).join()).join('|');})()`);
  b.click();await sleep(0);
  assert.strictEqual(b.getAttribute('aria-pressed'),'true','on');assert.ok(crossIn(),'on: the cross in place');
  assert.ok(/^overlay-/.test(run('scr.seed')),'a scramble of its own: '+run('scr.seed'));
  assert.ok(run(`applyAlg(applyAlg(new Cube(),scr.moves),crossRotation()?[crossRotation()]:[]).toFacelets().join()===displayedCube.toFacelets().join()`),'the player: the scramble and its grip make the cube');
  assert.ok(run('scr.moves.every(m=>/^[URFDLB][\'2]?$/.test(m))'),'face moves only');
  assert.ok(run(`fromFacelets(scr.cube.toFacelets()).ok`),'a real cube');
  assert.ok(!run('displayedCube.toFacelets().includes(6)')&&!$('#cube').innerHTML.includes('--sticker-X'),'no gray: every sticker in color');
  assert.strictEqual(run(`(()=>{const f=displayedCube.toFacelets(),ci=crossColorIndex();return cornerFacelet.filter(c=>c.some(i=>f[i]===ci)).map(c=>c.map(i=>f[i]).join()).join('|');})()`),f2l,'the F2L corners where they were');
  assert.ok(run(`history[0].seed===scr.seed&&!!history[0].moves`),'in the history, with its moves');
  assert.ok(b.title.startsWith('Overlay is on'),'the tooltip: '+b.title);
  // Every pair shows: the one whose edge was in a cross place too.
  const sk=run(`f2ltOverlay(applyAlg(applyAlg(new Cube(),wcaScramble(${JSON.stringify(seed)})),[]),crossColorIndex()).skip`);
  $(`#f2lPairRow [data-pair="${sk[0]}"]`).click();await sleep(0);
  assert.ok(run(`f2lTrainFade(displayedCube.toFacelets()).size`)>6+8,'the named pair is lit');
  $('#f2lPairRow [data-pair="shortest"]').click();
  assert.ok(await until(`!!f2ltCurrent()&&f2ltCurrent().keys.length===1`),'a pick on the cube');
  $('#f2lPairRow [data-pair="guide"]').click();await sleep(0);
  // Your moves turn it; the cross goes out of place and back.
  const side=run(`'URFDLB'[[1,2,4,5,0,3].find(i=>displayedCube.center[i]!==crossColorIndex()&&displayedCube.center[i]!==(crossColorIndex()+3)%6)]`);
  const on0=key('displayedCube');
  run(`cubePlayerTurn(${JSON.stringify(side)},'screen')`);await sleep(0);assert.ok(!crossIn(),'a move takes the cross out of place');
  run(`cubePlayerTurn('D','screen')`);await sleep(0);
  // Off: the scramble from before, with your moves before (R U) and since.
  b.click();await sleep(0);assert.strictEqual(b.getAttribute('aria-pressed'),'false','off');
  assert.strictEqual(run('scr.seed'),seed,'the scramble from before');
  assert.strictEqual(key('displayedCube'),run(`cubeTabKey(applyAlg(applyAlg(applyAlg(new Cube(),scr.moves),crossRotation()?[crossRotation()]:[]),['R','U',${JSON.stringify(side)},'D']))`),'with your moves before and since');
  assert.ok(/your moves/.test(run('seqState.label')),'labeled your moves');
  run(`cubePlayerTurn('D\\'','screen')`);run(`cubePlayerTurn(${JSON.stringify(side+"'")},'screen')`);await sleep(0);
  assert.strictEqual(key('displayedCube'),before,'the moves since undone: the cube from before');
  // A new scramble while on: the cross put in on it too.
  b.click();await sleep(0);const ov1=run('scr.seed');run(`newScramble('t-ov-next')`);await sleep(50);
  assert.ok(crossIn(),'a new scramble: the cross in place');assert.strictEqual(b.getAttribute('aria-pressed'),'true');
  assert.ok(/^overlay-/.test(run('scr.seed')),'its own scramble again');assert.strictEqual(run('F2O.real.seed'),'t-ov-next','the new scramble kept for Off');
  // Another cross color: that cross in place.
  const was=run(`$('#crossColor').value`),other=was==='white'?'yellow':'white';
  run(`(()=>{const s=$('#crossColor');s.value=${JSON.stringify(other)};s.dispatchEvent(new Event('change'));})()`);await sleep(0);
  assert.strictEqual(run('crossColorIndex()'),other==='white'?0:3);assert.ok(crossIn(),'another cross color: its cross in place');
  assert.strictEqual(b.getAttribute('aria-pressed'),'true','still on');
  run(`(()=>{const s=$('#crossColor');s.value=${JSON.stringify(was)};s.dispatchEvent(new Event('change'));})()`);await sleep(0);assert.ok(crossIn());
  // Another tab: the same cube; a new scramble there ends Overlay.
  const k1=key('displayedCube');run(`goTab('cross')`);await sleep(0);assert.strictEqual(key('displayedCube'),k1,'the Cross tab: the same cube');
  run(`goTab('f2l')`);await sleep(0);assert.strictEqual(b.getAttribute('aria-pressed'),'true','back on F2L: on');
  run(`goTab('cross')`);run(`newScramble('t-ov-cross')`);await sleep(50);assert.strictEqual(run('scr.seed'),'t-ov-cross','a new scramble on the Cross tab is its own');
  assert.ok(!run('F2O.on'),'and Overlay ends');run(`goTab('f2l')`);await sleep(0);assert.strictEqual(b.getAttribute('aria-pressed'),'false');
  // F2L Trainer off: the chip hides, and Overlay goes off to the scramble from before.
  b.click();await sleep(0);assert.ok(/^overlay-/.test(run('scr.seed')));
  $('#f2lTrainBtn').click();await sleep(0);assert.ok(g.hidden,'hidden with F2L Trainer off');assert.strictEqual(run('scr.seed'),'t-ov-cross','the scramble from before');
  $('#f2lTrainBtn').click();await sleep(0);assert.ok(!g.hidden,'shown again');assert.strictEqual(b.getAttribute('aria-pressed'),'false','and off');
  // Undo puts the scramble back: Overlay ends.
  b.click();await sleep(20);assert.ok(run('F2O.on'));assert.ok(run('undoRun()'),'something to undo');await sleep(0);
  assert.strictEqual(run('scr.seed'),'t-ov-cross','Undo: the scramble from before');assert.ok(!run('F2O.on'),'Undo: Overlay ends');
  assert.strictEqual(b.getAttribute('aria-pressed'),'false');

  // ----- a smart cube: the map -----
  run(`newScramble('t-ov-smart')`);await sleep(50);
  run(`setCubeSrc('smart')`);run(`cubeTab.conn={send:()=>Promise.resolve()}`);
  // The cube in your hands, scrambled: New F2L marks it as the start.
  const P0=`applyAlg(new Cube(),wcaScramble('t-ov-hands'))`;
  run(`cubeTabShow(${P0})`);await sleep(0);
  run(`$('#fgNew').click()`);await sleep(50);
  assert.ok(run('liveInStep(cubeTab.target)'),'the page shows the cube in your hands');assert.ok(!run('LIVE.map'),'no map');
  b.click();await sleep(0);
  assert.strictEqual(b.getAttribute('aria-pressed'),'true','on with a smart cube');assert.ok(crossIn(),'the cross in place');
  assert.ok(!!run('LIVE.map'),'a map');assert.ok(run('liveInStep(cubeTab.target)'),'the screen in step through the map');
  assert.ok(run(`liveReal(cubeTab.target).equals(${P0})`),'the real cube kept');
  assert.ok(!$('#liveNote')||$('#liveNote').hidden,'no note that the cube is not in step');
  // A turn of the cube in your hands goes on the player and turns the screen's cube.
  const n0=run('seqState.moves.length'),s0=key('displayedCube');
  run(`cubeTabShow(applyAlg(${P0},['R']))`);await sleep(0);
  assert.strictEqual(run('seqState.moves.length'),n0+1,'the turn on the player');
  assert.strictEqual(run(`cubeTabKey(liveNorm(displayedCube))`),run(`cubeTabKey(applyAlg(liveNorm(cubeAtSeq(${n0})),['R']))`),'the screen turned R');
  assert.notStrictEqual(key('displayedCube'),s0);assert.ok(run('liveInStep(cubeTab.target)'),'still in step');
  // Off: your own cube, in step, with the turn on it.
  b.click();await sleep(0);assert.ok(!run('LIVE.map'),'no map');
  assert.ok(run(`cubeTab.target.equals(applyAlg(${P0},['R']))`),'the cube kept as it is in your hands');
  assert.ok(run('liveInStep(cubeTab.target)'),'the page shows the cube in your hands again');
  run(`cubeTabShow(applyAlg(${P0},['R','U']))`);await sleep(0);assert.ok(run('liveInStep(cubeTab.target)'),'and follows it');
  // New F2L while on: the cube in your hands as the start, with the cross put in.
  b.click();await sleep(0);run(`cubeTabShow(applyAlg(${P0},['R','U','F']))`);await sleep(0);
  run(`$('#fgNew').click()`);await sleep(50);
  assert.ok(/^overlay-/.test(run('scr.seed')),'New F2L: an overlay of it');assert.ok(crossIn());
  assert.ok(run(`liveReal(cubeTab.target).equals(applyAlg(${P0},['R','U','F']))`),'the map from the cube as it is');
  assert.ok(run('liveInStep(cubeTab.target)'),'in step');
  assert.ok(/^smart-/.test(run('F2O.real.seed')),'the cube in your hands kept for Off');
  b.click();await sleep(0);assert.ok(run('liveInStep(cubeTab.target)'),'off: in step');
  assert.deepStrictEqual(errs,[],'no script errors at the end');
  console.log('f2loverlay: the chip, the scramble with the cross in place, every color, your moves, off, a new scramble, the cross color, the tabs, F2L Trainer off, Undo, a smart cube through the map ok');process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
