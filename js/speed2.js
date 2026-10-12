// ===== 2×2 speed methods: Ortega (face, OLL, PBL) and CLL (layer, then one algorithm) =====
// Data: the seven 2×2 OLL cases, the five PBL cases and the 42 CLL cases, with the algorithms
// jperm.net lists for the 2×2 (its Ortega and CLL sets, read 2026-10-11). Every algorithm is
// checked by test/speed2.js: an OLL orients the top and keeps the bottom face, a PBL solves the
// cube from its case, a CLL solves the cube from its case and keeps the bottom layer, and the 42
// CLL cases cover every top-layer state exactly once.
// Solvers: solveOrtega(cube, {color}) and solveCLL(cube, {color}) plan a solve of the current
// scramble the way the method goes, with the whole-cube turns the method needs (a hold first
// when the fixed corner is not home, the face or layer to the bottom). twoFindStep matches a
// case to a state, as the trainer and the plans need. Pure: no DOM. Loads after two.js.

const TWO_AUFS=['','U',"U'",'U2'];
const TWO_ADFS=['','D',"D'",'D2'];

const ORTEGA_OLL=[
  {id:'two:oll:sune',name:'Sune',alg:"R U R' U R U2 R'",prob:4,
   recog:'One top sticker up, at the front left. The front right corner shows the top color on the front.',
   why:'Sune twists three corners the same way. Read it as (R U R\' U) (R U2 R\'): lift a corner out, put it back twisted. On a 2×2 it is the whole yellow-face step of the beginner method.'},
  {id:'two:oll:antisune',name:'Anti-Sune',alg:"R U2 R' U' R U' R'",prob:4,
   recog:'One top sticker up, at the back right. The front left corner shows the top color on the front.',
   why:'The inverse of Sune: the same three corners twist the other way.'},
  {id:'two:oll:H',name:'H',alg:"R2 U2 R U2 R2",prob:2,
   recog:'No top sticker up. All four show the top color on the front and the back.',
   why:'Five moves on a 2×2, where the 3×3 needs eleven: with no edges to protect, R2 U2 R U2 R2 twists two pairs of corners against each other.'},
  {id:'two:oll:pi',name:'Pi',alg:"R U2 R2 U' R2 U' R2 U2 R",prob:4,
   recog:'No top sticker up. Two show the top color on the left. The other two show it on the front and the back, on the right side.',
   why:'An Anti-Sune and a Sune with the middle moves canceled, which is why it has R2 turns.'},
  {id:'two:oll:L',name:'L',alg:"F R' F' R U R U' R'",prob:4,
   recog:'Two up, across from each other: back left and front right. The front left corner shows the top color on the front; the back right shows it on the right.',
   why:'A hedgeslammer (F R\' F\' R) and then a sexy move the other way round. The two halves share only the two corners that twist.'},
  {id:'two:oll:T',name:'T',alg:"R U R' U' R' F R F'",prob:4,
   recog:'Two up, next to each other on the right. The two left corners show the top color on the front and the back.',
   why:'The sexy move, then the sledgehammer. Each half moves four corners; together they twist two of them and put the rest back.'},
  {id:'two:oll:U',name:'U',alg:"F R U R' U' F'",prob:4,
   recog:'Two up, next to each other on the right. The two left corners show the top color on the left.',
   why:'A conjugate: F, the sexy move, F\'. The F moves bring the two left corners into the sexy move\'s path, which twists them, and F\' puts everything else back.'},
];
const ORTEGA_PBL=[
  {id:'two:pbl:adj',name:'Adjacent on top',alg:"R U R' U' R' F R2 U' R' U' R U R' F'",prob:8,
   recog:'The bottom layer is solved. On top, two corners next to each other need to swap: one bar. Hold the bar on the left.',
   why:'The T perm. It swaps the two right corners. The edge swap it does on a 3×3 does not exist here.'},
  {id:'two:pbl:diag',name:'Diagonal on top',alg:"F R U' R' U' R U R' F' R U R' U' R' F R F'",alt:"R' U R' F2 R F' U R' F2 R F' R",prob:2,
   recog:'The bottom layer is solved. On top, two corners across from each other need to swap: no bar. Any hold.',
   why:'The Y perm. Two conjugated commutators that together swap one diagonal pair of corners.'},
  {id:'two:pbl:adjadj',name:'Adjacent, adjacent',alg:"R2 U' B2 U2 R2 U' R2",prob:16,
   recog:'A bar on top and a bar on the bottom. Hold both bars at the front.',
   why:'Seven half turns and two U turns swap the two back corners of each layer at once. Half turns of the right face move a top corner and a bottom corner together, so one algorithm fixes both layers.'},
  {id:'two:pbl:adjdiag',name:'Adjacent, diagonal',alg:"R U' R F2 R' U R'",prob:8,
   recog:'A bar on one layer and no bar on the other. Hold the layer with the bar on top, with the bar at the front.',
   why:'R U\' R moves one corner into the other layer, F2 swaps two corners between the layers, and R\' U R\' brings things back with the swap done.'},
  {id:'two:pbl:diagdiag',name:'Diagonal, diagonal',alg:"R2 F2 R2",prob:1,
   recog:'No bar on either layer. Any hold.',
   why:'Three half turns. R2 swaps the two right columns, F2 swaps the front, and R2 undoes the first swap on the other pieces: each layer gets one diagonal swap.'},
];
const ORTEGA_ALL=[...ORTEGA_OLL,...ORTEGA_PBL];

