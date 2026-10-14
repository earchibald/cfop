// The beginner method: the guide's algorithms do what the guide says, from the holds the guide
// gives, and the solver solves random scrambles with only the guide's moves, holds and rules.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/beginner.js');
const Cube=run('Cube'),applyAlg=run('applyAlg'),invertAlg=run('invertAlg'),parseAlg=run('parseAlg');
const solveBeginner=run('solveBeginner'),beginnerChunks=run('beginnerChunks');
const STEPS=run('BEGINNER_STEPS'),ALGS=run('BEGINNER_ALGS');
const randomMoveScramble=run('randomMoveScramble');
const S=new Cube();const Y=applyAlg(S,['z2']);const fl=c=>c.toFacelets();
const FACE=/^(?:[URFDLB]['2]?|y['2]?)$/;
const uniform=c=>{const f=fl(c);return [0,1,2,3,4,5].every(i=>f.slice(9*i,9*i+9).every(x=>x===f[9*i+4]));};
// Yellow up: the first layer (white, below) and the first two layers.
const firstLayer=c=>{const f=fl(c);for(let i=27;i<36;i++)if(f[i]!==f[31])return false;for(const face of [1,2,4,5])for(const p of [6,7,8])if(f[9*face+p]!==f[9*face+4])return false;return true;};
const twoLayers=c=>{const f=fl(c);for(let i=27;i<36;i++)if(f[i]!==f[31])return false;for(const face of [1,2,4,5])for(const p of [3,4,5,6,7,8])if(f[9*face+p]!==f[9*face+4])return false;return true;};
const okCorner=(f,i)=>cornerFacelet[i].slice(1).every(x=>f[x]===f[9*Math.floor(x/9)+4]);
const cornerFacelet=run('cornerFacelet'),edgeFacelet=run('edgeFacelet');

// ----- the data -----
assert.strictEqual(STEPS.length,9,'Basics plus eight steps');
STEPS.forEach((s,i)=>{assert.strictEqual(s.n,i);assert.ok(s.name&&s.goal&&s.what&&s.how,'step '+i+' has prose');
  for(const a of (s.algs||[]))assert.ok(ALGS[a],'step '+i+' names a known algorithm: '+a);
  for(const c of (s.cases||[])){if(c.moves)parseAlg(c.moves).forEach(m=>assert.ok(FACE.test(m),'case move '+m));if(c.setup)parseAlg(c.setup).forEach(m=>assert.ok(FACE.test(m),'setup move '+m));}});
