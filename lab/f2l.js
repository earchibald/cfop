// ================= The F2L guide of the smart cube lab =================
// The first two layers, one pair at a time, for the F2L guide window in lab/lab.js. Pure: no DOM.
// It loads after js/engine.js (SLOTS, slotSolved, crossSolved, the cross and pair tables).
// The frame: X is the cube as held after reframe (reframe(labHeld(cube)) in lab.js), so D is the
// bottom as held, F the front as held, and every move that comes out reads as held. The slot names
// are positions as held: FR front right, FL front left, BL back left, BR back right.
// The search: IDA* as solveF2LPair in engine.js, with the same heuristic (the largest of the cross
// table and the pair table of each slot in the goal), on the few pieces the goal needs: the four
// cross edges, and the corner and the edge of each slot. A move goes from piece index to piece
// index through two small tables, so a node costs no allocation. The search goes on past the first
// find at each bound, so it lists every solution of a length. Each solution is counted once, as
// crossSolutions counts the cross: no face twice in a row, two moves on one axis in one order (D
// before U, L before R, B before F), no move that leaves every piece of the goal where it was, and
// a sequence stops where the goal is solved, so no solution holds a shorter one.
//
// f2lSlotWords(held)             the position and the corner colors of each slot, as held
// f2lState(X, done)              {cross, solved, broken}: the slots solved, and which of `done` came apart
// f2lPairSolutions(X, slot, keep, {extra, limit, nodeLimit})
//                                every solution of `slot` that keeps the cross and `keep`, by length
// f2lNext(X, {mode, order, done, target})
//                                the next target and its hint: {slot, moves, optimal, sols, partial}
// f2lThen(X, {mode, order})      from the cube after the current hint: the slots still to do, in the
//                                order the mode takes them, with each one's move count
// f2lCombos(X, slot, keep, others, {extra, nodeLimit, mode, order})
//                                {also, setup, partial}: a hint that makes a second slot too, and the
//                                shortest hint that leaves the next slot shortest
// f2lDone(start, moves, now)     how many moves of a hint the user has done; -1 off the hint
// f2lPart(start, moves, now)     a half turn of the hint made as one quarter turn so far
const F2L_ORDER_DEFAULT=['FR','FL','BL','BR'];
const F2L_COMBO_EXTRA=3;       // an "also makes" line is at most this many moves longer than the target alone
const F2L_NODES=12000000;      // the node budget of one call (about half a second at worst); past it the answer is partial
const F2L_MAX_DEPTH=14;        // no pair with the cross kept needs more
const F2L_LIMIT=60;            // the most solutions listed for one length
const F2L_POS={FR:'front right',FL:'front left',BL:'back left',BR:'back right'};
// The faces of each slot's corner, in the order the words name its colors: front or back, then
// right or left, then the bottom. Face indices as Cube.center: U R F D L B.
const F2L_SLOT_FACES={FR:[2,1,3],FL:[2,4,3],BL:[5,4,3],BR:[5,1,3]};
// The cost of a move for the hint a person reads first: U, R and L turn easily; F, then D and B less.
const F2L_FACE_COST={U:0,R:0,L:0,F:1,D:2,B:2};
function f2lSlot(s){return typeof s==='string'?SLOTS.find(x=>x.name===s):s;}
function f2lSlotWords(held){
  const c=held.center,o={};
  for(const n of F2L_ORDER_DEFAULT)o[n]={pos:F2L_POS[n],colors:F2L_SLOT_FACES[n].map(f=>COLOR_NAMES_E[c[f]])};
  return o;
}
function f2lState(X,done){
  const solved=SLOTS.filter(s=>slotSolved(X,s)).map(s=>s.name);
  return {cross:crossSolved(X),solved,broken:(done||[]).filter(n=>!solved.includes(n))};
}
// ----- the search -----
// The move tables: the index of a piece (position*3+twist for a corner, position*2+flip for an
// edge, as pieceIndexCorner and pieceIndexEdge) after each of the 18 face moves.
let F2L_CM=null,F2L_EM=null;
function f2lTables(){
  if(F2L_CM)return;
  F2L_CM=new Uint8Array(24*18);F2L_EM=new Uint8Array(24*18);
  for(let m=0;m<18;m++){const M=MOVE_LIST[m];
    for(let i=0;i<8;i++){const p=M.cp[i];for(let o=0;o<3;o++)F2L_CM[(p*3+o)*18+m]=i*3+(o+M.co[i])%3;}
    for(let i=0;i<12;i++){const p=M.ep[i];for(let o=0;o<2;o++)F2L_EM[(p*2+o)*18+m]=i*2+(o+M.eo[i])%2;}
  }
}
function f2lCost(sol){let n=0;for(const m of sol.split(' '))n+=F2L_FACE_COST[m[0]];return n;}
function f2lSort(sols){return sols.map((s,i)=>({s,i,c:f2lCost(s)})).sort((a,b)=>a.c-b.c||a.i-b.i).map(x=>x.s);}
// Every solution of the goal (the cross and each slot in `goal`) from X, shortest first: {optimal,
// byLen, partial, capped}. o.first: stop at the first solution. o.extra: lengths past the optimal.
// o.budget: {left}, a node budget that several searches can share. optimal is null when no
// solution came within o.maxDepth or the budget.
function f2lFind(X,goal,o={}){
  f2lTables();
  const slots=goal.map(f2lSlot),k=slots.length,W=4+2*k,ct=buildCrossTable(),pts=slots.map(s=>buildPairTable(s.corner,s.edge));
  const maxDepth=o.maxDepth==null?F2L_MAX_DEPTH:o.maxDepth,limit=o.first?1:(o.limit||F2L_LIMIT),extra=o.first?0:(o.extra||0);
  const bud=o.budget||{left:o.nodeLimit||F2L_NODES};
  const st=[];for(let d=0;d<=maxDepth+1;d++)st.push(new Uint8Array(W));
  for(let e=4;e<8;e++)st[0][e-4]=pieceIndexEdge(X,e);
  slots.forEach((s,j)=>{st[0][4+2*j]=pieceIndexCorner(X,s.corner);st[0][5+2*j]=pieceIndexEdge(X,s.edge);});
  const h=s=>{let m=ct[((s[0]*24+s[1])*24+s[2])*24+s[3]];for(let j=0;j<k;j++){const v=pts[j][s[4+2*j]*24+s[5+2*j]];if(v>m)m=v;}return m;};
  const out={optimal:null,byLen:{},partial:false,capped:false};
  const h0=h(st[0]);if(h0===0){out.optimal=0;return out;}
  const path=[];let sols=null,stop=false;
  const dfs=(d,left,lastF)=>{
    if(--bud.left<0){out.partial=true;stop=true;return;}
    const s=st[d],hv=h(s);
    if(hv===0){if(left===0){sols.push(path.slice(0,d).map(i=>FACE_MOVES[i]).join(' '));if(sols.length>=limit){out.capped=!o.first;stop=true;}}return;}
    if(hv>left)return;
    const n=st[d+1];
    for(let i=0;i<18;i++){
      const f=(i/3)|0;if(f===lastF)continue;if(lastF>=0&&f>=3&&f-3===lastF)continue; // D after U, L after R, B after F: taken in the other order
      let ch=false;
      for(let w=0;w<W;w++){const v=(w<4||(w&1))?F2L_EM[s[w]*18+i]:F2L_CM[s[w]*18+i];n[w]=v;if(v!==s[w])ch=true;}
      if(!ch)continue;
      path[d]=i;dfs(d+1,left-1,f);if(stop)return;
    }
  };
  for(let L=h0;L<=maxDepth;L++){
    if(out.optimal!=null&&L>out.optimal+extra)break;
    sols=[];stop=false;dfs(0,L,-1);
    if(sols.length){if(out.optimal==null)out.optimal=L;out.byLen[L]=f2lSort(sols);}
    if(out.partial||(o.first&&sols.length))break;
  }
  return out;
}
// Every solution of `slot` that keeps the cross and the slots in `keep`, at the optimal length and
// up to `extra` moves longer. limit: the most listed for one length (capped:true past it).
// nodeLimit: past it the answer is what was found so far, with partial:true.
function f2lPairSolutions(X,slot,keep,opts={}){
  return f2lFind(X,[slot,...(keep||[])],{extra:opts.extra||0,limit:opts.limit||F2L_LIMIT,nodeLimit:opts.nodeLimit,budget:opts.budget,maxDepth:opts.maxDepth});
}
// The length of the shortest solution alone, or null.
function f2lLen(X,goal,budget,maxDepth){return f2lFind(X,goal,{first:true,budget,maxDepth}).optimal;}
// The slots of X that are not solved, in the order given.
function f2lOpen(X,order){return (order||F2L_ORDER_DEFAULT).filter(n=>!slotSolved(X,f2lSlot(n)));}
function f2lKeep(X){return SLOTS.filter(s=>slotSolved(X,s)).map(s=>s.name);}
// The slot the mode takes next, with its length: `target` if set and not solved; by corner, the
// first slot of the order not solved; shortest, the slot with the fewest moves from here (ties go
// to the order). The solved slots are kept. null when every slot is solved.
// cap: in shortest mode, only a slot within cap moves counts (n null when none is).
function f2lPick(X,{mode='shortest',order=F2L_ORDER_DEFAULT,target=null,budget,cap=F2L_MAX_DEPTH}={}){
  const open=f2lOpen(X,order),keep=f2lKeep(X);
  if(!open.length)return null;
  if(target&&open.includes(target))return {slot:target,n:null};
  if(mode==='corner')return {slot:open[0],n:null};
  let best=null;
  for(const n of open){
    const len=f2lLen(X,[n,...keep],budget,best&&best.n!=null?best.n-1:cap); // only a shorter one can win
    if(len!=null&&(!best||best.n==null||len<best.n))best={slot:n,n:len};
  }
  return best||{slot:open[0],n:null};
}
// The next target and its hint. moves: one of the shortest solutions (the easiest to turn first),
// sols: all of that length (up to the limit). done is the list of slots the guide has recorded;
// the solved slots of X are kept, whether done or solved by chance.
function f2lNext(X,{mode='shortest',order=F2L_ORDER_DEFAULT,done=[],target=null,limit=F2L_LIMIT,nodeLimit,budget}={}){
  budget=budget||{left:nodeLimit||F2L_NODES};
  const p=f2lPick(X,{mode,order,target,budget});if(!p)return null;
  const keep=f2lKeep(X),r=f2lFind(X,[p.slot,...keep],{limit,budget});
  const sols=r.optimal!=null?(r.byLen[r.optimal]||[]):[];
  return {slot:p.slot,moves:sols.length?sols[0].split(' '):null,optimal:r.optimal,sols,partial:r.partial,capped:r.capped};
}
// From X, the cube after the current hint: the slots still to do, in the order the mode takes
// them, each with its move count from the cube after the one before ([{slot, n}]; n null where
// the search gave up, and the list stops there).
function f2lThen(X,{mode='shortest',order=F2L_ORDER_DEFAULT,nodeLimit,budget}={}){
  budget=budget||{left:nodeLimit||F2L_NODES};
  const out=[];let Y=X;
  for(let i=0;i<4;i++){
    const r=f2lNext(Y,{mode,order,budget});if(!r)break; // the hint the window would show for it
    out.push({slot:r.slot,n:r.optimal});
    if(!r.moves)break;
    Y=applyAlg(Y,r.moves);
  }
  return out;
}
// Also makes: the shortest solution that solves `slot` and `other` together, keeping the cross and
// `keep`, when it is at most `max` moves long. {slot:other, moves, n}; null when there is none;
// {slot:other, moves:null, partial:true} when the search gave up first.
function f2lAlso(X,slot,keep,other,{max,budget,nodeLimit}={}){
  budget=budget||{left:nodeLimit||F2L_NODES};
  const r=f2lFind(X,[slot,other,...(keep||[])],{first:true,maxDepth:max,budget});
  if(r.optimal==null)return r.partial?{slot:other,moves:null,partial:true}:null;
  if(!r.optimal)return null;
  return {slot:other,moves:r.byLen[r.optimal][0].split(' '),n:r.optimal};
}
// Sets up: of `sols` (the shortest solutions of `slot` alone, the plain hint first), the one after
// which the next slot the mode takes is shortest. {slot, moves, after, plain} when it beats the
// plain hint by a move or more, else null. after: that slot's optimal after this solution; plain:
// the next step's optimal after the plain hint.
function f2lSetup(X,slot,sols,{mode='shortest',order=F2L_ORDER_DEFAULT,budget,nodeLimit}={}){
  budget=budget||{left:nodeLimit||F2L_NODES};
  if(!sols||sols.length<2)return null;
  const next=(moves,max)=>{const Y=applyAlg(X,moves);const p=f2lPick(Y,{mode,order,budget,cap:max});if(!p)return null;
    const n=p.n!=null?p.n:f2lLen(Y,[p.slot,...f2lKeep(Y)],budget,max);return n==null?null:{slot:p.slot,n};};
  const plain=next(sols[0].split(' '),F2L_MAX_DEPTH);if(!plain||plain.n<=1)return null;
  let best=null;
  for(const s of sols.slice(1)){
    if(budget.left<=0)break;
    const moves=s.split(' '),r=next(moves,(best?best.after:plain.n)-1);
    if(r&&r.n<(best?best.after:plain.n))best={slot:r.slot,moves,after:r.n,plain:plain.n};
  }
  return best;
}
// The combinations for the target: {also:[...], setup, partial}. others: the slots to try with it.
// nodeLimit is the budget of each part (the target alone, each other slot, the setup), so the
// window can run each part in its own turn of the event loop with the same answer.
function f2lCombos(X,slot,keep,others,{extra=F2L_COMBO_EXTRA,nodeLimit,mode='shortest',order=F2L_ORDER_DEFAULT}={}){
  const lim=nodeLimit||F2L_NODES,r=f2lPairSolutions(X,slot,keep,{nodeLimit:lim});
  const out={also:[],setup:null,partial:r.partial};
  if(r.optimal==null)return out;
  for(const o of others){const a=f2lAlso(X,slot,keep,o,{max:r.optimal+extra,nodeLimit:lim});if(a&&a.partial)out.partial=true;else if(a)out.also.push(a);}
  const b={left:lim};out.setup=f2lSetup(X,slot,r.byLen[r.optimal]||[],{mode,order,budget:b});if(b.left<=0)out.partial=true;
  return out;
}
// How many moves of a hint the user has done: the largest n for which the cube now is the cube at
// the hint's start after its first n moves (cfopStageDone in js/stage.js). -1 when it is none of
// them: the user went off the hint. A move off the hint and back again counts as on it.
function f2lDone(start,moves,now){
  if(!start||!now||!moves)return -1;
  let c=start,n=start.equals(now)?0:-1;
  moves.forEach((m,i)=>{c=applyAlg(c,[m]);if(c.equals(now))n=i+1;});
  return n;
}
// A half turn of the hint made as two quarter turns: after the first, the cube is the hint's
// first n moves and a quarter turn of move n's face (either way). n, or -1.
function f2lPart(start,moves,now){
  if(!start||!now||!moves)return -1;
  let c=start;
  for(let i=0;i<moves.length;i++){
    const m=moves[i];
    if(m.endsWith('2')&&(applyAlg(c,[m[0]]).equals(now)||applyAlg(c,[m[0]+"'"]).equals(now)))return i;
    c=applyAlg(c,[m]);
  }
  return -1;
}
