// The Cross drill (js/crossdrill.js, js/crosstrain.js): a drill seed gives a scramble whose best
// cross is exactly that long, in each cross color; the same seed gives the same scramble; the Length
// menu loads one; Find the edges times the four cross edges picked on the cube; Cross Trainer grays
// all but the cross edges and the centers, and only on the Cross tab; F2L Trainer does the same for
// the eight F2L pieces on the F2L tab, at the same level.
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
  const {w,d,errs}=await boot({'cw:method':'"cfop"','cw:cubeSrc':'"screen"'});
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
  const run=s=>w.Function('return ('+s+')')();
  assert.deepStrictEqual(errs,[],'no script errors');
  // Exact lengths, in every color, and the moves make the state.
  for(const color of ['white','yellow','green','red']){
    $('#crossColor').value=color;
    for(const n of [2,4,6,8]){
      const seed=run(`crossDrillSeed(${n},${JSON.stringify(color)},'test-${color}-${n}')`);
      assert.ok(seed.startsWith('x'+n+color[0]+'-'),'the seed names the length and the color');
      const len=run(`(()=>{const o=wcaFor(${JSON.stringify(seed)});const a=applyAlg(new Cube(),o.moves).toFacelets().join(),b=o.state.toFacelets().join();if(a!==b)return -1;return buildCrossTable()[crossIndex(toFrame(o.state))];})()`);
      assert.strictEqual(len,n,`a ${n}-move ${color} cross (${seed})`);}}
  $('#crossColor').value='white';
  assert.strictEqual(run(`wcaScramble('x5w-same-seed-10').join(' ')`),run(`(WCA.cache.clear(),wcaScramble('x5w-same-seed-10').join(' '))`),'the same seed, the same scramble');
  assert.strictEqual(run(`crossDrillState('amber-otter-42',Math.random)`),null,'a plain seed is no drill seed');
  // The Length menu loads a drill scramble of that length.
  const sel=$('#crossDiff');assert.ok([...sel.options].some(o=>o.value==='3'),'exact lengths in the menu');
  sel.value='3';sel.dispatchEvent(new w.Event('change',{bubbles:true}));
  $('#crossNew').click();await sleep(80);
  assert.ok(/^x3w-/.test(w.scr.seed),'New cross scramble with Length 3: '+w.scr.seed);
  assert.strictEqual($('#crossOpt').textContent,'3','the optimal cross is 3');
  assert.strictEqual(w.localStorage.getItem('cw:crossDiff'),'"3"','the length is kept');
  // Cross Trainer: on the Cross tab only; all but the cross edges and the centers gray.
  const ct=$('#crossTrainBtn');assert.ok(ct,'the Cross Trainer button');
  ct.click();assert.strictEqual(ct.getAttribute('aria-pressed'),'true','on');
  const fade=run(`crossTrainFade(displayedCube.toFacelets())`);assert.ok(fade,'a fade on the Cross tab');
  assert.strictEqual(fade.size,6+8,'the six centers and the four cross edges keep their colors');
  const f=run(`displayedCube.toFacelets()`);assert.ok([...fade].every(i=>i%9===4||f[i]===0||run(`edgeFacelet.some(e=>e.includes(${i})&&e.some(j=>displayedCube.toFacelets()[j]===0))`)),'only centers and white edges');
  assert.ok($$('#cube [opacity]').length>0,'the picture grays the rest');
  $('#rail button[data-tab="f2l"]').click();await sleep(20);
  assert.strictEqual(run(`crossTrainFade(displayedCube.toFacelets())`),null,'no fade on another tab');
  $('#rail button[data-tab="cross"]').click();await sleep(20);
  // The level of the other pieces: 22% over black by default; Settings > Cross Trainer moves it, 0% is black.
  const blacks=()=>$$('#cube polygon[fill="#000"]').length,dimmed=v=>$$('#cube polygon[opacity="'+v+'"]').length;
  assert.ok(blacks()>0&&dimmed(0.22)>0,'22% over black by default');
  $('#settingsBtn').click();const sl=$('#setCrossDim');assert.ok(sl,'the slider in Settings');
  assert.strictEqual(+sl.max,40,'up to 40%');assert.strictEqual(sl.value,'22');assert.ok(sl.closest('label').title,'the slider has a title');
  sl.value='0';sl.dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.strictEqual($('#setCrossDimOut').textContent,'0%');
  assert.ok(blacks()>0&&dimmed(0.22)===0,'the cube shows 0% at once: black');
  $('#setCancel').click();assert.ok(dimmed(0.22)>0,'Cancel puts 22% back');assert.strictEqual(w.localStorage.getItem('cw:crossDim'),'22');
  $('#settingsBtn').click();$('#setCrossDim').value='35';$('#setCrossDim').dispatchEvent(new w.Event('input',{bubbles:true}));$('#setSave').click();
  assert.strictEqual(w.localStorage.getItem('cw:crossDim'),'35','Save keeps it');assert.ok(dimmed(0.35)>0,'the cube at 35%');
  w.localStorage.setItem('cw:crossDim','0');run('drawMain()');
  assert.strictEqual($$('#cube polygon[opacity="0"]').length,0,'at 0% the other stickers are not drawn: black shows');
  run(`(view.mode='net',drawMain())`);assert.strictEqual($$('#cube rect[fill="#000"]').length,54-14,'the net: 40 stickers black');
  assert.strictEqual($$('#cube rect').length,54,'the net: no color drawn over a black one');run(`(view.mode='3d',drawMain())`);w.localStorage.setItem('cw:crossDim','22');
  ct.click();assert.strictEqual(w.localStorage.getItem('cw:crossTrain'),'false','off, and kept');
  // F2L Trainer: on the F2L tab only; the eight F2L pieces and the centers keep their colors, the rest at the same level.
  const ft=$('#f2lTrainBtn');assert.ok(ft,'the F2L Trainer button');
  assert.strictEqual(run(`f2lTrainFade(displayedCube.toFacelets())`),null,'off: no fade');
  ft.click();assert.strictEqual(ft.getAttribute('aria-pressed'),'true','on');assert.strictEqual(w.localStorage.getItem('cw:f2lTrain'),'true','kept');
  assert.strictEqual(run(`trainFade(displayedCube.toFacelets())`),null,'no F2L fade on the Cross tab');
  $('#rail button[data-tab="f2l"]').click();await sleep(20);
  const ff=run(`f2lTrainFade(displayedCube.toFacelets())`);assert.ok(ff,'a fade on the F2L tab');
  assert.strictEqual(ff.size,6+4*3+4*2,'the centers, four corners and four edges');
  assert.ok(run(`(()=>{const f=displayedCube.toFacelets(),k=f2lTrainFade(f);
    const pieces=[...cornerFacelet,...edgeFacelet].filter(p=>p.some(i=>k.has(i)));
    return pieces.length===8&&pieces.every(p=>p.every(i=>k.has(i)))&&cornerFacelet.filter(c=>c.some(i=>k.has(i))).every(c=>c.some(i=>f[i]===0))
      &&edgeFacelet.filter(e=>e.some(i=>k.has(i))).every(e=>e.every(i=>f[i]!==0&&f[i]!==3));})()`),'white corners and the edges with no white or yellow, whole');
  assert.ok($$('#cube polygon[opacity="0.22"]').length>0,'the picture grays the rest at the Cross Trainer level');
  ft.click();assert.strictEqual(run(`trainFade(displayedCube.toFacelets())`),null,'off again');
  $('#rail button[data-tab="cross"]').click();await sleep(20);
  // Find the edges: a pick of each white edge; a miss counts.
  $('#crossFindBtn').click();assert.ok(run('CF.on'),'Find starts');
  assert.ok(/0 of 4/.test($('#crossFindOut').textContent),'the count');
  const g=run(`displayedCube.toFacelets()`);
  const whites=run(`edgeFacelet.filter(e=>e.some(j=>displayedCube.toFacelets()[j]===0)).map(e=>e[0])`);
  const other=run(`edgeFacelet.find(e=>e.every(j=>displayedCube.toFacelets()[j]!==0))[0]`);
  run(`crossFindPick(${other})`);assert.ok(/1 miss/.test($('#crossFindOut').textContent),'a miss');
  run(`crossFindPick(${whites[0]})`);run(`crossFindPick(${whites[0]})`);assert.ok(/1 of 4/.test($('#crossFindOut').textContent),'one found, once');
  assert.ok(run('mainLift&&mainLift.set.size===2'),'a found edge lifts out');
  whites.slice(1).forEach(i=>run(`crossFindPick(${i})`));
  assert.ok(!run('CF.on'),'four found: done');assert.ok(/Found in/.test($('#crossFindOut').textContent),'the time');
  const log=JSON.parse(w.localStorage.getItem('cw:crossFinds'));assert.strictEqual(log.length,1);assert.strictEqual(log[0].miss,1);assert.strictEqual(log[0].n,3);
  // A turn of the cube stops a find.
  $('#crossFindBtn').click();run(`cubePlayerTurn('R','screen')`);assert.ok(!run('CF.on'),'a turn stops it');
  assert.deepStrictEqual(errs,[],'no script errors');w.close();
  console.log('crossdrill: exact lengths in each color, the same seed, the Length menu, Cross Trainer, Find the edges ok');
}catch(e){console.error(e);process.exit(1);}})();
