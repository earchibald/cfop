// Stage 4: the frame voter. Unit checks on hand-made readings, then one end-to-end run:
// render six faces of a random cube frame by frame, read, vote, assemble, compare.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/two.js','js/scan-assemble.js','js/scan.js');
const T=run(`({makeVoter,voteFrame,readFace,rotateFace,assembleScan,Cube,applyAlg,FACE_MOVES})`);
const {render,rnd,U}=require('./synth-render');
const ok=colors=>({ok:true,colors,margins:new Array(9).fill(10)});

// Ten steady frames lock a face. Readings turn between frames; the voter aligns them.
let v=T.makeVoter();const face=[1,2,3,4,2,5,0,1,3];let ev;
for(let n=0;n<10;n++)ev=T.voteFrame(v,ok(T.rotateFace(face,n%4)));
assert.strictEqual(ev.event,'locked');assert.strictEqual(ev.center,2);
assert.ok([0,1,2,3].some(k=>T.rotateFace(face,k).join()===v.faces[2].stickers.join()));
// The same face, still in view, does not lock again.
for(let n=0;n<12;n++)ev=T.voteFrame(v,ok(face));assert.strictEqual(ev.event,'held');
// Two misread frames out of ten still lock with the right colors.
const f2=[0,0,1,1,3,4,5,5,2];
for(let n=0;n<10;n++){const r=f2.slice();if(n===3||n===6)r[0]=4;ev=T.voteFrame(v,ok(r));}
assert.strictEqual(ev.event,'locked');assert.strictEqual(v.faces[3].stickers.join(),f2.join());
// One stray frame with another center does not reset the tally.
for(let n=0;n<4;n++)T.voteFrame(v,ok([1,1,1,1,0,1,1,1,1]));
T.voteFrame(v,ok(face));
for(let n=0;n<5;n++)ev=T.voteFrame(v,ok([1,1,1,1,0,1,1,1,1]));
assert.strictEqual(v.run.length,9);
// Retake keeps pinned stickers, even when the new reading is turned.
v.faces[2].stickers[0]=5;v.faces[2].pinned[0]=true;const pinnedCol=v.faces[2].stickers.slice();
for(let n=0;n<10;n++)ev=T.voteFrame(v,ok(T.rotateFace(face,1)));
assert.strictEqual(ev.event,'locked');assert.ok(ev.retake);
const k=[0,1,2,3].find(k=>T.rotateFace(v.faces[2].stickers,k).join()===pinnedCol.join());
assert.ok(k!==undefined,'pinned sticker lost on retake');
// A different face with the same center color is a conflict, not a retake.
for(let n=0;n<12;n++)T.voteFrame(v,ok([1,1,1,1,0,1,1,1,1]));
const stored=v.faces[2].stickers.join(),other=[5,5,5,0,2,0,4,4,4];
for(let n=0;n<10;n++)ev=T.voteFrame(v,ok(other));
assert.strictEqual(ev.event,'conflict');assert.strictEqual(v.faces[2].stickers.join(),stored);
console.log('scan-vote: unit checks ok');

// End to end with synthetic frames, for a stickered and a glossy stickerless cube.
for(const style of ['stickers','stickerless']){
  const ms=[];for(let i=0;i<25;i++)ms.push(T.FACE_MOVES[Math.floor(U(0,18))]);
  const cube=T.applyAlg(new T.Cube(),ms),f=cube.toFacelets();
  v=T.makeVoter();let frames=0;const order=[2,0,1,5,3,4];
  for(const c of order){
    const truth=f.slice(9*c,9*c+9);let locked=false;
    for(let n=0;n<60&&!locked;n++){frames++;const e=T.voteFrame(v,T.readFace(render(truth,320,240,false,style)));locked=e.event==='locked';}
    assert.ok(locked,`${style}: face did not lock: ${c}`);
  }
  const res=T.assembleScan(Object.values(v.faces));
  assert.ok(res.ok,`${style}: cube not legal: ${res.errors}`);assert.ok(res.cube.equals(cube),`${style}: wrong cube`);
  console.log(`scan-vote: ${style} end to end ok, ${frames} frames for six faces${res.changes.length?', '+res.changes.join(' '):''}`);
}

