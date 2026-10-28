// ===== The 2×2 cube: the corners of the 3×3 model =====
// A 2×2 state is a Cube (js/engine.js) whose edges and centers are ignored. Every face move
// and rotation of the engine works on it. A 2×2 has no centers, so a state is solved when the
// four corner stickers of every face match: twoSolved. The 24 stickers a 2×2 shows are the
// corner stickers of the 3×3: twoFacelets gives them in face order U R F D L B, four per face,
// left to right, top to bottom. The drawing code (js/draw.js) takes either form.
//
// Scrambles use R, U and F only, as the WCA does: those three faces reach every state while the
// bottom-back-left corner (DBL, piece 6) stays where it is. The solver works in that frame: a
// state is first turned so piece 6 sits at home (twoAlign), then searched with R U F. The whole
// 2×2 has 7!·3^6 = 3,674,160 states in that frame, so one table holds the distance of every state
// (buildTwoTable, about a quarter of a second) and twoOptimal reads an optimal solution from it.
// twoSearch finds the shortest R U F moves to any goal given as a test on the 24 stickers: a
// face, a layer, an oriented top. Pure: no DOM. Loads after engine.js.

const TWO_FACELET=[];for(let f=0;f<6;f++)for(let i=0;i<2;i++)for(let j=0;j<2;j++)TWO_FACELET.push(9*f+6*i+2*j);
// 24 stickers from a Cube, or from a 54-sticker array.
function twoFacelets(x){const f=Array.isArray(x)?x:x.toFacelets();return f.length===24?f:TWO_FACELET.map(i=>f[i]);}
function twoSolved(cube){const f=twoFacelets(cube);for(let k=0;k<6;k++){const c=f[4*k];if(f[4*k+1]!==c||f[4*k+2]!==c||f[4*k+3]!==c)return false;}return true;}
// A random-move scramble of R, U and F, the same seed giving the same moves.
function twoScramble(seed,n=11){
  const r=rng(seed);const out=[];const faces=['R','U','F'],sfx=['',"'",'2'];let last='';
  while(out.length<n){const f=faces[Math.floor(r()*3)];if(f===last)continue;out.push(f+sfx[Math.floor(r()*3)]);last=f;}
  return out;
}

// ---------- the aligned frame: piece 6 (DBL) at home, moves R U F ----------
const TWO_MOVES=['U',"U'",'U2','R',"R'",'R2','F',"F'",'F2'];
const TWO_INV=[1,0,2,4,3,5,7,6,8]; // the index of each move's inverse
const TWO_FREE=[0,1,2,3,4,5,7];     // the corner positions R, U and F move
const TWO_N=5040*729;
// Permutation coordinate: the Lehmer rank of the pieces at the seven free positions.
function twoPermCoord(cp){let r=0;for(let i=0;i<7;i++){const a=cp[TWO_FREE[i]];let s=0;for(let j=i+1;j<7;j++)if(cp[TWO_FREE[j]]<a)s++;r=r*(7-i)+s;}return r;}
function twoPermDecode(r,cp){const pieces=[0,1,2,3,4,5,7];const digits=new Array(7);for(let i=6;i>=0;i--){digits[i]=r%(7-i);r=Math.floor(r/(7-i));}
  for(let i=0;i<7;i++){cp[TWO_FREE[i]]=pieces.splice(digits[i],1)[0];}cp[6]=6;}
// Orientation coordinate: the twists of the first six free positions; the seventh follows.
function twoOriCoord(co){let r=0;for(let i=0;i<6;i++)r=r*3+co[TWO_FREE[i]];return r;}
function twoOriDecode(r,co){let s=0;for(let i=5;i>=0;i--){co[TWO_FREE[i]]=r%3;s+=r%3;r=Math.floor(r/3);}co[7]=(3-s%3)%3;co[6]=0;}
let TWO_PM=null,TWO_OM=null;
// Move tables on the two coordinates. A move's effect on the twists depends only on positions,
// so the two tables are independent.
function buildTwoMoveTables(){
  if(TWO_PM)return;
  TWO_PM=new Uint16Array(5040*9);TWO_OM=new Uint16Array(729*9);
  const mv=TWO_MOVES.map(m=>MOVES[m]);const cp=new Array(8),co=new Array(8).fill(0),cp2=new Array(8),co2=new Array(8);
  for(let p=0;p<5040;p++){twoPermDecode(p,cp);for(let k=0;k<9;k++){const b=mv[k];for(let i=0;i<8;i++)cp2[i]=cp[b.cp[i]];TWO_PM[p*9+k]=twoPermCoord(cp2);}}
  for(let i=0;i<8;i++)cp[i]=i;
  for(let o=0;o<729;o++){twoOriDecode(o,co);for(let k=0;k<9;k++){const b=mv[k];for(let i=0;i<8;i++)co2[i]=(co[b.cp[i]]+b.co[i])%3;TWO_OM[o*9+k]=twoOriCoord(co2);}}
}
function twoAligned(cube){return cube.cp[6]===6&&cube.co[6]===0;}
function twoCoord(cube){return twoPermCoord(cube.cp)*729+twoOriCoord(cube.co);}
// The corner stickers of a coordinate, as the 24-sticker array, with the scratch arrays given.
const TWO_CORNER_POS=[];// for each 24-sticker index: [corner position, sticker number on it]
for(let i=0;i<24;i++){const fi=TWO_FACELET[i];for(let c=0;c<8;c++){const n=cornerFacelet[c].indexOf(fi);if(n>=0)TWO_CORNER_POS[i]=[c,n];}}
function twoStickers(cp,co,out){for(let i=0;i<24;i++){const [c,n]=TWO_CORNER_POS[i];out[i]=cornerColor[cp[c]][(n-co[c]+3)%3];}return out;}

