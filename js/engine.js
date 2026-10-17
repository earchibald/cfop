// ===== Cube engine (cubie model, Kociemba conventions) =====
const CORNER_NAMES=['URF','UFL','ULB','UBR','DFR','DLF','DBL','DRB'];
const EDGE_NAMES=['UR','UF','UL','UB','DR','DF','DL','DB','FR','FL','BL','BR'];
const FACE_NAMES=['U','R','F','D','L','B'];
const cornerFacelet=[[8,9,20],[6,18,38],[0,36,47],[2,45,11],[29,26,15],[27,44,24],[33,53,42],[35,17,51]];
const edgeFacelet=[[5,10],[7,19],[3,37],[1,46],[32,16],[28,25],[30,43],[34,52],[23,12],[21,41],[50,39],[48,14]];
const cornerColor=[[0,1,2],[0,2,4],[0,4,5],[0,5,1],[3,2,1],[3,4,2],[3,5,4],[3,1,5]];
const edgeColor=[[0,1],[0,2],[0,4],[0,5],[3,1],[3,2],[3,4],[3,5],[2,1],[2,4],[5,4],[5,1]];

class Cube{
  constructor(cp,co,ep,eo,center){
    this.cp=cp||[0,1,2,3,4,5,6,7];this.co=co||[0,0,0,0,0,0,0,0];
    this.ep=ep||[0,1,2,3,4,5,6,7,8,9,10,11];this.eo=eo||[0,0,0,0,0,0,0,0,0,0,0,0];
    this.center=center||[0,1,2,3,4,5]; // center[i] = color at face position i
  }
  clone(){return new Cube(this.cp.slice(),this.co.slice(),this.ep.slice(),this.eo.slice(),this.center.slice());}
  // apply b after this (this := this * b)
  mul(b){
    const cp=new Array(8),co=new Array(8),ep=new Array(12),eo=new Array(12),ce=new Array(6);
    for(let i=0;i<8;i++){cp[i]=this.cp[b.cp[i]];co[i]=(this.co[b.cp[i]]+b.co[i])%3;}
    for(let i=0;i<12;i++){ep[i]=this.ep[b.ep[i]];eo[i]=(this.eo[b.ep[i]]+b.eo[i])%2;}
    for(let i=0;i<6;i++)ce[i]=this.center[b.center[i]];
    return new Cube(cp,co,ep,eo,ce);
  }
  inverse(){
    const c=new Cube();
    for(let i=0;i<8;i++){c.cp[this.cp[i]]=i;}
    for(let i=0;i<8;i++){c.co[i]=(3-this.co[c.cp[i]])%3;}
    for(let i=0;i<12;i++){c.ep[this.ep[i]]=i;}
    for(let i=0;i<12;i++){c.eo[i]=this.eo[c.ep[i]];}
    for(let i=0;i<6;i++)c.center[this.center[i]]=i;
    return c;
  }
  equals(b){return this.cp.join()===b.cp.join()&&this.co.join()===b.co.join()&&this.ep.join()===b.ep.join()&&this.eo.join()===b.eo.join()&&this.center.join()===b.center.join();}
  isSolved(){return this.equals(new Cube());}
  toFacelets(){
    const f=new Array(54);
    for(let i=0;i<6;i++)f[9*i+4]=this.center[i];
    for(let i=0;i<8;i++){const j=this.cp[i],o=this.co[i];for(let n=0;n<3;n++)f[cornerFacelet[i][(n+o)%3]]=cornerColor[j][n];}
    for(let i=0;i<12;i++){const j=this.ep[i],o=this.eo[i];for(let n=0;n<2;n++)f[edgeFacelet[i][(n+o)%2]]=edgeColor[j][n];}
    return f;
  }
  key(){return this.cp.join('')+this.co.join('')+this.ep.map(x=>x.toString(12)).join('')+this.eo.join('')+this.center.join('');}
}
const I6=[0,1,2,3,4,5];
const BASE={
  U:new Cube([3,0,1,2,4,5,6,7],null,[3,0,1,2,4,5,6,7,8,9,10,11],null,I6),
  R:new Cube([4,1,2,0,7,5,6,3],[2,0,0,1,1,0,0,2],[8,1,2,3,11,5,6,7,4,9,10,0],null,I6),
  F:new Cube([1,5,2,3,0,4,6,7],[1,2,0,0,2,1,0,0],[0,9,2,3,4,8,6,7,1,5,10,11],[0,1,0,0,0,1,0,0,1,1,0,0],I6),
  D:new Cube([0,1,2,3,5,6,7,4],null,[0,1,2,3,5,6,7,4,8,9,10,11],null,I6),
  L:new Cube([0,2,6,3,4,1,5,7],[0,1,2,0,0,2,1,0],[0,1,10,3,4,5,9,7,8,2,6,11],null,I6),
  B:new Cube([0,1,3,7,4,5,2,6],[0,0,1,2,0,0,2,1],[0,1,2,11,4,5,6,10,8,9,3,7],[0,0,0,1,0,0,0,1,0,0,1,1],I6),
  // whole-cube rotations. center[i]=which old face now sits at position i
  x:new Cube([4,5,1,0,7,6,2,3],[2,1,2,1,1,2,1,2],[8,5,9,1,11,7,10,3,4,6,2,0],[0,1,0,1,0,1,0,1,0,0,0,0],[2,1,3,5,4,0]),
  y:new Cube([3,0,1,2,7,4,5,6],null,[3,0,1,2,7,4,5,6,11,8,9,10],[0,0,0,0,0,0,0,0,1,1,1,1],[0,5,1,3,2,4]),
  z:new Cube([1,5,6,2,0,4,7,3],[1,2,1,2,2,1,2,1],[2,9,6,10,0,8,4,11,1,5,7,3],[1,1,1,1,1,1,1,1,1,1,1,1],[4,0,2,1,3,5]),
};
// derived: wide + slice
function seq(...cs){return cs.reduce((a,b)=>a.mul(b),new Cube());}
const inv=c=>c.inverse();
BASE.r=seq(BASE.x,BASE.L); BASE.l=seq(inv(BASE.x),BASE.R);
BASE.u=seq(BASE.y,BASE.D); BASE.d=seq(inv(BASE.y),BASE.U);
BASE.f=seq(BASE.z,BASE.B); BASE.b=seq(inv(BASE.z),BASE.F);
BASE.M=seq(BASE.l,inv(BASE.L)); BASE.E=seq(BASE.d,inv(BASE.D)); BASE.S=seq(BASE.f,inv(BASE.F));
const MOVES={};
for(const k in BASE){MOVES[k]=BASE[k];MOVES[k+"'"]=inv(BASE[k]);MOVES[k+'2']=seq(BASE[k],BASE[k]);}
MOVES["Rw"]=MOVES.r;MOVES["Rw'"]=MOVES["r'"];MOVES["Rw2"]=MOVES.r2;
MOVES["Lw"]=MOVES.l;MOVES["Lw'"]=MOVES["l'"];MOVES["Lw2"]=MOVES.l2;
MOVES["Uw"]=MOVES.u;MOVES["Uw'"]=MOVES["u'"];MOVES["Uw2"]=MOVES.u2;
MOVES["Dw"]=MOVES.d;MOVES["Dw'"]=MOVES["d'"];MOVES["Dw2"]=MOVES.d2;
MOVES["Fw"]=MOVES.f;MOVES["Fw'"]=MOVES["f'"];MOVES["Fw2"]=MOVES.f2;
MOVES["Bw"]=MOVES.b;MOVES["Bw'"]=MOVES["b'"];MOVES["Bw2"]=MOVES.b2;

