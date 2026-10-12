// The 2×2 engine: stickers, the solved test, scrambles, the frame, the search, the table and
// optimal solutions, a scramble for any corner state, and 24-sticker validation.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/two.js');
const Cube=run('Cube'),applyAlg=run('applyAlg'),randomMoveScramble=run('randomMoveScramble');
const twoFacelets=run('twoFacelets'),twoSolved=run('twoSolved'),twoScramble=run('twoScramble'),twoAlign=run('twoAlign'),twoSearch=run('twoSearch'),twoAnyFace=run('twoAnyFace'),twoFaceOf=run('twoFaceOf'),twoLayerSolid=run('twoLayerSolid'),buildTwoTable=run('buildTwoTable'),twoOptimal=run('twoOptimal'),twoDistance=run('twoDistance'),twoScrambleFor=run('twoScrambleFor'),twoFromFacelets=run('twoFromFacelets'),twoRotationTo=run('twoRotationTo');
const S=new Cube();
const f0=twoFacelets(S);assert.strictEqual(f0.length,24);assert.deepStrictEqual([...f0],[0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5],'24 stickers, face order U R F D L B');
assert.ok(twoSolved(S));assert.ok(twoSolved(applyAlg(S,['y','x2'])),'a turned cube is solved');assert.ok(!twoSolved(applyAlg(S,['R'])));
assert.ok(twoSolved(applyAlg(S,['R','L\''])),'R and L\' leave a solved 2×2 (one cube, two names)');
// scrambles: R U F only, no face twice in a row, repeatable
const sc=twoScramble('otter',11);assert.strictEqual(sc.length,11);assert.ok(sc.every(m=>/^[RUF]['2]?$/.test(m)));assert.ok(sc.every((m,i)=>!i||m[0]!==sc[i-1][0]));
assert.deepStrictEqual([...twoScramble('otter',11)],[...sc]);assert.notDeepStrictEqual([...twoScramble('fox',11)],[...sc]);
// the frame and the table
const t0=Date.now();buildTwoTable();const ms=Date.now()-t0;const T=run('TWO_TABLE');
let n11=0,n255=0;for(const v of T){if(v===11)n11++;if(v===255)n255++;}
assert.strictEqual(n255,0,'every state is reached');assert.strictEqual(n11,2644,'God\'s number is 11 in face turns, 2644 states need it');
let total=0;
for(let i=0;i<200;i++){const c=applyAlg(S,twoScramble('s'+i,11));const o=twoOptimal(c);assert.deepStrictEqual([...o.rot],[],'an R U F scramble needs no turn to align');
  assert.ok(twoSolved(applyAlg(c,o.moves)),'optimal solves '+i);assert.strictEqual(o.moves.length,twoDistance(c));total+=o.moves.length;}
assert.ok(total/200>7&&total/200<10,'optimal solutions average about eight moves');
// any frame: a 3×3-style scramble moves the fixed corner; align turns the cube, the solution follows
for(let i=0;i<60;i++){const c=applyAlg(S,randomMoveScramble('r'+i,22));const a=twoAlign(c);assert.ok(a.cube.cp[6]===6&&a.cube.co[6]===0);assert.ok(a.rot.length<=2,'at most two turns');
  const o=twoOptimal(c);assert.ok(twoSolved(applyAlg(c,[...o.rot,...o.moves])),'optimal with a turn first '+i);
  const scr=twoScrambleFor(c);assert.ok(scr.every(m=>/^[URFDLB]['2]?$/.test(m)),'face moves only');assert.strictEqual(twoFacelets(applyAlg(S,scr)).join(),twoFacelets(c).join(),'the scramble gives the same stickers '+i);}
// search: a face, a white face, a layer
for(let i=0;i<40;i++){const c=twoAlign(applyAlg(S,twoScramble('f'+i,11))).cube;
  const m=twoSearch(c,twoAnyFace,9);assert.ok(m&&twoAnyFace(twoFacelets(applyAlg(c,m))),'a face '+i);
  const w=twoSearch(c,twoFaceOf(0),9);assert.ok(w&&twoFaceOf(0)(twoFacelets(applyAlg(c,w))),'the white face '+i);assert.ok(w.length>=m.length);
  const l=twoSearch(c,f=>twoLayerSolid(f,0)||twoLayerSolid(f,3),11);assert.ok(l&&(twoLayerSolid(twoFacelets(applyAlg(c,l)),0)||twoLayerSolid(twoFacelets(applyAlg(c,l)),3)),'a layer '+i);}
assert.deepStrictEqual([...twoSearch(S,twoAnyFace)],[],'a solved cube needs nothing');
assert.strictEqual(twoSearch(S,f=>false,3),null,'no goal within the depth: null');
// rotations
assert.deepStrictEqual([...twoRotationTo(S,c=>c.center[0]===3)],['x2'],'the shortest turn that puts yellow on top');
// 24-sticker validation
const ok=twoFromFacelets(twoFacelets(applyAlg(S,randomMoveScramble('v',20))));assert.ok(ok.ok);assert.strictEqual(twoFacelets(ok.cube).join(),twoFacelets(applyAlg(S,randomMoveScramble('v',20))).join());
const r1=twoFromFacelets(f0.map((x,i)=>i===0?1:x));assert.ok(!r1.ok&&/4 stickers/.test(r1.errors[0]));
const r2=twoFromFacelets(f0.map((x,i)=>i===0?-1:x));assert.ok(!r2.ok&&/not set/.test(r2.errors[0]));
const tw=twoFacelets(S);[tw[3],tw[4],tw[9]]=[tw[9],tw[3],tw[4]]; // the top front right corner's three tiles, turned onceconst r3=twoFromFacelets(tw);assert.ok(!r3.ok&&/twisted/.test(r3.errors[0]),'one twisted corner: '+r3.errors);
console.log(`two: table in ${ms} ms, optimal average ${(total/200).toFixed(1)} moves, search, scramble-for, validation ok`);
