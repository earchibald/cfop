// ===== 4×4 advanced: reduction with CFOP, the parity fixes, and the way to Yau =====
// The plan: the centers and the edges as the 4×4 beginner guide builds them (js/master.js), then the
// 3×3 stage with CFOP from js/engine.js and js/algs.js (cross, F2L, two-look OLL and PLL), with
// the two parity fixes placed where a speedsolver meets them: OLL parity after F2L, PLL parity
// after OLL. The parity algorithms are the ones most 4×4 solvers learn first (jperm.net, the
// speedcube.com.au parity pages), checked by test/speed4.js on the engine.
// Pure: no DOM. Loads after four.js, master.js, algs.js.

const FOUR_PARITY=[
  {id:'four:oll',name:'OLL parity',alg:"Rr U2 x Rr U2 Rr U2 Rr' U2 Ll U2 Rr' U2 Rr U2 Rr' U2 Rr'",prob:2,
   recog:'After F2L the count of top edges facing up is odd: one or three, which a 3×3 never shows. Hold a wrong edge at the front; with one up, hold that one at the back.',
   why:'One edge pair is turned over. The wide turns carry one wing round the cube and put it back the other way up. The front edge flips; the two front corners and the left and right edges swap too, and OLL and PLL take care of that.'},
  {id:'four:pll',name:'PLL parity',alg:"r2 U2 r2 Uu2 r2 u2",prob:2,
   recog:'After OLL, two edges across from each other need to swap and nothing else: no PLL does that. Hold them at the front and the back.',
   why:'A pure swap of the front and back edge pairs. All the right turns are slice turns.'},
  {id:'four:pll-adj',name:'PLL parity, adjacent',alg:"R U R' U' r2 U2 r2 Uu2 r2 u2 U R U' R'",prob:1,
   recog:'Two edges next to each other need to swap and nothing else. Hold them at the front and the right.',
   why:"The PLL parity algorithm inside a setup: R U R' U' brings the right edge round to the back, the swap happens, and U R U' R' undoes the setup."},
];
function fourCaseName(id){const a=FOUR_PARITY.find(x=>x.id===id);return a?a.name:id;}

// The last-layer algorithms for the reduced cube: outside turns only. A 3×3 wide or slice turn
// (f, r, M) is not one move on a 4×4 and breaks the reduction, so the two-look sets of js/algs.js
// swap those algorithms for outside-turn forms of the same cases.
const FOUR_LL={
  eo:[{id:'eo-dot',name:'Dot (no edges)',alg:"F R U R' U' F' U2 F U R U' R' F'"},{id:'eo-L',name:'L shape',alg:"F U R U' R' F'"},{id:'eo-line',name:'Line',alg:"F R U R' U' F'"}],
  co:[{id:'co-sune',name:'Sune',alg:"R U R' U R U2 R'"},{id:'co-antisune',name:'Anti-Sune',alg:"R U2 R' U' R U' R'"},{id:'co-H',name:'H (double Sune)',alg:"R U R' U R U' R' U R U2 R'"},{id:'co-pi',name:'Pi (Bruno)',alg:"R U2 R2 U' R2 U' R2 U2 R"},
      {id:'co-L',name:'L / Bowtie',alg:"R U R' U R U2 R' U2 R U2 R' U' R U' R'"},{id:'co-T',name:'T (chameleon)',alg:"R U R' U R U2 R' U' R U2 R' U' R U' R'"},{id:'co-U',name:'U (headlights)',alg:"R2 D R' U2 R D' R' U2 R'"}], // L and T as a Sune and an Anti-Sune
  cp:[{id:'pll-T',name:'T perm',alg:"R U R' U' R' F R2 U' R' U' R U R' F'"},{id:'pll-Y',name:'Y perm',alg:"F R U' R' U' R U R' F' R U R' U' R' F R F'"}],
  ep:[{id:'pll-Ua',name:'Ua perm',alg:"R U' R U R U R U' R' U' R2"},{id:'pll-Ub',name:'Ub perm',alg:"R2 U R U R' U' R' U' R' U R'"},{id:'pll-H',name:'H perm',alg:"R2 U2 R U2 R2 U2 R2 U2 R U2 R2"},{id:'pll-Z',name:'Z perm',alg:"R' U' R U' R U R U' R' U R U R2 U' R' U"}],
};
// The 3×3 frame CFOP solves in: white cross on the bottom, as the 3×3 Solve tab plans it.
const FOUR_CFOP_ROT='z2';
function solveMasterSpeed(start){
  const red=solveMaster(start,{reduceOnly:true});let s=red.end.s;
  const steps=red.stages.map(st=>({stage:st.name,name:st.parts.length+' part'+(st.parts.length===1?'':'s'),moves:st.parts.flatMap(p=>[...parseAlg(p.pre||''),...p.moves])}));
  // hold: standard centers (white up, green in front), then the cross color down
  const f=fourTo54(s);const rot=TWO_ROTS.find(r=>{const g=r.length?fourTo54(fourApply(s,r)):f;return [0,1,2,3,4,5].every(i=>g[9*i+4]===i);})||[];
  const hold=[...rot,FOUR_CFOP_ROT];s=fourApply(s,hold);
  steps.push({stage:'Hold',name:'white down, green in front',moves:hold});
  const R=MOVES[FOUR_CFOP_ROT];const Rinv=R.inverse();
  const image=()=>{const c=fourToCube(s);if(!c)throw new Error('speed4: not reduced');return Rinv.mul(c);};
  const push=(stage,name,moves,extra)=>{const ms=moves.filter(Boolean);if(ms.length)s=fourApply(s,ms);steps.push(Object.assign({stage,name,moves:ms},extra||{}));};
  let X=image();
  const cross=parseAlg(solveCross(X,0,1).solutions[0]);push('Cross',cross.length+' moves',cross);X=applyAlg(X,cross);
  const f2l=solveF2L(X);if(!f2l)return null;
  f2l.steps.forEach((st,i)=>{push('Pair '+(i+1),st.slot,st.moves);});X=f2l.cube;
  if(X.eo.reduce((a,b)=>a+b,0)%2){const a=FOUR_PARITY[0];push('OLL parity',a.name,parseAlg(a.alg),{caseId:a.id});X=image();}
  if(!eoSolved(X)){const r=findLLStep(X,FOUR_LL.eo,eoSolved);if(!r)return null;push('OLL edges',r.name,[r.pre,...parseAlg(r.alg)]);X=r.cube;}
  if(!ollSolved(X)){const r=findLLStep(X,FOUR_LL.co,ollSolved);if(!r)return null;push('OLL corners',r.name,[r.pre,...parseAlg(r.alg)]);X=r.cube;}
  if(permParity(X.cp)!==permParity(X.ep)){const a=FOUR_PARITY[1];push('PLL parity',a.name,parseAlg(a.alg),{caseId:a.id});X=image();}
  if(!X.isSolved()){const ll=solveLL(X,FOUR_LL,false);if(!ll)return null;for(const st of ll.steps){push(st.stage,st.name,[st.pre,...parseAlg(st.alg||''),st.post]);}X=ll.cube;}
  const moves=steps.flatMap(st=>st.moves);
  return {steps,moves,solved:fourSolved(s),end:new FourCube(s)};
}
