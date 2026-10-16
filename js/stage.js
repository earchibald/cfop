// ================= The CFOP stage of a cube =================
// For the smart cube window (cubetab.js): where a CFOP solve stands, and for the last layer, which
// two-look case the cube shows and the algorithm that solves it. Pure: no DOM.
// The cube comes in as it is held: a Cube in the space of the user, whose centers say which color
// is up and which faces the user (applyAlg(state, holdMoves) in cubetab.js). The moves that come
// out are in the same space: U is the top layer as held, and a whole-cube turn (z2) is a turn of
// the cube in the hands.
// cfopStage(held, prefer) -> {stage, name, sub, moves, held, down}
//   stage: cross | f2l | eo | co | cp | ep | auf | solved
//   name:  what the window shows: Cross, F2L, Sune, T perm, ...
//   sub:   the line under the name: the edges or pairs so far, or the hold for the last layer
//   moves: the algorithm as held, with a whole-cube turn first where the cross is not down, a U
//          turn before it where the case needs one, and the last U turn for the edges. Empty for
//          the cross, the pairs and a solved cube.
//   held:  the cube as it came in; down: the color of the cross taken
// The cross is looked for with each color down. The one furthest along wins: a cross, then more
// pairs, then the last layer steps. Until a cross is complete, only `prefer` (a color name, white
// by default) counts, so a fresh scramble reads as the cross the user means to build. With the
// cross already down, the hold is kept; otherwise one turn (x, x', z, z', z2 or x2) brings it
// down, z2 for a cross on top so the front stays.
// stageRank(stage) orders the stages, so the window can tell a reading that falls behind the one
// it shows (cubetab.js keeps the stage then: the user may be part way through its algorithm).
// cfopStageDone(stage, held) counts the moves of `stage` done since, by the cube as held now: the
// largest n for which the cube is the stage's cube after its first n moves. A pause part way
// through an algorithm keeps the case on the screen, with the moves so far marked. The centers
// count, so a whole-cube turn counts only when the cube was turned.
const STAGE_DOWN=['',"x'",'x','z',"z'",'z2','x2']; // as held; then front, back, right, left down; top down with the front kept, then turned to the back
const STAGE_ORDER=['cross','f2l','eo','co','cp','ep','auf','solved'];
// Where a stage stands in the solve, for one stage against another: a stage earlier in the order
// is further back. 'll' (a last layer no algorithm names) stands with the first last-layer step.
function stageRank(stage){const i=STAGE_ORDER.indexOf(stage);return i<0?STAGE_ORDER.indexOf('eo'):i;}
// How far X (the engine's frame, cross on D) is along: a score that grows with every step.
function stageProgress(X){
  let edges=0;for(let e=4;e<8;e++)if(X.ep[e]===e&&X.eo[e]===0)edges++;
  const cross=edges===4;let pairs=0;if(cross)for(const s of SLOTS)if(slotSolved(X,s))pairs++;
  const f2l=cross&&pairs===4,eo=f2l&&eoSolved(X),co=eo&&ollSolved(X),cp=co&&cpSolvedLL(X),solved=X.isSolved();
  return {edges,cross,pairs,f2l,eo,co,cp,solved,score:solved?40:cross?10+pairs*4+(eo?1:0)+(co?1:0)+(cp?1:0):edges};
}
function cfopStage(held,prefer){
  const H=reframe(held),want=COLOR_NAMES_E.indexOf(prefer||'white');
  let best=null;
  for(const r of STAGE_DOWN){
    const X=r?afterRotation(H,r):H,p=stageProgress(X),down=(r?applyAlg(held,[r]):held).center[3];
    const s=(p.cross||down===want?p.score:-1)*2+(down===want?1:0);
    if(!best||s>best.s)best={r,X,p,down,s};
  }
  const {r,X,p,down}=best,color=COLOR_NAMES_E[down],turn=r?[r]:[];
  const base={stage:'',name:'',sub:'',moves:[],held,down:color};
  if(p.solved)return {...base,stage:'solved',name:'Solved'};
  if(!p.cross)return {...base,stage:'cross',name:'Cross',sub:`${p.edges} of 4 ${color} edges`};
  if(!p.f2l)return {...base,stage:'f2l',name:'F2L',sub:`${p.pairs} of 4 pairs`};
  const T=applyAlg(held,turn),up=COLOR_NAMES_E[T.center[0]],front=COLOR_NAMES_E[T.center[2]];
  const sub=(r?`Turn ${r}: `:'')+up[0].toUpperCase()+up.slice(1)+' up, '+front+' in front';
  const out=(stage,f,post)=>({...base,stage,name:f.name,sub,moves:[...turn,...(f.pre?[f.pre]:[]),...parseAlg(f.alg),...(post?[post]:[])]});
  if(!p.eo){const f=findLLStep(X,ALG_DB.eo,eoSolved);if(f)return out('eo',f);}
  else if(!p.co){const f=findLLStep(X,ALG_DB.co,ollSolved);if(f)return out('co',f);}
  else if(!p.cp){const f=findLLStep(X,ALG_DB.cp,cpSolvedLL);if(f)return out('cp',f);}
  else{
    const post=c=>AUFS.find(u=>(u?applyAlg(c,[u]):c).isSolved());
    const u=post(X);if(u)return {...base,stage:'auf',name:'AUF',sub,moves:[...turn,u]};
    const f=findLLStep(X,ALG_DB.ep,c=>post(c)!==undefined);if(f)return out('ep',f,post(f.cube));
  }
  return {...base,stage:'ll',name:'Last layer',sub};
}
function cfopStageDone(st,held){
  if(!st||!st.moves.length||!held)return 0;
  let c=st.held,n=0;
  st.moves.forEach((m,i)=>{c=applyAlg(c,[m]);if(c.equals(held))n=i+1;});
  return n;
}