// ----- the 2x2 and the 4x4: faces with no center, named by their own stickers -----
const F=run(`({scanSize,applyPerm,assembleFree,canonicalKey,twoFacelets,twoScramble,edgeColor,scanWidth})`);
// Unit checks: a reading that agrees with the face in view stays with it; a reading that
// differs starts a new face; a reading that equals a face read before is a retake of it.
v=T.makeVoter({n:2});const fa=[0,1,2,3],fb=[0,1,2,5],fc=[4,4,5,5];
for(let i=0;i<10;i++)ev=T.voteFrame(v,{ok:true,colors:T.rotateFace(fa,i%4),margins:[10,10,10,10]});
assert.strictEqual(ev.event,'locked');assert.strictEqual(v.order.join(),String(ev.center));const idA=ev.center;
for(let i=0;i<5;i++)ev=T.voteFrame(v,{ok:true,colors:fb,margins:[10,10,10,10]}); // one cell off: still the face in view
assert.strictEqual(ev.event,'held','a reading one cell off stays with the face in view');
for(let i=0;i<10;i++)ev=T.voteFrame(v,{ok:true,colors:fc,margins:[10,10,10,10]});
assert.strictEqual(ev.event,'locked');assert.notStrictEqual(ev.center,idA);assert.strictEqual(v.order.length,2);
for(let i=0;i<10;i++)ev=T.voteFrame(v,{ok:true,colors:T.rotateFace(fa,2),margins:[10,10,10,10]});
assert.strictEqual(ev.event,'locked');assert.ok(ev.retake);assert.strictEqual(ev.center,idA,'the first face again, turned, is a retake');
assert.strictEqual(v.order.length,2);
console.log('scan-vote: free faces unit checks ok');
// End to end: six faces of a random cube, any order, any turn, held any way.
function random4(){
  const S4=F.scanSize(4),S3=F.scanSize(3),ms=[];for(let i=0;i<25;i++)ms.push(T.FACE_MOVES[Math.floor(U(0,18))]);
  const f3=T.applyAlg(new T.Cube(),ms).toFacelets(),f=new Array(96).fill(-1),pick=n=>Math.floor(U(0,n));
  for(const c4 of S4.corners){const fs=c4.idx.map(i=>Math.floor(i/16)).join();const c3=S3.corners.find(c=>c.idx.map(i=>Math.floor(i/9)).join()===fs);c4.idx.forEach((i,t)=>{f[i]=f3[c3.idx[t]];});}
  const pairs=[];for(const e of F.edgeColor)pairs.push(e,e);for(let k=pairs.length-1;k>0;k--){const j=pick(k+1);[pairs[k],pairs[j]]=[pairs[j],pairs[k]];}
  S4.edges.forEach((e,t)=>{const p=pairs[t],flip=pick(2);f[e.idx[0]]=p[flip];f[e.idx[1]]=p[1-flip];});
  const cen=[];for(let c=0;c<6;c++)for(let k=0;k<4;k++)cen.push(c);for(let k=cen.length-1;k>0;k--){const j=pick(k+1);[cen[k],cen[j]]=[cen[j],cen[k]];}
  let t=0;for(let i=0;i<96;i++)if(f[i]<0)f[i]=cen[t++];
  return f;
}
for(const [n,style] of [[2,'stickers'],[2,'stickerless'],[4,'stickers'],[4,'stickerless']]){
  const cells=n*n,W=F.scanWidth(n),H=W*3/4;
  const f=n===2?F.twoFacelets(T.applyAlg(new T.Cube(),F.twoScramble('vote-'+style,11))):random4();
  const held=F.applyPerm(f,F.scanSize(n).rots[Math.floor(U(0,24))]);
  v=T.makeVoter({n});let frames=0;const order=[2,0,1,5,3,4];
  for(const c of order){
    const truth=T.rotateFace(held.slice(cells*c,cells*c+cells),Math.floor(U(0,4)));let locked=false;
    for(let k=0;k<80&&!locked;k++){frames++;const e=T.voteFrame(v,T.readFace(render(truth,W,H,false,style),{n}));locked=e.event==='locked';}
    assert.ok(locked,`${n}x${n} ${style}: a face did not lock`);
  }
  assert.strictEqual(v.order.length,6,`${n}x${n} ${style}: six faces, no stray ones: ${v.order.length}`);
  const res=F.assembleFree(v.order.map(id=>v.faces[id]),n);
  assert.ok(res.ok,`${n}x${n} ${style}: cube not legal: ${res.errors}`);
  const key=F.canonicalKey(f,n);
  assert.ok(res.fits.some(x=>F.canonicalKey(x.facelets,n)===key),`${n}x${n} ${style}: the scanned cube is not among the fits`);
  console.log(`scan-vote: ${n}x${n} ${style} end to end ok, ${frames} frames for six faces${res.changes.length?', '+res.changes.join(' '):''}${res.fits.length>1?', '+res.fits.length+' fits':''}`);
}
