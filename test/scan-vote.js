// Stage 4: the frame voter. Unit checks on hand-made readings, then one end-to-end run:
// render six faces of a random cube frame by frame, read, vote, assemble, compare.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/scan-assemble.js','js/scan.js');
const T=run(`({makeVoter,voteFrame,readFace,rotateFace,assembleScan,Cube,applyAlg,FACE_MOVES})`);
const {render,rnd,U}=require('./synth-render');
const ok=colours=>({ok:true,colours,margins:new Array(9).fill(10)});

// Ten steady frames lock a face. Readings turn between frames; the voter aligns them.
let v=T.makeVoter();const face=[1,2,3,4,2,5,0,1,3];let ev;
for(let n=0;n<10;n++)ev=T.voteFrame(v,ok(T.rotateFace(face,n%4)));
assert.strictEqual(ev.event,'locked');assert.strictEqual(ev.centre,2);
assert.ok([0,1,2,3].some(k=>T.rotateFace(face,k).join()===v.faces[2].stickers.join()));
// The same face, still in view, does not lock again.
for(let n=0;n<12;n++)ev=T.voteFrame(v,ok(face));assert.strictEqual(ev.event,'held');
// Two misread frames out of ten still lock with the right colours.
const f2=[0,0,1,1,3,4,5,5,2];
for(let n=0;n<10;n++){const r=f2.slice();if(n===3||n===6)r[0]=4;ev=T.voteFrame(v,ok(r));}
assert.strictEqual(ev.event,'locked');assert.strictEqual(v.faces[3].stickers.join(),f2.join());
// One stray frame with another centre does not reset the tally.
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
// A different face with the same centre colour is a conflict, not a retake.
for(let n=0;n<12;n++)T.voteFrame(v,ok([1,1,1,1,0,1,1,1,1]));
const stored=v.faces[2].stickers.join(),other=[5,5,5,0,2,0,4,4,4];
for(let n=0;n<10;n++)ev=T.voteFrame(v,ok(other));
assert.strictEqual(ev.event,'conflict');assert.strictEqual(v.faces[2].stickers.join(),stored);
console.log('scan-vote: unit checks ok');

// End to end with synthetic frames.
const ms=[];for(let i=0;i<25;i++)ms.push(T.FACE_MOVES[Math.floor(U(0,18))]);
const cube=T.applyAlg(new T.Cube(),ms),f=cube.toFacelets();
v=T.makeVoter();let frames=0;const order=[2,0,1,5,3,4];
for(const c of order){
  const truth=f.slice(9*c,9*c+9);let locked=false;
  for(let n=0;n<40&&!locked;n++){frames++;const e=T.voteFrame(v,T.readFace(render(truth)));locked=e.event==='locked';}
  assert.ok(locked,'face did not lock: '+c);
}
const res=T.assembleScan(Object.values(v.faces));
assert.ok(res.ok,'cube not legal: '+res.errors);assert.ok(res.cube.equals(cube),'wrong cube');
console.log(`scan-vote: end to end ok, ${frames} frames for six faces${res.changes.length?', repairs: '+res.changes.join(' '):''}`);
