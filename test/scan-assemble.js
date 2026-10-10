// Stage 5: split random cubes into six faces, turn and shuffle them, and check that
// assembleScan recovers the cube. Also check the colour-confusion repairs.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/scan-assemble.js');
const T=run(`({rotateFace,assembleScan,Cube,applyAlg,FACE_MOVES})`);
let seed=12345;const rnd=n=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return Math.floor(((t^(t>>>14))>>>0)/4294967296*n);}; // mulberry32

// rotateFace: four quarter turns is the identity; one turn moves the top-left to top-right.
const id=[0,1,2,3,4,5,6,7,8];
assert.strictEqual(T.rotateFace(id,4).join(),id.join());
assert.strictEqual(T.rotateFace(id,1).join(),"6,3,0,7,4,1,8,5,2");

function randomCube(){const ms=[];for(let i=0;i<25;i++)ms.push(T.FACE_MOVES[rnd(T.FACE_MOVES.length)]);return T.applyAlg(new T.Cube(),ms);}
function scanOf(cube){
  const f=cube.toFacelets(),faces=[];
  for(let i=0;i<6;i++)faces.push({stickers:T.rotateFace(f.slice(9*i,9*i+9),rnd(4)),margins:new Array(9).fill(10)});
  for(let i=5;i>0;i--){const j=rnd(i+1);[faces[i],faces[j]]=[faces[j],faces[i]];}
  return faces;
}
const N=300;let ok=0,amb=0;const t0=Date.now();
for(let n=0;n<N;n++){
  const c=randomCube(),r=T.assembleScan(scanOf(c));
  assert.ok(r.ok,'legal cube rejected: '+r.errors);assert.strictEqual(r.changes.length,0);
  if(r.cube.equals(c))ok++;if(r.ambiguous)amb++;
}
console.log(`assemble: ${ok}/${N} recovered, ${amb} ambiguous, ${((Date.now()-t0)/N).toFixed(1)} ms each`);
assert.ok(ok>=N-1,'too many wrong cubes');

// One red sticker read as orange, with a low margin.
let fixed=0,fixed2=0,faceSwap=0;const M=60;
for(let n=0;n<M;n++){
  const c=randomCube(),faces=scanOf(c);
  const spots=[];faces.forEach((fc,fi)=>fc.stickers.forEach((x,p)=>{if(p!==4&&(x===1||x===4))spots.push([fi,p]);}));
  const [fi,p]=spots[rnd(spots.length)];faces[fi].stickers[p]=5-faces[fi].stickers[p];faces[fi].margins[p]=1;
  const r=T.assembleScan(faces);if(r.ok&&r.cube.equals(c)&&r.changes.length===1)fixed++;
  // A red and an orange sticker both misread: colour counts stay right.
  const c2=randomCube(),f2=scanOf(c2);const reds=[],oranges=[];
  f2.forEach((fc,fi)=>fc.stickers.forEach((x,p)=>{if(p!==4&&x===1)reds.push([fi,p]);if(p!==4&&x===4)oranges.push([fi,p]);}));
  const a=reds[rnd(reds.length)],b=oranges[rnd(oranges.length)];
  f2[a[0]].stickers[a[1]]=4;f2[b[0]].stickers[b[1]]=1;f2[a[0]].margins[a[1]]=1;f2[b[0]].margins[b[1]]=2;
  const r2=T.assembleScan(f2);if(r2.ok&&r2.cube.equals(c2))fixed2++;
  // A whole face read with white and yellow swapped.
  const c3=randomCube(),f3=scanOf(c3);const k=f3.findIndex(fc=>fc.stickers[4]!==0&&fc.stickers[4]!==3&&fc.stickers.some(x=>x===0||x===3));
  if(k>=0){f3[k].stickers=f3[k].stickers.map((x,p)=>p===4?x:x===0?3:x===3?0:x);const r3=T.assembleScan(f3);if(r3.ok&&r3.cube.equals(c3))faceSwap++;}else faceSwap++;
}
console.log(`repair: one sticker ${fixed}/${M}, two stickers ${fixed2}/${M}, whole face ${faceSwap}/${M}`);
assert.ok(fixed>=M*0.95&&fixed2>=M*0.9&&faceSwap>=M*0.95,'repair rate too low');

// Joint read: dim light makes five red stickers read as orange. With per-cell Lab values,
// stage 5 assigns all stickers to the centre colours, nine each, and recovers the cube.
const LAB=[[95,0,2],[50,62,45],[58,-55,40],[88,-6,80],[64,48,68],[42,12,-60]];
let joint=0;const J=40;
for(let n=0;n<J;n++){
  const c=randomCube(),faces=scanOf(c);
  for(const fc of faces)fc.lab=fc.stickers.map(x=>LAB[x].map(v=>v+(rnd(7)-3)));
  // Light shifts the reds toward orange; the five least red ones read as orange.
  const reds=[];faces.forEach((fc,fi)=>fc.stickers.forEach((x,p)=>{if(x===1&&p!==4)reds.push([fi,p]);}));
  for(const [fi,p] of reds.slice(0,5)){faces[fi].stickers[p]=4;faces[fi].lab[p]=[55,56,55];}
  const r=T.assembleScan(faces);if(r.ok&&r.cube.equals(c)&&r.joint)joint++;
}
console.log(`repair: joint read ${joint}/${J}`);
assert.ok(joint>=J-1,'joint read failed');

// Errors in plain words.
const c=randomCube(),faces=scanOf(c);
assert.match(T.assembleScan(faces.slice(0,5)).errors[0],/^Scan the \w+ face\.$/);
faces[1]={stickers:faces[0].stickers.slice()};
assert.match(T.assembleScan(faces).errors[0],/^Two faces have a \w+ centre\.$/);
console.log('scan-assemble: ok');
