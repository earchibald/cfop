// The 2×2 beginner method: the guide's algorithms do what the guide says from the holds it gives,
// the lesson cases start where their text says, and the solver solves random cubes with only the
// guide's moves, holds and rules.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/two.js','js/mini.js');
const Cube=run('Cube'),applyAlg=run('applyAlg'),invertAlg=run('invertAlg'),parseAlg=run('parseAlg'),randomMoveScramble=run('randomMoveScramble');
const twoSolved=run('twoSolved'),twoScramble=run('twoScramble'),twoFacelets=run('twoFacelets'),twoLayerSolid=run('twoLayerSolid'),twoFaceSolid=run('twoFaceSolid');
const solveMini=run('solveMini'),miniChunks=run('miniChunks'),STEPS=run('MINI_STEPS'),ALGS=run('MINI_ALGS'),cornerFacelet=run('cornerFacelet');
const S=new Cube(),Y=applyAlg(S,['z2']);const fl=c=>c.toFacelets();const J=JSON.stringify;
const FACE=/^(?:[URFDLB]['2]?|[xyz]['2]?)$/;
// ----- the data -----
assert.strictEqual(STEPS.length,6,'Basics plus five steps');
STEPS.forEach((s,i)=>{assert.strictEqual(s.n,i);assert.ok(s.name&&s.goal&&s.what&&s.how&&s.note,'step '+i+' has prose');
  for(const a of (s.algs||[]))assert.ok(ALGS[a],'step '+i+' names a known algorithm: '+a);
  for(const c of (s.cases||[])){if(c.moves)parseAlg(c.moves).forEach(m=>assert.ok(FACE.test(m),'case move '+m));if(c.setup)parseAlg(c.setup).forEach(m=>assert.ok(FACE.test(m),'setup move '+m));}});
