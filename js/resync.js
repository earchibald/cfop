// ================= Resync: the real cube from a few faces =================
// A regular cube drifts from the screen after a wrong move: the site does not see it turn. The
// guide keeps a reset point (the last state it knew to be true) and the hint it expects the user
// to follow. From those and two or three scanned faces, this finds the state the cube is in. Pure:
// no DOM. It loads after js/engine.js and js/solver.js (solveTwoPhase, for the way back).
//
// resyncBases(reset, moves, done)   the states the guide expects: the reset point after each prefix
//                                   of the hint, the one at `done` first, then by distance from it
// resyncFind(bases, faces, opts)    every state within opts.depth face moves (3) of a base whose
//                                   stickers agree with the scanned faces: {candidates, unique, ask}
// resyncReturn(current, target)     the moves that bring `current` to `target`
// resyncFaceOk(cube, face, read)    one scanned face agrees with the cube at some turn of the reading
const RESYNC_DEPTH=3;
function resyncBases(reset,moves,done){
  const ms=moves?(Array.isArray(moves)?moves:parseAlg(moves)):[],at=Math.max(0,Math.min(done||0,ms.length));
  const out=[];let c=reset;
  for(let i=0;i<=ms.length;i++){out.push({cube:c,at:i,off:Math.abs(i-at)});if(i<ms.length)c=applyAlg(c,[ms[i]]);}
  return out.sort((a,b)=>a.off-b.off||a.at-b.at);
}
// A 3x3 face reading turned a quarter turn clockwise, k times (rotateFace in js/scan-assemble.js,
// here for nine stickers so this file needs only the engine).
function resyncTurn(s,k){let a=s.slice();for(let t=0;t<((k%4)+4)%4;t++){const b=new Array(9);for(let r=0;r<3;r++)for(let c=0;c<3;c++)b[3*r+c]=a[3*(2-c)+r];a=b;}return a;}
// `read`: the nine colors of face `face` (0..5, U R F D L B) as the camera saw them, at any turn.
// -1 in the reading is a sticker not read; it matches anything.
function resyncFaceOk(cube,face,read){
  const f=cube.toFacelets().slice(9*face,9*face+9);
  for(let k=0;k<4;k++){const r=resyncTurn(read,k);let ok=true;for(let i=0;i<9;i++)if(r[i]>=0&&r[i]!==f[i]){ok=false;break;}if(ok)return true;}
  return false;
}
function resyncMatch(cube,faces){for(const face in faces){if(faces[face]&&!resyncFaceOk(cube,+face,faces[face]))return false;}return true;}
// faces: {faceIndex: [9 colors]} (a missing or null face is not scanned). opts.depth: moves from a
// base (RESYNC_DEPTH). opts.limit: the most candidates listed (40).
// Returns {candidates:[{cube, base (its index in `bases`), at, moves (from the base)}], unique, ask}.
// The candidates come nearest first: by the moves from their base, then by the base's order. ask
// is the face (0..5) not yet scanned whose reading would split the candidates best, or null when
// one candidate is left or no face helps.
function resyncFind(bases,faces,opts={}){
  const depth=opts.depth==null?RESYNC_DEPTH:opts.depth,limit=opts.limit||40;
  const seen=new Set(),cands=[];
  for(let d=0;d<=depth;d++){
    bases.forEach((b,bi)=>{
      // The states at exactly d moves from this base, each once, in the canonical order of moves
      // (no face twice in a row, two faces on one axis in one order) so a state has one path.
      let layer=[{c:b.cube,path:[]}];
      for(let k=0;k<d;k++){const next=[];
        for(const n of layer){const last=n.path[n.path.length-1],lf=last?last[0]:'';
          for(const m of FACE_MOVES){const f=m[0];if(f===lf)continue;if(lf&&axisOf(m)===axisOf(lf)&&'DLB'.includes(f))continue;next.push({c:n.c.mul(MOVES[m]),path:[...n.path,m]});}}
        layer=next;}
      for(const n of layer){const key=n.c.key();if(seen.has(key))continue;seen.add(key);
        if(resyncMatch(n.c,faces))cands.push({cube:n.c,base:bi,at:b.at,moves:n.path});}
    });
    if(cands.length>=limit)break;
  }
  const candidates=cands.slice(0,limit);
  let ask=null;
  if(candidates.length>1){let best=0;
    for(let face=0;face<6;face++){if(faces[face])continue;
      const groups=new Set(candidates.map(x=>{const f=x.cube.toFacelets().slice(9*face,9*face+9);let k=f.join();for(let t=1;t<4;t++){const r=resyncTurn(f,t).join();if(r<k)k=r;}return k;}));
      if(groups.size>best){best=groups.size;ask=face;}}}
  return {candidates,unique:candidates.length===1,ask,depth};
}
// The moves from `current` to `target`, both in the engine's frame: the shortest up to four moves
// (an exact search), else the two-phase solver on target⁻¹ · current (opts.timeMs, 1500).
function resyncReturn(current,target,opts={}){
  const C=target.inverse().mul(current);if(C.isSolved())return [];
  const path=[];
  const dfs=(c,left,lf)=>{if(c.isSolved())return left===0;if(!left)return false;
    for(const m of FACE_MOVES){const f=m[0];if(f===lf)continue;if(lf&&axisOf(m)===axisOf(lf)&&'DLB'.includes(f))continue;
      path.push(m);if(dfs(c.mul(MOVES[m]),left-1,f))return true;path.pop();}return false;};
  for(let d=1;d<=(opts.short||4);d++){path.length=0;if(dfs(C,d,''))return path.slice();}
  if(typeof solveTwoPhase!=='function')return null;
  const sol=solveTwoPhase(C,{timeMs:opts.timeMs||1500});
  return sol&&applyAlg(C,sol).isSolved()?sol:null;
}
