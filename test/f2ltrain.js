// The pair F2L Trainer's F2L-1 lights (js/f2ltrain.js) on the F2L tab: a second row of chips shows
// while F2L-1 is pressed and hides with F2L-2, F2L-3 and the trainer off; Guide (the default) is
// the guide's pair as before; a pair named by its colors lights the cross and that pair; Shortest,
// Fastest and Two at once light the pairs they pick, the pressed chip shows their colors and its
// tooltip says why; a new cross color gives its own four pairs; the choice is kept in cw:f2lPair.
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
  // A scramble that keeps the white cross solved (white is up at home): the F2L tab shows the cube
  // as it is, so the picks have a cross to keep.
  run(`loadScramble('t-f2lt',parseAlg("R D R' L' D' L B D2 B' F' D F D2"),true)`);
  await until('fgActive()&&!!fg.step');
  // The row: after the style chips, not one of them, shown with F2L-1.
  const r=$('#f2lPairRow');assert.ok(r,'the row');assert.ok(!r.hidden,'shown with F2L-1');assert.strictEqual(r.getAttribute('role'),'group');
  assert.ok(!$('#f2lStyle').contains(r),'not in the style chips');
  assert.strictEqual($$('#f2lStyle button').map(x=>x.textContent).join(),'F2L-1,F2L-2,F2L-3','the three style chips as they were');
  const chips=()=>$$('#f2lPairRow button[data-pair]');
  assert.strictEqual(chips().map(x=>x.dataset.pair).join(),'guide,shortest,fastest,two,'+run('f2ltPairs(0).join()'),'the four ways, then the four white cross pairs');
  assert.ok(chips().every(x=>x.title),'every chip titled');assert.ok(chips().slice(4).every(x=>/^The \w+ and \w+ pair$/.test(x.getAttribute('aria-label'))),'each pair named');
  const pressed=()=>$('#f2lPairRow button[aria-pressed="true"]');
  assert.strictEqual(pressed().dataset.pair,'guide','Guide by default');
  // Guide: the guide's pair, as before.
  assert.ok(run(`(()=>{const f=displayedCube.toFacelets(),p=f2lTrainPairs(f);return p.length===1&&p[0].join()===f2lTrainPair(f).join();})()`),"the guide's pair");
  // The pieces lit in F2L-1: the centers, the cross edges, and the corner and edge of each pair named.
  const lit=keys=>run(`(()=>{const f=displayedCube.toFacelets(),k=f2lTrainFade(f),ci=crossColorIndex(),want=new Set([4,13,22,31,40,49]);
    for(const e of edgeFacelet)if(e.some(i=>f[i]===ci))e.forEach(i=>want.add(i));for(const x of ${JSON.stringify(keys)})f2ltPieces(f,ci,x).forEach(i=>want.add(i));
    return k.size===want.size&&[...want].every(i=>k.has(i));})()`);
  // One pair, by its colors.
  const k=run('f2ltPairs(0)[2]');$(`#f2lPairRow [data-pair="${k}"]`).click();
  assert.strictEqual(w.localStorage.getItem('cw:f2lPair'),JSON.stringify(k),'kept');assert.strictEqual(pressed().dataset.pair,k,'pressed');
  assert.ok(lit([k]),'the cross and the pair named');
  // The box (1.78): Show, Overlay, Pair; the kind of pick not in use is idle; Lit reads the cube.
  assert.ok($('#f2lTrainer')&&!$('#f2lTrainer').hidden,'the box shows');
  assert.deepStrictEqual([...$('#f2lTrainer').children].map(x=>x.id),['f2lStyle','f2lOverGrp','f2lPairRow'],'Show, Overlay, Pair');
  assert.deepStrictEqual($$('#f2lTrainer .f2lt-lab').map(x=>x.textContent),['Show','Pair','Lit'],'the labels');
  assert.ok($('#f2lPairRow .f2lt-ways').hasAttribute('data-idle')&&!$('#f2lPairRow .f2lt-pairs').hasAttribute('data-idle'),'a pair named: the ways idle');
  await sleep(10);assert.deepStrictEqual($$('#f2lLit .f2lt-sw').map(x=>x.dataset.k),[k],'Lit: the pair named');
  // Shortest: the pair it picks; the chip shows its colors, the tooltip how far.
  $('#f2lPairRow [data-pair="shortest"]').click();
  assert.ok(await until(`!!f2ltCurrent()`),'a pick comes');const p=run('f2ltCurrent()');
  assert.strictEqual(p.keys.length,1,'one pair');assert.ok(lit(p.keys),'the cross and the pair picked');
  await sleep(10);assert.strictEqual(JSON.stringify($$('#f2lLit .f2lt-sw').map(x=>x.dataset.k)),JSON.stringify(p.keys),'Lit: its colors');
  assert.ok(/^\d+ moves?$/.test($('#f2lLit .f2lt-word').textContent),'Lit: how far: '+$('#f2lLit .f2lt-word').textContent);
  assert.ok(!$('#f2lPairRow .f2lt-ways').hasAttribute('data-idle')&&$('#f2lPairRow .f2lt-pairs').hasAttribute('data-idle'),'a way: the pairs idle');
  assert.ok(/Lit: the \w+ and \w+ pair\. It takes \d+ moves?\.$/.test(pressed().title),'the tooltip says which and how far: '+pressed().title);
  // Two at once: two pairs lit.
  $('#f2lPairRow [data-pair="two"]').click();
  assert.ok(await until(`!!f2ltCurrent()&&f2ltCurrent().how==='two'`),'a pick of two comes');const q=run('f2ltCurrent()');
  assert.strictEqual(q.keys.length,2,'two pairs');assert.ok(lit(q.keys),'the cross and both pairs');
  await sleep(10);assert.strictEqual($$('#f2lLit .f2lt-sw').length,2,'Lit: both');
  assert.strictEqual($$('#f2lPairRow button .f2lt-sw').filter(x=>!x.closest('.f2lt-pair')).length,0,'no colors on the ways');
  // Fastest picks one.
  $('#f2lPairRow [data-pair="fastest"]').click();
  assert.ok(await until(`!!f2ltCurrent()&&f2ltCurrent().how==='fastest'`),'a fastest pick comes');assert.ok(lit(run('f2ltCurrent()').keys));
  // F2L-2 and F2L-3 put the row off (dimmed, shown); F2L-1 engages it again; off hides it. A pick
  // with the row off turns F2L-1 on.
  $$('#f2lStyle button')[1].click();await sleep(0);assert.ok(!r.hidden&&r.hasAttribute('data-off'),'off with F2L-2');
  $$('#f2lStyle button')[2].click();await sleep(0);assert.ok(!r.hidden&&r.hasAttribute('data-off'),'off with F2L-3');
  assert.ok(/Turns F2L-1 on/.test(chips()[0].title),'its chips say so');
  $$('#f2lStyle button')[0].click();await sleep(0);assert.ok(!r.hidden&&!r.hasAttribute('data-off'),'engaged with F2L-1');
  $$('#f2lStyle button')[1].click();await sleep(0);$('#f2lPairRow [data-pair="shortest"]').click();await sleep(0);
  assert.strictEqual(run('f2lTrainStyle()'),1,'a pick turns F2L-1 on');assert.ok(!r.hasAttribute('data-off'));
  $('#f2lTrainBtn').click();await sleep(0);assert.ok(r.hidden&&$('#f2lTrainer').hidden,'hidden when F2L Trainer is off');
  $('#f2lTrainBtn').click();await sleep(0);
  // Another cross color: its own four pairs; a pair that color has no slot for reads as Guide.
  $(`#f2lPairRow [data-pair="${k}"]`).click();
  const cc=$('#crossColor');cc.value='green';cc.dispatchEvent(new w.Event('change'));await sleep(0);
  assert.strictEqual(chips().slice(4).map(x=>x.dataset.pair).join(),run('f2ltPairs(2).join()'),'the green cross pairs');
  assert.ok(!run('f2ltPairs(2)').includes(k)&&pressed().dataset.pair==='guide','the white pair reads as Guide');
  cc.value='white';cc.dispatchEvent(new w.Event('change'));await sleep(0);assert.strictEqual(pressed().dataset.pair,k,'back to white: the pair again');
  assert.deepStrictEqual(errs,[],'no script errors at the end');
  console.log('f2ltrain: the row with F2L-1, Guide, one pair, Shortest, Fastest, Two at once, the colors, the cross color ok');process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
