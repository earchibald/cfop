// Stage 5: split random cubes into six faces, turn and shuffle them, and check that
// assembleScan recovers the cube. Also check the color-confusion repairs.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/two.js','js/scan-assemble.js');
const T=run(`({rotateFace,assembleScan,Cube,applyAlg,FACE_MOVES,cornerFacelet,edgeFacelet})`);
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
  // A red and an orange sticker both misread: color counts stay right.
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
// stage 5 assigns all stickers to the center colors, nine each, and recovers the cube.
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
assert.match(T.assembleScan(faces.slice(0,4)).errors[0],/^Scan the \w+, \w+ faces\.$/);
faces[1]={stickers:faces[0].stickers.slice()};
assert.match(T.assembleScan(faces).errors[0],/^Two faces have a \w+ center\.$/);
console.log('scan-assemble: ok');

// ----- five faces of the 3x3 -----
// The sixth face follows from the other five in most cases: the result names it as deduced, and
// the cube is among the fits. Where the fits differ on that face, the face is asked for (need),
// and six faces then give the cube. The fits that agree on it only turn the faces read another
// way, as six faces can: the first is shown and the cube is among them.
let five=0,ask=0,lost=0;const V=300;
for(let n=0;n<V;n++){
  const c=randomCube(),faces=scanOf(c),m=rnd(6),r=T.assembleScan(faces.filter(fc=>fc.stickers[4]!==m));
  if(r.ok){
    five++;assert.strictEqual(r.deduced,m,'the face worked out is the one not given');assert.strictEqual(r.changes.length,0);
    assert.strictEqual(r.facelets[9*m+4],m,'the face worked out has its center');
    if(!r.fits.some(f=>f.cube.equals(c)))lost++;
  }else{
    ask++;assert.strictEqual(r.need,m,'the face to show is the one not given');assert.match(r.errors[0],/^Show the \w+ face too: /);
    const r6=T.assembleScan(faces);assert.ok(r6.ok&&r6.fits.some(f=>f.cube.equals(c)),'six faces give the cube');
  }
}
console.log(`five faces: ${five}/${V} worked out, ${ask} asked for the sixth, ${lost} without the cube among the fits`);
assert.ok(five>=V*0.8,'five faces settle too few cubes');assert.ok(ask>0,'no cube asked for the sixth face');assert.strictEqual(lost,0);
// A solved cube from any five faces. One move from solved, the faces fit more than one way (U and
// D' show the same six faces, each turned half way round): the cube is among the fits.
for(let m=0;m<6;m++){const r=T.assembleScan(scanOf(new T.Cube()).filter(fc=>fc.stickers[4]!==m));assert.ok(r.ok&&r.cube.equals(new T.Cube())&&r.deduced===m,'a solved cube from five faces');}
for(const mv of ['R','U',"F'"]){const c1=T.applyAlg(new T.Cube(),[mv]);for(let m=0;m<6;m++){const r=T.assembleScan(scanOf(c1).filter(fc=>fc.stickers[4]!==m));assert.ok(r.ok&&r.fits.some(f=>f.cube.equals(c1)),`${mv} with face ${m} hidden`);}}
// The edge case: L D2 B with the red face hidden leaves three cubes that differ on that face.
const cN=T.applyAlg(new T.Cube(),['L','D2','B']),rN=T.assembleScan(scanOf(cN).filter(fc=>fc.stickers[4]!==1));
assert.ok(!rN.ok&&rN.need===1&&/more than one cube fits the other five/.test(rN.errors[0]),'the red face is asked for: '+rN.errors);
// A misread on five faces that fits no cube asks for the sixth face too.
const cB=randomCube(),fB=scanOf(cB).filter(fc=>fc.stickers[4]!==3);
const k=fB.findIndex(fc=>fc.stickers.some((x,p)=>p!==4&&x===0));fB[k].stickers=fB[k].stickers.map((x,p)=>p!==4&&x===0?2:x);
const rB=T.assembleScan(fB);assert.ok(!rB.ok||rB.fits.length,'a misread gives a fit or asks for the face');
if(!rB.ok)assert.ok(rB.need===3&&/Show the yellow face too/.test(rB.errors[0]),'the yellow face is asked for: '+rB.errors);
console.log('scan-assemble: five faces ok');