// CLL: the first layer solved, then one algorithm for the four top corners. Names and
// algorithms follow jperm.net's 2×2 CLL set. Each group shares the orientation shape of the
// OLL case with that name; the number tells the permutation apart.
const CLL_GROUPS=['Sune','Anti-Sune','H','Pi','L','T','U','Oriented'];
const CLL_GROUP_TEXT={
  'Sune':'One top sticker up, at the front left; the front right corner shows the top color on the front.',
  'Anti-Sune':'One top sticker up, at the back right; the front left corner shows the top color on the front.',
  'H':'No top sticker up; all four show the top color on the front and the back.',
  'Pi':'No top sticker up; two show the top color on the left, the other two on the front and the back of the right side.',
  'L':'Two up, across from each other: back left and front right.',
  'T':'Two up, next to each other on the right; the two left corners show the top color on the front and the back.',
  'U':'Two up, next to each other on the right; the two left corners show the top color on the left.',
  'Oriented':'All four top stickers up; only the places are wrong.',
};
const CLL_CASES=[
  ['Sune','S1',"R U R' U R U2 R'",4],['Sune','S2',"L' U2 L U2 L F' L' F",4],['Sune','S3',"F R' F' R U2 R U2 R'",4],
  ['Sune','S4',"R U R' U' R' F R F' R U R' U R U2 R'",4],['Sune','S5',"L F' L' F L' U' L",4],['Sune','S6',"R U R' U R' F R F' R U2 R'",4],
  ['Anti-Sune','AS1',"L' U' L U' L' U2 L",4],['Anti-Sune','AS2',"L' U' L U L F' L' F L' U' L U' L' U2 L",4],['Anti-Sune','AS3',"F' L F L' U2 L' U2 L",4],
  ['Anti-Sune','AS4',"R U2 R' U2 R' F R F'",4],['Anti-Sune','AS5',"R' F R F' R U R'",4],['Anti-Sune','AS6',"R' U R U' R2 F R F' R U R' U' R",4],
  ['H','H1',"R2 U2 R' U2 R2",2],['H','H2',"F R2 U' R2 U' R2 U R2 F'",4],['H','H3',"R U R' U R U L' U R' U' L",4],['H','H4',"x' U2 R U2 R2 F2 R U2 x",2],
  ['Pi','P1',"R U' R2 U R2 U R2 U' R",4],['Pi','P2',"R' F2 R F' U2 R U' R' U' F",4],['Pi','P3',"F R2 U' R2 U R2 U R2 F'",4],
  ['Pi','P4',"R U2 R' U' R U R' U2 R' F R F'",4],['Pi','P5',"R U' R' F R' F R U R' F R",4],['Pi','P6',"R' U' R' F R F' R U' R' U2 R",4],
  ['L','L1',"R' U R' U2 R U' R' U R U' R2",4],['L','L2',"R U2 R2 F2 R U R' F2 R F'",4],['L','L3',"R U2 R' F' R U2 R' U R' F2 R",4],
  ['L','L4',"F R' F' R U R U' R'",4],['L','L5',"F R U' R' U' R U R' F'",4],['L','L6',"R U2 R2 F R F' R U2 R'",4],
  ['T','T1',"R' U R U2 R2 F' R U' R' F2 R2",4],['T','T2',"R' U R U2 R2 F R F' R",4],['T','T3',"y L' U' L U L F' L' F",4],
  ['T','T4',"F R U R' U' R U' R' U' R U R' F'",4],['T','T5',"R U R' U' R' F R F'",4],['T','T6',"F U' R U2 R' U' F2 R U R'",4],
  ['U','U1',"R2 F2 R U R' F R2 U2 R' U' R",4],['U','U2',"R U2 R U' R' F R' F2 U' F",4],['U','U3',"R' U R' F R F' R U2 R' U R",4],
  ['U','U4',"F R' F' R U' R U' R' U2 R U' R'",4],['U','U5',"R U' R2 F R F' R U R' U' R U R'",4],['U','U6',"F R U R' U' F'",4],
  ['Oriented','Adjacent',"R U R' U' R' F R2 U' R' U' R U R' F'",4],['Oriented','Diagonal',"F R U' R' U' R U R' F' R U R' U' R' F R F'",1],
].map(([group,name,alg,prob])=>({id:'two:cll:'+name,group,name,alg,prob,recog:CLL_GROUP_TEXT[group]}));

