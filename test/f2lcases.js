// The 41 F2L cases as drills (1.79): the deck (each selected case once a round, f2lDeckDraw), the
// case cube Overlay deals (f2loCaseCube: the cross and the other three pairs solved, the case's
// pair in the slot named in the Pair row), a pair solved with Overlay on brings the next case (a
// smart cube too, through the map), a pair named in the Pair row solved brings the next drill, and
// The 41 cases brings the next case when one is solved, with F2L Trainer off.
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
  const {w,d,errs}=await boot({'cw:method':'"cfop"','cw:cubeSrc':'"screen"','cw:tab':'"f2l"','cw:smartAsk':'false'});
  const $=s=>d.querySelector(s);
  const run=s=>w.Function('return ('+s+')')();
  const runJ=s=>JSON.parse(run('JSON.stringify('+s+')'));
  const until=async(f,ms=8000)=>{const t=Date.now();while(!run(f)){if(Date.now()-t>ms)return false;await sleep(30);}return true;};
  assert.deepStrictEqual(errs,[],'no script errors');
  // ---- the deck ----
  run(`store.set('f2lDeck',[])`);
  const round=runJ(`Array.from({length:41},()=>f2lDeckDraw())`);
  assert.deepStrictEqual([...round].sort((a,b)=>a-b),Array.from({length:41},(_,i)=>i+1),'a round deals each of the 41 once');
  assert.notDeepStrictEqual(round,Array.from({length:41},(_,i)=>i+1),'in a shuffled order');
  const next=run('f2lDeckDraw()');assert.notStrictEqual(next,round[40],'a new round never starts with the last case');
  assert.strictEqual(run(`store.get('f2lDeck').length`),40,'cw:f2lDeck keeps the cases left');
  run(`(()=>{f2lState.caseSel=new Set([3,7,12]);store.set('f2lDeck',[]);})()`);
  const few=runJ(`Array.from({length:6},()=>f2lDeckDraw())`);
  assert.deepStrictEqual(few.slice(0,3).sort((a,b)=>a-b),[3,7,12],'the cases selected, each once');
  assert.deepStrictEqual(few.slice(3).sort((a,b)=>a-b),[3,7,12],'then again');
  run(`(()=>{f2lState.caseSel=new Set(F2L_CASES.map(c=>c.n));store.set('f2lDeck',[]);})()`);
  // ---- the case cube: every case, in every slot ----
  const bad=runJ(`(()=>{const ci=crossColorIndex(),out=[];
    for(const k of f2ltPairs(ci))for(const c of F2L_CASES){const o=f2loCaseCube(c.n,{pair:k}),f=o.cube.toFacelets();
      const others=f2ltPairs(ci).filter(x=>x!==k);
      if(o.cube.center[3]!==ci)out.push(c.n+' '+k+': held with the cross down');
      if(!twCross(f,ci))out.push(c.n+' '+k+': the cross');
      if(!others.every(x=>f2lPairHome(f,ci,...f2ltKeyColors(x))))out.push(c.n+' '+k+': the other pairs');
      if(f2lPairHome(f,ci,...f2ltKeyColors(k)))out.push(c.n+' '+k+': the pair is not solved');
      const s=applyAlg(o.cube,o.solve).toFacelets();if(!(twCross(s,ci)&&twAllPairs(s,ci)))out.push(c.n+' '+k+': its solve solves it');}
    return out;})()`);
  assert.deepStrictEqual(bad,[],'every case in every slot: the cross and the other pairs solved, its solve solves it');
  assert.strictEqual(run(`(()=>{const ci=crossColorIndex(),f=f2loCaseCube(5).cube.toFacelets();const c=new Cube();c.center;
    return f2ltPairs(ci).filter(k=>!f2lPairHome(f,ci,...f2ltKeyColors(k)))[0];})()`),run(`(()=>{const c=applyAlg(new Cube(),[crossRotation()]);return f2ltKey(c.center[2],c.center[1]);})()`),
    'with no pair named: the front-right pair, as the list holds it');
  // ---- The 41 cases, F2L Trainer off: a case solved, the next case ----
  d.querySelector('#f2lMode [data-m=cases]').click();await sleep(20);
  $('#f2lRandomCase').click();await sleep(20);
  assert.ok(/of 41 in this round/.test($('#f2lCaseOut').textContent),'the round shows');
  for(let i=0;i<2;i++){
    const n0=run('f2lState.curCase'),left=run('f2lDeckLeft().length');
    for(const m of run('f2lSolution()'))run(`cubePlayerTurn(${JSON.stringify(m)},'screen')`);
    assert.ok(run('!!TW.win'),'a case solved: a win, F2L Trainer off');
    assert.ok(await until(`f2lState.curCase!==${n0}`,2000),'then the next case');
    assert.strictEqual(run('f2lDeckLeft().length'),left-1,'dealt from the deck');}
  d.querySelector('#f2lMode [data-m=guide]').click();await sleep(20);
  // ---- Overlay, F2L-1: each pair solved, the next case ----
  run(`store.set('f2lTrain',true)`);run(`f2lTrainStyleSet(1)`);run(`store.set('f2lPair','guide')`);
  run(`loadScramble('t-r',['R','U'],true)`);await sleep(30);
  $('#f2lOverBtn').click();await sleep(0);assert.ok(run('f2loOv()'),'Overlay on');
  // the first drill is the cube as it is: four pairs to solve. A pair solved there brings a case.
  run('f2loNext()');assert.ok(run('!!F2O.cas'),'a case dealt');
  const solveCase=async(src)=>{const n0=run('F2O.cas.n'),seed0=run('scr.seed');
    for(const m of run('F2O.cas.solve'))run(`cubePlayerTurn(${JSON.stringify(m)},${JSON.stringify(src)})`);
    assert.ok(run('!!TW.win'),'the pair solved: a win');
    assert.ok(await until(`scr.seed!==${JSON.stringify(seed0)}`,2000),'then a new scramble');
    assert.ok(run('f2loOv()'),'Overlay stays on');return n0;};
  const n1=await solveCase('screen');
  assert.notStrictEqual(run('F2O.cas.n'),n1,'the next case');
  const lit=run('f2lTrainPairs(displayedCube.toFacelets())');assert.strictEqual(lit.length,1,'one pair lit');
  assert.ok(!run(`f2lPairHome(displayedCube.toFacelets(),crossColorIndex(),...${JSON.stringify(lit[0])})`),'the case pair, not solved');
  // A pair named that is solved: the next case comes at once, in its slot; solved, the next one there too.
  const k=run(`f2ltPairs(crossColorIndex()).find(x=>x!==f2ltKey(...f2lTrainPairs(displayedCube.toFacelets())[0]))`),seed1=run('scr.seed');
  $(`#f2lPairRow [data-pair="${k}"]`).click();
  assert.notStrictEqual(run('scr.seed'),seed1,'a pair named that is solved: the next case at once');
  const un=()=>runJ(`f2ltPairs(crossColorIndex()).filter(x=>!f2lPairHome(displayedCube.toFacelets(),crossColorIndex(),...f2ltKeyColors(x)))`);
  assert.deepStrictEqual(un(),[k],'in the slot of the pair named');
  await solveCase('screen');
  assert.deepStrictEqual(un(),[k],'solved: the next case in the same slot');
  // A smart cube's turns (the screen's cube is not the cube in your hands): the next case too.
  await solveCase('smart');assert.deepStrictEqual(un(),[k],'a smart cube: the next case');
  // Overlay off, a pair named, the virtual cube: that pair solved, the tab's next scramble.
  $('#f2lOverBtn').click();await sleep(0);assert.ok(!run('f2loOv()'),'Overlay off');
  run(`(()=>{const r=crossRotation(),c=applyAlg(new Cube(),[r]),y=[[],['y'],['y2'],["y'"]].find(t=>{const h=applyAlg(c,t);return f2ltKey(h.center[2],h.center[1])===${JSON.stringify(k)};});
    const set=caseSetupMoves(F2L_CASES[0].alg),moves=removeRotations([r,...y,...set,...parseAlg(invertAlg(y.join(' '))),...parseAlg(invertAlg(r))]);
    loadScramble('t-named',moves,true);window.__solve=removeRotations([...y,...parseAlg(F2L_CASES[0].alg),...parseAlg(invertAlg(y.join(' ')))]);})()`);await sleep(30);
  assert.deepStrictEqual(un(),[k],'a scramble with the named pair alone to solve');
  const seed2=run('scr.seed');for(const m of run('__solve'))run(`cubePlayerTurn(${JSON.stringify(m)},'screen')`);
  assert.ok(run('!!TW.win'),'the named pair solved: a win');
  assert.ok(await until(`scr.seed!==${JSON.stringify(seed2)}`,2000),'then the tab\'s next scramble');
  console.log('f2lcases: the deck, every case in every slot, The 41 cases with F2L Trainer off, Overlay deals the next case per pair, the named slot ok');
  process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