// ----- faces with no center: the 2x2 and the 4x4 -----
// Any reading can be any side, at any turn. The right cube must be among the fits, however
// the cube was held; the first fit is right in most cases.
const F=run(`({scanSize,applyPerm,assembleFree,canonicalKey,twoFacelets,twoScramble,edgeColor})`);
const S2=F.scanSize(2),S4=F.scanSize(4),S3=F.scanSize(3);
function splitHeld(f,n){
  const cells=n*n,held=F.applyPerm(f,F.scanSize(n).rots[rnd(24)]),faces=[];
  for(let k=0;k<6;k++)faces.push({stickers:T.rotateFace(held.slice(cells*k,cells*k+cells),rnd(4)),margins:new Array(cells).fill(10)});
  for(let k=5;k>0;k--){const j=rnd(k+1);[faces[k],faces[j]]=[faces[j],faces[k]];}
  return faces;
}
const random2=i=>F.twoFacelets(T.applyAlg(new T.Cube(),F.twoScramble('scan-'+i,11)));
// A 4x4 state: the corners of a random 3x3, every edge pair on two wings at random slots,
// and four center tiles of each color. (js/four.js, with real 4x4 moves, is not loaded here.)
function random4(){
  const f3=randomCube().toFacelets(),f=new Array(96).fill(-1);
  for(const c4 of S4.corners){const fs=c4.idx.map(i=>Math.floor(i/16)).join();const c3=S3.corners.find(c=>c.idx.map(i=>Math.floor(i/9)).join()===fs);c4.idx.forEach((i,t)=>{f[i]=f3[c3.idx[t]];});}
  const pairs=[];for(const e of F.edgeColor)pairs.push(e,e);for(let k=pairs.length-1;k>0;k--){const j=rnd(k+1);[pairs[k],pairs[j]]=[pairs[j],pairs[k]];}
  S4.edges.forEach((e,t)=>{const p=pairs[t],flip=rnd(2);f[e.idx[0]]=p[flip];f[e.idx[1]]=p[1-flip];});
  const cen=[];for(let c=0;c<6;c++)for(let k=0;k<4;k++)cen.push(c);for(let k=cen.length-1;k>0;k--){const j=rnd(k+1);[cen[k],cen[j]]=[cen[j],cen[k]];}
  let t=0;for(let i=0;i<96;i++)if(f[i]<0)f[i]=cen[t++];
  return f;
}
for(const [n,make,M] of [[2,random2,300],[4,random4,120]]){
  let first=0,among=0,amb=0;const t1=Date.now();
  for(let i=0;i<M;i++){
    const f=make(i),key=F.canonicalKey(f,n),r=F.assembleFree(splitHeld(f,n),n);
    assert.ok(r.ok,`${n}x${n}: legal cube rejected: ${r.errors}`);assert.strictEqual(r.changes.length,0);
    assert.ok(r.slots.every(Boolean),'every side has a reading');
    if(n===2)assert.ok(r.cube&&r.cube.cp,'a 2x2 fit carries a Cube');
    if(F.canonicalKey(r.facelets,n)===key)first++;
    if(r.fits.some(x=>F.canonicalKey(x.facelets,n)===key))among++;
    if(r.ambiguous)amb++;
  }
  console.log(`assemble ${n}x${n}: first fit right ${first}/${M}, right cube among the fits ${among}/${M}, ${amb} with more than one fit, ${((Date.now()-t1)/M).toFixed(1)} ms each`);
  assert.strictEqual(among,M,`${n}x${n}: the right cube was not among the fits`);
  assert.ok(first>=M*(n===2?0.93:0.99),`${n}x${n}: the first fit is wrong too often`);
}
// A seventh face (a misread of one of the six) is left out when the other six fit.
let seven=0;
for(let i=0;i<40;i++){
  const f=random2(1000+i),faces=splitHeld(f,2);
  const bad={stickers:faces[2].stickers.slice(),margins:[10,10,10,10]};bad.stickers[1]=(bad.stickers[1]+1)%6;faces.splice(2,0,bad);
  const r=F.assembleFree(faces,2);
  if(r.ok&&!r.used.includes(2)&&r.fits.some(x=>F.canonicalKey(x.facelets,2)===F.canonicalKey(f,2)))seven++;
}
console.log(`assemble 2x2: a misread seventh face left out ${seven}/40`);assert.ok(seven>=38);
// One red sticker read as orange, with a low margin, is put back.
let mended=0;
for(let i=0;i<40;i++){
  const f=random2(2000+i),faces=splitHeld(f,2);
  const spots=[];faces.forEach((fc,fi)=>fc.stickers.forEach((x,p)=>{if(x===1||x===4)spots.push([fi,p]);}));
  const [fi,p]=spots[rnd(spots.length)];faces[fi].stickers[p]=5-faces[fi].stickers[p];faces[fi].margins[p]=1;
  const r=F.assembleFree(faces,2);
  if(r.ok&&r.changes.length===1&&r.fits.some(x=>F.canonicalKey(x.facelets,2)===F.canonicalKey(f,2)))mended++;
}
console.log(`assemble 2x2: one sticker repaired ${mended}/40`);assert.ok(mended>=36);
// Errors in plain words.
assert.match(F.assembleFree(splitHeld(random2(5),2).slice(0,4),2).errors[0],/^Show 2 more faces\.$/);
const wrong=splitHeld(random2(6),2);wrong[0].stickers=[0,0,0,0];wrong[1].stickers=[0,0,0,0];
assert.match(F.assembleFree(wrong,2).errors[0],/^Each color must appear 4 times/);
console.log('scan-assemble: free faces ok');
// The stickers-in-space model reproduces the engine's corner and edge tables at n=3.
const key3=a=>a.slice().sort((x,y)=>x-y).join();
assert.strictEqual(S3.corners.length,8);assert.strictEqual(S3.edges.length,12);assert.strictEqual(S3.rots.length,24);
assert.ok(S3.corners.every(c=>T.cornerFacelet.some(fl=>fl.join()===c.idx.join())),'3x3 corners in the engine order');
assert.ok(S3.edges.every(e=>T.edgeFacelet.some(fl=>key3(fl)===key3(e.idx))),'3x3 edges');
const spun=randomCube(),fy=T.applyAlg(spun,['y']).toFacelets();
assert.ok(S3.rots.some(p=>F.applyPerm(spun.toFacelets(),p).join()===fy.join()),'one of the 24 holdings is y');
console.log('scan-assemble: geometry ok');