for(const k in ALGS){const a=ALGS[k];assert.strictEqual(a.id,k);assert.ok(a.name&&a.say&&a.step&&a.why);parseAlg(a.alg).forEach(m=>assert.ok(/^[URFDLB]['2]?$/.test(m)));
  if(a.parts)assert.strictEqual(a.parts.reduce((n,[len])=>n+len,0),parseAlg(a.alg).length);}
assert.strictEqual(J(miniChunks("D R' D' R").map(c=>[c.label,c.at,c.len])),J([["R', D', R",1,3]]),'a bottom turn before the algorithm is not part of it');
assert.strictEqual(J(miniChunks(ALGS.yellowFace.alg).map(c=>c.at)),J([0,3,4]),'Up Over Down boxes in three');
// ----- the algorithms from the holds the guide gives (white up, slot at the top front right) -----
const whiteOn=(c,pos)=>'URFDLB'[Math.floor(cornerFacelet[pos][c.co[pos]]/9)];
const keep=(c,list)=>list.every(i=>c.cp[i]===i&&c.co[i]===0);
{const c=applyAlg(S,invertAlg('R'));assert.strictEqual(c.cp[4],0);assert.strictEqual(whiteOn(c,4),'F','R: white faces you');}
{const c=applyAlg(S,invertAlg(ALGS.cornerDown.alg));assert.strictEqual(c.cp[4],0);assert.strictEqual(whiteOn(c,4),'R',"R' D' R: white faces right");assert.ok(keep(c,[1,2,3]),'and keeps the other three');}
{const c=applyAlg(S,invertAlg('D R2'));assert.strictEqual(c.cp[4],0);assert.strictEqual(whiteOn(c,4),'D','D R2: white faces down');}
{const c=applyAlg(S,invertAlg(ALGS.cornerIn.alg));assert.strictEqual(c.cp[4],0);assert.strictEqual(whiteOn(c,4),'F','Corner in: white faces you');assert.ok(keep(c,[1,2,3]));}
{const c=applyAlg(S,invertAlg(ALGS.cornerFront.alg+' '+ALGS.cornerIn.alg));assert.strictEqual(c.cp[4],0);assert.strictEqual(whiteOn(c,4),'D','White to the front: before it white faces down');assert.ok(keep(c,[1,2,3]));}
{const c=applyAlg(S,['R']);assert.strictEqual(c.cp[3],0);assert.strictEqual(whiteOn(c,3),'B',"R' puts in a corner at the back right with white facing back");}
{const c=applyAlg(S,ALGS.cornerDown.alg);assert.ok(c.cp.indexOf(0)>=4,'Corner down moves the front right corner to the bottom');assert.ok(keep(c,[1,2,3]));}
// Yellow face, yellow up: Top one. One yellow tile at the front left, yellow on the front at the right.
{const c=applyAlg(Y,invertAlg(ALGS.yellowFace.alg));const f=fl(c);assert.strictEqual(f[6],3);assert.strictEqual(f[20],3);assert.ok([0,2,8].every(i=>f[i]!==3));}
// Yellow corners: the chant swaps the two front corners on top, so the matching pair goes at the back.
{const c=applyAlg(S,ALGS.yellowCorners.alg);assert.deepStrictEqual([...c.cp],[1,0,2,3,4,5,6,7]);assert.ok(c.co.every(x=>x===0));}
// ----- the lesson cases start where the text says -----
const hold=n=>n>=4?Y:S;
const caseStart=(n,c)=>c.setup?applyAlg(hold(n),parseAlg(c.setup)):applyAlg(hold(n),invertAlg(c.moves));
for(const s of STEPS)for(const c of (s.cases||[])){
  const st=caseStart(s.n,c);const end=applyAlg(st,c.moves);
  if(s.n>=1&&s.n<=3){
    const prev=[[],[1],[1,2],[1,2,3]][s.n];assert.ok(keep(st,prev),`${s.name} / ${c.name}: the placed corners are placed at the start`);
    assert.ok(keep(end,prev),`${s.name} / ${c.name}: they stay`);
    const pos=st.cp.indexOf(0);
    if(/^Top layer|^Back right|^Front right/.test(c.name)){assert.ok(pos<4&&!(pos===0&&st.co[0]===0),`${s.name} / ${c.name}: the corner is on top, not placed (at ${pos})`);
      if(/Back right/.test(c.name))assert.strictEqual(pos,3);if(/Front right/.test(c.name))assert.strictEqual(pos,0);
      if(/facing back/.test(c.name))assert.strictEqual(whiteOn(st,3),'B');if(/up or facing right/.test(c.name))assert.ok('UR'.includes(whiteOn(st,3)));
      if(/one turn|R'$/.test(c.text)||c.moves==="R'")assert.ok(end.cp[0]===0&&end.co[0]===0);else assert.ok(end.cp.indexOf(0)>=4,`${c.name}: ends in the bottom layer`);}
    else{assert.strictEqual(pos,4,`${c.name}: at the bottom right of the front`);const w={'you':'F','right':'R','down':'D'}[c.name.match(/facing (\w+)/)[1]];assert.strictEqual(whiteOn(st,4),w,`${c.name}: white on ${w}`);
      assert.ok(end.cp[0]===0&&end.co[0]===0,`${c.name}: placed at the end`);}
  }
  if(s.n===4){const f=fl(st);const n=[0,2,6,8].filter(i=>f[i]===3).length;const want=/^One/.test(c.name)?1:/^No/.test(c.name)?0:2;assert.strictEqual(n,want,c.name);
    if(want===1)assert.strictEqual(f[6],3);if(want===0)assert.strictEqual(f[38],3);if(want===2)assert.strictEqual(f[18],3);
    assert.ok(twoLayerSolid(twoFacelets(st),3),'the white layer stays below');}
  if(s.n===5){assert.ok(twoFaceSolid(twoFacelets(st),0)&&twoLayerSolid(twoFacelets(st),3));if(/next to/.test(c.name))assert.ok(twoSolved(end));}
}
// ----- the solver -----
const ALLOWED=/^(?:[URFDLB]['2]?|[xyz]['2]?)$/;
let total=0,max=0,parts=0;
const adjacentWhitePair=c=>{const f=fl(c);for(const [a,b,face] of [[0,3,1],[0,1,2],[1,2,4],[2,3,5]]){const fa=cornerFacelet[a],fb=cornerFacelet[b];if(f[fa[0]]!==0||f[fb[0]]!==0)continue;const sa=fa.find(x=>Math.floor(x/9)===face),sb=fb.find(x=>Math.floor(x/9)===face);if(f[sa]===f[sb])return true;}return false;};
for(let i=0;i<300;i++){
  // a 2×2 scramble, held any way round
  const rot=[[],['y'],['x'],['z',"y'"],['x2'],["z'"]][i%6];
  const start=applyAlg(S,[...twoScramble('mini-'+i,11),...rot]);
  const plan=solveMini(start);
  assert.ok(plan.solved,'scramble '+i+' ends solved');
  assert.ok(twoSolved(applyAlg(start,plan.moves)),'the flat move list solves it too');
  assert.strictEqual(plan.stages.length,5);
  for(const s of plan.stages)for(const p of s.parts){parts++;assert.ok(p.title&&p.text,'every part has a title and text');
    assert.strictEqual(p.up,s.n<=3?'white':'yellow');
    for(const m of [...parseAlg(p.pre),...p.moves])assert.ok(ALLOWED.test(m),'move '+m);
    if(p.pre){const ms=parseAlg(p.pre);assert.ok(ms.length<=2&&ms.every(m=>/^[xyz]/.test(m)),'a hold is one or two whole-cube turns');if(!(s.n===1&&p.title==='Hold your Mini'))assert.ok(ms.every(m=>/^y/.test(m)),'later holds turn about the vertical: '+p.pre);}
    assert.ok(p.moves.length<=14);}
  let c=start,up='white';const atEnd=[];
  for(const s of plan.stages){for(const p of s.parts){if(p.up!==up){c=applyAlg(c,['z2']);up=p.up;}c=applyAlg(c,[...parseAlg(p.pre),...p.moves]);}atEnd.push(s.n>=4&&up==='white'?applyAlg(c,['z2']):c);} // a stage with no parts: seen as the next stage holds it
  assert.ok(adjacentWhitePair(atEnd[0]),'two white corners next to each other after stage 1');
  const f3=twoFacelets(atEnd[2]);assert.ok(twoLayerSolid(f3,0),'the white layer on top after stage 3');
  const f4=twoFacelets(atEnd[3]);assert.ok(twoFaceSolid(f4,0)&&f4[0]===3&&twoLayerSolid(f4,3),'yellow face up, white layer down after stage 4');
  assert.ok(twoSolved(atEnd[4]));
  total+=plan.moves.length;max=Math.max(max,plan.moves.length);
}
console.log(`mini: 300 random cubes solved, ${Math.round(total/300)} moves on average, ${max} at most, ${Math.round(parts/300)} parts each`);
// The yellow face rule finishes within three rounds from every corner twist state; the chant at most twice.
{const C=["R U R' U R U2 R'","R U2 R' U' R U' R'","R2 U2 R U2 R2","R U2 R2 U' R2 U' R2 U2 R","F R' F' R U R U' R'","R U R' U' R' F R F'","F R U R' U' F'"];
  for(const alg of C)for(const auf of ['','U',"U'",'U2']){const c=applyAlg(S,['z2',...parseAlg(invertAlg(alg)),...(auf?[auf]:[]),'z2']);const plan=solveMini(c);
    assert.ok(plan.solved);const st=plan.stages[3];assert.ok(st.parts.length>0&&st.parts.length<=3,'yellow face in at most 3 rounds: '+alg);
    assert.ok(plan.stages[4].parts.filter(p=>p.alg==='yellowCorners').length<=2,'the chant at most twice');}}
console.log('mini: ok');
