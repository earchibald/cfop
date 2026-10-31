// ===== "Paint the colors": enter a real cube by tapping its stickers =====
// A camera-free way to read a cube. See docs/beginner-mode.md and the shared beginner-mode
// brief for the other modules (learn.js, guide.js, practice.js).
//
// The painter holds the 3×3 the way the solve holds it: the cross color down (paintHold(),
// crossRotation() in app.js). That is yellow up, green in front for the beginner method, for a
// white cross and in the lab, as in js/beginner-ui.js (heldCube()). The held array H uses the
// engine's index scheme (face order U R F D L B, 9 stickers per face, position 0..8 left to
// right then top to bottom), but H's "U" face is the face on top as held: yellow for z2.
// heldToEngineFacelets(H) converts H to the engine (white-up, green-front) array that
// fromFacelets expects.
//
// Every string shown in the dialog goes through esc(). The HTML built here is assembled
// from this module's own fixed labels and color names, never from outside input.

// Palette order: white, yellow, green, blue, red, orange. Keys 1-6 pick these in order.
const PAINT_PALETTE=[{c:0,label:'white'},{c:3,label:'yellow'},{c:2,label:'green'},{c:5,label:'blue'},{c:1,label:'red'},{c:4,label:'orange'}];

const PAINT_PERM={};
// The whole-cube turn from the engine frame to the cube as held. The lab has no cross color: z2.
function paintHold(){return typeof crossRotation==='function'?crossRotation():'z2';}
// The held-index -> engine-index map, found by brute force rather than worked out by hand.
// For 16 random cubes, compare the cube as held (after z2) with the cube as engine. A held
// position always lands on the same engine position, on every cube, so 16 cubes are enough
// to pin each one down against the handful of same-color stickers elsewhere on the cube.
function paintPerm(){
  const hold=paintHold();if(PAINT_PERM[hold])return PAINT_PERM[hold];
  const trials=[];
  for(let k=0;k<16;k++){
    const c=applyAlg(new Cube(),randomMoveScramble('paint-'+k,25));
    trials.push({engine:c.toFacelets(),held:(hold?applyAlg(c,parseAlg(hold)):c).toFacelets()});
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
  PAINT_PERM[hold]=perm;
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
// 54 tiles, 9 a face, in the held frame.
let paintH=null,paintColor=0,paintOnCube=null,paintOnClose=null;
function paintN(){return 9;}

// The held centers: always the same six colors, in held-face order, however the cube is
// scrambled (centers do not move for a face-turn scramble, so this is the held cube's own
// center row, not a guess at the colors).
function paintCenters(){const h=paintHold();return (h?applyAlg(new Cube(),parseAlg(h)):new Cube()).center;}
// The words for the hold: "yellow up and green in front".
function paintHoldText(){const c=paintCenters(),N=['white','red','green','yellow','orange','blue'];return `${N[c[0]]} up and ${N[c[2]]} in front`;}
function paintReset(){
  const H=new Array(6*9).fill(-1);
  const centers=paintCenters();for(let i=0;i<6;i++)H[9*i+4]=centers[i];
  return H;
}
function paintTileHTML(i){
  const v=paintH[i];const isCenter=i%9===4;
  const bg=v>=0?stickerColor(v):'var(--sticker-X)';
  return `<button type="button" class="pt-tile${isCenter?' pt-center':''}" data-i="${i}" data-cb="${v>=0?COLOR_VARS[v]:''}" style="background:${bg}"${isCenter?' disabled aria-label="center, fixed" title="The center: fixed"':' title="Tap to paint this tile with the chosen color"'}></button>`;
}
function paintFaceHTML(face){
  const n=paintN();let out=`<div class="pt-face" data-face="${face}">`;
  for(let pos=0;pos<n;pos++)out+=paintTileHTML(n*face+pos);
  return out+'</div>';
}
// The net in the one layout of the app (NET_POS in js/draw.js): each face goes to its own cell of
// a four by three grid. The faces are the faces as held.
function paintNetHTML(){
  return '<div class="pt-net">'+[0,1,2,3,4,5].map(f=>`<div class="pt-slot" style="grid-column:${NET_POS[f][0]+1};grid-row:${NET_POS[f][1]+1}">${paintFaceHTML(f)}</div>`).join('')+'</div>';
}
function paintPaletteHTML(){
  return PAINT_PALETTE.map((p,i)=>`<button type="button" class="pt-swatch${p.c===paintColor?' on':''}" data-c="${p.c}" aria-label="${esc(p.label)}" title="${esc(p.label.charAt(0).toUpperCase()+p.label.slice(1))}: key ${i+1}" style="background:${stickerColor(p.c)}"></button>`).join('');
}
function paintCountText(){return `${paintH.filter(v=>v>=0).length} of ${paintH.length} tiles painted.`;}
function paintUpdate(){
  $('#paintCount').textContent=paintCountText();
  $('#paintGo').disabled=paintH.filter(v=>v>=0).length<paintH.length;
}
function paintTileClick(e){
  const b=e.target.closest('button[data-i]');if(!b||b.disabled)return;
  const i=+b.dataset.i;paintH[i]=paintColor;
  b.style.background=stickerColor(paintColor);b.dataset.cb=COLOR_VARS[paintColor];
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
  const res=fromFacelets(heldToEngineFacelets(paintH));
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
   <button class="close small ghost" id="paintClose" aria-label="Close" title="Close this window (Esc)">✕</button>
   <h2>Paint my cube</h2>
   <p class="muted" style="margin-top:0">Hold your cube with ${paintHoldText()}. Pick a color, then tap the tiles. The centers are fixed.</p>
   <div class="pt-body">
    <div id="paintNet">${paintNetHTML()}</div>
    <div class="pt-side">
     <div class="pt-palette" id="paintPalette">${paintPaletteHTML()}</div>
     <div class="pt-count" id="paintCount"></div>
     <div id="paintNotice" class="notice hidden"></div>
     <div class="row">
      <button type="button" class="primary" id="paintGo" disabled title="Use the painted cube. Every tile must have a color first">${esc(opts.go||'Start the solve')}</button>
      <button type="button" class="ghost" id="paintClear" title="Take the color off every tile">Clear</button>
      <button type="button" class="ghost" id="paintCancel" title="Close this window and keep the cube as it was">Cancel</button>
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
