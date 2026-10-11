// The beginner method: the guide's algorithms do what the guide says, and the solver
// solves random scrambles with only the guide's moves, holds and rules.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/beginner.js');
const Cube=run('Cube'),applyAlg=run('applyAlg'),invertAlg=run('invertAlg'),parseAlg=run('parseAlg');
const solveBeginner=run('solveBeginner'),beginnerChunks=run('beginnerChunks');
const STEPS=run('BEGINNER_STEPS'),ALGS=run('BEGINNER_ALGS'),TRIG=run('BEGINNER_TRIGGERS');
const randomMoveScramble=run('randomMoveScramble');
const S=new Cube();const fl=c=>c.toFacelets();
const uniform=c=>{const f=fl(c);return [0,1,2,3,4,5].every(i=>f.slice(9*i,9*i+9).every(x=>x===f[9*i+4]));};
const twoLayers=c=>{const f=fl(c);for(let i=27;i<36;i++)if(f[i]!==f[31])return false;for(const face of [1,2,4,5])for(const p of [3,4,5,6,7,8])if(f[9*face+p]!==f[9*face+4])return false;return true;};
const f2lDone=c=>{const f=fl(c);for(let i=27;i<36;i++)if(f[i]!==3)return false;for(const face of [1,2,4,5])for(const p of [3,4,5,6,7,8])if(f[9*face+p]!==f[9*face+4])return false;return true;};