for(const k in ALGS){const a=ALGS[k];assert.strictEqual(a.id,k);assert.ok(a.name&&a.say&&a.step,'alg '+k+' has a name, a saying and a step');parseAlg(a.alg).forEach(m=>assert.ok(/^[URFDLB]['2]?$/.test(m)));
  if(a.parts)assert.strictEqual(a.parts.reduce((n,[len])=>n+len,0),parseAlg(a.alg).length,'the parts of '+k+' cover it');}
// (JSON: arrays from the vm realm are not deepStrictEqual to arrays from this one.)
const J=JSON.stringify;
assert.strictEqual(J(beginnerChunks("U F U R U' R' F'").map(c=>[c.label,c.at,c.len])),J([['Yellow cross',1,6]]),'the yellow cross alg is found after a U');
assert.strictEqual(J(beginnerChunks(ALGS.moveLeft.alg).map(c=>[c.label,c.at,c.len])),J([['next to its corner',0,4],['into the middle layer',4,4]]),'Moving Left boxes in two halves');
assert.strictEqual(J(beginnerChunks(ALGS.yellowCorners.alg).map(c=>c.at)),J([0,4,8]),'the chant boxes in three');
assert.strictEqual(J(beginnerChunks("D' D' R' D R").map(c=>[c.label,c.at])),J([['Corner in, right',1]]),'a D turn before the corner alg is not part of it');

// ----- the algorithms, from the holds the guide gives -----
// Daisy: a top edge with white facing out, held on the right, comes back white up.
{const daisy=applyAlg(Y,['F2','R2','B2','L2']);const c=applyAlg(daisy,invertAlg(ALGS.edgeFlip.alg));const f=fl(c);
  assert.strictEqual(f[10],0,'before the flip: white faces right at the top right');assert.ok([1,3,7].every(i=>f[i]===0),'the other petals stay');
  assert.ok([1,3,5,7].every(i=>fl(applyAlg(c,ALGS.edgeFlip.alg))[i]===0),'after: a daisy');}
// Bring it up: F2 takes a white edge from under the front, white down, to the top, white up.
{const daisy=applyAlg(Y,['F2','R2','B2','L2']);const c=applyAlg(daisy,invertAlg(ALGS.edgeUp.alg));
  assert.strictEqual(fl(c)[28],0,'before: white faces down under the front');assert.ok([1,3,5,7].every(i=>fl(applyAlg(c,ALGS.edgeUp.alg))[i]===0),'after: a daisy');
  assert.ok(!beginnerChunks(['U','F2','R']).length,'a one-move algorithm is never boxed in a plan');}
// The daisy demo: from any daisy with its moves undone, one petal, then each part adds one but the turn of the top.
{const demo=STEPS[1].demo,ms=parseAlg(demo.moves);assert.strictEqual(demo.parts.reduce((n,[len])=>n+len,0),ms.length,'the parts cover the moves');
  const petals=c=>[1,3,5,7].filter(i=>fl(c)[i]===0).length;
  for(const seed of ['a','b','c']){const scr=applyAlg(Y,randomMoveScramble(seed,20));const plan=solveBeginner(scr);let c=scr;
    for(const p of plan.stages[0].parts){if(p.pre)c=applyAlg(c,parseAlg(p.pre));c=applyAlg(c,p.moves);}
    assert.strictEqual(petals(c),4,'a daisy');c=applyAlg(c,invertAlg(ms));const seen=[petals(c)];let at=0;
    for(const [len] of demo.parts){c=applyAlg(c,ms.slice(at,at+len));at+=len;seen.push(petals(c));}
    assert.deepStrictEqual(JSON.stringify(seen),JSON.stringify([1,2,2,3,4]),'one petal, then R, the top turn, F2 and the flip');}}
// White corners, white up: white at the bottom left or right of the front goes in.
{const c=applyAlg(S,invertAlg(ALGS.cornerLeft.alg));const f=fl(c);assert.strictEqual(f[24],0,'Corner in, left: white faces you at the bottom left');assert.ok(applyAlg(c,ALGS.cornerLeft.alg).isSolved());}
{const c=applyAlg(S,invertAlg(ALGS.cornerRight.alg));const f=fl(c);assert.strictEqual(f[26],0,'Corner in, right: white faces you at the bottom right');assert.ok(applyAlg(c,ALGS.cornerRight.alg).isSolved());
  const d=applyAlg(c,invertAlg(ALGS.cornerFront.alg));assert.strictEqual(fl(d)[29],0,'White to the front: before it, white faces down at the bottom right');}
{const c=applyAlg(S,ALGS.cornerDown.alg);const f=fl(c);assert.ok([1,3,5,7].every(i=>f[i]===0),'Corner down keeps the cross');assert.strictEqual(c.cp.indexOf(0),5,'the top right corner is now at the bottom left');}
// Middle layer: a vertical line, the top tile the color of the left or right center.
{const c=applyAlg(Y,invertAlg(ALGS.moveLeft.alg));const f=fl(c);assert.ok(f[19]===f[22]&&f[7]===f[40],'Moving Left: front tile matches the front, top tile the left center');assert.ok(twoLayers(applyAlg(c,ALGS.moveLeft.alg)));}
{const c=applyAlg(Y,invertAlg(ALGS.moveRight.alg));const f=fl(c);assert.ok(f[19]===f[22]&&f[7]===f[13],'Moving Right: top tile the right center');assert.ok(twoLayers(applyAlg(c,ALGS.moveRight.alg)));}
// Yellow cross: an L at the back left -> the cross; a line left to right -> that L.
{const top=c=>[1,3,5,7].map(i=>fl(c)[i]===3?1:0).join('');
  const L=applyAlg(Y,invertAlg(ALGS.yellowCross.alg));assert.strictEqual(top(L),'1100','the alg solves an L at the back left (UB UL UR UF)');
  const line=applyAlg(L,invertAlg(ALGS.yellowCross.alg));assert.strictEqual(top(line),'0110','before that, a line left to right');}
// Yellow face: feed the fish. One corner yellow up at the front left, yellow on the front at the top right.
{const c=applyAlg(Y,invertAlg(ALGS.yellowFace.alg));const f=fl(c);assert.strictEqual(f[6],3);assert.strictEqual(f[20],3);assert.ok([0,2,8].every(i=>f[i]!==3));}
// Yellow corners: with the tail lights at the back, the chant places all four corners.
{const c=applyAlg(Y,invertAlg(ALGS.yellowCorners.alg));const f=fl(c);assert.ok(okCorner(f,2)&&okCorner(f,3),'the two back corners are right');assert.ok(!okCorner(f,0)&&!okCorner(f,1));
  const g=fl(applyAlg(c,ALGS.yellowCorners.alg));assert.ok([0,1,2,3].every(i=>okCorner(g,i)),'all four corners placed');}
// Yellow edges: the back edge stays; the front edge is the left center's color for the alg as written.
{const c=applyAlg(Y,invertAlg(ALGS.yellowEdges.alg));const f=fl(c);assert.strictEqual(f[46],f[49],'UB stays');assert.strictEqual(f[19],f[40],'front edge matches the left center');assert.ok(uniform(applyAlg(c,ALGS.yellowEdges.alg)));
  const d=applyAlg(Y,invertAlg(ALGS.yellowEdgesRight.alg));const h=fl(d);assert.strictEqual(h[46],h[49]);assert.strictEqual(h[19],h[13],"with U' turns: front edge matches the right center");}

// ----- the solver -----
const ALLOWED=/^(?:[URFDLB]['2]?|y['2]?|z2)$/;
let total=0,max=0,parts=0,flips=0;
for(let i=0;i<300;i++){
  const scr=randomMoveScramble('beginner-'+i,25);
  const start=applyAlg(S,[...scr,'z2']); // held yellow up, green in front
  const plan=solveBeginner(start);
  assert.ok(plan.solved,'scramble '+i+' ends solved');
  assert.ok(uniform(applyAlg(start,plan.moves)),'the flat move list solves it too');
  assert.strictEqual(plan.stages.length,8);
  for(const s of plan.stages)for(const p of s.parts){parts++;assert.ok(p.title&&p.text,'every part has a title and text');
    assert.strictEqual(p.up,s.n===3?'white':'yellow','step 3 works white up, the rest yellow up');
    for(const m of [p.pre,...p.moves].filter(Boolean))assert.ok(ALLOWED.test(m),'move '+m);
    if(p.pre)assert.ok(/^y/.test(p.pre),'a hold is a y rotation');
    // The guided solve shows `short`: the moves in parentheses, in order, name every move of the part.
    const named=[...p.short.matchAll(/\(([^)]+)\)/g)].flatMap(m=>m[1].split(', '));
    assert.deepStrictEqual(named,[...p.moves],'the short line names the moves: '+p.short);}
  // Follow the plan with its turn-overs. Step 1 ends with a daisy, 2 with a cross, 3 with the first
  // layer, 4 with two layers, 6 with a yellow face, 8 solved.
  let c=start,up='yellow';const atEnd=[];
  for(const s of plan.stages){for(const p of s.parts){if(p.up!==up){c=applyAlg(c,['z2']);up=p.up;}c=applyAlg(c,[p.pre,...p.moves].filter(Boolean));}atEnd.push(up==='yellow'?c:applyAlg(c,['z2']));}
  const f1=fl(atEnd[0]);assert.ok([1,3,5,7].every(j=>f1[j]===f1[31]),'daisy after step 1');
  const f2=fl(atEnd[1]);assert.ok([28,30,32,34].every(j=>f2[j]===f2[31])&&[25,16,43,52].every(j=>f2[j]===f2[9*Math.floor(j/9)+4]),'cross after step 2');
  assert.ok(firstLayer(atEnd[2]),'the first layer after step 3');
  assert.ok(twoLayers(atEnd[3]),'two layers after step 4');
  const f6=fl(atEnd[5]);assert.ok(f6.slice(0,9).every(x=>x===f6[4]),'yellow face after step 6');
  assert.ok(uniform(atEnd[7]),'solved after step 8');
  total+=plan.moves.length;max=Math.max(max,plan.moves.length);flips+=plan.moves.filter(m=>m==='z2').length;
}
console.log(`beginner: 300 random scrambles solved, ${Math.round(total/300)} moves on average, ${max} at most, ${Math.round(parts/300)} parts each, ${(flips/300).toFixed(1)} turn-overs`);

// The yellow face rule (count the corners, hold as the guide says, the algorithm) always finishes.
{const C=["R U R' U R U2 R'","R U2 R' U' R U' R'","R U R' U R U' R' U R U2 R'","R U2 R2 U' R2 U' R2 U2 R","r U R' U' r' F R F'","R2 D R' U2 R D' R' U2 R'","F' r U R' U' r' F R"];
  for(const alg of C)for(const auf of ['','U',"U'",'U2']){
    const c=applyAlg(S,['z2',...parseAlg(invertAlg(alg)),...(auf?[auf]:[])]); // yellow up, then the case
    const plan=solveBeginner(c);const st=plan.stages[5];
    assert.ok(st.parts.length>0&&st.parts.length<=3,'yellow face in at most 3 rounds: '+alg);
    assert.ok(plan.solved);
  }}
// The yellow corners rule: two corners right, the tail lights at the back, at most twice.
{for(let i=0;i<40;i++){const c=applyAlg(S,['z2',...randomMoveScramble('corners-'+i,20)]);const plan=solveBeginner(c);
  const st=plan.stages[6];const algs=st.parts.filter(p=>p.alg==='yellowCorners').length;assert.ok(algs<=2,'the chant at most twice');}}
console.log('beginner: ok');