// ---------- matching a case to a state ----------
// Try each case with a U turn before it (and, with post, one after). test(cube) says when the
// step is done. Returns the shortest {pre, alg, post, name, id, len, cube} or null.
function twoFindStep(cube,cases,test,post){
  let best=null;
  for(const a of cases){const ms=parseAlg(a.alg);
    for(const pre of TWO_AUFS){const c1=applyAlg(cube,[...(pre?[pre]:[]),...ms]);
      for(const p of (post?TWO_AUFS:[''])){const c2=p?applyAlg(c1,[p]):c1;if(!test(c2))continue;
        const len=(pre?1:0)+ms.length+(p?1:0);if(!best||len<best.len)best={pre,alg:a.alg,post:p,name:a.name,id:a.id,len,cube:c2,case:a};}}}
  return best;
}
const twoTopOriented=c=>twoFaceSolid(twoFacelets(c),0);
// A step with no algorithm: the cube is solved once the top is turned to match.
const TWO_NONE={id:'two:none',name:'Line up the top',alg:'',prob:0,recog:'Turn the top until the layers match.'};
// PBL also turns the bottom first, and turns the cube over when the solved layer is on top.
function twoFindPBL(cube){
  let best=null;
  for(const rot of ['','x2'])for(const d of TWO_ADFS){const c0=applyAlg(cube,[rot,d].filter(Boolean));
    const r=twoFindStep(c0,[TWO_NONE,...ORTEGA_PBL],twoSolved,true);if(!r)continue;const len=r.len+(rot?1:0)+(d?1:0);
    if(!best||len<best.len)best={...r,rot,preD:d,len};}
  return best;
}
// The whole-cube turn that brings face k (0..5, U R F D L B) to the bottom.
const TWO_TO_BOTTOM=['x2','z',"x'",'',"z'",'x'];
// A solid layer on any face: the face is one color and each side shows pairs that match.
const TWO_LAYER_SIDES=(()=>{const out=[];for(let k=0;k<6;k++){const pairs=[];const opp=[3,5,4,0,2,1][k];
  for(let j=0;j<6;j++){if(j===k||j===opp)continue;const idx=[];for(let i=0;i<24;i++){if(Math.floor(i/4)!==j)continue;const [c]=TWO_CORNER_POS[i];if(cornerFacelet[c].some(x=>Math.floor(x/9)===k))idx.push(i);}pairs.push(idx);}
  out.push(pairs);}return out;})();
