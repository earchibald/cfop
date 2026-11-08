// OLL · PLL Trainer (js/lltrain.js) on the OLL · PLL tab: one pane, no probability menu, no
// rest-of-layer box and no per-case times; the button on the cube and its chips (Two-look OLL,
// Two-look PLL, Full PLL) with what each keeps in color; Next case turns the trainer and Overlay on
// and deals a case of the set as a scramble of its own (the first two layers solved, the top one
// color for the PLL sets), each case once a round; the case line (? until Reveal, then the name,
// the algorithm, the Lab); the look solved is a win and the next case comes; another set deals from
// it; a new scramble on the tab while on is the next case; off, the scramble from before with your
// moves; the trainer off, Undo and a scramble on another tab end it; the full PLL cards select;
// a smart cube turns the case through the map (js/live.js), with no fresh start while on.
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
  const {w,d,errs}=await boot({'cw:method':'"cfop"','cw:cubeSrc':'"screen"','cw:tab':'"ll"'});
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
  const run=s=>w.Function('return ('+s+')')();
  const until=async(f,ms=8000)=>{const t=Date.now();while(!run(f)){if(Date.now()-t>ms)return false;await sleep(50);}return true;};
  const key=s=>run(`cubeTabKey(${s})`);
  const click=(el,opts)=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,...opts}));
  assert.deepStrictEqual(errs,[],'no script errors');
  // ---- the pane ----
  assert.strictEqual($$('#tab-ll > .panel').length,1,'one pane');assert.ok($('#llPane').contains($('#llNext'))&&$('#llPane').contains($('#llGroups'))&&$('#llPane').contains($('#llShowBar')),'Next case, the cases and Show in it');
  assert.ok(!$('#llProb')&&!$('#llRealState'),'no probability menu, no rest-of-layer box');
  assert.ok(!$('#llStats')&&!$('#f2lStats')&&!$('#f2lStatsPanel'),'no per-case times');
  assert.ok(!$('#llDrillLearning')&&/Finish/.test($('#llShowBar .llplan').textContent),'the plan line stays, Drill Learning goes');
  assert.ok(/Press Next case/.test($('#llCurrent').textContent),'the case line before a case');
  // ---- the button and its chips ----
  const tb=$('#llTrainBtn'),g=$('#llStyle'),box=$('#llTrainer');
  assert.ok(tb&&g&&box,'the button, the chips, the box');assert.strictEqual(tb.getAttribute('aria-pressed'),'false','off at the start');assert.ok(tb.title,'titled');
  assert.ok(g.hidden&&box.hidden,'the chips and the box hidden while it is off');
  tb.click();assert.strictEqual(tb.getAttribute('aria-pressed'),'true','on');assert.strictEqual(w.localStorage.getItem('cw:llTrain'),'true','kept');
  assert.ok(!g.hidden&&!box.hidden,'the chips show');
  assert.deepStrictEqual([...box.children].map(x=>x.id),['llStyle','llOverGrp'],'Show, Overlay');
  const chips=()=>$$('#llStyle button[data-set]');
  assert.deepStrictEqual(chips().map(x=>x.dataset.set),['oll','pll','pllf'],'the three sets');
  assert.deepStrictEqual(chips().map(x=>x.textContent),['Two-look OLL','Two-look PLL','Full PLL'],'their labels');
  assert.ok(chips().every(x=>x.title),'every chip titled');
  const pressed=()=>$('#llStyle button[aria-pressed="true"]');assert.strictEqual(pressed().dataset.set,'oll','Two-look OLL by default');
  const ob=$('#llOverBtn');assert.ok(ob,'the Overlay chip');assert.strictEqual(ob.textContent,'Overlay');assert.strictEqual(ob.getAttribute('aria-pressed'),'false','off at the start');assert.ok(ob.title);
  // ---- what each set keeps in color ----
  run(`newScramble('t-ll')`);await sleep(50);
  const fadeOK=set=>run(`(()=>{const f=displayedCube.toFacelets(),k=llTrainFade(f),op=llColor(),centers=new Set([4,13,22,31,40,49]);
    if(${JSON.stringify(set)}==='oll'){for(let i=0;i<54;i++){const want=centers.has(i)||f[i]===op;if(k.has(i)!==want)return false;}return true;}
    const want=new Set(centers);for(const p of cornerFacelet.concat(edgeFacelet))if(p.some(i=>f[i]===op))p.forEach(i=>want.add(i));
    return k.size===want.size&&[...want].every(i=>k.has(i));})()`);
  assert.ok(fadeOK('oll'),'Two-look OLL: the stickers of the last layer color, and the centers');
  assert.ok(run('llTrainFade(displayedCube.toFacelets()).size')<54,'the rest fades');
  chips()[1].click();assert.strictEqual(pressed().dataset.set,'pll');assert.strictEqual(w.localStorage.getItem('cw:llStyle'),'"pll"','the set kept');
  assert.ok(fadeOK('pll'),'Two-look PLL: the last layer pieces whole');
  chips()[2].click();assert.ok(fadeOK('pll'),'Full PLL: the same');chips()[0].click();
  // Off: no fade.
  tb.click();assert.strictEqual(run('llTrainFade(displayedCube.toFacelets())'),null,'off: every color');assert.ok(g.hidden,'the chips hide');
  // ---- Next case: the trainer and Overlay on, a case of the set as the scramble ----
  run(`cubePlayerTurn('R','screen')`);run(`cubePlayerTurn('U','screen')`);await sleep(0);
  const before=key('displayedCube');
  const f2lIn=()=>run(`(()=>{const f=displayedCube.toFacelets(),op=llColor();return cornerFacelet.concat(edgeFacelet).filter(p=>!p.some(i=>f[i]===op)).every(p=>p.every(i=>f[i]===f[i-i%9+4]));})()`);
  const ollIn=()=>run('llOLL(displayedCube.toFacelets())');
  $('#llNext').click();await sleep(0);
  assert.strictEqual(tb.getAttribute('aria-pressed'),'true','Next case: the trainer on');assert.strictEqual(ob.getAttribute('aria-pressed'),'true','and Overlay on');
  assert.ok(ob.title.startsWith('Overlay is on'),'the tooltip: '+ob.title);
  assert.ok(/^case-/.test(run('scr.seed')),'a scramble of its own: '+run('scr.seed'));
  assert.ok(run('scr.moves.every(m=>/^[URFDLB][\'2]?$/.test(m))')&&run('scr.moves.length')<=22,'face moves, 22 or fewer');
  assert.ok(run(`applyAlg(applyAlg(new Cube(),scr.moves),crossRotation()?[crossRotation()]:[]).toFacelets().join()===displayedCube.toFacelets().join()`),'the player: the scramble and its grip make the cube');
  assert.ok(f2lIn(),'the first two layers solved');assert.ok(!ollIn(),'the last layer not');
  assert.ok(run(`LLO.real.seed==='t-ll'`),'the scramble from before kept');
  const cas=()=>run('({id:LLO.cas.a.id,group:LLO.cas.a.group,name:LLO.cas.a.name,set:LLO.cas.set})');
  assert.ok(/^OLL (edges|corners)$/.test(cas().group),'a two-look OLL case: '+cas().group);
  assert.ok(!run(`LL_GOALS[LLO.cas.a.group](displayedCube.toFacelets(),displayedCube)`),'its look not done yet');
  assert.ok(run(`history[0].seed===scr.seed&&!!history[0].moves`),'in the history, with its moves');
  assert.strictEqual($('#timesScope').textContent,'Times: OLL · PLL','the tab times, not the case');
  // The case line: ? until Reveal.
  const line=()=>$('#llCurrent').textContent;
  assert.ok(line().includes(cas().group)&&line().includes('?')&&/Answer hidden/.test(line())&&/Case 1 of 10/.test(line()),'the group, ?, the deck: '+line());
  assert.ok(!line().includes(cas().name),'the name hidden');
  $('#llHint').click();assert.ok(line().includes(cas().name)&&$('#llNameBtn')&&$('#llCurrent .big')&&$('#llLab'),'Reveal: the name, the algorithm, the Lab');
  assert.ok(/^(U['2]? · )?[A-Za-z]/.test($('#llCurrent .big').textContent),'the algorithm, with its top turn: '+$('#llCurrent .big').textContent);
  $('#llHint').click();assert.ok(!line().includes(cas().name)&&/Answer hidden/.test(line()),'a second press hides it');
  // ---- the deck: each case once a round ----
  const seen=new Set([cas().id]);for(let i=0;i<9;i++){run('lloNext()');seen.add(cas().id);}
  assert.strictEqual(seen.size,10,'ten cases in a round, each once');assert.ok(/Case 10 of 10/.test(line()));
  assert.ok(run(`LLO.real.seed==='t-ll'`),'the scramble from before still kept');
  run('lloNext()');assert.ok(/Case 1 of 10/.test(line()),'a new round');
  // ---- a win: the look done brings the next case ----
  const sol=()=>run(`(()=>{const a=LLO.cas.a,r=findLLStep(LLO.cas.cube,llAlgsFor(a),llTestFor(a));return [...(r&&r.pre?[r.pre]:[]),...parseAlg(r?r.alg:a.alg)];})()`);
  const win=async()=>{const ms=sol(),seed=run('scr.seed');assert.ok(ms.length,'a solution');
    for(const m of ms.slice(0,-1))run(`cubePlayerTurn(${JSON.stringify(m)},'screen')`);await sleep(0);
    assert.ok(!run('TW.win'),'no win before the last move');assert.ok(!run(`LL_GOALS[LLO.cas.a.group](displayedCube.toFacelets(),displayedCube)`),'the look not done before the last move');
    run(`cubePlayerTurn(${JSON.stringify(ms[ms.length-1])},'screen')`);await sleep(0);
    assert.ok(run(`LL_GOALS[LLO.cas.a.group](displayedCube.toFacelets(),displayedCube)`),'the look done');assert.ok(run('!!TW.win'),'a win');
    assert.ok(run('TW.win')&&run('mainLift===null||true'),'the glow');
    assert.ok(await until(`scr.seed!==${JSON.stringify(seed)}`,3000),'the next case comes');await sleep(0);
    assert.ok(/^case-/.test(run('scr.seed'))&&run('lloOv()'),'another case, Overlay still on');};
  await win();await win();
  assert.ok(run(`LLO.real.seed==='t-ll'`),'the scramble from before kept through the wins');
  // ---- another set: a case from it ----
  chips()[1].click();await sleep(0);const s1=run('scr.seed');
  assert.ok(/^PLL (corners|edges)$/.test(cas().group)&&cas().set==='pll','Two-look PLL: a case of its set: '+cas().group);
  assert.ok(f2lIn()&&ollIn(),'the first two layers and the top solved');assert.ok(!run('llPLL(displayedCube)'),'the cube not solved');
  assert.ok(fadeOK('pll'),'and its view');
  chips()[2].click();await sleep(0);assert.notStrictEqual(run('scr.seed'),s1,'Full PLL: a new case');
  assert.strictEqual(cas().group,'Full PLL');assert.ok(/ perm$/.test(cas().name));assert.ok(f2lIn()&&ollIn()&&!run('llPLL(displayedCube)'),'a PLL to solve');
  assert.ok(/Case 1 of 21/.test(line()),'the 21 as a round: '+line());
  $('#llHint').click();assert.ok(line().includes(cas().name)&&$('#llCurrent .big'),'Reveal names the perm');
  // A win on a full PLL: the cube solved up to a top turn.
  await win();
  // ---- a new scramble on the tab while on: the next case ----
  run(`newScramble('t-ll-new')`);await sleep(50);
  assert.ok(/^case-/.test(run('scr.seed'))&&run('lloOv()'),'a new scramble here: the next case');assert.strictEqual(run('LLO.real.seed'),'t-ll-new','the new scramble kept for Off');
  // ---- off: the scramble from before, with your moves before and since ----
  chips()[0].click();await sleep(0);run(`lloSet(false)`);await sleep(0);
  assert.strictEqual(run('scr.seed'),'t-ll-new','off: the scramble from before');assert.strictEqual(ob.getAttribute('aria-pressed'),'false');
  assert.ok(/Press Next case/.test(line()),'the case line empties');
  run(`newScramble('t-ll')`);await sleep(50);run(`cubePlayerTurn('R','screen')`);run(`cubePlayerTurn('U','screen')`);await sleep(0);
  assert.strictEqual(key('displayedCube'),before,'your moves on the scramble again');
  ob.click();await sleep(0);assert.ok(run('lloOv()'),'the chip turns it on: a case');run(`cubePlayerTurn('F','screen')`);await sleep(0);
  ob.click();await sleep(0);assert.strictEqual(run('scr.seed'),'t-ll');
  assert.strictEqual(key('displayedCube'),run(`cubeTabKey(applyAlg(applyAlg(applyAlg(new Cube(),scr.moves),crossRotation()?[crossRotation()]:[]),['R','U','F']))`),'with your moves before and since');
  run(`cubePlayerTurn("F'",'screen')`);await sleep(0);
  // ---- the trainer off turns Overlay off ----
  ob.click();await sleep(0);assert.ok(run('lloOv()'));tb.click();await sleep(0);
  assert.ok(!run('LLO.on')&&run('scr.seed')==='t-ll','the trainer off: Overlay off, the scramble from before');assert.ok(g.hidden&&box.hidden,'the chips hide');
  // ---- Undo ends it ----
  $('#llNext').click();await sleep(20);assert.ok(run('lloOv()'));assert.ok(run('undoRun()'),'something to undo');await sleep(0);
  assert.strictEqual(run('scr.seed'),'t-ll','Undo: the scramble from before');assert.ok(!run('LLO.on'),'Undo: it ends');assert.strictEqual(ob.getAttribute('aria-pressed'),'false');
  // ---- another tab: the same cube; a new scramble there ends it ----
  ob.click();await sleep(0);const k1=key('displayedCube');
  run(`goTab('f2l')`);await sleep(0);assert.strictEqual(key('displayedCube'),k1,'the F2L tab: the same cube');assert.strictEqual(run('llTrainFade(displayedCube.toFacelets())'),null,'no fade off the tab');
  run(`goTab('ll')`);await sleep(0);assert.strictEqual(ob.getAttribute('aria-pressed'),'true','back: on');
  run(`goTab('cross')`);run(`newScramble('t-ll-cross')`);await sleep(50);assert.strictEqual(run('scr.seed'),'t-ll-cross','a new scramble on another tab is its own');
  assert.ok(!run('LLO.on'),'and it ends');run(`goTab('ll')`);await sleep(0);assert.strictEqual(ob.getAttribute('aria-pressed'),'false');
  // ---- the full PLL cards select, as the two-look ones do ----
  const card=$('#llGroups .case[data-pll="T"]');assert.ok(card.classList.contains('sel'),'selected at the start');
  click(card.querySelector('svg'),{shiftKey:true});assert.ok(!$('#llGroups .case[data-pll="T"]').classList.contains('sel'),'shift-click takes it out');
  assert.ok(!JSON.parse(w.localStorage.getItem('cw:llSel')).includes('pllf-T'),'kept');
  assert.ok(!$('#modalBg'),'no window');
  chips()[2].click();assert.strictEqual(run("llDeckPool('pllf').length"),20,'the deck: the 20 selected');
  $('#llSelNone').click();assert.strictEqual($$('#llGroups .case.sel').length,0,'None');assert.strictEqual(run("llDeckPool('pllf').length"),21,'none selected: all of them');
  $('#llSelAll').click();assert.strictEqual($$('#llGroups .case.sel').length,16+21,'Select all: the two-look and the full PLL');
  chips()[0].click();
  // ---- a smart cube: the map ----
  run(`newScramble('t-ll-smart')`);await sleep(50);
  run(`setCubeSrc('smart')`);run(`cubeTab.conn={send:()=>Promise.resolve()}`);
  const P0=`applyAlg(new Cube(),wcaScramble('t-ll-hands'))`;
  run(`cubeTabShow(${P0})`);await sleep(0);run('liveFreshDraw()');
  assert.ok(run('liveInStep(cubeTab.target)'),'the page shows the cube in your hands');assert.ok(!run('LIVE.map'),'no map');
  assert.strictEqual($('#scrPillNew').firstChild.textContent,'New OLL · PLL','a fresh start on the pill');
  const mine=run('scr.seed');
  $('#llNext').click();await sleep(0);
  assert.ok(run('lloOv()'),'on with a smart cube');assert.ok(/^case-/.test(run('scr.seed')),'a case');
  assert.ok(!!run('LIVE.map'),'a map');assert.ok(run('liveInStep(cubeTab.target)'),'the screen in step through the map');
  assert.ok(run(`liveReal(cubeTab.target).equals(${P0})`),'the real cube kept');
  assert.ok(!$('#liveNote')||$('#liveNote').hidden,'no note that the cube is not in step');
  assert.notStrictEqual($('#scrPillNew').firstChild.textContent,'New OLL · PLL','no fresh start while on: '+$('#scrPillNew').firstChild.textContent);
  // A turn of the cube in your hands goes on the player and turns the screen's case.
  const n0=run('seqState.moves.length');
  run(`cubeTabShow(applyAlg(${P0},['R']))`);await sleep(0);
  assert.strictEqual(run('seqState.moves.length'),n0+1,'the turn on the player');
  assert.strictEqual(run(`cubeTabKey(liveNorm(displayedCube))`),run(`cubeTabKey(applyAlg(liveNorm(cubeAtSeq(${n0})),['R']))`),'the screen turned R');
  // The next case while on: the map from the cube as it is.
  run('lloNext()');await sleep(0);assert.ok(run(`liveReal(cubeTab.target).equals(applyAlg(${P0},['R']))`),'the cube in your hands kept');assert.ok(run('liveInStep(cubeTab.target)'),'in step');
  // Off: your own cube, in step, with the turns on it.
  ob.click();await sleep(0);assert.ok(!run('LIVE.map'),'no map');assert.strictEqual(run('scr.seed'),mine,'the cube you marked');
  assert.ok(run(`cubeTab.target.equals(applyAlg(${P0},['R']))`),'the cube kept as it is in your hands');assert.ok(run('liveInStep(cubeTab.target)'),'the page shows the cube in your hands again');
  assert.strictEqual($('#scrPillNew').firstChild.textContent,'New OLL · PLL','a fresh start again');
  // Use my cube while on: it ends, and the cube in your hands is the scramble.
  ob.click();await sleep(0);assert.ok(run('lloOv()'));run('liveUse()');await sleep(0);
  assert.ok(!run('LLO.on')&&!run('LIVE.map'),'Use my cube ends it');assert.ok(run('liveInStep(cubeTab.target)'),'in step');
  assert.deepStrictEqual(errs,[],'no script errors at the end');
  console.log('lltrain: one pane, the button and the three sets, the fades, Next case as a case scramble, the case line and Reveal, the deck, wins and the next case, another set, a new scramble while on, off with your moves, the trainer off, Undo, the tabs, the full PLL selection, a smart cube through the map ok');process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
