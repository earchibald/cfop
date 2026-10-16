// The CFOP stage of a cube (js/stage.js): a solved cube, the cross with the preferred color, the
// pairs, every two-look case by name from the cube as held, the turn that brings the cross down,
// the last U turn, and the count of moves done part way through an algorithm.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/algs.js','js/stage.js');
const Cube=run('Cube'),applyAlg=run('applyAlg'),invertAlg=run('invertAlg'),parseAlg=run('parseAlg'),afterRotation=run('afterRotation');
const solveCross=run('solveCross'),solveF2L=run('solveF2L'),randomMoveScramble=run('randomMoveScramble');
const ALG_DB=run('ALG_DB'),cfopStage=run('cfopStage'),cfopStageDone=run('cfopStageDone'),ORDER=run('STAGE_ORDER');
const S=new Cube(),rank=st=>ORDER.indexOf(st.stage);
// A solved cube, however it is held.
for(const r of ['','x',"y'",'z2',"x y"]){const st=cfopStage(r?applyAlg(S,r):S);assert.strictEqual(st.stage,'solved',r);assert.strictEqual(st.name,'Solved');assert.strictEqual(st.moves.length,0);}
// A scramble: the cross of the preferred color, white unless told otherwise.
{const c=applyAlg(S,"R U F' L2 D B R'");
  const st=cfopStage(c);assert.strictEqual(st.stage,'cross');assert.strictEqual(st.name,'Cross');assert.strictEqual(st.down,'white');assert.ok(/^\d of 4 white edges$/.test(st.sub),st.sub);
  const sy=cfopStage(c,'yellow');assert.strictEqual(sy.down,'yellow');assert.ok(/yellow edges$/.test(sy.sub));
  // A cross of another color done: it wins over the preferred color's loose edges.
  const y=applyAlg(S,invertAlg(ALG_DB.co[0].alg)); // only the top layer is loose: the engine's cross (yellow, on D) is whole
  assert.strictEqual(cfopStage(y,'white').down,'yellow');assert.ok(['f2l','eo','co','cp','ep','auf'].includes(cfopStage(y,'white').stage));
}
// The pairs: a cross, then the pairs one by one. The engine's cross is yellow.
{const c=applyAlg(S,randomMoveScramble('stage-f2l',22));
  const cr=solveCross(c,0,4);const c1=applyAlg(c,parseAlg(cr.solutions[0]));
  const s1=cfopStage(c1,'yellow');assert.strictEqual(s1.stage,'f2l');assert.strictEqual(s1.name,'F2L');assert.strictEqual(s1.sub,'0 of 4 pairs');
  const f2l=solveF2L(c1);assert.ok(f2l,'f2l solved');let c2=c1;
  f2l.steps.forEach((s,i)=>{c2=applyAlg(c2,s.moves);const st=cfopStage(c2,'yellow');if(i<3){assert.strictEqual(st.stage,'f2l');assert.strictEqual(st.sub,`${i+1} of 4 pairs`);}else assert.ok(rank(st)>=ORDER.indexOf('eo'),'last layer after four pairs: '+st.stage);});
}
// Every two-look case, from the cube as held with its cross down (the engine's frame): the name,
// the moves as held, and the moves take the cube on to the next step; the edges end solved.
const groups=[['eo',ALG_DB.eo],['co',ALG_DB.co],['cp',ALG_DB.cp],['ep',ALG_DB.ep]];
for(const [stage,list] of groups)for(const a of list){
  const X=applyAlg(S,invertAlg(a.alg));
  for(const pre of ['','U',"U'",'U2']){
    const held=pre?applyAlg(X,[pre]):X,st=cfopStage(held,'yellow');
    assert.strictEqual(st.stage,stage,a.name+' '+pre+': '+st.stage);assert.strictEqual(st.name,a.name,a.name+' '+pre+': '+st.name);
    assert.ok(/^White up, green in front$/.test(st.sub),st.sub);
    assert.ok(st.moves.length>=parseAlg(a.alg).length,'the moves carry the algorithm');
    const after=applyAlg(held,st.moves);
    if(stage==='ep')assert.ok(after.isSolvedAny(),a.name+' ends solved');else assert.ok(rank(cfopStage(after,'yellow'))>rank(st),a.name+' goes on to the next step');
    // Done so far: each prefix of the moves counts; a cube off the path counts nothing.
    st.moves.forEach((m,i)=>assert.strictEqual(cfopStageDone(st,applyAlg(held,st.moves.slice(0,i+1))),i+1,a.name+' done '+(i+1)));
    assert.strictEqual(cfopStageDone(st,held),0);assert.strictEqual(cfopStageDone(st,applyAlg(held,"F D")),0);
  }
  // Held with the cross up: z2 first, so the front stays. Held with the cross at the front: x'.
  const up=applyAlg(X,'z2'),su=cfopStage(up,'yellow');assert.strictEqual(su.name,a.name,a.name+' held upside down');assert.strictEqual(su.moves[0],'z2');
  assert.ok(/^Turn z2: White up, green in front$/.test(su.sub),su.sub);
  if(stage==='ep')assert.ok(applyAlg(up,su.moves).isSolvedAny());
  assert.strictEqual(cfopStageDone(su,applyAlg(up,'z2')),1,'the turn counts once the cube was turned');assert.strictEqual(cfopStageDone(su,up),0,'and not before');
  const fr=applyAlg(X,'x'),sf=cfopStage(fr,'yellow');assert.strictEqual(sf.name,a.name);assert.strictEqual(sf.moves[0],"x'",a.name+' cross at the front: '+sf.moves[0]);
  if(stage==='ep')assert.ok(applyAlg(fr,sf.moves).isSolvedAny());
}
// Only the last U turn left.
for(const u of ['U',"U'",'U2']){const st=cfopStage(applyAlg(S,[u]),'yellow');assert.strictEqual(st.stage,'auf');assert.strictEqual(st.name,'AUF');assert.strictEqual(st.moves.join(' '),invertAlg(u));}
// A white cross as held: white down, any front.
{const X=applyAlg(S,invertAlg(ALG_DB.co[0].alg)); // Sune, cross on D (yellow in the engine)
  const held=applyAlg(afterRotation(X,'z2'),'z2 y'); // the same cube with the white cross at D, held white down and turned
  const st=cfopStage(held,'white');assert.strictEqual(st.name,'Sune');assert.strictEqual(st.down,'white');assert.ok(rank(cfopStage(applyAlg(held,st.moves),'white'))>rank(st),'Sune done from a white cross');
}
// Every scramble gives a stage without a throw.
for(let i=0;i<100;i++){const st=cfopStage(applyAlg(S,randomMoveScramble('stage-'+i,22)));assert.ok(ORDER.includes(st.stage)&&st.name);}
console.log('stage ok');