function twoLayerAt(f,k){if(!twoFaceSolid(f,k))return false;return TWO_LAYER_SIDES[k].every(([a,b])=>f[a]===f[b]);}
const twoAnyLayerOf=color=>f=>[0,1,2,3,4,5].some(k=>f[4*k]===color&&twoLayerAt(f,k));
const twoAnyLayer=f=>[0,1,2,3,4,5].some(k=>twoLayerAt(f,k));
function twoSolidFaceIndex(f,color,layer){for(let k=0;k<6;k++)if(f[4*k]===color&&(layer?twoLayerAt(f,k):twoFaceSolid(f,k)))return k;return -1;}

// ---------- the plans ----------
// opts.color: a color index for the first face or layer, or 'any' for the shortest.
// Returns {rot, first:{color, moves, face}, flip, steps:[{stage,name,pre,alg,post,...}], moves, cube, solved}.
function twoPlanFirst(cube,opts,layer){
  const al=twoAlign(cube);let best=null;
  const colors=opts&&opts.color==='any'?[0,1,2,3,4,5]:[opts&&typeof opts.color==='number'?opts.color:0];
  for(const col of colors){const m=twoSearch(al.cube,layer?twoAnyLayerOf(col):twoFaceOf(col),11);if(m&&(!best||m.length<best.moves.length))best={color:col,moves:m};}
  if(!best)return null;
  const c=applyAlg(al.cube,best.moves);const f=twoFacelets(c);const k=twoSolidFaceIndex(f,best.color,layer);
  const flip=TWO_TO_BOTTOM[k];best.face=k;
  return {rot:al.rot,first:best,flip,cube:flip?applyAlg(c,[flip]):c};
}
function solveOrtega(cube,opts){
  const p=twoPlanFirst(cube,opts,false);if(!p)return null;
  let c=p.cube;const steps=[];
  if(!twoTopOriented(c)){const r=twoFindStep(c,ORTEGA_OLL,twoTopOriented,false);if(!r)return null;steps.push({stage:'OLL',...r});c=r.cube;}
  if(!twoSolved(c)){const r=twoFindPBL(c);if(!r)return null;steps.push({stage:'PBL',...r});c=r.cube;}
  const moves=[...p.rot,...p.first.moves,...(p.flip?[p.flip]:[])];
  for(const s of steps)moves.push(...[s.rot,s.preD,s.pre].filter(Boolean),...parseAlg(s.alg),...(s.post?[s.post]:[]));
  return {method:'ortega',rot:p.rot,first:p.first,flip:p.flip,steps,moves,cube:c,solved:twoSolved(c)};
}
function solveCLL(cube,opts){
  const p=twoPlanFirst(cube,opts,true);if(!p)return null;
  let c=p.cube;const steps=[];
  if(!twoSolved(c)){const r=twoFindStep(c,[TWO_NONE,...CLL_CASES],twoSolved,true);if(!r)return null;steps.push({stage:'CLL',...r});c=r.cube;}
  const moves=[...p.rot,...p.first.moves,...(p.flip?[p.flip]:[])];
  for(const s of steps)moves.push(...(s.pre?[s.pre]:[]),...parseAlg(s.alg),...(s.post?[s.post]:[]));
  return {method:'cll',rot:p.rot,first:p.first,flip:p.flip,steps,moves,cube:c,solved:twoSolved(c)};
}
// The bars of a layer: the sides where two neighboring corners share a color. For recognition text.
function twoBars(cube,layer){const f=cube.toFacelets();const sets=layer==='U'?[[0,3,1],[0,1,2],[1,2,4],[2,3,5]]:[[4,7,1],[4,5,2],[5,6,4],[6,7,5]];const out=[];
  for(const [a,b,face] of sets){const sa=cornerFacelet[a].find(x=>Math.floor(x/9)===face),sb=cornerFacelet[b].find(x=>Math.floor(x/9)===face);if(f[sa]===f[sb])out.push('URFDLB'[face]);}return out;}
