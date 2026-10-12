// ===== The 4×4 cube (the Rubik's Master): a sticker model =====
// A 4×4 has no fixed centers, 24 center tiles, 24 edge pieces (wings) and 8 corners. The engine
// keeps the 96 stickers as an array of colors, index 16*face + 4*row + column, face order
// U R F D L B, rows top to bottom, columns left to right (the same scheme js/draw.js uses).
// Every move is a permutation of the 96 stickers, found from the geometry: each sticker has a
// position in space, a move turns the stickers of its layers a quarter turn about the face's
// axis, and the sticker lands where another one was.
//
// Notation follows the Rubik's Master guide: a capital letter turns the outside face (R), the
// small letter turns the inside slice next to it (r), and the two together turn both as one
// (Rr). Rw and 2R are read as Rr and r. x y z turn the whole cube. ' and 2 as usual.
// FourCube wraps a state so the rest of the app can treat it like a Cube: applyAlg,
// toFacelets, clone. Pure: no DOM. Loads after engine.js.

const FOUR_GEOM=[{n:[0,1,0],r:[1,0,0],d:[0,0,1]},{n:[1,0,0],r:[0,0,-1],d:[0,-1,0]},{n:[0,0,1],r:[1,0,0],d:[0,-1,0]},
  {n:[0,-1,0],r:[1,0,0],d:[0,0,-1]},{n:[-1,0,0],r:[0,0,1],d:[0,-1,0]},{n:[0,0,-1],r:[-1,0,0],d:[0,-1,0]}];
// Sticker centers in eighths: the face at 12, the four rows and columns at -9 -3 3 9.
const FOUR_POS=[];const FOUR_AT=new Map();
for(let f=0;f<6;f++)for(let i=0;i<4;i++)for(let j=0;j<4;j++){const g=FOUR_GEOM[f];const p=[0,1,2].map(t=>g.n[t]*12+g.r[t]*(2*j-3)*3+g.d[t]*(2*i-3)*3);FOUR_POS.push(p);FOUR_AT.set(p.join(),FOUR_POS.length-1);}
// A quarter turn clockwise, as seen from outside the face whose outward normal is n.
function fourTurn(v,n){const dot=v[0]*n[0]+v[1]*n[1]+v[2]*n[2];const c=[n[1]*v[2]-n[2]*v[1],n[2]*v[0]-n[0]*v[2],n[0]*v[1]-n[1]*v[0]];return [dot*n[0]-c[0],dot*n[1]-c[1],dot*n[2]-c[2]];}
// The layer of a sticker, counted from the face with normal n: 0 is that face's own layer.
function fourDepth(p,n){let c=p[0]*n[0]+p[1]*n[1]+p[2]*n[2];if(Math.abs(c)===12)c=Math.sign(c)*9;return (9-c)/6;}
const FOUR_FACE='URFDLB';
// The permutation of a move: perm[j] = the sticker that lands on j.
function fourPerm(face,depths,k){const n=FOUR_GEOM[face].n;const perm=new Array(96);for(let i=0;i<96;i++)perm[i]=i;
  for(let i=0;i<96;i++){const p=FOUR_POS[i];if(!depths.includes(fourDepth(p,n)))continue;let q=p;for(let t=0;t<k;t++)q=fourTurn(q,n);perm[FOUR_AT.get(q.join())]=i;}
  return perm;}
const FOUR_MOVES={};
(()=>{const sfx={'':1,"'":3,'2':2};
  for(let f=0;f<6;f++){const F=FOUR_FACE[f],w=F.toLowerCase();
    for(const s in sfx){FOUR_MOVES[F+s]=fourPerm(f,[0],sfx[s]);FOUR_MOVES[w+s]=fourPerm(f,[1],sfx[s]);FOUR_MOVES[F+w+s]=fourPerm(f,[0,1],sfx[s]);}}
  for(const [r,f] of [['x',1],['y',0],['z',2]])for(const s in sfx)FOUR_MOVES[r+s]=fourPerm(f,[0,1,2,3],sfx[s]);})();
