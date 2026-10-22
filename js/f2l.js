// ================= The F2L guide =================
// The first two layers, one pair at a time, for the Guide panel of the site (js/f2l-ui.js) and the
// F2L guide window of the lab (lab/lab.js). Pure: no DOM.
// It loads after js/engine.js (SLOTS, slotSolved, crossSolved, the cross and pair tables, the
// rotations) and js/algs.js (F2L_CASES, F2L_WHY: the 41 cases for the basic way).
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
// f2lStatus(X, done)              {cross, solved, broken}: the slots solved, and which of `done` came apart
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
// f2lBasic(X, slot, keep)        the textbook way: free a stuck piece, then one of the 41 cases
// f2lArc(X, slot, moves)         what each move does to the pair, in plain words
// f2lJoined(X, slot)             the corner and the edge are a pair on top: a basic insert puts them in
// f2lUnrotate(moves)             the same moves with no whole-cube turns (x, y, z, wide and slice moves)
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
function f2lStatus(X,done){
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
// solution came within o.maxDepth or the budget. o.free: the last slot of the goal is not solved
// but freed: its corner and its edge end on top or at home, with the rest of the goal solved.
function f2lFind(X,goal,o={}){
  f2lTables();
  const slots=goal.map(f2lSlot),k=slots.length,W=4+2*k,ct=buildCrossTable(),pts=slots.map(s=>buildPairTable(s.corner,s.edge));
  const kh=o.free?k-1:k,fs=slots[k-1]; // the slots the heuristic counts; the slot to free
  const freeOk=s=>{const c=(s[4+2*(k-1)]/3)|0,e=(s[5+2*(k-1)]/2)|0;return (c<4||c===fs.corner)&&(e<4||e===fs.edge);};
  const maxDepth=o.maxDepth==null?F2L_MAX_DEPTH:o.maxDepth,limit=o.first?1:(o.limit||F2L_LIMIT),extra=o.first?0:(o.extra||0);
  const bud=o.budget||{left:o.nodeLimit||F2L_NODES};
  const st=[];for(let d=0;d<=maxDepth+1;d++)st.push(new Uint8Array(W));
  for(let e=4;e<8;e++)st[0][e-4]=pieceIndexEdge(X,e);
  slots.forEach((s,j)=>{st[0][4+2*j]=pieceIndexCorner(X,s.corner);st[0][5+2*j]=pieceIndexEdge(X,s.edge);});
  const h=s=>{let m=ct[((s[0]*24+s[1])*24+s[2])*24+s[3]];for(let j=0;j<kh;j++){const v=pts[j][s[4+2*j]*24+s[5+2*j]];if(v>m)m=v;}return m;};
  const done=s=>h(s)===0&&(!o.free||freeOk(s));
  const out={optimal:null,byLen:{},partial:false,capped:false};
  if(done(st[0])){out.optimal=0;return out;}
  const h0=h(st[0]);
  const path=[];let sols=null,stop=false;
  const dfs=(d,left,lastF)=>{
    if(--bud.left<0){out.partial=true;stop=true;return;}
    const s=st[d],hv=h(s);
    if(hv===0&&(!o.free||freeOk(s))){if(left===0){sols.push(path.slice(0,d).map(i=>FACE_MOVES[i]).join(' '));if(sols.length>=limit){out.capped=!o.first;stop=true;}}return;}
    if(hv>left||left===0)return;
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
// The cube went off the hint, but is on another way to the same end: one of the other shortest
// solutions `sols`, or the hint (or one of them) with two moves on opposite faces made in the
// other order, which the canonical lists never hold. {moves, n} to go on with, else null. The hint
// the user follows should not change under them for a difference that makes none.
function f2lAlong(start,moves,sols,now){
  const opp={U:'D',D:'U',R:'L',L:'R',F:'B',B:'F'},seen=new Set([moves.join(' ')]),lists=[moves];
  for(const s of sols||[]){const c=typeof s==='string'?s.split(' '):s.slice();if(!seen.has(c.join(' '))){seen.add(c.join(' '));lists.push(c);}}
  const cands=[];
  for(const c of lists){
    if(c!==moves)cands.push(c);
    for(let i=0;i+1<c.length;i++)if(opp[c[i][0]]===c[i+1][0]){const w=c.slice();[w[i],w[i+1]]=[w[i+1],w[i]];if(!seen.has(w.join(' '))){seen.add(w.join(' '));cands.push(w);}}
  }
  for(const c of cands){const n=f2lDone(start,c,now);if(n>=0)return {moves:c,n};const h=f2lPart(start,c,now);if(h>=0)return {moves:c,n:h};}
  return null;
}
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
// ----- the basic way: the textbook path for one pair -----
// The same moves with no whole-cube turn in them: a rotation turns the letters of the moves after
// it, a wide move is a rotation and a face move, a slice move is a wide move and a face move. The
// list comes out as face moves as held in the frame the first move was in, cancelled (simplify).
// (removeRotations in js/app.js is this function.)
const F2L_WIDE={r:['x','L'],l:["x'",'R'],u:['y','D'],d:["y'",'U'],f:['z','B'],b:["z'",'F']};
function f2lExpand(m){
  const b=m[0],sfx=m.slice(1),flip=t=>sfx===''?t:sfx==='2'?t.replace("'",'')+'2':(t.endsWith("'")?t.slice(0,-1):t+"'");
  if('rludfb'.includes(b))return F2L_WIDE[b].map(flip);
  const inv=sfx===''?"'":sfx==='2'?'2':'';
  if(b==='M')return [...f2lExpand('l'+sfx),...f2lExpand('L'+inv)];
  if(b==='E')return [...f2lExpand('d'+sfx),...f2lExpand('D'+inv)];
  if(b==='S')return [...f2lExpand('f'+sfx),...f2lExpand('F'+inv)];
  return [m];
}
function f2lUnrotate(moves){
  moves=Array.isArray(moves)?moves:parseAlg(moves);
  if(!moves.some(m=>'xyzrludfbMES'.includes(m[0])))return moves.slice();
  let rot=new Cube();const out=[];
  for(const m0 of moves)for(const m of f2lExpand(m0)){
    const b=m[0];
    if('xyz'.includes(b)){rot=rot.mul(MOVES[m]);continue;}
    out.push(FACE_NAMES[rot.center[FACE_NAMES.indexOf(b)]]+m.slice(1));
  }
  return simplify(out);
}
// The corner and the edge of `slot` are a pair on top: one of the four basic inserts (cases 1 to
// 4), with any top turn first, puts them into the slot. The cross need not be made.
function f2lJoined(X,slot){
  const s=f2lSlot(slot);if(X.cp.indexOf(s.corner)>=4||X.ep.indexOf(s.edge)>=4)return false;
  const Y=afterRotation(X,SLOT_TO_FRONT[s.name]||'');
  for(const f of F2L_CASES.slice(0,4))for(const u of AUFS){
    if(slotSolved(derotate(applyAlg(Y,simplify([...(u?[u]:[]),...parseAlg(f.alg)]))),SLOTS[0]))return true;
  }
  return false;
}
// The textbook way for `slot`, with the cross and `keep` kept: the cube turned so the slot is at the
// front right, a stuck piece (one in another slot) freed with the fewest moves, then one of the 41
// cases with the top turn it needs. {rot, steps:[{kind:'free'|'case', moves, text, n, grp, why}],
// moves (the rotation first, then the steps' moves, as the book writes them), flat (face moves as
// held in X's frame, f2lUnrotate), n (the count of flat)}. null when no case fits (it always does
// once the pieces are free).
function f2lBasic(X,slot,keep,opts={}){
  const s=f2lSlot(slot),rot=SLOT_TO_FRONT[s.name]||'',g=Y_COUNT[rot];
  const Y0=afterRotation(X,rot),fr=SLOTS[0],keepF=(keep||[]).map(n=>slotAfterY(typeof n==='string'?n:n.name,g));
  const steps=[];let Y=Y0;
  // Free: the pieces of the slot on top or at home, with the cross and the kept slots as they are.
  const cp=Y.cp.indexOf(fr.corner),ep=Y.ep.indexOf(fr.edge),stuck=[];
  if(cp>=4&&cp!==fr.corner)stuck.push('corner');if(ep>=4&&ep!==fr.edge)stuck.push('edge');
  if(stuck.length){
    const r=f2lFind(Y,[...keepF,'FR'],{free:true,first:false,limit:F2L_LIMIT,maxDepth:opts.freeDepth||6,nodeLimit:opts.nodeLimit});
    if(r.optimal==null)return null;
    const moves=r.optimal?r.byLen[r.optimal][0].split(' '):[];
    // The slot a stuck piece sits in, named in X's frame.
    const where=p=>F2L_POS[slotAfterY(SLOTS[p].name,-g)];
    const parts=[];if(cp>=4&&cp!==fr.corner)parts.push(`the corner from the ${where(cp-4)} slot`);if(ep>=4&&ep!==fr.edge)parts.push(`the edge from the ${where(ep-8)} slot`);
    steps.push({kind:'free',moves,text:`Free ${parts.join(' and ')}: ${moves.length} move${moves.length===1?'':'s'} that keep the cross${keepF.length?' and the solved pairs':''}.`});
    Y=applyAlg(Y,moves);
  }
  // The case: the shortest of the 41 with a top turn that solves the slot and keeps the rest.
  const goal=c=>{const z=derotate(c);if(!crossSolved(z)||!slotSolved(z,fr))return false;for(const n of keepF)if(!slotSolved(z,f2lSlot(n)))return false;return true;};
  let best=null;
  if(goal(Y))best={moves:[],n:0,f:null,u:''};
  else for(const f of F2L_CASES)for(const u of AUFS){
    const moves=simplify([...(u?[u]:[]),...parseAlg(f.alg)]),len=moves.filter(m=>!'xyz'.includes(m[0])).length;
    if(best&&len>=best.n)continue;
    if(goal(applyAlg(Y,moves)))best={moves,n:len,f,u};
  }
  if(!best)return null;
  if(best.f)steps.push({kind:'case',moves:best.moves,n:best.f.n,grp:best.f.grp,why:F2L_WHY[best.f.grp]||'',auf:best.u,alg:best.f.alg,
    text:`Case ${best.f.n}, ${best.f.grp.toLowerCase()}${best.u?`: turn the top ${best.u} first, then ${best.f.alg}`:`: ${best.f.alg}`}.`});
  const moves=[...(rot?[rot]:[]),...steps.flatMap(st=>st.moves)],flat=f2lUnrotate(moves);
  return {rot,steps,moves,flat,n:flat.length};
}
// ----- the arc: what each move does to the pair -----
// The corner and the edge of `slot` followed through `moves` (face moves, or any moves: the cube
// is turned home after each). The events, at the count of moves made when each first holds:
// [{i, text}], several at one count joined with " · ". i is 0 for what holds before the first
// move. The kept slots are the slots solved at the start, other than the target.
//   corner comes up / edge comes up      the piece leaves a slot for the top layer
//   corner over its slot                 the corner sits at the top corner above the slot
//   pair joins                           a basic insert would put them in (f2lJoined)
//   pair goes in                         the slot is solved
//   pair comes out                       the slot was solved a moment ago and is not now
//   cross edge out / cross edge back     a cross edge leaves the bottom, and comes back
//   another pair out / another pair back a kept slot comes apart, and goes back
function f2lArc(X,slot,moves){
  const s=f2lSlot(slot),ms=Array.isArray(moves)?moves:parseAlg(moves),out=[];
  const kept=SLOTS.filter(k=>k!==s&&slotSolved(X,k));
  const look=c=>{const cp=c.cp.indexOf(s.corner),ep=c.ep.indexOf(s.edge);
    return {cUp:cp<4,eUp:ep<4,over:cp===s.corner-4,joined:f2lJoined(c,s),in:slotSolved(c,s),crossOut:[4,5,6,7].filter(e=>c.ep[e]!==e||c.eo[e]).length,keptOut:kept.filter(k=>!slotSolved(c,k)).length};};
  let c=derotate(X),was=look(c);
  const first=[];if(was.in)first.push('pair is in');else if(was.joined)first.push('pair joined');else if(was.over)first.push('corner over its slot');
  if(first.length)out.push({i:0,text:first.join(' · ')});
  ms.forEach((m,i)=>{
    c=derotate(applyAlg(c,[m]));const now=look(c),ev=[];
    if(now.in&&!was.in)ev.push('pair goes in');
    else if(was.in&&!now.in)ev.push('pair comes out');
    else{
      if(now.cUp&&!was.cUp)ev.push('corner comes up');
      if(now.eUp&&!was.eUp)ev.push('edge comes up');
      if(now.joined&&!was.joined)ev.push('pair joins');
      else if(now.over&&!was.over&&!now.joined)ev.push('corner over its slot');
    }
    if(now.crossOut>was.crossOut)ev.push('cross edge out');else if(now.crossOut<was.crossOut)ev.push(now.crossOut?'cross edge back':'cross back');
    if(now.keptOut>was.keptOut)ev.push('another pair out');else if(now.keptOut<was.keptOut)ev.push('another pair back');
    if(ev.length)out.push({i:i+1,text:ev.join(' · ')});
    was=now;
  });
  return out;
}
