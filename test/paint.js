// "Paint my cube" dialog: paint a cube's tiles instead of scanning it. Checks the
// held-to-engine conversion and a full paint-and-solve round trip.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.confirm=()=>{w.confirm.called=true;return true;};w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
const w=dom.window;const d=w.document;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const pickColor=c=>click($(`#paintPalette .pt-swatch[data-c="${c}"]`));
const paintTile=i=>click($(`#paintNet button[data-i="${i}"]`));
const countText=()=>$('#paintCount').textContent;

w.addEventListener('load',async()=>{try{
  await sleep(100);
  w.setMethod('beginner');

  // A known cube, reached through the player's own scramble loader (so we get a real Cube
  // instance without reaching for the Cube class, which the page keeps out of window).
  w.loadScramble('painttest',w.parseAlg("R U F' L2 D B' R2 U' F D2"),true);
  const engine=w.scr.cube;
  const held=w.applyAlg(engine,['z2']).toFacelets();

  // Opening the dialog shows the six fixed centres already painted.
  w.openPaint();
  assert.ok($('#paintBg'),'the dialog opens');
  assert.strictEqual(countText(),'6 of 54 tiles painted.','centres count as painted at the start');
  assert.ok($('#paintGo').disabled,'Start the solve is disabled until every tile is painted');

  // Paint the known cube, tile by tile, from its held (yellow-up, green-front) facelets.
  for(let i=0;i<54;i++){if(i%9===4)continue;pickColor(held[i]);paintTile(i);}
  assert.strictEqual(countText(),'54 of 54 tiles painted.','every tile is painted');
  assert.ok(!$('#paintGo').disabled,'Start the solve is enabled once all 54 tiles are painted');

  // heldToEngineFacelets converts the held reading to the engine (white-up) frame fromFacelets wants.
  assert.deepStrictEqual(w.heldToEngineFacelets(held),engine.toFacelets(),'the painted cube converts to the engine frame');

  // Start the solve: the dialog closes, beginner mode goes to Solve my cube, and the loaded
  // scramble reproduces the painted cube (the moves differ from the scramble above; the state matters).
  click($('#paintGo'));
  assert.ok(!$('#paintBg'),'Start the solve closes the dialog');
  assert.ok($('#tab-bsolve').classList.contains('on'),'beginner mode goes to Solve my cube');
  assert.deepStrictEqual(w.scr.cube.toFacelets(),engine.toFacelets(),'the loaded scramble reproduces the painted cube');

  // heldToEngineFacelets round-trips for other random cubes too.
  for(let k=0;k<3;k++){
    w.loadScramble('paintcheck'+k,w.randomMoveScramble('paint-check-'+k,20),true);
    const c=w.scr.cube,h=w.applyAlg(c,['z2']).toFacelets();
    assert.deepStrictEqual(w.heldToEngineFacelets(h),c.toFacelets(),'heldToEngineFacelets round-trips for cube '+k);
  }

  // An impossible cube (every non-centre tile painted white) shows an error and stays open.
  w.openPaint();
  for(let i=0;i<54;i++){if(i%9===4)continue;pickColor(0);paintTile(i);}
  assert.strictEqual(countText(),'54 of 54 tiles painted.');
  click($('#paintGo'));
  assert.ok($('#paintBg'),'an impossible cube leaves the dialog open');
  assert.ok(!$('#paintNotice').classList.contains('hidden'),'an impossible cube shows a notice');
  assert.ok($('#paintNotice').textContent.length>0,'the notice has text');
  click($('#paintCancel'));assert.ok(!$('#paintBg'),'Cancel closes the dialog');

  // Clear keeps the centres and clears the rest. Escape closes the dialog.
  w.openPaint();
  pickColor(0);paintTile(0); // paint one non-centre tile (U face, position 0)
  assert.notStrictEqual(countText(),'6 of 54 tiles painted.');
  click($('#paintClear'));
  assert.strictEqual(countText(),'6 of 54 tiles painted.','Clear keeps the centres and clears the rest');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  assert.ok(!$('#paintBg'),'Escape closes the dialog');

  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('paint: open state, painting, held-to-engine conversion, start/clear/cancel/escape ok');process.exit(0);
}catch(e){console.error('paint: FAIL',e.message,errs);process.exit(1);}});
