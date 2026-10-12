// The 4×4 beginner method: the data, the parity cases, and the solver on random scrambles with
// only the guide's moves, holds and rules.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/two.js','js/four.js','js/beginner.js','js/master.js');
const FourCube=run('FourCube'),fourApply=run('fourApply'),fourSolved=run('fourSolved'),fourScramble=run('fourScramble'),fourCentersSolid=run('fourCentersSolid'),fourAllPaired=run('fourAllPaired'),fourToCube=run('fourToCube'),parseAlg=run('parseAlg'),invertAlg=run('invertAlg');
const solveMaster=run('solveMaster'),masterChunks=run('masterChunks'),STEPS=run('MASTER_STEPS'),ALGS=run('MASTER_ALGS');
const S=run('FOUR_SOLVED');const J=JSON.stringify;
const MOVE=/^(?:[URFDLB]|[urfdlb]|[URFDLB][urfdlb])['2]?$|^[xyz]['2]?$/;
// ----- the data -----
assert.strictEqual(STEPS.length,11,'Basics, centers, edges and the eight 3×3 steps');
STEPS.forEach((s,i)=>{assert.strictEqual(s.n,i);assert.ok(s.name&&s.goal&&s.what&&s.how&&s.note,'step '+i+' has prose');
  for(const a of (s.algs||[]))assert.ok(ALGS[a],'step '+i+' names a known algorithm: '+a);
  for(const c of (s.cases||[])){if(c.moves)parseAlg(c.moves).forEach(m=>assert.ok(MOVE.test(m),'case move '+m));if(c.setup)parseAlg(c.setup).forEach(m=>assert.ok(MOVE.test(m),'setup move '+m));}});
for(const k in ALGS){const a=ALGS[k];assert.strictEqual(a.id,k);assert.ok(a.name&&a.say&&a.step&&a.why);parseAlg(a.alg).forEach(m=>assert.ok(MOVE.test(m),m));
  if(a.parts)assert.strictEqual(a.parts.reduce((n,[len])=>n+len,0),parseAlg(a.alg).length,k);}
assert.strictEqual(J(masterChunks("F Dd R F' U R' F Dd'").map(c=>c.at)),J([1,2,3,4,5,6,7]),'the pairing chant boxes word by word after a setup move');
assert.strictEqual(J(masterChunks(ALGS.pllParity.alg).map(c=>c.label)),J(['Are you?','Are you you?','Are you?']));
// ----- the parity cases of steps 7 and 10 start where their text says -----
const Y=fourApply(S,'z2');const UP_EDGE=[1,2,4,8,7,11,13,14];
{const c=STEPS[7].cases.find(c=>/parity/.test(c.name));const start=fourApply(Y,invertAlg(c.moves));const up=UP_EDGE.filter(i=>start[i]===3).length;assert.strictEqual(up,6,'three yellow edges up, the gap at the front: '+up);
  assert.ok(start[13]!==3&&start[14]!==3,'the gap is at the front');assert.ok(UP_EDGE.every(i=>fourApply(start,c.moves)[i]===3),'the parity algorithm completes the cross');}
// which top edges sit in their places: the side sticker matches the center under it
const edgeFacelet=run('edgeFacelet');const rightEdges=s=>{const f=fourToCube(s).toFacelets();return ['UR','UF','UL','UB'].filter((k,i)=>{const b=edgeFacelet[i][1];return f[b]===f[9*Math.floor(b/9)+4];});};
{const c=STEPS[10].cases.find(c=>/across/.test(c.name));const start=fourApply(Y,invertAlg(c.moves));assert.ok(fourToCube(start));
  assert.strictEqual(JSON.stringify(rightEdges(start)),'["UR","UL"]','left and right edges right, front and back swapped');assert.ok(fourSolved(fourApply(start,c.moves)));}
{const c=STEPS[10].cases.find(c=>/next to/.test(c.name));const start=fourApply(Y,invertAlg(c.moves));assert.ok(fourToCube(start));
  assert.strictEqual(JSON.stringify(rightEdges(start)),'["UL","UB"]','the left and back edges are right: '+JSON.stringify(rightEdges(start)));assert.ok(fourSolved(fourApply(start,c.moves)));}
// ----- the solver -----
let total=0,max=0,parts=0,oll=0,pll=0;const N=40;const t0=Date.now();
for(let i=0;i<N;i++){
  const rot=[[],['y'],['x'],["z'",'y'],['x2']][i%5];
  const start=new FourCube(fourApply(S,[...fourScramble('master-'+i,40),...rot]));
  const plan=solveMaster(start);
  assert.ok(plan.solved,'scramble '+i+' ends solved');
  assert.ok(fourSolved(fourApply(start.s,plan.moves)),'the flat move list solves it too');
  assert.strictEqual(plan.stages.map(s=>s.n).join(),'1,2,3,4,5,6,7,8,9,10','ten stages in order');
  for(const st of plan.stages)for(const p of st.parts){parts++;assert.ok(p.title&&p.text,'every part has a title and text');assert.strictEqual(p.up,'white');
    for(const m of [...parseAlg(p.pre),...p.moves])assert.ok(MOVE.test(m),'move '+m);
    if(p.pre)assert.ok(parseAlg(p.pre).every(m=>/^[xyz]/.test(m)),'a hold is whole-cube turns: '+p.pre);
    if(st.n<=2)assert.ok(p.moves.every(m=>!/^[xyz]/.test(m)));
    if(st.n>=3)assert.ok(p.moves.every(m=>/^[URFDLB]['2]?$/.test(m))||p.alg==='ollParity'||p.alg==='pllParity','the 3×3 part uses outside turns, except the parity fixes: '+p.moves.join(' '));
    if(p.alg==='ollParity')oll++;if(p.alg==='pllParity')pll++;}
  let c=start.s;const atEnd=[];for(const st of plan.stages){for(const p of st.parts)c=fourApply(c,[...parseAlg(p.pre),...p.moves]);atEnd.push(c);}
  assert.ok(fourCentersSolid(atEnd[0]),'centers after stage 1');assert.ok(fourAllPaired(atEnd[1])&&fourCentersSolid(atEnd[1]),'edges paired after stage 2');
  const img7=fourToCube(atEnd[6]);assert.ok(img7&&[1,3,5,7].every(k=>img7.toFacelets()[k]===img7.toFacelets()[4]),'the yellow cross after stage 7');
  total+=plan.moves.length;max=Math.max(max,plan.moves.length);
}
console.log(`master: ${N} random cubes solved in ${Date.now()-t0} ms, ${Math.round(total/N)} moves on average, ${max} at most, ${Math.round(parts/N)} parts each, OLL parity in ${oll}, PLL parity in ${pll}`);
assert.ok(oll>0&&pll>0,'both parities came up');
console.log('master: ok');
