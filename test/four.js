// The 4×4 engine: moves, notation, the 3×3 image, pieces, scrambles and validation.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/two.js','js/four.js');
const Cube=run('Cube'),applyAlg=run('applyAlg'),FourCube=run('FourCube'),fourApply=run('fourApply'),fourSolved=run('fourSolved'),fourTo54=run('fourTo54'),fourToCube=run('fourToCube'),fourScramble=run('fourScramble'),fourFromFacelets=run('fourFromFacelets'),parseFour=run('parseFour'),FOUR_DEDGES=run('FOUR_DEDGES'),fourPaired=run('fourPaired'),fourCentersSolid=run('fourCentersSolid'),fourAllPaired=run('fourAllPaired');
const S=run('FOUR_SOLVED');
assert.strictEqual(S.length,96);assert.ok(fourSolved(S));assert.ok(!fourSolved(fourApply(S,'R')));assert.ok(fourSolved(fourApply(S,'x y2 z')));
// outside turns agree with the 3×3 engine on the 3×3 image
for(const alg of ["R U R' U'","F D L2 B' U2 R","x y z2 R","L' B D' F2"])assert.strictEqual(fourTo54(fourApply(S,alg)).join(),applyAlg(new Cube(),alg).toFacelets().join(),alg);
// orders
const order=alg=>{let s=S,k=0;do{s=fourApply(s,alg);k++;}while(!fourSolved(s)&&k<2000);return k;};
assert.strictEqual(order('r'),4);assert.strictEqual(order('Rr'),4);assert.strictEqual(order('R U'),105);assert.ok(order("r U r' U'")>1);
// notation
assert.deepStrictEqual([...parseFour("R'r' Rw2 2R Uu U'u' D2d2")],["Rr'",'Rr2','r','Uu',"Uu'",'Dd2']);
assert.throws(()=>parseFour('M'));assert.throws(()=>parseFour('Rl'));
// a FourCube through applyAlg
const c=applyAlg(new FourCube(),"Rr U Rr'");assert.ok(c.isFour&&!c.isSolved());assert.ok(applyAlg(c,"Rr U' Rr'").isSolved());
// pieces: a slice turn breaks centers and pairs; outside turns never do
const t=fourApply(S,"r");assert.ok(!fourCentersSolid(t)&&!fourAllPaired(t));
const o=fourApply(S,"R U F' D L2 B");assert.ok(fourCentersSolid(o)&&fourAllPaired(o));
assert.strictEqual(FOUR_DEDGES.length,12);assert.ok(FOUR_DEDGES.every(e=>e.wings.length===2));
// the guide's algorithms: what each one changes
const changed=(a,test)=>test(fourApply(S,a));
assert.ok(changed("Rr U Rr'",x=>{const moved=[];for(let i=0;i<96;i++)if(x[i]!==S[i]&&[5,6,9,10].includes(i%16))moved.push(i);return moved.join()==='9,38';}),'the center insert swaps the top lower-left tile with the front upper-right one');
assert.ok(changed("Dd R F' U R' F Dd'",x=>fourCentersSolid(x)&&FOUR_DEDGES.filter(e=>!fourPaired(x,e)).length===2),'the pairing algorithm exchanges one wing between two front edges and keeps the centers');
{const x=fourToCube(fourApply(S,"r2 B2 U2 l U2 r' U2 r U2 F2 r F2 l' B2 r2"));assert.ok(x,'OLL parity leaves a reduced cube');assert.strictEqual(JSON.stringify(x.eo.map((v,i)=>v?i:-1).filter(v=>v>=0)),'[1]','it flips the front top edge only');assert.ok(x.cp.every((v,i)=>v===i)&&x.ep.every((v,i)=>v===i));}
{const x=fourToCube(fourApply(S,"r2 U2 r2 Uu2 r2 u2"));assert.ok(x,'PLL parity leaves a reduced cube');assert.strictEqual(JSON.stringify([x.ep[1],x.ep[3]]),'[3,1]','it swaps the front and back top edges');assert.ok(x.cp.every((v,i)=>v===i)&&x.eo.every(v=>!v));}
// a reduced cube held any way round reads as a Cube in that hold
{const x=fourApply(S,"z R U R' U' x'");const cube=fourToCube(x);assert.ok(cube);assert.strictEqual(cube.toFacelets().join(),fourTo54(x).join());}
assert.strictEqual(fourToCube(fourApply(S,'r')),null,'an unreduced cube has no 3×3 image');
// scrambles
const sc=fourScramble('otter',40);assert.strictEqual(sc.length,40);assert.ok(sc.every(m=>/^(?:[UDLRFB]|Uu|Rr|Ff)['2]?$/.test(m)));assert.ok(sc.every((m,i)=>!i||m[0]!==sc[i-1][0]));
// validation
assert.ok(fourFromFacelets(fourApply(S,sc)).ok);
const bad=S.slice();bad[0]=1;const r1=fourFromFacelets(bad);assert.ok(!r1.ok&&/16 stickers/.test(r1.errors[0]));
const bad2=S.slice();bad2[0]=4;bad2[16*4+5]=0;const r2=fourFromFacelets(bad2); // a corner with two orange tilesassert.ok(!r2.ok&&/no real piece/.test(r2.errors[0]),r2.errors.join());
console.log('four: moves, notation, 3×3 image, pieces, guide algorithms, scrambles, validation ok');