// Read a move list in the guide's notation. Rw → Rr, 2R → r.
function parseFour(alg){const toks=Array.isArray(alg)?alg:parseAlg(alg);return toks.map(t=>{let m=t;
  let x=/^([URFDLB])w(['2]?)$/.exec(m);if(x)m=x[1]+x[1].toLowerCase()+x[2];
  x=/^2([URFDLB])(['2]?)$/.exec(m);if(x)m=x[1].toLowerCase()+x[2];
  x=/^([urfdlb])([URFDLB])(['2]?)$/.exec(m);if(x&&x[1]===x[2].toLowerCase())m=x[2]+x[1]+x[3];
  x=/^([URFDLB])'([urfdlb])'$/.exec(m);if(x&&x[1].toLowerCase()===x[2])m=x[1]+x[2]+"'"; // the guide writes R'r'
  x=/^([URFDLB])2([urfdlb])2$/.exec(m);if(x&&x[1].toLowerCase()===x[2])m=x[1]+x[2]+'2';
  if(!FOUR_MOVES[m])throw new Error('bad move '+t);return m;});}
function fourApply(s,moves){let cur=s;for(const m of parseFour(moves)){const perm=FOUR_MOVES[m];const out=new Array(96);for(let j=0;j<96;j++)out[j]=cur[perm[j]];cur=out;}return cur;}
const FOUR_SOLVED=[];for(let f=0;f<6;f++)for(let k=0;k<16;k++)FOUR_SOLVED.push(f);
class FourCube{
  constructor(s){this.s=s||FOUR_SOLVED.slice();this.isFour=true;this.n=4;}
  apply(moves){return new FourCube(fourApply(this.s,moves));}
  toFacelets(){return this.s.slice();}
  clone(){return new FourCube(this.s.slice());}
  equals(o){return o&&o.isFour&&this.s.join()===o.s.join();}
  key(){return this.s.join('');}
  isSolved(){return fourSolved(this.s);}
}
function fourSolved(x){const s=x.isFour?x.s:x;for(let f=0;f<6;f++){const c=s[16*f];for(let k=1;k<16;k++)if(s[16*f+k]!==c)return false;}return true;}
// A random-move scramble: outside faces and the three wide turns Uu Rr Ff, no face twice in a row.
function fourScramble(seed,n=40){
  const r=rng(seed);const out=[];const faces=['U','D','L','R','F','B','Uu','Rr','Ff'],sfx=['',"'",'2'];let last='';
  while(out.length<n){const f=faces[Math.floor(r()*9)];if(f[0]===last)continue;out.push(f+sfx[Math.floor(r()*3)]);last=f[0];}
  return out;
}

// ---------- pieces ----------
const fourIdx=(f,i,j)=>16*f+4*i+j;
const FOUR_CENTER=[5,6,9,10];                       // the four center tiles of a face
const FOUR_CORNER=[0,3,12,15];
const FOUR_WING=[1,2,4,8,7,11,13,14];
// Cubies: stickers that share a piece. A corner has three, a wing two, a center tile one.
const FOUR_CUBIE=(()=>{const m=new Map();FOUR_POS.forEach((p,i)=>{const k=p.map(v=>Math.abs(v)===12?Math.sign(v)*9:v).join();if(!m.has(k))m.set(k,[]);m.get(k).push(i);});return m;})();
const FOUR_PARTNER=new Array(96).fill(null);for(const idx of FOUR_CUBIE.values())for(const i of idx)FOUR_PARTNER[i]=idx.filter(j=>j!==i);
// The 12 edge slots, each with its two wings as [stickerA, stickerB] pairs, both wings on the same two faces.
const FOUR_DEDGES=(()=>{const out=[];const seen=new Set();
  for(const idx of FOUR_CUBIE.values()){if(idx.length!==2)continue;const p=FOUR_POS[idx[0]].map(v=>Math.abs(v)===12?Math.sign(v)*9:v);const big=p.map((v,t)=>Math.abs(v)===9?v:0).join();
    const key=big;if(seen.has(key))continue;seen.add(key);
    const wings=[...FOUR_CUBIE.values()].filter(w=>w.length===2&&FOUR_POS[w[0]].map(v=>Math.abs(v)===12?Math.sign(v)*9:v).map((v,t)=>Math.abs(v)===9?v:0).join()===big);
    // order each wing's two stickers by face, so the two wings list their faces the same way
    out.push({wings:wings.map(w=>w.slice().sort((a,b)=>Math.floor(a/16)-Math.floor(b/16))),faces:wings[0].map(i=>Math.floor(i/16)).sort((a,b)=>a-b)});}
  return out;})();
// Is edge slot e paired: both wings show the same colors on the same faces.
function fourPaired(s,e){const [a,b]=e.wings;return s[a[0]]===s[b[0]]&&s[a[1]]===s[b[1]];}
function fourAllPaired(s){return FOUR_DEDGES.every(e=>fourPaired(s,e));}
function fourCenterSolid(s,f){const c=s[16*f+5];return FOUR_CENTER.every(k=>s[16*f+k]===c);}
function fourCentersSolid(s){return [0,1,2,3,4,5].every(f=>fourCenterSolid(s,f));}
// The cube as a 3×3 once centers are solid and edges paired: 54 stickers, same scheme as the engine.
function fourTo54(s){const m=[0,1,3];const out=new Array(54);for(let f=0;f<6;f++)for(let i=0;i<3;i++)for(let j=0;j<3;j++)out[9*f+3*i+j]=s[fourIdx(f,m[i],m[j])];return out;}
// A Cube for the reduced 4×4, as held (centers may be any way round). null when it is not reduced.
function fourToCube(s){
  if(!fourCentersSolid(s)||!fourAllPaired(s))return null;
  const f=fourTo54(s);const centers=[0,1,2,3,4,5].map(i=>f[9*i+4]);
  // turn the picture to standard centers, read it, then turn the Cube back
  const rot=TWO_ROTS.find(r=>{const c=applyAlg(new Cube(),r).center;return [0,1,2,3,4,5].every(i=>centers[c[i]]===i);});
  if(!rot)return null;
  const g=rot.length?fourTo54(fourApply(s,rot)):f;const res=fromFacelets(g);if(!res.cube)return null;
  return rot.length?applyAlg(res.cube,invertAlg(rot)):res.cube;
}
// 96 stickers from a painted cube: counts, pieces, and a Cube. The frame is as held.
function fourFromFacelets(f){
  if(!Array.isArray(f)||f.length!==96)return {ok:false,errors:['Need 96 stickers.']};
  const counts=[0,0,0,0,0,0];let unknown=0;for(const x of f){if(x>=0&&x<6)counts[x]++;else unknown++;}
  const errors=[];if(unknown)errors.push(`${unknown} sticker${unknown>1?'s are':' is'} not set.`);
  const bad=[];for(let c=0;c<6;c++)if(counts[c]!==16)bad.push(`${COLOR_NAMES_E[c]} ${counts[c]}`);
  if(bad.length&&!unknown)errors.push('Each color must be on 16 stickers. These are not: '+bad.join(', ')+'.');
  if(errors.length)return {ok:false,errors,counts};
  const opp=[3,4,5,0,1,2];
  for(const idx of FOUR_CUBIE.values()){const cols=idx.map(i=>f[i]);
    if(new Set(cols).size!==cols.length||cols.some(c=>cols.includes(opp[c])))errors.push(`A ${idx.length===3?'corner':'edge'} piece shows colors that no real piece has: ${cols.map(c=>COLOR_NAMES_E[c]).join(', ')}. Check its stickers.`);}
  if(errors.length)return {ok:false,errors:errors.slice(0,4),counts};
  return {ok:true,errors:[],counts,cube:new FourCube(f.slice())};
}
