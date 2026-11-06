// F2L Trainer's Overlay (js/f2ltrain.js) on the F2L tab: the chip shows while F2L Trainer is on and
// is off at the start; on, the cube draws with the cross in place, the F2L pieces where the real cube
// has them and the last layer gray; a move turns the drawn cube as it turns the real one, so the
// cross goes out of place and back; a pair whose edge is in a cross place is gray, never lit, and
// named in the tooltip; the picks read the drawn cube; a new scramble puts the cross in again; off,
// or F2L Trainer off, the real cube draws again.
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
  // A scramble with an F2L edge in a cross place, so one pair can not show.
  const seed=run(`(()=>{for(let i=0;i<200;i++){const s='t-ov-'+i,c=applyAlg(new Cube(),wcaScramble(s));
    const o=f2ltOverlay(c,crossColorIndex());if(o.skip.length===1&&buildCrossTable()[crossIndex(f2ltFrame(c,crossColorIndex()).X)]>3)return s;}})()`);
  assert.ok(seed,'a scramble with one F2L edge in the cross');
  run(`newScramble(${JSON.stringify(seed)})`);await sleep(50);
  const g=$('#f2lOverGrp'),b=$('#f2lOverBtn');
  assert.ok(g&&b,'the chip');assert.ok(!g.hidden,'shown while F2L Trainer is on');assert.ok(!$('#f2lStyle').contains(b),'not one of the style chips');
  assert.strictEqual($$('#f2lStyle button').length,3,'the three style chips as they were');
  assert.strictEqual(b.textContent,'Overlay');assert.strictEqual(b.getAttribute('aria-pressed'),'false','off at the start');assert.ok(b.title,'titled');
  const real=()=>run('displayedCube.toFacelets().join()'),drawn=()=>run('trainLook(displayedCube).join()');
  assert.strictEqual(drawn(),real(),'off: the real cube draws');
  // The drawn cross: each sticker of a cross edge the color of its face's center.
  const crossIn=()=>run(`(()=>{const f=trainLook(displayedCube),ci=crossColorIndex();return edgeFacelet.filter(e=>e.some(i=>f[i]===ci)).every(e=>e.every(i=>f[i]===f[i-i%9+4]));})()`);
  assert.ok(!crossIn(),'the real cross is not solved');
  b.click();await sleep(0);
  assert.strictEqual(b.getAttribute('aria-pressed'),'true','on');assert.ok(crossIn(),'on: the cross in place');
  assert.ok(run(`(()=>{const f=trainLook(displayedCube),a=displayedCube.toFacelets(),ci=crossColorIndex();
    return cornerFacelet.filter(c=>c.some(i=>a[i]===ci)).every(c=>c.every(i=>f[i]===a[i]));})()`),'the F2L corners where the real cube has them');
  assert.ok(run(`(()=>{const f=trainLook(displayedCube),op=(crossColorIndex()+3)%6;return !f.includes(op)||f.indexOf(op)%9===4&&f.filter(x=>x===op).length===1;})()`),'the last layer gray');
  const sk=run('F2O.ov.skip');assert.strictEqual(sk.length,1,'one pair can not show');
  assert.ok(b.title.includes(`The ${run(`f2ltPairName(${JSON.stringify(sk[0])})`)} edge is in a cross place`),'the tooltip names it: '+b.title);
  // That pair is never lit, on any pick; its edge is gray and its corner dim.
  const lit=()=>run(`[...f2lTrainFade(trainLook(displayedCube))]`);
  const corner=run(`(()=>{const [a,b]=f2ltKeyColors(${JSON.stringify(sk[0])}),f=displayedCube.toFacelets(),ci=crossColorIndex();return cornerFacelet.find(c=>[ci,a,b].every(x=>c.some(i=>f[i]===x)));})()`);
  $(`#f2lPairRow [data-pair="${sk[0]}"]`).click();await sleep(0);
  assert.ok(corner.every(i=>!lit().includes(i)),'the pair named, but it can not show: not lit');
  $('#f2lPairRow [data-pair="shortest"]').click();
  assert.ok(await until(`!!f2ltCurrent()&&f2ltCurrent().keys.length===1`),'a pick on the drawn cube');
  assert.ok(!run('f2ltCurrent().keys').includes(sk[0]),'the pick skips it');assert.ok(corner.every(i=>!lit().includes(i)));
  $('#f2lPairRow [data-pair="guide"]').click();await sleep(0);
  assert.ok(run(`(()=>{const p=f2lTrainPairs(trainLook(displayedCube));return p.length===1&&f2ltKey(...p[0])!==${JSON.stringify(sk[0])};})()`),"the guide's pair is one it can show");
  // A move turns the drawn cube as the real one: a turn of the cross face's side takes the cross apart; its undo puts it back.
  const before=drawn(),side=run(`'URFDLB'[[1,2,4,5,0,3].find(i=>displayedCube.center[i]!==crossColorIndex()&&displayedCube.center[i]!==(crossColorIndex()+3)%6)]`);
  run(`cubePlayerTurn(${JSON.stringify(side)},'screen')`);await sleep(0);
  assert.ok(!crossIn(),'a move takes the drawn cross out of place');
  assert.strictEqual(drawn(),run(`f2ltGray(applyAlg(F2O.ov.T.mul(applyAlg(displayedCube,[${JSON.stringify(side+"'")}])),[${JSON.stringify(side)}]).toFacelets(),F2O.ov).join()`),'as the move turns it');
  run(`cubePlayerTurn(${JSON.stringify(side+"'")},'screen')`);await sleep(0);
  assert.ok(crossIn(),'its undo puts it back');assert.strictEqual(drawn(),before,'the same picture');
  // The picture on the page draws the gray.
  assert.ok($('#cube').innerHTML.includes('--sticker-X'),'gray on the cube');
  // Off: the real cube again.
  b.click();await sleep(0);assert.strictEqual(b.getAttribute('aria-pressed'),'false');assert.strictEqual(drawn(),real(),'off: the real cube draws');
  // A new scramble puts the cross in again.
  b.click();await sleep(0);run(`newScramble('t-ov-next')`);await sleep(50);
  assert.ok(crossIn(),'a new scramble: the cross in place again');assert.strictEqual(b.getAttribute('aria-pressed'),'true');
  // Another tab: the real cube; back: the overlay again.
  run(`goTab('cross')`);await sleep(0);assert.strictEqual(drawn(),real(),'the Cross tab: the real cube');
  run(`goTab('f2l')`);await sleep(0);assert.ok(crossIn(),'back on F2L: the overlay');
  // F2L Trainer off: the chip hides and Overlay goes off.
  $('#f2lTrainBtn').click();await sleep(0);assert.ok(g.hidden,'hidden with F2L Trainer off');assert.strictEqual(drawn(),real(),'the real cube');
  $('#f2lTrainBtn').click();await sleep(0);assert.ok(!g.hidden,'shown again');assert.strictEqual(b.getAttribute('aria-pressed'),'false','and off');
  assert.deepStrictEqual(errs,[],'no script errors at the end');
  console.log('f2loverlay: the chip, the cross in place, the gray, a pair it can not show, the moves, a new scramble, off ok');process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