// ---------- rotations ----------
// The shortest rotation moves to each of the 24 ways to hold the cube, keyed by the centers.
const TWO_ROTS=(()=>{const out=new Map();const gens=['x',"x'",'x2','y',"y'",'y2','z',"z'",'z2'];
  let frontier=[{c:new Cube(),ms:[]}];out.set(frontier[0].c.center.join(),[]);
  while(frontier.length){const next=[];for(const {c,ms} of frontier)for(const g of gens){const n=c.mul(MOVES[g]);const k=n.center.join();if(!out.has(k)){out.set(k,[...ms,g]);next.push({c:n,ms:[...ms,g]});}}frontier=next;}
  return [...out.values()].sort((a,b)=>a.length-b.length);})();
// The first rotation (shortest first) after which test(cube) holds. Returns the moves, or null.
function twoRotationTo(cube,test){for(const r of TWO_ROTS){const c=r.length?applyAlg(cube,r):cube;if(test(c))return r;}return null;}
// Turn the cube so piece 6 sits at home: {rot, cube}.
function twoAlign(cube){if(twoAligned(cube))return {rot:[],cube};const rot=twoRotationTo(cube,twoAligned);return {rot,cube:applyAlg(cube,rot)};}

// ---------- search ----------
let TWO_VIA=null;
// The shortest R U F moves from an aligned cube to a state where goal(stickers) holds.
// goal gets the 24 stickers. Returns the moves, [] when the start already fits, null when none
// is found within maxDepth.
function twoSearch(cube,goal,maxDepth=11){
  if(!twoAligned(cube))throw new Error('twoSearch: the cube is not aligned');
  buildTwoMoveTables();if(!TWO_VIA)TWO_VIA=new Uint8Array(TWO_N);const via=TWO_VIA;via.fill(0);
  const cp=new Array(8),co=new Array(8),st=new Array(24);
  const fits=s=>{twoPermDecode(Math.floor(s/729),cp);twoOriDecode(s%729,co);return goal(twoStickers(cp,co,st));};
  const s0=twoCoord(cube);if(fits(s0))return [];
  via[s0]=255;let frontier=[s0];
  for(let d=1;d<=maxDepth;d++){const next=[];
    for(const s of frontier){const p=Math.floor(s/729)*9,o=(s%729)*9;
      for(let k=0;k<9;k++){const t=TWO_PM[p+k]*729+TWO_OM[o+k];if(via[t])continue;via[t]=k+1;
        if(fits(t)){const out=[];let x=t;while(x!==s0){const m=via[x]-1;out.push(TWO_MOVES[m]);const q=Math.floor(x/729)*9,r=(x%729)*9;x=TWO_PM[q+TWO_INV[m]]*729+TWO_OM[r+TWO_INV[m]];}return out.reverse();}
        next.push(t);}}
    frontier=next;if(!frontier.length)break;}
  return null;
}
// Goals on the 24 stickers.
const twoFaceSolid=(f,k)=>f[4*k]===f[4*k+1]&&f[4*k]===f[4*k+2]&&f[4*k]===f[4*k+3];
const twoAnyFace=f=>[0,1,2,3,4,5].some(k=>twoFaceSolid(f,k));
const twoFaceOf=(color)=>f=>[0,1,2,3,4,5].some(k=>f[4*k]===color&&twoFaceSolid(f,k));
// The stickers round each face, in order: pairs [sticker, sticker] on the same side of the layer.
const TWO_SIDES={0:[[20,21],[4,5],[8,9],[16,17]],3:[[22,23],[6,7],[10,11],[18,19]]}; // U: B R F L ; D: B R F L bottom rows
// A layer is a solid face whose side stickers agree in pairs. Only U and D layers are tested
// (a scrambled layer elsewhere is found through a rotation by the caller).
function twoLayerSolid(f,k){if(!twoFaceSolid(f,k))return false;const s=k===0?TWO_SIDES[0]:k===3?TWO_SIDES[3]:null;if(!s)return false;return s.every(([a,b])=>f[a]===f[b]);}
const twoAllSolved=f=>[0,1,2,3,4,5].every(k=>twoFaceSolid(f,k));

