// ===== "Paint the colors": enter a real cube by tapping its stickers =====
// A camera-free way to read a cube. See docs/beginner-mode.md and the shared beginner-mode
// brief for the other modules (learn.js, guide.js, practice.js).
//
// The painter holds the cube yellow up, green in front — the held frame, as in
// js/beginner-ui.js (heldCube()). The held array H uses the engine's index scheme (face
// order U R F D L B, 9 stickers per face, position 0..8 left to right then top to bottom),
// but H's "U" face is the yellow face on top, "R" is orange, "F" is green, "D" is white,
// "L" is red, "B" is blue. heldToEngineFacelets(H) converts H to the engine (white-up,
// green-front) array that fromFacelets expects.
//
// Every string shown in the dialog goes through esc(). The HTML built here is assembled
// from this module's own fixed labels and color names, never from outside input.

// Palette order: white, yellow, green, blue, red, orange. Keys 1-6 pick these in order.
const PAINT_PALETTE=[{c:0,label:'white'},{c:3,label:'yellow'},{c:2,label:'green'},{c:5,label:'blue'},{c:1,label:'red'},{c:4,label:'orange'}];

let PAINT_PERM=null;
// The held-index -> engine-index map, found by brute force rather than worked out by hand.
// For 16 random cubes, compare the cube as held (after z2) with the cube as engine. A held
// position always lands on the same engine position, on every cube, so 16 cubes are enough
// to pin each one down against the handful of same-color stickers elsewhere on the cube.
function paintPerm(){
  if(PAINT_PERM)return PAINT_PERM;
  const trials=[];
  for(let k=0;k<16;k++){
    const c=applyAlg(new Cube(),randomMoveScramble('paint-'+k,25));
    trials.push({engine:c.toFacelets(),held:applyAlg(c,['z2']).toFacelets()});
  }
  const perm=new Array(54).fill(-1);
  for(let h=0;h<54;h++){
    let cand=null;
    for(const t of trials){
      const m=[];for(let s=0;s<54;s++)if(t.engine[s]===t.held[h])m.push(s);
      cand=cand===null?new Set(m):new Set(m.filter(s=>cand.has(s)));
    }
    perm[h]=cand.values().next().value;
  }
  PAINT_PERM=perm;
  return perm;
}
// H: 54 colors in the held frame (or -1 where not painted yet). Returns the 54 colors
// in the engine (white-up, green-front) frame, in the order fromFacelets expects.
function heldToEngineFacelets(H){
  const perm=paintPerm();const E=new Array(54);
  for(let h=0;h<54;h++)E[perm[h]]=H[h];
  return E;
}

// ---------- the dialog's own state ----------
// A 2×2 has 4 tiles a face and no centers. Its net is in the engine frame (white up, green in
// front, as the player shows) and goes to twoFromFacelets; the 3×3 net is in the held frame.
let paintH=null,paintColor=0,paintOnCube=null,paintOnClose=null;
function paintN(){return puzzleN()===2?4:puzzleN()===4?16:9;}