// ----- the data -----
assert.strictEqual(STEPS.length,9,'Basics plus eight steps');
STEPS.forEach((s,i)=>{assert.strictEqual(s.n,i);assert.ok(s.name&&s.goal&&s.what&&s.how,'step '+i+' has prose');
  for(const c of (s.cases||[]))if(c.moves)parseAlg(c.moves).forEach(m=>assert.ok(/^[URFDLB]['2]?$/.test(m),'case move '+m));});
for(const k in ALGS)parseAlg(ALGS[k].alg).forEach(m=>assert.ok(/^[URFDLB]['2]?$/.test(m)));
assert.strictEqual(JSON.stringify(beginnerChunks("F R U R' U' F'")),JSON.stringify([{label:'Right Trigger',id:'right',at:1,len:3}]),'the cross alg holds one Right Trigger');
assert.strictEqual(beginnerChunks("U' L' U' L U R U R'").map(c=>c.label).join(),'Left Trigger,Right Trigger');
assert.strictEqual(beginnerChunks(ALGS.sune.alg).map(c=>c.at).join(),'0','Sune starts with the Right Trigger');

// ----- the algorithms, as the guide describes them -----
// A trigger inserts a corner from the top layer into the slot below it.
{const c=applyAlg(S,invertAlg("R U R'"));const f=fl(c);assert.ok(f2lDone(applyAlg(c,"R U R'")));
  assert.strictEqual(f[9],3,'before the Right Trigger: bottom color faces right at the top right');assert.strictEqual(f[20],2,'its front tile matches the front center');}
{const c=applyAlg(S,invertAlg("L' U' L"));const f=fl(c);assert.strictEqual(f[38],3,'before the Left Trigger: bottom color faces left');assert.strictEqual(f[18],2);}
// Move Left and Move Right, each with the corner put back by the step 3 rule.
{const c=applyAlg(S,invertAlg("U' L' U' L y' U R U R'"));const f=fl(c);assert.ok(f[19]===f[22]&&f[7]===f[40],'Move Left starts with the edge at the top of the front, front tile matching, top tile the left color');assert.ok(f2lDone(applyAlg(c,"U' L' U' L y' U R U R'")));}
{const c=applyAlg(S,invertAlg("U R U R' y U' L' U' L"));const f=fl(c);assert.ok(f[19]===f[22]&&f[7]===f[13],'Move Right: top tile is the right color');assert.ok(f2lDone(applyAlg(c,"U R U R' y U' L' U' L")));}
// Yellow cross: line (left to right) -> cross; L at the back left -> line.
{const top=c=>[1,3,5,7].map(i=>fl(c)[i]===0?1:0).join('');
  const line=applyAlg(S,invertAlg(ALGS.yellowCross.alg));assert.strictEqual(top(line),'0110','the alg solves a line held left to right (UB UL UR UF)');
  const L=applyAlg(line,invertAlg(ALGS.yellowCross.alg));assert.strictEqual(top(L),'1100','before that, an L at the back left');}
// Sune: one corner oriented at the front left, top color of the front right corner faces front.
{const c=applyAlg(S,invertAlg(ALGS.sune.alg));const f=fl(c);assert.strictEqual(f[6],0);assert.strictEqual(f[20],0);assert.notStrictEqual(f[0],0);assert.notStrictEqual(f[2],0);assert.notStrictEqual(f[8],0);}
// Yellow corners: the alg then Sune swaps the two right-hand corners, keeps the left pair and all orientation.
{const c=applyAlg(S,ALGS.cornerSwap.alg+' '+ALGS.sune.alg);assert.strictEqual(c.cp.join(),'3,1,2,0,4,5,6,7');assert.ok(c.co.every(x=>x===0));assert.ok(c.eo.every(x=>x===0));}
// Yellow edges: a cycle of three top edges, the back edge stays.
{const c=applyAlg(S,ALGS.edgeCycle.alg);assert.strictEqual(c.cp.join(),'0,1,2,3,4,5,6,7');assert.strictEqual(c.ep[3],3,'UB stays');assert.strictEqual(c.ep.slice(4).join(),'4,5,6,7,8,9,10,11');}

// ----- the solver -----
const ALLOWED=/^(?:[URFDLB]['2]?|y['2]?)$/;
let total=0,max=0,parts=0;
for(let i=0;i<300;i++){
  const scr=randomMoveScramble('beginner-'+i,25);
  const start=applyAlg(S,[...scr,'z2']); // held yellow up, green in front
  const plan=solveBeginner(start);
  assert.ok(plan.solved,'scramble '+i+' ends solved');
  assert.ok(uniform(applyAlg(start,plan.moves)),'the flat move list solves it too');
  assert.strictEqual(plan.stages.length,8);
  for(const s of plan.stages)for(const p of s.parts){parts++;assert.ok(p.title&&p.text,'every part has a title and text');
    for(const m of [p.pre,...p.moves].filter(Boolean))assert.ok(ALLOWED.test(m),'move '+m);
    if(p.pre)assert.ok(/^y/.test(p.pre),'a hold is a y rotation');}
  // Step 1 ends with a daisy, step 2 with a cross, step 6 with a yellow face.
  let c=start;const atEnd=[];for(const s of plan.stages){for(const p of s.parts)c=applyAlg(c,[p.pre,...p.moves].filter(Boolean));atEnd.push(c);}
  const f1=fl(atEnd[0]);assert.ok([1,3,5,7].every(j=>f1[j]===f1[31]),'daisy after step 1');
  const f2=fl(atEnd[1]);assert.ok([28,30,32,34].every(j=>f2[j]===f2[31])&&[25,16,43,52].every(j=>f2[j]===f2[9*Math.floor(j/9)+4]),'cross after step 2');
  assert.ok(twoLayers(atEnd[3]),'two layers after step 4');
  const f6=fl(atEnd[5]);assert.ok(f6.slice(0,9).every(x=>x===f6[4]),'yellow face after step 6');
  assert.ok(uniform(atEnd[7]),'solved after step 8');
  total+=plan.moves.length;max=Math.max(max,plan.moves.length);
}
console.log(`beginner: 300 random scrambles solved, ${Math.round(total/300)} moves on average, ${max} at most, ${Math.round(parts/300)} parts each`);

// The yellow face rule (count the corners, hold as the guide says, Sune) always finishes.
{const C=["R U R' U R U2 R'","R U2 R' U' R U' R'","R U R' U R U' R' U R U2 R'","R U2 R2 U' R2 U' R2 U2 R","r U R' U' r' F R F'","R2 D R' U2 R D' R' U2 R'","F' r U R' U' r' F R"];
  for(const alg of C)for(const auf of ['','U',"U'",'U2']){
    const c=applyAlg(S,['z2',...parseAlg(invertAlg(alg)),...(auf?[auf]:[])]); // yellow up, then the case
    const plan=solveBeginner(c);const st=plan.stages[5];
    assert.ok(st.parts.length>0&&st.parts.length<=4,'yellow face in at most 4 rounds: '+alg);
    assert.ok(plan.solved);
  }}
console.log('beginner: ok');
