// 2×2 speed methods: every algorithm does what its case says, the 42 CLL cases cover every
// top-layer state exactly once, and the Ortega and CLL plans solve random scrambles.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/two.js','js/speed2.js');
const Cube=run('Cube'),applyAlg=run('applyAlg'),invertAlg=run('invertAlg'),parseAlg=run('parseAlg'),randomMoveScramble=run('randomMoveScramble');
const twoSolved=run('twoSolved'),twoScramble=run('twoScramble'),twoFacelets=run('twoFacelets'),twoFaceSolid=run('twoFaceSolid'),twoLayerAt=run('twoLayerAt');
const OLL=run('ORTEGA_OLL'),PBL=run('ORTEGA_PBL'),CLL=run('CLL_CASES'),solveOrtega=run('solveOrtega'),solveCLL=run('solveCLL'),twoFindStep=run('twoFindStep'),twoFindPBL=run('twoFindPBL'),twoTopOriented=run('twoTopOriented');
const S=new Cube();
assert.strictEqual(OLL.length,7);assert.strictEqual(PBL.length,5);assert.strictEqual(CLL.length,42);
for(const a of [...OLL,...PBL,...CLL]){assert.ok(a.id&&a.name&&a.alg&&a.recog&&a.prob,'case data '+a.name);parseAlg(a.alg).forEach(m=>assert.ok(/^[URFDLBxyz]['2]?$/.test(m),'move '+m+' in '+a.name));}
// OLL: from its case the top gets oriented and the bottom face stays a face
for(const a of OLL){const c=applyAlg(S,invertAlg(a.alg));const f=twoFacelets(c);assert.ok(twoFaceSolid(f,3),a.name+': bottom face before');assert.ok(!twoTopOriented(c));
  const d=applyAlg(c,a.alg);assert.ok(twoTopOriented(d)&&twoFaceSolid(twoFacelets(d),3),a.name+' orients the top');}
// PBL: from its case the cube is solved; the layers before it are as the name says
const layerPerm=(c,layer)=>{const bars=run('twoBars')(c,layer);return bars.length===4?'solved':bars.length===1?'adjacent':'diagonal';};
for(const a of PBL){const c=applyAlg(S,invertAlg(a.alg));assert.ok(twoSolved(applyAlg(c,a.alg)),a.name+' solves');
  const u=layerPerm(c,'U'),d=layerPerm(c,'D');const want={'two:pbl:adj':['adjacent','solved'],'two:pbl:diag':['diagonal','solved'],'two:pbl:adjadj':['adjacent','adjacent'],'two:pbl:adjdiag':['adjacent','diagonal'],'two:pbl:diagdiag':['diagonal','diagonal']}[a.id];
  assert.deepStrictEqual([u,d],want,a.name+' layers: '+u+' '+d);if(a.alt)assert.ok(twoFindStep(c,[{alg:a.alt,name:'alt',id:'alt'}],twoSolved,true),a.name+': the alternative solves the same case from some hold');}
// CLL: from its case the cube is solved and the bottom layer never breaks at the end
for(const a of CLL){const c=applyAlg(S,invertAlg(a.alg));assert.ok(twoLayerAt(twoFacelets(c),3),a.name+': bottom layer before');assert.ok(twoSolved(applyAlg(c,a.alg)),a.name+' solves');}
// Every state with a solved bottom layer is one CLL case (with U turns before and after), and only one.
{const states=new Map();const perms=[];const permute=(arr,k)=>{if(k===4){perms.push(arr.slice());return;}for(let i=k;i<4;i++){[arr[k],arr[i]]=[arr[i],arr[k]];permute(arr,k+1);[arr[k],arr[i]]=[arr[i],arr[k]];}};permute([0,1,2,3],0);
  let count=0;const byCase={};
  for(const p of perms)for(let o=0;o<27;o++){const co=[Math.floor(o/9)%3,Math.floor(o/3)%3,o%3];co.push((3-co.reduce((a,b)=>a+b,0)%3)%3);
    const c=new Cube([...p,4,5,6,7],[...co,0,0,0,0]);count++;
    if(twoSolved(c)||run('TWO_AUFS').some(u=>u&&twoSolved(applyAlg(c,[u]))))continue;
    const hits=[];for(const a of CLL){const ms=parseAlg(a.alg);for(const pre of run('TWO_AUFS')){const c1=applyAlg(c,[...(pre?[pre]:[]),...ms]);if(run('TWO_AUFS').some(u=>twoSolved(u?applyAlg(c1,[u]):c1))){hits.push(a.name);break;}}}
    assert.strictEqual(hits.length,1,'state '+p.join('')+'/'+co.join('')+' matches '+hits.join(','));byCase[hits[0]]=(byCase[hits[0]]||0)+1;}
  assert.strictEqual(count,648);assert.strictEqual(Object.keys(byCase).length,42,'all 42 cases appear');
  for(const a of CLL)assert.strictEqual(byCase[a.name],a.prob*4,a.name+' probability weight matches its state count');}
// The OLL set covers every twist state; the PBL set every pair of layer permutations.
{for(let o=0;o<27;o++){const co=[Math.floor(o/9)%3,Math.floor(o/3)%3,o%3];co.push((3-co.reduce((a,b)=>a+b,0)%3)%3);const c=new Cube(null,[...co,0,0,0,0]);if(twoTopOriented(c))continue;assert.ok(twoFindStep(c,OLL,twoTopOriented,false),'OLL for '+co.join(''));}
 for(let i=0;i<120;i++){const c=applyAlg(S,[...parseAlg(invertAlg(PBL[i%5].alg)),run('TWO_AUFS')[i%4],run('TWO_ADFS')[(i>>2)%4],i%7===0?'x2':''].filter(Boolean));if(twoSolved(c))continue;const r=twoFindPBL(c);assert.ok(r&&twoSolved(r.cube),'PBL '+i);}}
// Plans on random scrambles, in any hold
let om=0,cm=0;
for(let i=0;i<150;i++){const rot=[[],['y'],['x'],["z'",'y'],['x2']][i%5];const c=applyAlg(S,[...twoScramble('sp'+i,11),...rot]);
  const o=solveOrtega(c,{color:i%3===0?'any':0});assert.ok(o&&o.solved,'ortega '+i);assert.ok(twoSolved(applyAlg(c,o.moves)),'ortega moves '+i);assert.ok(o.steps.length<=2);om+=o.moves.length;
  if(i%3)assert.strictEqual(o.first.color,0,'the white face when asked');
  const k=solveCLL(c,{color:i%3===0?'any':0});assert.ok(k&&k.solved,'cll '+i);assert.ok(twoSolved(applyAlg(c,k.moves)),'cll moves '+i);assert.ok(k.steps.length<=1);cm+=k.moves.length;
  if(rot.length)assert.ok(o.rot.length&&k.rot.length,'a turned cube is held first');}
console.log(`speed2: 7 OLL, 5 PBL, 42 CLL verified; plans on 150 scrambles: Ortega ${(om/150).toFixed(1)} moves, CLL ${(cm/150).toFixed(1)} moves`);