function parseAlg(s){
  return s.replace(/[()\[\],]/g,' ').replace(/’|`/g,"'").split(/\s+/).filter(Boolean).map(t=>t.replace(/2'/,'2').replace(/'2/,'2').replace(/3/,"'"));
}
function applyAlg(cube,alg){if(cube&&cube.isFour)return cube.apply(alg);let c=cube;for(const m of (typeof alg==='string'?parseAlg(alg):alg)){if(!MOVES[m])throw new Error('bad move '+m);c=c.mul(MOVES[m]);}return c;}
function invertAlg(alg){const ms=(typeof alg==='string'?parseAlg(alg):alg).slice().reverse();return ms.map(m=>m.endsWith("'")?m.slice(0,-1):m.endsWith('2')?m:m+"'").join(' ');}
const FACE_MOVES=['U',"U'",'U2','R',"R'",'R2','F',"F'",'F2','D',"D'",'D2','L',"L'",'L2','B',"B'",'B2'];
function axisOf(m){return 'UD'.includes(m[0])?0:'RL'.includes(m[0])?1:2;}
// cancel redundant moves
function simplify(ms){
  const out=[];
  const q={'':1,"2":2,"'":3};const rq=['', '', '2', "'"];
  for(const m of ms){
    const f=m[0],a=q[m.slice(1)]||1;
    if(out.length&&out[out.length-1][0]===f){
      const p=out.pop();const t=(q[p.slice(1)]+a)%4;if(t)out.push(f+rq[t]);
    } else if(out.length>1&&out[out.length-2][0]===f&&'URFDLB'.includes(f)&&'URFDLB'.includes(out[out.length-1][0])&&axisOf(out[out.length-1])===axisOf(m)&&out[out.length-1][0]!==f){
      const mid=out.pop();const p=out.pop();const t=(q[p.slice(1)]+a)%4;if(t)out.push(f+rq[t]);out.push(mid);
    } else out.push(m);
  }
  return out;
}
// ===== Seeded random =====
function hashStr(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return h>>>0;}
function rng(seed){let a=hashStr(String(seed));return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const SEED_A=['amber','basalt','cobalt','dune','ember','fjord','granite','harbor','iris','juniper','kelp','lumen','marble','nectar','onyx','pumice','quartz','raven','saffron','tundra','umber','velvet','willow','yarrow','zephyr','cedar','flint','moss','opal','slate'];
const SEED_B=['fox','otter','heron','lynx','viper','crane','moth','newt','ibis','wolf','hare','finch','gecko','koi','mole','owl','pike','quail','raccoon','stag','tern','vole','wren','yak','bison','crab','dove','eel','gull','hawk'];
function randomSeedName(){const r=Math.random;return SEED_A[Math.floor(r()*SEED_A.length)]+'-'+SEED_B[Math.floor(r()*SEED_B.length)]+'-'+Math.floor(r()*90+10);}
function randomMoveScramble(seed,n=22){
  const r=rng(seed);const out=[];let lastAx=-1,lastFace='',prevFace='';
  const faces=['U','R','F','D','L','B'],sfx=['',"'",'2'];
  while(out.length<n){
    const f=faces[Math.floor(r()*6)];const ax=axisOf(f);
    if(f===lastFace)continue;
    if(ax===lastAx&&f===prevFace)continue;
    out.push(f+sfx[Math.floor(r()*3)]);
    if(ax===lastAx){prevFace=lastFace;}else{prevFace='';}
    lastFace=f;lastAx=ax;
  }
  return out;
}
// Random-state scramble via inverse of a solve is not available; we use random moves (25) which is standard for trainers.

// ===== Pruning tables =====
// cross: edges 4..7 (DR DF DL DB). index = prod of (pos*2+eo) base 24
const MOVE_LIST=FACE_MOVES.map(m=>MOVES[m]);
function crossIndex(c){let idx=0;const pos=new Array(12);for(let i=0;i<12;i++)pos[c.ep[i]]=i;for(let e=4;e<8;e++){const p=pos[e];idx=idx*24+p*2+c.eo[p];}return idx;}
function pieceIndexCorner(c,corner){const pos=c.cp.indexOf(corner);return pos*3+c.co[pos];}
function pieceIndexEdge(c,edge){const pos=c.ep.indexOf(edge);return pos*2+c.eo[pos];}
function pairIndex(c,corner,edge){return pieceIndexCorner(c,corner)*24+pieceIndexEdge(c,edge);}

let CROSS_TABLE=null;
function buildCrossTable(){
  if(CROSS_TABLE)return CROSS_TABLE;
  const N=24*24*24*24;const t=new Uint8Array(N).fill(255);
  // BFS over reduced state: positions+orientations of 4 edges. Represent as small array.
  const start=new Cube();let frontier=[start];t[crossIndex(start)]=0;let d=0;
  // To keep states small, we store cubes but dedupe by index (edge-only subset). Use ep/eo only.
  while(frontier.length){
    const next=[];
    for(const c of frontier){for(const m of MOVE_LIST){const n=c.mul(m);const k=crossIndex(n);if(t[k]===255){t[k]=d+1;next.push(n);}}}
    frontier=next;d++;
  }
  CROSS_TABLE=t;return t;
}
const PAIR_TABLES={};
function buildPairTable(corner,edge){
  const key=corner+'-'+edge;if(PAIR_TABLES[key])return PAIR_TABLES[key];
  const t=new Uint8Array(576).fill(255);const start=new Cube();let frontier=[start];t[pairIndex(start,corner,edge)]=0;let d=0;
  while(frontier.length){const next=[];for(const c of frontier){for(const m of MOVE_LIST){const n=c.mul(m);const k=pairIndex(n,corner,edge);if(t[k]===255){t[k]=d+1;next.push(n);}}}frontier=next;d++;}
  PAIR_TABLES[key]=t;return t;
}
// ===== Cross solver: all optimal solutions (and optionally +1) =====
function solveCross(cube,extra=0,limit=40){
  const t=buildCrossTable();const d0=t[crossIndex(cube)];const sols=[];
  function dfs(c,depth,path,lastFace,lastAx){
    if(sols.length>=limit)return;
    const h=t[crossIndex(c)];
    if(h===0){sols.push(path.slice());return;}
    if(h>depth)return;
    for(let i=0;i<18;i++){const m=FACE_MOVES[i];const f=m[0];if(f===lastFace)continue;const ax=axisOf(m);if(ax===lastAx&&'DLB'.includes(f)&&f!==lastFace&&lastFace&&axisOf(lastFace)===ax&&'DLB'.includes(lastFace))continue;
      path.push(m);dfs(c.mul(MOVE_LIST[i]),depth-1,path,f,ax);path.pop();}
  }
  for(let dd=d0;dd<=d0+extra;dd++){dfs(cube,dd,[],'',-1);}
  // dedupe
  const seen=new Set();return {optimal:d0,solutions:sols.map(s=>s.join(' ')).filter(s=>{if(seen.has(s))return false;seen.add(s);return true;})};
}
// ===== Cross count: every solution of the D cross up to `maxLen` moves =====
// For a scramble report: the shortest length, and the solutions of each length from the shortest up
// to `maxLen`, so a count by length is `byLen[n].length`. Each solution is counted once: two moves
// that commute (U and D, R and L, F and B) are taken in one order, a face is never turned twice in
// a row, a move that leaves the cross as it was (a U turn) is not a solution move, and a sequence
// stops where the cross is solved, so no solution holds a shorter one. The cross table is exact, so
// the search visits only sequences that can still solve in the moves left.
function crossSolutions(cube,maxLen=7){
  const t=buildCrossTable();const d0=t[crossIndex(cube)];const byLen={};
  function dfs(c,ci,left,path,lastFace,lastAx){
    const h=t[ci];
    if(h===0){if(path.length)(byLen[path.length]||(byLen[path.length]=[])).push(path.join(' '));return;}
    if(h>left)return;
    for(let i=0;i<18;i++){const m=FACE_MOVES[i],f=m[0];if(f===lastFace)continue;const ax=axisOf(m);if(ax===lastAx&&'DLB'.includes(f))continue;
      const n=c.mul(MOVE_LIST[i]),ni=crossIndex(n);if(ni===ci)continue;
      path.push(m);dfs(n,ni,left-1,path,f,ax);path.pop();}
  }
  dfs(cube,crossIndex(cube),maxLen,[],'',-1);
  return {optimal:d0,byLen};
}
// ===== F2L pair solver (IDA*) keeping cross + previously solved pairs =====
const SLOTS=[{name:'FR',corner:4,edge:8},{name:'FL',corner:5,edge:9},{name:'BL',corner:6,edge:10},{name:'BR',corner:7,edge:11}];
function slotSolved(c,slot){return c.cp[slot.corner]===slot.corner&&c.co[slot.corner]===0&&c.ep[slot.edge]===slot.edge&&c.eo[slot.edge]===0;}
function crossSolved(c){for(let e=4;e<8;e++)if(c.ep[e]!==e||c.eo[e]!==0)return false;return true;}
function solveF2LPair(cube,slot,keep,maxDepth=13,nodeLimit=2500000){
  const ct=buildCrossTable();const tables=[slot,...keep].map(s=>({s,t:buildPairTable(s.corner,s.edge)}));
  const need=[slot,...keep];
  function h(c){let m=ct[crossIndex(c)];for(const {s,t} of tables){const v=t[pairIndex(c,s.corner,s.edge)];if(v>m)m=v;}return m;}
  function goal(c){if(!crossSolved(c))return false;for(const s of need)if(!slotSolved(c,s))return false;return true;}
  let nodes=0;let found=null;
  function dfs(c,g,bound,path,lastFace,lastAx){
    nodes++;if(nodes>nodeLimit)return Infinity;
    const f=g+h(c);if(f>bound)return f;
    if(goal(c)){found=path.slice();return -1;}
    let min=Infinity;
    for(let i=0;i<18;i++){const m=FACE_MOVES[i];const face=m[0];if(face===lastFace)continue;const ax=axisOf(m);if(ax===lastAx&&'DLB'.includes(face)&&'DLB'.includes(lastFace))continue;
      path.push(m);const r=dfs(c.mul(MOVE_LIST[i]),g+1,bound,path,face,ax);path.pop();if(r===-1)return -1;if(r<min)min=r;}
    return min;
  }
  if(goal(cube))return [];
  let bound=h(cube);
  while(bound<=maxDepth){const r=dfs(cube,0,bound,[],'',-1);if(r===-1)return found;if(r===Infinity)return null;bound=r;}
  return null;
}
// Full F2L: greedy order (shortest pair first)
function solveF2L(cube,order){
  let c=cube;const steps=[];const done=[];let remaining=SLOTS.slice();
  if(order){remaining=order.map(n=>SLOTS.find(s=>s.name===n));}
  while(remaining.length){
    let best=null;
    const cands=order?[remaining[0]]:remaining;
    for(const s of cands){
      if(slotSolved(c,s)&&crossSolved(c)){best={s,sol:[]};break;}
      const sol=solveF2LPair(c,s,done,order?14:11,order?3000000:600000);
      if(sol&&(!best||sol.length<best.sol.length))best={s,sol};
    }
    if(!best){ // fall back with larger limit on first remaining
      const s=remaining[0];const sol=solveF2LPair(c,s,done,15,6000000);if(!sol)return null;best={s,sol};
    }
    steps.push({slot:best.s.name,moves:best.sol});c=applyAlg(c,best.sol);done.push(best.s);remaining=remaining.filter(x=>x!==best.s);
  }
  return {steps,cube:c};
}
// ===== Turn the cube to each algorithm =====
// A state whose centers have turned (a rotation was applied) is reframed with rotationToRestore(c).mul(c):
// the same cube as the solver now holds it, with the centers back at home. derotate(c) is different: it
// turns the cube back physically, so the original slot names apply again.
function reframe(c){const r=rotationToRestore(c);return r?r.mul(c):c;}
// The state as held after the rotation r is applied to a cube in state c (r' c r).
function afterRotation(c,r){if(!r)return c;const R=MOVES[r];return R.inverse().mul(c).mul(R);}
// The y rotation that brings a slot to the front right, and where each slot goes after one y.
const SLOT_TO_FRONT={FR:'',FL:"y'",BL:'y2',BR:'y'};
const SLOT_AFTER_Y={FR:'FL',FL:'BL',BL:'BR',BR:'FR'};
const Y_COUNT={'':0,y:1,y2:2,"y'":3};
function yRot(k){return Y_ROTS.find(r=>Y_COUNT[r]===((k%4)+4)%4);}
function slotAfterY(name,k){for(let i=0;i<(k%4+4)%4;i++)name=SLOT_AFTER_Y[name];return name;}
// The net y rotation of a move list, as a count of y turns. Every reference alg turns only about y.
function yCountOf(moves){const c=applyAlg(new Cube(),moves).center.join();for(const r of Y_ROTS)if(applyAlg(new Cube(),r||[]).center.join()===c)return Y_COUNT[r];return 0;}
// Solve one pair the way the reference shows it. `cube` is the state in the original frame (cross on D, no
// rotation) and `grip` is how many y turns the solver has made so far. The cube is turned so the slot is at
// the front right, then a reference case with an AUF is tried. If no case fits (a piece sits in another
// slot) the search solver runs in that grip. Returns {rot, moves, ref} with the rotation first in moves.
function solveF2LPairRef(cube,slot,keep,grip,cases){
  const here=slotAfterY(slot.name,grip);const rot=SLOT_TO_FRONT[here];const g=grip+Y_COUNT[rot];
  const X=afterRotation(cube,yRot(g));
  const fr=SLOTS[0];const keepF=keep.map(s=>SLOTS.find(x=>x.name===slotAfterY(s.name,g)));
  const goal=c=>{const z=derotate(c);if(!crossSolved(z)||!slotSolved(z,fr))return false;for(const s of keepF)if(!slotSolved(z,s))return false;return true;};
  const out=(moves,ref)=>({rot,moves:[...(rot?[rot]:[]),...moves],ref});
  if(goal(X))return out([],null);
  let best=null;
  for(const f of cases)for(const u of AUFS){const moves=simplify([...(u?[u]:[]),...parseAlg(f.alg)]);// an AUF merges with a leading U of the alg
    if(best&&moves.length>=best.moves.length)continue;if(goal(applyAlg(X,moves)))best={moves,ref:f.n};}
  if(best)return out(best.moves,best.ref);
  const sol=solveF2LPair(X,fr,keepF,14,3000000);return sol?out(sol,null):null;
}
// Full F2L with the cube turned to each algorithm. Steps carry the slot (original name), the rotation,
// the moves and the reference case number. `cube` on return is the state as held at the end.
function solveF2LRef(cube,order,cases){
  let c=cube;let grip=0;const steps=[];const done=[];let remaining=order?order.map(n=>SLOTS.find(s=>s.name===n)):SLOTS.slice();
  while(remaining.length){
    let best=null;const cands=order?[remaining[0]]:remaining;
    for(const s of cands){const r=solveF2LPairRef(c,s,done,grip,cases);if(r&&(!best||r.moves.length<best.r.moves.length))best={s,r};}
    if(!best)return null;
    steps.push({slot:best.s.name,rot:best.r.rot,moves:best.r.moves,ref:best.r.ref});
    // The physical cube is c turned by the grip. Apply the moves there, then turn it back home.
    const g=yRot(grip);c=derotate(applyAlg(c,[...(g?[g]:[]),...best.r.moves]));
    grip=(grip+yCountOf(best.r.moves))%4;
    done.push(best.s);remaining=remaining.filter(x=>x!==best.s);
  }
  return {steps,cube:afterRotation(c,yRot(grip)),grip};
}
// ===== Last layer =====
function f2lSolved(c){if(!crossSolved(c))return false;for(const s of SLOTS)if(!slotSolved(c,s))return false;return true;}
function eoSolved(c){for(let e=0;e<4;e++)if(c.eo[e]!==0)return false;return true;}
function ollSolved(c){if(!eoSolved(c))return false;for(let i=0;i<4;i++)if(c.co[i]!==0)return false;return true;}
function cpSolvedLL(c){ // corners permuted relative to each other (allow AUF)
  for(let k=0;k<4;k++){const u=applyAlg(c,['U','U2',"U'",''][k]||[]);let ok=true;for(let i=0;i<4;i++)if(u.cp[i]!==i){ok=false;break;}if(ok)return true;}return false;}
const AUFS=['','U',"U'",'U2'];
// Rotations about the vertical axis, in place of an AUF when the plan turns the cube to each algorithm.
const Y_ROTS=['','y',"y'",'y2'];
// Try algs with a pre AUF (or, with rotate, a pre y rotation) and return the shortest {pre,alg,name,cube}.
// The returned cube is reframed: it is the state as held after the alg, with the centers home.
function findLLStep(cube,algs,test,rotate){
  let best=null;
  for(const a of algs){const ac=applyAlg(new Cube(),a.alg);
    for(const pre of (rotate?Y_ROTS:AUFS)){const c1=pre?(rotate?afterRotation(cube,pre):cube.mul(MOVES[pre])):cube;const c2=reframe(c1.mul(ac));
      if(test(c2)){const len=(pre?1:0)+parseAlg(a.alg).length;if(!best||len<best.len)best={pre,alg:a.alg,name:a.name,len,cube:c2};}
    }
  }
  return best;
}
function solveLL(cube,DB,rotate){
  const steps=[];let c=cube;
  if(!eoSolved(c)){const r=findLLStep(c,DB.eo,eoSolved,rotate);if(!r)return null;steps.push({stage:'OLL edges',...r});c=r.cube;}
  if(!ollSolved(c)){const r=findLLStep(c,DB.co,ollSolved,rotate);if(!r)return null;steps.push({stage:'OLL corners',...r});c=r.cube;}
  if(!cpSolvedLL(c)){const r=findLLStep(c,DB.cp,cpSolvedLL,rotate);if(!r)return null;steps.push({stage:'PLL corners',...r});c=r.cube;}
  if(!c.isSolved()){ // edges with AUF at end
    let best=null;
    for(const a of DB.ep){const ac=applyAlg(new Cube(),a.alg);for(const pre of (rotate?Y_ROTS:AUFS)){const c1=pre?(rotate?afterRotation(c,pre):c.mul(MOVES[pre])):c;const c2=reframe(c1.mul(ac));for(const post of AUFS){const c3=post?c2.mul(MOVES[post]):c2;if(c3.isSolved()){const len=(pre?1:0)+parseAlg(a.alg).length+(post?1:0);if(!best||len<best.len)best={pre,alg:a.alg,name:a.name,post,len,cube:c3};}}}}
    if(!best){ // maybe just AUF
      for(const post of AUFS){const c3=post?c.mul(MOVES[post]):c;if(c3.isSolved()){best={pre:'',alg:'',name:'AUF',post,len:post?1:0,cube:c3};}}
    }
    if(!best)return null;steps.push({stage:'PLL edges',...best});c=best.cube;
  }
  return {steps,cube:c};
}
// ===== Permutation analysis of an alg =====
function analyzeAlg(alg){
  const c=derotate(applyAlg(new Cube(),alg));const iv=c.inverse(); // iv.cp[piece] = where that piece went
  const cornerCycles=[],edgeCycles=[];const seenC=new Array(8).fill(false),seenE=new Array(12).fill(false);
  const twisted=[],flipped=[];
  for(let i=0;i<8;i++){if(seenC[i])continue;let j=i;const cyc=[];let tw=0;while(!seenC[j]){seenC[j]=true;cyc.push(j);tw+=c.co[j];j=iv.cp[j];}
    if(cyc.length>1)cornerCycles.push({cyc,twist:tw%3});else if(c.co[i])twisted.push({piece:i,twist:c.co[i]});}
  for(let i=0;i<12;i++){if(seenE[i])continue;let j=i;const cyc=[];let fl=0;while(!seenE[j]){seenE[j]=true;cyc.push(j);fl+=c.eo[j];j=iv.ep[j];}
    if(cyc.length>1)edgeCycles.push({cyc,flip:fl%2});else if(c.eo[i])flipped.push(i);}
  // order
  let order=1;let p=new Cube();do{p=p.mul(c);order++;}while(!p.isSolved()&&order<2000);
  order=order-1;
  const ms=parseAlg(alg);
  return {cube:c,cornerCycles,edgeCycles,twisted,flipped,order,moveCount:ms.filter(m=>!'xyz'.includes(m[0])).length,affectsOnlyU:[...Array(8).keys()].every(i=>(i<4)||(c.cp[i]===i&&c.co[i]===0))&&[...Array(12).keys()].every(i=>(i<4)||(c.ep[i]===i&&c.eo[i]===0))};
}
// trigger detection
const TRIGGERS=[
  {name:'sexy move',alg:"R U R' U'"},{name:'inverse sexy',alg:"U R U' R'"},{name:'left sexy',alg:"L' U' L U"},{name:'sledgehammer',alg:"R' F R F'"},{name:'hedgeslammer',alg:"F R' F' R"},{name:'Sune core',alg:"R U R' U R U2 R'"},{name:'fat sexy',alg:"r U R' U'"},{name:'fat sledge',alg:"r' F R F'"}
];
function findTriggers(alg){
  const ms=parseAlg(alg);const out=[];
  for(const t of TRIGGERS){const tm=parseAlg(t.alg);for(let i=0;i+tm.length<=ms.length;i++){let ok=true;for(let k=0;k<tm.length;k++)if(ms[i+k]!==tm[k]){ok=false;break;}if(ok)out.push({name:t.name,start:i,end:i+tm.length});}}
  return out.sort((a,b)=>a.start-b.start);
}
// ===== rotations & derotation =====
const ROTATIONS=(()=>{const out=[];const seen=new Set();let frontier=[new Cube()];seen.add(frontier[0].center.join());out.push(frontier[0]);
  while(frontier.length){const next=[];for(const c of frontier)for(const m of ['x','y','z']){const n=c.mul(MOVES[m]);const k=n.center.join();if(!seen.has(k)){seen.add(k);out.push(n);next.push(n);}}frontier=next;}return out;})();
function derotate(c){if(c.center.join()==='0,1,2,3,4,5')return c;for(const r of ROTATIONS){const n=c.mul(r);if(n.center.join()==='0,1,2,3,4,5')return n;}return c;}
function isSolvedAny(c){return derotate(c).isSolved();}
function rotationToRestore(c){for(const r of ROTATIONS){const n=c.mul(r);if(n.center.join()==='0,1,2,3,4,5')return r;}return null;}
Cube.prototype.isSolvedAny=function(){return isSolvedAny(this);};

// ---------- facelets -> cube, with validation ----------
// f: array of 54 color indices (0..5, = face index of that color in the WCA grip). Centers must be 0..5 in order.
function fromFacelets(f){
  const errors=[];
  if(!Array.isArray(f)||f.length!==54)return {ok:false,errors:['Need 54 stickers.']};
  for(let i=0;i<6;i++)if(f[9*i+4]!==i)errors.push(`The center of the ${['top','right','front','bottom','left','back'][i]} face must be ${COLOR_NAMES_E[i]}.`);
  const counts=[0,0,0,0,0,0];let unknown=0;for(const x of f){if(x>=0&&x<6)counts[x]++;else unknown++;}
  if(unknown)errors.push(`${unknown} sticker${unknown>1?'s are':' is'} not set.`);
  const bad=[];for(let c=0;c<6;c++)if(counts[c]!==9)bad.push(`${COLOR_NAMES_E[c]} ${counts[c]}`);
  if(bad.length&&!unknown)errors.push('Each color must be on 9 stickers. These are not: '+bad.join(', ')+'.');
  if(errors.length)return {ok:false,errors,counts};
  const c=new Cube();const seenC=new Array(8).fill(0),seenE=new Array(12).fill(0);const badPieces=[];
  for(let i=0;i<8;i++){
    let ori=0;for(ori=0;ori<3;ori++){const v=f[cornerFacelet[i][ori]];if(v===0||v===3)break;}
    if(ori===3){badPieces.push({type:'corner',pos:i});continue;}
    const c1=f[cornerFacelet[i][(ori+1)%3]],c2=f[cornerFacelet[i][(ori+2)%3]];let found=-1;
    for(let j=0;j<8;j++)if(c1===cornerColor[j][1]&&c2===cornerColor[j][2]&&f[cornerFacelet[i][ori]]===cornerColor[j][0]){found=j;break;}
    if(found<0){badPieces.push({type:'corner',pos:i});continue;}
    c.cp[i]=found;c.co[i]=ori%3;seenC[found]++;
  }
  for(let i=0;i<12;i++){
    let found=-1;
    for(let j=0;j<12;j++){
      if(f[edgeFacelet[i][0]]===edgeColor[j][0]&&f[edgeFacelet[i][1]]===edgeColor[j][1]){c.ep[i]=j;c.eo[i]=0;found=j;break;}
      if(f[edgeFacelet[i][0]]===edgeColor[j][1]&&f[edgeFacelet[i][1]]===edgeColor[j][0]){c.ep[i]=j;c.eo[i]=1;found=j;break;}
    }
    if(found<0){badPieces.push({type:'edge',pos:i});continue;}
    seenE[found]++;
  }
  for(const p of badPieces)errors.push(`The ${p.type} at ${p.type==='corner'?CORNER_NAMES[p.pos]:EDGE_NAMES[p.pos]} has a mix of colors that no real piece has. Check its stickers.`);
  if(errors.length)return {ok:false,errors,counts,badPieces};
  const dupC=[],dupE=[];for(let j=0;j<8;j++)if(seenC[j]!==1)dupC.push(CORNER_NAMES[j]);for(let j=0;j<12;j++)if(seenE[j]!==1)dupE.push(EDGE_NAMES[j]);
  if(dupC.length)errors.push('Some corners show up twice, and others are missing: '+dupC.join(', ')+'.');
  if(dupE.length)errors.push('Some edges show up twice, and others are missing: '+dupE.join(', ')+'.');
  if(errors.length)return {ok:false,errors,counts};
  if(c.co.reduce((a,b)=>a+b,0)%3)errors.push('One corner is twisted, so this cube cannot be solved. Check the corner stickers: one is probably wrong.');
  if(c.eo.reduce((a,b)=>a+b,0)%2)errors.push('One edge is flipped, so this cube cannot be solved. Check the edge stickers: one is probably wrong.');
  if(permParity(c.cp)!==permParity(c.ep))errors.push('Two pieces are swapped, so this cube cannot be solved. Check the stickers: two colors are probably mixed up.');
  if(errors.length)return {ok:false,errors,counts,cube:c,unsolvable:true};
  return {ok:true,errors:[],counts,cube:c};
}
const COLOR_NAMES_E=['white','red','green','yellow','orange','blue'];
function permParity(p){let s=0;for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++)if(p[i]>p[j])s++;return s&1;}