// The held centers: always the same six colors, in held-face order, however the cube is
// scrambled (centers do not move for a face-turn scramble, so this is the held cube's own
// center row, not a guess at the colors).
function paintCenters(){return applyAlg(new Cube(),['z2']).center;}
function paintReset(){
  const n=paintN();const H=new Array(6*n).fill(-1);
  if(n===9){const centers=paintCenters();for(let i=0;i<6;i++)H[9*i+4]=centers[i];}
  return H;
}
function paintTileHTML(i){
  const v=paintH[i];const isCenter=paintN()===9&&i%9===4;
  const bg=v>=0?stickerColor(v):'var(--sticker-X)';
  return `<button type="button" class="pt-tile${isCenter?' pt-center':''}" data-i="${i}" style="background:${bg}"${isCenter?' disabled aria-label="center, fixed"':''}></button>`;
}
function paintFaceHTML(face){
  const n=paintN();let out=`<div class="pt-face${n===4?' pt-face2':n===16?' pt-face4':''}" data-face="${face}">`;
  for(let pos=0;pos<n;pos++)out+=paintTileHTML(n*face+pos);
  return out+'</div>';
}
function paintNetHTML(){
  // Held face order U R F D L B. Cross layout: yellow (U) on top, red (L), green (F),
  // orange (R), blue (B) in the middle row, white (D) on the bottom.
  return '<div class="pt-net">'+
    `<span></span><div class="pt-slot">${paintFaceHTML(0)}</div><span></span><span></span>`+
    `<div class="pt-slot">${paintFaceHTML(4)}</div><div class="pt-slot">${paintFaceHTML(2)}</div><div class="pt-slot">${paintFaceHTML(1)}</div><div class="pt-slot">${paintFaceHTML(5)}</div>`+
    `<span></span><div class="pt-slot">${paintFaceHTML(3)}</div><span></span><span></span>`+
  '</div>';
}
function paintPaletteHTML(){
  return PAINT_PALETTE.map(p=>`<button type="button" class="pt-swatch${p.c===paintColor?' on':''}" data-c="${p.c}" aria-label="${esc(p.label)}" style="background:${stickerColor(p.c)}"></button>`).join('');
}
function paintCountText(){return `${paintH.filter(v=>v>=0).length} of ${paintH.length} tiles painted.`;}
function paintUpdate(){
  $('#paintCount').textContent=paintCountText();
  $('#paintGo').disabled=paintH.filter(v=>v>=0).length<paintH.length;
}
function paintTileClick(e){
  const b=e.target.closest('button[data-i]');if(!b||b.disabled)return;
  const i=+b.dataset.i;paintH[i]=paintColor;
  b.style.background=stickerColor(paintColor);
  paintUpdate();
}
function paintPaletteClick(e){
  const b=e.target.closest('button[data-c]');if(!b)return;
  paintSelectColor(+b.dataset.c);
}
function paintSelectColor(c){
  paintColor=c;
  $$('#paintPalette .pt-swatch').forEach(b=>b.classList.toggle('on',+b.dataset.c===c));
}
function paintClear(){
  paintH=paintReset();
  $('#paintNet').innerHTML=paintNetHTML();
  paintNotice([]);
  paintUpdate();
}
function paintNotice(errors){
  const el=$('#paintNotice');
  if(!errors||!errors.length){el.classList.add('hidden');el.innerHTML='';return;}
  el.classList.remove('hidden');
  el.innerHTML=errors.map(e=>`<div>${esc(e)}</div>`).join('');
}
function paintStart(){
  const res=paintN()===4?twoFromFacelets(paintH):paintN()===16?fourFromFacelets(paintH):fromFacelets(heldToEngineFacelets(paintH));
  if(!res.ok){paintNotice(res.errors);return;}
  if(paintOnCube){const f=paintOnCube;paintOnClose=null;closePaint();f(res.cube);return;}
  const sres=scrambleFromCube(res.cube,customName('paint'));
  if(!sres.ok){paintNotice(sres.errors);return;}
  closePaint();
}
function paintKeys(e){
  if(!$('#paintBg'))return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closePaint();return;}
  const n=+e.key;
  if(Number.isInteger(n)&&n>=1&&n<=6){e.preventDefault();e.stopPropagation();paintSelectColor(PAINT_PALETTE[n-1].c);return;}
  e.stopPropagation(); // keep tab/timer keys out while the dialog is open
}
function closePaint(){
  document.removeEventListener('keydown',paintKeys,true);paintOnCube=null;
  const bg=$('#paintBg');if(bg)bg.remove();
  const f=paintOnClose;paintOnClose=null;if(f)f();
}
// With opts.onCube, the Go button (opts.go names it) hands the Cube to it and closes, instead of
// starting a solve; opts.onClose is called when the dialog closes any other way (the Smart cube
// dialog, which opens again).
function openPaint(opts){
  if($('#paintBg'))return;
  opts=opts&&opts.onCube?opts:{};
  paintH=paintReset();paintColor=0;paintOnCube=opts.onCube||null;paintOnClose=opts.onClose||null;
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='paintBg';
  bg.innerHTML=`<div class="modal paint" role="dialog" aria-label="Paint my cube">
   <button class="close small ghost" id="paintClose" aria-label="Close">✕</button>
   <h2>Paint my cube</h2>
   <p class="muted" style="margin-top:0">${paintN()===4?'Hold your cube the way the 3D cube shows: the face on top in the picture is the one on top in your hand. Pick a color, then tap the tiles. Every color is on four tiles.':paintN()===16?'Hold your cube the way the 3D cube shows: the face on top in the picture is the one on top in your hand. Pick a color, then tap the tiles. Every color is on sixteen tiles.':'Hold your cube with yellow up and green in front, like the 3D cube. Pick a color, then tap the tiles. The centers are fixed.'}</p>
   <div class="pt-body">
    <div id="paintNet">${paintNetHTML()}</div>
    <div class="pt-side">
     <div class="pt-palette" id="paintPalette">${paintPaletteHTML()}</div>
     <div class="pt-count" id="paintCount"></div>
     <div id="paintNotice" class="notice hidden"></div>
     <div class="row">
      <button type="button" class="primary" id="paintGo" disabled>${esc(opts.go||'Start the solve')}</button>
      <button type="button" class="ghost" id="paintClear">Clear</button>
      <button type="button" class="ghost" id="paintCancel">Cancel</button>
     </div>
    </div>
   </div>
  </div>`;
  document.body.appendChild(bg);
  bg.addEventListener('click',e=>{if(e.target===bg)closePaint();});
  $('#paintClose').onclick=closePaint;
  $('#paintCancel').onclick=closePaint;
  $('#paintClear').onclick=paintClear;
  $('#paintGo').onclick=paintStart;
  $('#paintNet').addEventListener('click',paintTileClick);
  $('#paintPalette').addEventListener('click',paintPaletteClick);
  document.addEventListener('keydown',paintKeys,true);
  paintUpdate();
}

if(typeof document!=='undefined'&&$('#paintBtn'))$('#paintBtn').onclick=openPaint;
