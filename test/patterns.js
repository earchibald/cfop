// Pattern recognition (js/patterns.js): the cross at a scramble, each free pair as one of the 41
// F2L cases, the two-look OLL and PLL cases, the once-only rule, and the moves as held.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/algs.js','js/stage.js','js/f2l.js','js/patterns.js');
const Cube=run('Cube'),applyAlg=run('applyAlg'),invertAlg=run('invertAlg'),parseAlg=run('parseAlg'),randomMoveScramble=run('randomMoveScramble');
const F2L_CASES=run('F2L_CASES'),ALG_DB=run('ALG_DB'),cfopStage=run('cfopStage'),reframe=run('reframe'),slotSolved=run('slotSolved'),SLOTS=run('SLOTS');
const patCross=run('patCross'),patCrossMade=run('patCrossMade'),patF2L=run('patF2L'),patLL=run('patLL'),patTracker=run('patTracker'),patStep=run('patStep');
const S=new Cube(),ALL={cross:true,f2l:true,ll:true},inv=a=>parseAlg(invertAlg(a));
// The holds a user may take: the moves that come out must read as held.
const HOLDS=['','y','x2',"z y'",'x'];
// The F2L cases: each of the 41, set up in the front right slot, is named as itself, and its moves
// solve the pair as the cube is held.
for(const f of F2L_CASES){
  for(const h of HOLDS){
    const c=applyAlg(S,[...inv(f.alg),...(h?parseAlg(h):[])]),ps=patF2L(c,'yellow');
    assert.ok(ps&&ps.length===1,`case ${f.n} held ${h}: one free pair`);
    assert.strictEqual(ps[0].n,f.n,`case ${f.n} held ${h}`);
    assert.ok(applyAlg(c,ps[0].moves.map(String)).isSolved()||cfopStage(applyAlg(c,ps[0].moves)).stage==='solved',`case ${f.n} held ${h}: the moves solve it`);
  }
}
// The pair's place and colors are named as held.
{const c=applyAlg(S,inv(F2L_CASES[0].alg)),p=patF2L(c,'yellow')[0];assert.strictEqual(p.slot,'FR');assert.strictEqual(p.pos,'front right');
  const c2=applyAlg(c,'x2'),p2=patF2L(c2,'yellow')[0];assert.strictEqual(cfopStage(applyAlg(c2,p2.moves)).stage,'solved');}
// A pair stuck in another slot has no case yet; the free ones do.
{const c=applyAlg(S,"R U R' F' U' F"); // the front right pair taken out, then the front left pair's corner moved
  const ps=patF2L(c,'yellow');assert.ok(Array.isArray(ps));for(const p of ps)assert.ok(p.n>=1&&p.n<=41);}
// No F2L reading before the cross, or after the pairs.
assert.strictEqual(patF2L(applyAlg(S,"R U F' L2 D B R'"),'white'),null);
assert.strictEqual(patF2L(applyAlg(S,inv(ALG_DB.co[0].alg)),'yellow'),null);
// The two-look cases: every one by name, its moves solving the step as held.
for(const [set,stage] of [['eo','eo'],['co','co'],['cp','cp'],['ep','ep']]){
  for(const a of ALG_DB[set]){
    for(const h of ['','x2']){
      const c=applyAlg(S,[...inv(a.alg),...(h?parseAlg(h):[])]),p=patLL(c,'yellow');
      assert.ok(p,`${a.name} held ${h}`);
      if(p.stage!==stage)continue; // a case that is another step's too (an OLL that solves the edges already)
      assert.strictEqual(p.name,a.name,`${set} ${a.name} held ${h}`);
    }
  }
}
// The once-only rule: a case once until another comes; solved starts over; a kind turned off adds nothing.
{const T=patTracker(),sune=applyAlg(S,inv(ALG_DB.co.find(a=>a.name==='Sune').alg));
  let e=patStep(T,sune,ALL,'yellow');assert.strictEqual(e.length,1);assert.strictEqual(e[0].kind,'ll');assert.strictEqual(e[0].name,'Sune');assert.strictEqual(e[0].step,'OLL corners');
  assert.strictEqual(patStep(T,applyAlg(sune,'U'),ALL,'yellow').length,0,'the same case, the top turned');
  assert.strictEqual(patStep(T,S,ALL,'yellow').length,0,'solved');
  assert.strictEqual(patStep(T,sune,ALL,'yellow').length,1,'again after solved');
  const T2=patTracker();assert.strictEqual(patStep(T2,sune,{cross:true,f2l:true,ll:false},'yellow').length,0,'OLL · PLL off');
  const T3=patTracker(),pair=applyAlg(S,inv(F2L_CASES[10].alg));
  e=patStep(T3,pair,ALL,'yellow');assert.strictEqual(e.length,1);assert.strictEqual(e[0].kind,'f2l');assert.strictEqual(e[0].pairs[0].n,F2L_CASES[10].n);
  assert.strictEqual(patStep(T3,applyAlg(pair,'U2'),ALL,'yellow').length,0,'the same pair case, the top turned');
  assert.strictEqual(patStep(patTracker(),pair,{cross:true,f2l:false,ll:true},'yellow').length,0,'F2L off');
}
// The cross on the bottom as held: counted by length, the shortest solutions solve it as held.
for(const h of ['z2','','x']){
  const c=applyAlg(S,[...[].concat(randomMoveScramble('pat-cross-'+h,22)),...(h?parseAlg(h):[])]),r=patCross(c);
  assert.strictEqual(r.color,['white','red','green','yellow','orange','blue'][c.center[3]]);
  assert.ok(!r.made&&r.optimal>0&&r.optimal<=8,'shortest '+r.optimal);assert.ok(r.sols.length>0);assert.ok(/^\d moves: \d+$/.test(r.lens[0]),r.lens[0]);
  for(const s of r.sols.slice(0,5)){const d=applyAlg(c,parseAlg(s));assert.ok(patCrossMade(d,r.color),`${s} makes the ${r.color} cross`);}
  assert.ok(!patCrossMade(c,r.color));
}
assert.ok(patCross(applyAlg(S,'z2')).made);
console.log('patterns ok');