// ---------- the whole table and optimal solutions ----------
let TWO_TABLE=null;
function buildTwoTable(){
  if(TWO_TABLE)return TWO_TABLE;buildTwoMoveTables();
  const t=new Uint8Array(TWO_N).fill(255);const s0=twoCoord(new Cube());t[s0]=0;let frontier=[s0];let d=0;
  while(frontier.length){const next=[];for(const s of frontier){const p=Math.floor(s/729)*9,o=(s%729)*9;for(let k=0;k<9;k++){const x=TWO_PM[p+k]*729+TWO_OM[o+k];if(t[x]===255){t[x]=d+1;next.push(x);}}}frontier=next;d++;}
  TWO_TABLE=t;return t;
}
function twoDistance(cube){const t=buildTwoTable();return t[twoCoord(twoAlign(cube).cube)];}
// An optimal solution: {rot, moves}. rot turns the cube so piece 6 is home; moves are R U F.
function twoOptimal(cube){
  const t=buildTwoTable();const {rot,cube:c}=twoAlign(cube);let s=twoCoord(c);const out=[];
  while(t[s]>0){const p=Math.floor(s/729)*9,o=(s%729)*9;let k=0;for(;k<9;k++){const x=TWO_PM[p+k]*729+TWO_OM[o+k];if(t[x]===t[s]-1){s=x;out.push(TWO_MOVES[k]);break;}}if(k===9)break;}
  return {rot,moves:out};
}
// Face moves only, from a solved cube held as the engine holds it, that give this corner state.
// For a cube read from a camera or painted: its scramble.
function twoScrambleFor(cube){
  // First a few face moves that bring piece 6 home, then the optimal solution; invert both.
  let q=null;
  if(twoAligned(cube))q=[];
  else{const seen=new Set();let frontier=[{c:cube,ms:[]}];seen.add(cube.cp.join()+'|'+cube.co.join());
    outer:for(let d=0;d<4&&!q;d++){const next=[];for(const {c,ms} of frontier)for(const m of FACE_MOVES){const n=c.mul(MOVES[m]);const k=n.cp.join()+'|'+n.co.join();if(seen.has(k))continue;seen.add(k);if(twoAligned(n)){q=[...ms,m];break outer;}next.push({c:n,ms:[...ms,m]});}frontier=next;}}
  if(!q)return null;
  const a=applyAlg(cube,q);const sol=twoOptimal(a).moves;
  return simplify([...parseAlg(invertAlg(sol)||''),...parseAlg(invertAlg(q)||'')]);
}

// ---------- a 2×2 from 24 stickers, with plain-English errors ----------
// f: 24 colors, face order U R F D L B, four per face. The cube is read as held: the colors
// name the pieces, and the piece at the bottom back left is whatever is there.
function twoFromFacelets(f){
  const errors=[];
  if(!Array.isArray(f)||f.length!==24)return {ok:false,errors:['Need 24 stickers.']};
  const counts=[0,0,0,0,0,0];let unknown=0;for(const x of f){if(x>=0&&x<6)counts[x]++;else unknown++;}
  if(unknown)errors.push(`${unknown} sticker${unknown>1?'s are':' is'} not set.`);
  const bad=[];for(let c=0;c<6;c++)if(counts[c]!==4)bad.push(`${COLOR_NAMES_E[c]} ${counts[c]}`);
  if(bad.length&&!unknown)errors.push('Each color must be on 4 stickers. These are not: '+bad.join(', ')+'.');
  if(errors.length)return {ok:false,errors,counts};
  const full=new Array(54).fill(-1);TWO_FACELET.forEach((fi,i)=>{full[fi]=f[i];});
  const c=new Cube();const seen=new Array(8).fill(0);const badPieces=[];
  for(let i=0;i<8;i++){
    const st=cornerFacelet[i].map(x=>full[x]);let found=-1,ori=0;
    for(let j=0;j<8&&found<0;j++)for(let o=0;o<3;o++){if(st[o]===cornerColor[j][0]&&st[(o+1)%3]===cornerColor[j][1]&&st[(o+2)%3]===cornerColor[j][2]){found=j;ori=o;break;}}
    if(found<0){badPieces.push(i);continue;}
    c.cp[i]=found;c.co[i]=ori;seen[found]++;
  }
  for(const p of badPieces)errors.push(`The corner at ${CORNER_NAMES[p]} has a mix of colors that no real piece has. Check its stickers.`);
  if(errors.length)return {ok:false,errors,counts};
  const dup=[];for(let j=0;j<8;j++)if(seen[j]!==1)dup.push(CORNER_NAMES[j]);
  if(dup.length)return {ok:false,errors:['Some corners show up twice, and others are missing: '+dup.join(', ')+'.'],counts};
  if(c.co.reduce((a,b)=>a+b,0)%3)return {ok:false,errors:['One corner is twisted, so this cube cannot be solved. Check the corner stickers: one is probably wrong.'],counts,cube:c,unsolvable:true};
  return {ok:true,errors:[],counts,cube:c};
}
