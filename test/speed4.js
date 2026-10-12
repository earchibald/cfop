// 4×4 advanced: the parity algorithms do what their cards say, and the reduction-with-CFOP plan
// solves random scrambles with the parity fixes where they fall.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/two.js','js/four.js','js/beginner.js','js/master.js','js/algs.js','js/speed4.js');
const FourCube=run('FourCube'),fourApply=run('fourApply'),fourSolved=run('fourSolved'),fourScramble=run('fourScramble'),fourToCube=run('fourToCube'),parseAlg=run('parseAlg');
const PAR=run('FOUR_PARITY'),solveMasterSpeed=run('solveMasterSpeed'),S=run('FOUR_SOLVED');
assert.strictEqual(PAR.length,3);
const img=a=>fourToCube(fourApply(S,a));
{const c=img(PAR[0].alg);assert.ok(c,'OLL parity leaves a reduced cube');assert.strictEqual(c.eo.map((v,i)=>v?i:-1).filter(v=>v>=0).join(),'1','it flips the front top edge');assert.ok(c.cp.slice(4).every((v,i)=>v===i+4)&&c.ep.slice(4).every((v,i)=>v===i+4),'and leaves the first two layers');}
{const c=img(PAR[1].alg);assert.ok(c);assert.strictEqual([c.ep[1],c.ep[3]].join(),'3,1','PLL parity swaps the front and back top edges');assert.ok(c.cp.every((v,i)=>v===i)&&c.eo.every(v=>!v));}
{const c=img(PAR[2].alg);assert.ok(c);assert.strictEqual([c.ep[0],c.ep[1]].join(),'1,0','the adjacent form swaps the right and front top edges');assert.ok(c.cp.every((v,i)=>v===i)&&c.eo.every(v=>!v)&&c.ep.slice(2).every((v,i)=>v===i+2));}
// The last-layer sets: outside turns only, and every case of each two-look step is covered.
const LL=run('FOUR_LL'),Cube=run('Cube'),applyAlg=run('applyAlg'),findLLStep=run('findLLStep'),eoSolved=run('eoSolved'),ollSolved=run('ollSolved'),cpSolvedLL=run('cpSolvedLL'),solveLL=run('solveLL'),invertAlg=run('invertAlg');
for(const k in LL)for(const a of LL[k])assert.ok(parseAlg(a.alg).every(m=>/^[URFDLB]['2]?$/.test(m)),a.name+' uses outside turns only');
{const DB=run('ALG_DB');const S3=new Cube();
  for(const a of DB.eo){const c=applyAlg(S3,invertAlg(a.alg));assert.ok(findLLStep(c,LL.eo,eoSolved),'an outside-turn algorithm orients the edges of '+a.name);}
  for(const a of DB.co){const c=applyAlg(S3,invertAlg(a.alg));assert.ok(findLLStep(c,LL.co,ollSolved),'an outside-turn algorithm orients the corners of '+a.name);}
  for(const a of [...DB.ep,...DB.cp]){const c=applyAlg(S3,invertAlg(a.alg));assert.ok(solveLL(c,LL,false),'outside-turn algorithms permute '+a.name);}}
let total=0,oll=0,pll=0;const N=12;const t0=Date.now();
for(let i=0;i<N;i++){const start=new FourCube(fourApply(S,fourScramble('fast-'+i,40)));const plan=solveMasterSpeed(start);
  assert.ok(plan&&plan.solved,'plan '+i+' ends solved');assert.ok(fourSolved(fourApply(start.s,plan.moves)),'the flat moves solve it');
  const names=plan.steps.map(s=>s.stage);assert.ok(names[0]==='Solve the centers'&&names[1]==='Pair the edges'&&names[2]==='Hold'&&names[3]==='Cross','the order: '+names.join(' > '));
  const iOll=names.indexOf('OLL parity'),iPll=names.indexOf('PLL parity');if(iOll>=0){oll++;assert.ok(names[iOll-1].startsWith('Pair'),'OLL parity right after F2L');}if(iPll>=0){pll++;assert.ok(/OLL/.test(names[iPll-1])||names[iPll-1].startsWith('Pair'),'PLL parity after OLL');}
  total+=plan.moves.length;}
console.log(`speed4: parity algorithms ok; ${N} plans in ${Date.now()-t0} ms, ${Math.round(total/N)} moves on average, OLL parity in ${oll}, PLL parity in ${pll}`);
