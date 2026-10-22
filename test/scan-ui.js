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
  // A click on a net tile paints the chosen color and pins it; the fit is checked again. The
  // palette keys 1 to 6 pick a color.
  const keyOf=c=>String(ev("SCAN_PALETTE").findIndex(p=>p.c===c)+1);
  const keydown=k=>d.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
  assert.strictEqual($$('#scanPal .pt-swatch').length,6,'six swatches');assert.strictEqual(ev("scanColor"),0,'white is picked at first');
  const tile=$('#scanNet rect[data-pos]'),id=+tile.dataset.id,pos=+tile.dataset.pos,was=ev("scanVoter").faces[id].stickers.slice();
  const g0=$(`#scanNet g[data-id="${id}"]`),k0=ev(`netSlot(${g0.dataset.slot})`).k,idx=w.rotateFace([0,1,2,3],k0)[pos],other=(was[idx]+1)%6;
  keydown(keyOf(other));assert.strictEqual(ev("scanColor"),other,'a key picks a color');
  assert.ok($(`#scanPal .pt-swatch[data-c="${other}"]`).classList.contains('on'),'the swatch shows picked');
  click(tile);
  assert.ok(ev("scanVoter").faces[id].pinned[idx],'the tile is pinned');
  assert.strictEqual(ev("scanVoter").faces[id].stickers[idx],other,'the tile has the painted color');
  // Put it back: pick its read color and paint it again. The net may redraw the face turned
  // another way between clicks, so find the tile by its stored index each time.
  const tileOf=()=>{const g=$(`#scanNet g[data-id="${id}"]`),k=ev(`netSlot(${g.dataset.slot})`).k,shown=w.rotateFace([0,1,2,3],k).indexOf(idx);return $(`#scanNet rect[data-id="${id}"][data-pos="${shown}"]`);};
  click($(`#scanPal .pt-swatch[data-c="${was[idx]}"]`));assert.strictEqual(ev("scanColor"),was[idx],'a click on a swatch picks it');
  click(tileOf());
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
  // ----- the 4x4: sixteen tiles a face; Use this cube loads the state itself -----
  w.setMethod('master');w.openScan({n:4});await sleep(50);
  assert.strictEqual(ev("scanN"),4);assert.strictEqual($$('#scanNet rect').length,96);
  assert.ok(/4×4/.test($('.modal.scan p').textContent));
  const f4=[];for(let f=0;f<6;f++)for(let k=0;k<16;k++)f4.push(f); // solved
  showAll(f4,4);
  assert.ok(ev("scanRes")&&ev("scanRes").ok,'six 4x4 faces fit together: '+$('#scanStatus').textContent);
  assert.strictEqual(ev("scanRes").facelets.join(),f4.join(),'a solved 4x4, held white up and green in front');
  assert.ok(!$('#scanUse').disabled,'a 4x4 can be used: '+$('#scanStatus').textContent);
  click($('#scanUse'));await sleep(50);assert.ok(!$('#scanBg'));
  assert.ok(w.scr.cube.isFour&&w.scr.cube.s.join()===f4.join(),'the loaded state is the scanned 4x4');
  // ----- the sticker style chip: Auto by default, a pick is kept -----
  w.openScan({n:3});await sleep(20);
  assert.ok($('#scanStyle button[data-s="auto"]').classList.contains('on'),'Auto is the default');
  click($('#scanStyle button[data-s="stickerless"]'));assert.strictEqual(ev("scanStyle()"),'stickerless');assert.strictEqual(JSON.parse(w.localStorage.getItem('cw:scanStyle')),'stickerless','the style is kept');
  assert.strictEqual(w.readFace(render([0,1,2,3,4,5,0,1,2],320,240,false,'stickers'),{n:3,style:'stickerless'}).style,'stickerless','a pinned style is read as that style');
  click($('#scanStyle button[data-s="auto"]'));assert.strictEqual(ev("scanStyle()"),'auto');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  // ----- a refresh scan: the net starts as the state the guide expects; the stickers painted that
  // differ, or a face shown, find the cube near the hint; Set up from current and Return to
  // scramble hand it back with how it was found -----
  const Cube=ev("Cube"),reset=w.applyAlg(new Cube(),w.parseAlg("R U F' L2 D B R' U2")),hint=['R','U',"R'",'U',"F'"];
  const bases=w.resyncBases(reset,hint,0);
  const feed=(truth,c)=>{const tf=w.rotateFace(truth.toFacelets().slice(9*c,9*c+9),c%4);for(let k=0;k<80&&!(ev("scanVoter").faces[c]&&ev("scanVoter").faces[c].read);k++)w.scanStep(w.readFace(render(tf,320,240,false,'stickers'),{n:3}));};
  const paintDiff=(truth,c)=>{const tf=truth.toFacelets(),ef=ev("scanResync").bases[0].cube.toFacelets();for(let p=0;p<9;p++){if(p===4||tf[9*c+p]===ef[9*c+p])continue;w.scanPick(tf[9*c+p]);click($(`#scanNet rect[data-id="${c}"][data-pos="${p}"]`));}};
  const findIt=truth=>{let guard=0;while(!(ev("scanRes")&&ev("scanRes").ok)&&guard++<5){const m=$('#scanStatus').textContent.match(/Show the (\w+) face/);feed(truth,m?ev("COLOR_NAMES_E").indexOf(m[1]):[0,2,1,3,4,5].find(c=>!ev("scanVoter").faces[c].read));}};
  let got=null;
  w.openScan({n:3,resync:{bases},onCube:(c,how,info)=>{got={c,how,info};}});await sleep(20);
  assert.ok(/Read my cube/.test($('.modal.scan h2').textContent)&&/the cube the guide expects/.test($('.modal.scan p').textContent),'the dialog is a refresh scan');
  assert.strictEqual($$('#scanNet g.expect').length,6,'six faces are expected, dimmed');
  assert.strictEqual(ev("scanVoter").faces[0].stickers.join(),reset.toFacelets().slice(0,9).join(),'the net starts as the expected state');
  assert.strictEqual($('#scanUse').textContent,'Set up from current');assert.ok(!$('#scanReturn').classList.contains('hidden')&&$('#scanReturn').disabled,'Return to scramble waits');
  // Two moves into the hint, then a slip of one move: paint the top face's stickers that differ.
  const truth=w.applyAlg(reset,['R','U','F']);
  paintDiff(truth,0);
  assert.ok($$('#scanNet g.expect').length<6,'a painted face is given');
  assert.ok(ev("scanRes")&&ev("scanRes").ok||/states fit so far|No state within/.test($('#scanStatus').textContent),'the resync ran: '+$('#scanStatus').textContent);
  findIt(truth);
  assert.ok(ev("scanRes")&&ev("scanRes").ok&&ev("scanRes").cube.equals(truth),'the cube is found: '+$('#scanStatus').textContent);
  assert.ok(/Found it: your cube is 1 move off the hint/.test($('#scanStatus').textContent),'the status says how far off: '+$('#scanStatus').textContent);
  assert.strictEqual($$('#scanNet g.expect').length,0,'the whole net shows the cube found');
  assert.ok(!$('#scanUse').disabled&&!$('#scanReturn').disabled);
  click($('#scanReturn'));await sleep(20);
  assert.ok(!$('#scanBg')&&got&&got.how==='return'&&got.c.equals(truth)&&got.info.off===1&&!got.info.full,'Return to scramble hands the cube back');
  // The same cube by the camera alone: the top face, then the face asked for. Set up from current.
  got=null;w.openScan({n:3,resync:{bases},onCube:(c,how,info)=>{got={c,how,info};}});await sleep(20);
  feed(truth,0);findIt(truth);
  assert.ok(ev("scanRes")&&ev("scanRes").ok&&ev("scanRes").cube.equals(truth),'the cube is found from faces shown: '+$('#scanStatus').textContent);
  click($('#scanUse'));await sleep(20);
  assert.ok(got&&got.how==='setup'&&got.c.equals(truth),'Set up from current hands the cube back');
  // Start again puts the expected state back. Far off the hint, six faces go through a full read.
  got=null;w.openScan({n:3,resync:{bases},onCube:(c,how,info)=>{got={c,how,info};}});await sleep(20);
  paintDiff(truth,0);click($('#scanReset'));
  assert.strictEqual($$('#scanNet g.expect').length,6,'Start again shows the expected state again');assert.ok(!ev("scanRes"));
  const far=w.applyAlg(reset,['L','D','B','L','D2','B']);
  for(const c of [0,2,1,3,4,5])feed(far,c);
  assert.ok(/read the whole cube/.test($('#scanStatus').textContent)&&$('#scanUse').textContent==='Use this cube','six faces far off the hint are a full read: '+$('#scanStatus').textContent);
  assert.ok(ev("scanRes")&&ev("scanRes").ok&&ev("scanRes").cube.equals(far),'the full read gives the cube');
  click($('#scanUse'));await sleep(20);
  assert.ok(got&&got.how==='use'&&got.info.full&&got.c.equals(far),'Use this cube hands the full read back');
  // Escape closes the dialog; Start again clears it.
  w.openScan({n:2});await sleep(20);
  click($('#scanReset'));assert.strictEqual(ev("scanVoter").order.length,0);assert.ok(/Show a face/.test($('#scanStatus').textContent));
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  assert.ok(!$('#scanBg'),'Escape closes the dialog');
  assert.deepStrictEqual(errs,[]);
  console.log('scan-ui: ok');process.exit(0);
}catch(e){console.error(e);process.exit(1);}})();
