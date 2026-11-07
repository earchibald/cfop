// Trainer wins (js/trainwin.js) and F2L Trainer's picks on a solved cube. A turn that solves what a
// trainer asks for lifts the pieces just solved with a soft glow and a bounce (mainBump with
// bounce, TRAIN_WIN: 750 ms, the glow at most TRAIN_WIN.glow), then the next drill: Cross Trainer's
// cross, F2L-1's pair (the next pair lights), F2L-2's F2L (the tab's next scramble on the virtual
// cube; Overlay's fresh drill). A smart cube with no Overlay glows and gets no new scramble; a running
// timer waits. With every pair solved F2L-1 lights none, and Overlay on a solved cube (a smart cube
// solved in your hands) loads a fresh drill with pairs to solve, never a solved pair (1.78).
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
  const {w,d,errs}=await boot({'cw:method':'"cfop"','cw:cubeSrc':'"screen"','cw:tab':'"f2l"','cw:f2lTrain':'true','cw:f2lStyle':'1','cw:f2lPair':'"shortest"'});
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
  const run=s=>w.Function('return ('+s+')')();
  const until=async(f,ms=8000)=>{const t=Date.now();while(!run(f)){if(Date.now()-t>ms)return false;await sleep(30);}return true;};
  assert.deepStrictEqual(errs,[],'no script errors');
  const ci=()=>run('crossColorIndex()');
  const done=`(()=>{const f=displayedCube.toFacelets();return twCross(f,crossColorIndex())&&twAllPairs(f,crossColorIndex());})()`;
  const litSolved=`f2lTrainPairs(displayedCube.toFacelets()).some(p=>f2lPairHome(displayedCube.toFacelets(),crossColorIndex(),...p))`;
  // ---- a solved cube: no pair lit; Overlay makes a drill ----
  run(`loadScramble('t-solved',[],true)`);await sleep(50);
  assert.ok(run(done),'a solved cube');
  assert.ok(await until(`!!f2ltCurrent()`),'Shortest reads the cube');
  assert.strictEqual(run('f2ltCurrent().why'),'solved','Shortest: every pair is solved');
  assert.strictEqual(run('f2lTrainPairs(displayedCube.toFacelets()).length'),0,'no pair lit: none is solved-and-lit');
  await sleep(10);assert.strictEqual($('#f2lLit .f2lt-word').textContent,'every pair solved','Lit says so');
  $('#f2lOverBtn').click();await sleep(0);
  assert.strictEqual($('#f2lOverBtn').getAttribute('aria-pressed'),'true','Overlay on');
  assert.ok(!run(done),'Overlay on a solved cube: a fresh drill with pairs to solve');
  assert.ok(run('twCross(displayedCube.toFacelets(),crossColorIndex())'),'its cross in place');
  assert.ok(await until(`!!f2ltCurrent()&&f2ltCurrent().keys.length===1`),'Shortest picks a pair of the drill');
  assert.ok(!run(litSolved),'the pair lit is not solved');
  $('#f2lOverBtn').click();await sleep(0);assert.ok(run(done),'off: the solved cube again');
  // ---- a win: the move that solves it ----
  // The face move, as the picture names it, that solves the goal from here (one exists: the scramble is one move).
  const solver=goal=>run(`(()=>{const c=displayedCube;for(const f of 'URFDLB')for(const s of ['',"'",'2']){const m=f+s,n=applyAlg(c,[m]).toFacelets(),ci=crossColorIndex();
      if(${goal})return m;}return null;})()`);
  const winning=async(src)=>{const m=solver(`twCross(n,ci)&&twAllPairs(n,ci)`);assert.ok(m,'a move solves it');run(`cubePlayerTurn(${JSON.stringify(m)},${JSON.stringify(src)})`);};
  // F2L-1 with one pair named: that pair glows; the cube was one move from solved, so the F2L is solved too.
  run(`loadScramble('t-r',['R'],true)`);await sleep(50);
  const k=run(`f2ltPairs(0).find(x=>!f2lPairHome(displayedCube.toFacelets(),0,...f2ltKeyColors(x)))`);assert.ok(k,'a pair the scramble breaks');
  $(`#f2lPairRow [data-pair="${k}"]`).click();
  const seed0=run('scr.seed');
  await winning('smart');
  assert.ok(run('!!TW.win'),'a win');
  assert.ok(await until(`!!mainLift&&mainLift.bounce`,1000),'the pieces bounce');
  assert.strictEqual(run('mainLift.set.size'),5,'the pair lifted: its corner and its edge');
  const L=run('({d:mainLift.d,dim:mainLift.dim})');assert.ok(L.d<0.55&&L.dim<0.45,'a smaller lift, less dim than a bump');
  let maxG=0;for(let i=0;i<12;i++){const g=run('mainLift&&mainLift.g||0');maxG=Math.max(maxG,g);
    const o=[...$('#cube').innerHTML.matchAll(/filter="url\(#cwLiftGlow\)" opacity="([\d.]+)"/g)].map(x=>+x[1]);for(const x of o)assert.ok(x<=0.5001,'a soft glow: '+x);await sleep(50);}
  assert.ok(maxG>0.2&&maxG<=0.5,'the glow rises, to half at most: '+maxG);
  assert.ok(await until('!TW.win&&!mainLift',1500),'it ends after about 750 ms');
  assert.strictEqual(run('scr.seed'),seed0,'a smart cube with no Overlay: no new scramble (the cube in your hands)');
  // F2L-2 on the virtual cube: the F2L solved, then the tab's next scramble.
  $$('#f2lStyle button')[1].click();
  run(`loadScramble('t-r2',['R'],true)`);await sleep(50);const seed1=run('scr.seed');
  await winning('screen');assert.ok(run('!!TW.win'),'F2L-2: a win');
  assert.ok(await until(`scr.seed!==${JSON.stringify(seed1)}`,2500),'then the next scramble');
  assert.ok(run('!TW.win'),'the win over');
  // A running timer waits for its stop.
  run(`loadScramble('t-r3',['R'],true)`);await sleep(50);const seed2=run('scr.seed');
  run(`timer.state='running'`);await winning('screen');assert.ok(run('!!TW.win'));
  await until('!TW.win',2000);await sleep(100);assert.strictEqual(run('scr.seed'),seed2,'a running timer: no next scramble');
  run(`timer.state='idle'`);
  // A turn that is no win: nothing.
  run(`loadScramble('t-rr',['R','U'],true)`);await sleep(50);run(`cubePlayerTurn('U','screen')`);assert.ok(run('!TW.win'),'no win while unsolved');
  // Overlay: the F2L solved gives a fresh drill (a smart cube too: the screen's cube is not yours).
  // F2L-2, so the goal is the whole F2L. The drill is solved by the two-phase solver's moves, named
  // as the picture holds the cube (white down: z2 swaps U and D, R and L), until the win.
  $$('#f2lStyle button')[1].click();
  run(`loadScramble('t-solved2',[],true)`);await sleep(50);$('#f2lOverBtn').click();await sleep(0);
  assert.ok(run('f2loOv()')&&!run(done),'Overlay on: a drill');
  const ovSeed=run('scr.seed');
  const sol=run(`(()=>{const sw={U:'D',D:'U',R:'L',L:'R',F:'F',B:'B'},s=solveTwoPhase(scr.cube,{timeMs:4000});return s?s.map(m=>sw[m[0]]+m.slice(1)):null;})()`);
  assert.ok(sol&&sol.length,'a solution');
  for(const m of sol){run(`cubePlayerTurn(${JSON.stringify(m)},'smart')`);if(run('!!TW.win'))break;}
  assert.ok(run('!!TW.win')&&run(done),'Overlay: a win when the F2L is solved');
  assert.ok(await until(`scr.seed!==${JSON.stringify(ovSeed)}`,2500),'then a fresh drill, a smart cube too');
  assert.ok(run('f2loOv()')&&/^overlay-/.test(run('scr.seed')),'still Overlay');
  assert.ok(!run(done),'with pairs to solve');
  $('#f2lOverBtn').click();await sleep(0);
  // ---- Cross Trainer: the cross made, then the next cross drill ----
  $('nav.rail button[data-tab="cross"]').click();await sleep(50);
  if(!run('crossTrainOn()'))$('#crossTrainBtn').click();
  run(`loadScramble('t-f',['F'],true)`);await sleep(50);const cs=run('scr.seed');
  assert.ok(!run('twCross(displayedCube.toFacelets(),crossColorIndex())'),'the cross is off');
  const cm=solver('twCross(n,ci)');run(`cubePlayerTurn(${JSON.stringify(cm)},'screen')`);
  assert.ok(run('!!TW.win'),'Cross Trainer: a win');
  assert.ok(await until('!!mainLift&&mainLift.bounce',1000),'the cross edges bounce');
  assert.strictEqual(run('mainLift.set.size'),8,'the four cross edges, both stickers');
  assert.ok(await until(`scr.seed!==${JSON.stringify(cs)}`,2500),'then the next cross');
  // Virtual scramble (1.77): the page owns the cross, so a smart cube's win gives the next virtual cross.
  const dsel=$('#crossDiff');dsel.value='2';dsel.dispatchEvent(new w.Event('change'));
  $('#crossOverBtn').click();assert.ok(await until('cxoOv()',3000),'Virtual scramble on');
  const vs=run('scr.seed');
  const two=run(`(()=>{const c=displayedCube,ms=[];for(const f of 'URFDLB')for(const s of ['',"'",'2'])ms.push(f+s);
    for(const a of ms)for(const b of ms)if(twCross(applyAlg(c,[a,b]).toFacelets(),crossColorIndex()))return [a,b];return null;})()`);
  assert.ok(two,'two moves make the cross');
  for(const m of two)run(`cubePlayerTurn(${JSON.stringify(m)},'smart')`);
  assert.ok(run('!!TW.win'),'Virtual scramble: a win');
  assert.ok(await until(`scr.seed!==${JSON.stringify(vs)}&&!TW.win`,3000),'then the next virtual cross, a smart cube too');
  assert.ok(run('cxoOv()'),'still Virtual scramble');
  $('#crossOverBtn').click();await sleep(0);
  // A tab change stops a glow.
  run(`loadScramble('t-f2',['F'],true)`);await sleep(50);run(`cubePlayerTurn(${JSON.stringify(solver('twCross(n,ci)'))},'smart')`);
  assert.ok(run('!!TW.win'));$('nav.rail button[data-tab="f2l"]').click();assert.ok(run('!TW.win'),'another tab stops it');
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('trainwin: no solved pair lit, Overlay on a solved cube makes a drill, the soft glow and bounce, the next drill, a smart cube, the timer, Cross Trainer ok');
  process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
