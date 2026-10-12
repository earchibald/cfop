// The Scan cube dialog in the page, for each puzzle. jsdom has no camera, so the dialog
// reports that and the test feeds it synthetic frames through scanStep, as the camera loop
// would. A scanned 2x2 goes through Use this cube to a scramble that gives the same cube.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const {render,U}=require('./synth-render');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
function fakeStorage(seed){const m=new Map(Object.entries(seed||{}));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),map:m};}
function boot(seed){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
    beforeParse(w){w.matchMedia=q=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};Object.defineProperty(w,'localStorage',{value:fakeStorage(seed)});}});
  const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
  return new Promise(res=>w.addEventListener('load',()=>setTimeout(()=>res({w,d:w.document,errs}),400)));
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  const {w,d,errs}=await boot({'cw:method':'"mini"'});
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
  const click=el=>{assert.ok(el,'element to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};const ev=s=>w.eval(s);
  // Show the faces of a cube held some way, each at a random turn, until each locks.
  const showAll=(f,n)=>{
    const cells=n*n,W=w.scanWidth(n),H=W*3/4,held=w.applyPerm(f,w.scanSize(n).rots[Math.floor(U(0,24))]);
    for(const c of [2,0,1,5,3,4]){
      const truth=w.rotateFace(held.slice(cells*c,cells*c+cells),Math.floor(U(0,4)));
      const before=ev("scanVoter").order.length+Object.keys(ev("scanVoter").faces).length;let k=0;
      for(;k<80;k++){w.scanStep(w.readFace(render(truth,W,H,false,'stickers'),{n}));if(ev("scanVoter").order.length+Object.keys(ev("scanVoter").faces).length>before||ev("scanRes"))break;}
    }
  };
  // ----- the 2x2: the beginner home offers the scan, and the top bar button opens it -----
  assert.strictEqual(d.body.dataset.puzzle,'2x2');
  assert.ok($('#begAsk [data-beg="scan"]'),'the 2x2 home offers the camera');
  assert.ok(!$('#camBtn').classList.contains('three-only'),'the Scan cube button shows for every puzzle');
  click($('#camBtn'));await sleep(50);
  assert.ok($('#scanBg'),'the dialog opens');assert.strictEqual(ev("scanN"),2);
  assert.ok(/2×2/.test($('.modal.scan p').textContent)&&/no fixed centers/.test($('.modal.scan p').textContent),'the text names the puzzle');
  assert.ok(/cannot use the camera/.test($('#scanStatus').textContent),'no camera in jsdom');
  assert.strictEqual($$('#scanNet g').length,6);assert.strictEqual($$('#scanNet rect').length,24,'six faces of four tiles');
  assert.ok($('#scanUse').disabled&&$('#scanNextFit').classList.contains('hidden'));
  const cube2=w.applyAlg(new (ev("Cube"))(),w.twoScramble('ui-scan',11)),f2=w.twoFacelets(cube2);
  showAll(f2,2);
  assert.ok(ev("scanRes")&&ev("scanRes").ok,'six faces fit together: '+$('#scanStatus').textContent);
  assert.ok(/All six faces are read/.test($('#scanStatus').textContent));
  assert.strictEqual($$('#scanNet rect[data-pos]').length,24,'every net tile shows a sticker');
  assert.ok(!$('#scanUse').disabled,'Use this cube is on');
  const key=w.canonicalKey(f2,2);
  if(ev("scanRes").fits.length>1){
    assert.ok(!$('#scanNextFit').classList.contains('hidden'),'Next fit shows when more than one cube fits');
    for(let i=0;i<ev("scanRes").fits.length&&w.canonicalKey(ev("scanRes").facelets,2)!==key;i++)click($('#scanNextFit'));
  }else assert.ok($('#scanNextFit').classList.contains('hidden'));
  assert.strictEqual(w.canonicalKey(ev("scanRes").facelets,2),key,'the fit shown is the scanned cube');
  // A click on a net tile turns its color and pins it; the fit is checked again.
  const tile=$('#scanNet rect[data-pos]'),id=+tile.dataset.id,pos=+tile.dataset.pos,was=ev("scanVoter").faces[id].stickers.slice();
  click(tile);
  assert.ok(ev("scanVoter").faces[id].pinned.some(Boolean),'the tile is pinned');
  assert.notStrictEqual(ev("scanVoter").faces[id].stickers.join(),was.join());
  // Put it back by cycling through the six colors. The net may redraw the face turned another
  // way between clicks, so find the tile by its stored index each time.
  const idx=ev("scanVoter").faces[id].stickers.findIndex((c,i)=>c!==was[i]);
  const tileOf=()=>{const g=$(`#scanNet g[data-id="${id}"]`),k=ev(`netSlot(${g.dataset.slot})`).k,shown=w.rotateFace([0,1,2,3],k).indexOf(idx);return $(`#scanNet rect[data-id="${id}"][data-pos="${shown}"]`);};
  for(let i=0;i<5;i++)click(tileOf());
  assert.strictEqual(ev("scanVoter").faces[id].stickers.join(),was.join(),'the sticker is back to its read color');
  assert.ok(ev("scanRes")&&ev("scanRes").ok,'the fit holds after the tile is put back: '+$('#scanStatus').textContent);
  while(w.canonicalKey(ev("scanRes").facelets,2)!==key&&!$('#scanNextFit').classList.contains('hidden'))click($('#scanNextFit'));
  click($('#scanUse'));await sleep(50);
  assert.ok(!$('#scanBg'),'the dialog closes on Use');
  assert.strictEqual(w.canonicalKey(w.twoFacelets(w.scr.cube),2),key,'the loaded scramble gives the scanned 2x2');
  assert.ok(/^scan-/.test(w.scr.seed),'the scramble is named after the scan');
  // ----- the 3x3 dialog is as before: nine tiles a face, faces by center color -----
  w.setMethod('cfop');click($('#camBtn'));await sleep(50);
  assert.strictEqual(ev("scanN"),3);assert.strictEqual($$('#scanNet rect').length,54);
  assert.ok(!/no fixed centers/.test($('.modal.scan p').textContent));
  const cube3=w.applyAlg(new (ev("Cube"))(),['R','U',"F'",'L2','D','B']),f3=cube3.toFacelets();
  for(const c of [2,0,1,5,3,4]){const truth=w.rotateFace(f3.slice(9*c,9*c+9),c%4);for(let k=0;k<80&&!ev("scanVoter").faces[c];k++)w.scanStep(w.readFace(render(truth,320,240,false,'stickers'),{n:3}));}
  assert.ok(ev("scanRes")&&ev("scanRes").ok&&ev("scanRes").cube.equals(cube3),'the 3x3 is read: '+$('#scanStatus').textContent);
  click($('#scanUse'));await sleep(50);assert.ok(!$('#scanBg'));
  assert.ok(w.scr.cube.equals(cube3),'the loaded scramble gives the scanned 3x3');
  // ----- the 4x4: sixteen tiles a face; the cube reads, but nothing loads it yet -----
  w.openScan({n:4});await sleep(50);
  assert.strictEqual(ev("scanN"),4);assert.strictEqual($$('#scanNet rect').length,96);
  assert.ok(/4×4/.test($('.modal.scan p').textContent));
  const f4=[];for(let f=0;f<6;f++)for(let k=0;k<16;k++)f4.push(f); // solved
  showAll(f4,4);
  assert.ok(ev("scanRes")&&ev("scanRes").ok,'six 4x4 faces fit together: '+$('#scanStatus').textContent);
  assert.strictEqual(ev("scanRes").facelets.join(),f4.join(),'a solved 4x4, held white up and green in front');
  assert.ok(typeof w.fourFromFacelets==='function'?!$('#scanUse').disabled:$('#scanUse').disabled&&/cannot load a 4×4 yet/.test($('#scanStatus').textContent));
  w.closeScan();
  // Escape closes the dialog; Start again clears it.
  w.openScan({n:2});await sleep(20);
  click($('#scanReset'));assert.strictEqual(ev("scanVoter").order.length,0);assert.ok(/Show a face/.test($('#scanStatus').textContent));
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  assert.ok(!$('#scanBg'),'Escape closes the dialog');
  assert.deepStrictEqual(errs,[]);
  console.log('scan-ui: ok');process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
