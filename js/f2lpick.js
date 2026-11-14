// ================= F2L Trainer: which pairs to light =================
// F2L Trainer (js/f2ltrain.js) lights the F2L pieces on the cube and grays the rest. It can light
// every pair, one pair the user names, or the pairs this module picks from the cube in view:
//   shortest   the pair with the fewest moves from here
//   fastest    the pair whose quickest solution to turn costs least: U and R turn fastest, then L,
//              then F; D and B the slowest (F2L_SPEED). A solution up to F2L_FAST_EXTRA moves longer
//              than the shortest can win. The search turns faces only, so no M comes out.
//   two        two pairs: the two that one solution makes together, at most F2L_COMBO_EXTRA moves
//              longer than the shorter of them alone; else the shortest pair and the pair its
//              solution sets up (f2lSetup); else the shortest pair and the one shortest after it.
// A pair is named by its two side colors, as a key: the color indices low first, "1-2" for red and
// green. A key holds in any hold, so a pick stays on its pieces when the cube turns as a whole.
// Pure: no DOM. It loads after js/f2l.js.
//
// f2ltFrame(cube, ci)            the cube turned so the cross color ci is down: {P, X, key, slot},
//                                X as the solvers read it (reframe), key[slot name] and slot[key]
// f2ltPairs(ci)                  the four keys of cross color ci, in the order FR FL BL BR as the
//                                site holds that cross (CROSS_ROT in app.js)
// f2ltPieces(f, ci, key)         the stickers of the pair `key` in facelets f: its corner and its edge
// f2ltSteps(cube, ci, how, o)    a generator: one search per step; its return value is the pick
// f2ltPick(cube, ci, how, o)     the same, run to the end
// f2ltStill(cube, ci, pick)      true while the pick still holds: the pair it tracks not solved,
//                                however far the user wanders on the way (1.87.1: the pick no
//                                longer lets go when its pair gets farther, so the drill stays on it)
// f2ltOverlay(cube, ci)          Overlay (1.73): the cube with the cross put in place, as a fixed
//                                relabel of the pieces: {T, ci, skip}; T.mul(cube) is that cube
// f2ltOverlayScramble(cube, ci)  Overlay (1.74): that cube as a scramble from solved: {moves, O},
//                                O the cube turned to white up, green front (the moves make it)
const F2L_SPEED={U:1,R:1,L:1.25,F:1.6,D:2.2,B:2.5};
const F2L_SPEED_HALF=1.4;    // a half turn costs this many quarter turns of its face
const F2L_FAST_EXTRA=2;      // fastest: a solution at most this many moves longer than the shortest
const F2L_PICK_NODES=4000000;// the node budget of each search of a pick
const F2LT_CROSS_NEAR=3;     // a pick is made while the cross is at most this many moves off: an insert opens it for a move or two
// The turn that puts each color on the bottom from home; the first that fits a cube is used.
const F2LT_DOWN=['','z2',"x'",'x','z',"z'",'x2',"x2 y","y"];
function f2ltKey(a,b){return a<b?a+'-'+b:b+'-'+a;}
function f2ltKeyColors(k){return String(k).split('-').map(Number);}
function f2lSpeed(sol){let c=0;for(const m of (Array.isArray(sol)?sol:sol.split(' ')))if(m)c+=F2L_SPEED[m[0]]*(m.endsWith('2')?F2L_SPEED_HALF:1);return c;}
function f2ltFrame(cube,ci){
  let P=null;
  for(const r of ['','z2',"x'",'x','z',"z'",'x2']){const c=r?applyAlg(cube,parseAlg(r)):cube;if(c.center[3]===ci){P=c;break;}}
  if(!P)return null;
  const key={},slot={};
  for(const n of F2L_ORDER_DEFAULT){const [a,b]=F2L_SLOT_FACES[n];const k=f2ltKey(P.center[a],P.center[b]);key[n]=k;slot[k]=n;}
  return {P,X:reframe(P),key,slot};
}
function f2ltPairs(ci){
  const r={0:'z2',3:'',2:"x'",5:'x',1:'z',4:"z'"}[ci]||'';
  const fr=f2ltFrame(r?applyAlg(new Cube(),parseAlg(r)):new Cube(),ci);
  return fr?F2L_ORDER_DEFAULT.map(n=>fr.key[n]):[];
}
function f2ltPieces(f,ci,key){
  const [a,b]=f2ltKeyColors(key),out=[];
  const has=(p,cols)=>p.length===cols.length&&cols.every(c=>p.some(i=>f[i]===c));
  for(const c of cornerFacelet)if(has(c,[ci,a,b]))out.push(...c);
  for(const e of edgeFacelet)if(has(e,[a,b]))out.push(...e);
  return out;
}
// A pick: {how, keys, kind, n, n2, track:{keys, len}}; or {how, keys:[], why:'cross'|'solved'}.
// keys: the pairs to light, the current one first. kind (two): 'both', 'setup', 'then' or 'last'.
// n: the moves of the current pair (fastest: of its quickest solution; both: of the two together);
// n2: the moves of the next pair after it (setup, then). cost (fastest): its F2L_SPEED cost.
// track: the pairs f2ltStill follows (the current one, or both with Two at once) and how many
// moves they took when picked.
// o.prefer: keys of the pick before; a tie goes to them, so the light does not hop between equals.
// o.skip: keys not to pick (the pairs Overlay can not show).
function* f2ltSteps(cube,ci,how,o={}){
  const fr=f2ltFrame(cube,ci);if(!fr)return {how,keys:[],why:'cross'};
  const X=fr.X,pref=new Set(o.prefer||[]),B=()=>({left:o.nodeLimit||F2L_PICK_NODES});
  if(buildCrossTable()[crossIndex(X)]>F2LT_CROSS_NEAR)return {how,keys:[],why:'cross'};
  const sk=new Set(o.skip||[]),open=f2lOpen(X).filter(n=>!sk.has(fr.key[n])),keep=f2lKeep(X);
  if(!open.length)return {how,keys:[],why:'solved'};
  const K=n=>fr.key[n],rank=n=>(pref.has(K(n))?0:1)*10+F2L_ORDER_DEFAULT.indexOf(n);
  const better=(a,b)=>!b||a.v<b.v||(a.v===b.v&&a.r<b.r);
  // The length of each open pair alone, best first. cap: only a length up to it is wanted.
  const singles=function*(cap){const s={};for(const n of open){s[n]=f2lLen(X,[n,...keep],B(),cap==null?F2L_MAX_DEPTH:cap);yield;}return s;};
  if(how==='fastest'){
    let best=null;
    for(const n of open){
      const r=f2lPairSolutions(X,n,keep,{extra:F2L_FAST_EXTRA,budget:B()});yield;
      if(r.optimal==null)continue;
      for(const L of Object.keys(r.byLen))for(const s of r.byLen[L]){const c={n,v:f2lSpeed(s),r:rank(n),len:+L};if(better(c,best))best=c;}
    }
    if(!best)return {how,keys:[],why:'cross'};
    return {how,keys:[K(best.n)],n:best.len,cost:Math.round(best.v*10)/10,track:{keys:[K(best.n)],len:best.len}};
  }
  const s=yield* singles();
  const order=open.filter(n=>s[n]!=null).sort((a,b)=>s[a]-s[b]||rank(a)-rank(b));
  if(!order.length)return {how,keys:[],why:'cross'};
  const t=order[0];
  if(how!=='two'||open.length===1){
    const kind=how==='two'?'last':undefined;
    return {how,keys:[K(t)],kind,n:s[t],track:{keys:[K(t)],len:s[t]}};
  }
  // Two at once: the pair of pairs one solution makes, shortest first.
  let both=null;
  for(let i=0;i<order.length;i++)for(let j=i+1;j<order.length;j++){
    const a=order[i],b=order[j],cap=Math.min(Math.min(s[a],s[b])+F2L_COMBO_EXTRA,both?both.v:F2L_MAX_DEPTH);
    const len=f2lLen(X,[a,b,...keep],B(),cap);yield;
    if(len==null)continue;
    const c={a,b,v:len,r:rank(a)+rank(b)};if(better(c,both))both=c;
  }
  if(both){const [a,b]=s[both.a]<=s[both.b]?[both.a,both.b]:[both.b,both.a];
    return {how,keys:[K(a),K(b)],kind:'both',n:both.v,track:{keys:[K(a),K(b)],len:both.v}};}
  // No solution makes both: the pair the shortest one sets up, or the one shortest after it.
  const r=f2lPairSolutions(X,t,keep,{budget:B()});yield;
  const sols=r.optimal!=null?(r.byLen[r.optimal]||[]):[];
  const su=sols.length?f2lSetup(X,t,sols,{mode:'shortest',budget:B()}):null;yield;
  if(su)return {how,keys:[K(t),K(su.slot)],kind:'setup',n:s[t],n2:su.after,plain:su.plain,track:{keys:[K(t)],len:s[t]}};
  const Y=sols.length?applyAlg(X,sols[0].split(' ')):X,p=f2lPick(Y,{mode:'shortest',budget:B()});
  const next=p&&p.slot!==t?p.slot:order[1];
  return {how,keys:[K(t),K(next)],kind:'then',n:s[t],n2:p&&p.slot===next?p.n:s[next],track:{keys:[K(t)],len:s[t]}};
}
function f2ltPick(cube,ci,how,o={}){const it=f2ltSteps(cube,ci,how,o);let r;do r=it.next();while(!r.done);return r.value;}
function f2ltStill(cube,ci,pick){
  if(!pick||!pick.track||!pick.track.keys.length)return false;
  const fr=f2ltFrame(cube,ci);if(!fr)return false;
  return !pick.track.keys.map(k=>fr.slot[k]).some(n=>!n||slotSolved(fr.X,f2lSlot(n)));
}
// ---- Overlay ----
// The user's cube A0 can have the cross anywhere. Overlay makes a cube O0 from it: the cross
// solved, the eight F2L pieces where A0 has them, the other pieces put where they fit. O0 = T·A0
// for one relabel of the pieces, T = O0·A0⁻¹. O0 keeps the parity and the twist sums of A0, so it
// is a real cube: f2ltOverlayScramble finds the moves that make it from solved, and the site loads
// them as the scramble. The cube in your hands then turns it as a drill does (the lab's drill:
// setup · P0⁻¹ · P): js/live.js keeps that map for a smart cube.
// An F2L edge in a cross place has no place of its own in O0: it goes where the cross pushed a
// piece out, never at home, and its pair is in skip (keys).
function f2ltOverlay(cube,ci){
  const op=(ci+3)%6,F0=cube.center.indexOf(ci);if(F0<0)return null;
  const face=i=>Math.floor(i/9),want=i=>cube.center[face(i)];
  // The edge, and its turn, that sits solved at place p.
  const homeAt=p=>{for(let j=0;j<12;j++)for(let o=0;o<2;o++)
    if(edgeColor[j][0]===want(edgeFacelet[p][o])&&edgeColor[j][1]===want(edgeFacelet[p][(1+o)%2]))return {j,o};
    return null;};
  const has=(j,c)=>edgeColor[j].includes(c),f2l=j=>!has(j,ci)&&!has(j,op),ll=j=>has(j,op);
  const cross=[...Array(12).keys()].filter(p=>edgeFacelet[p].some(i=>face(i)===F0));
  const ep=cube.ep.slice(),eo=cube.eo.slice(),used=new Set(),skip=[],free=[];
  for(const p of cross){const h=homeAt(p);ep[p]=h.j;eo[p]=h.o;used.add(h.j);if(f2l(cube.ep[p]))skip.push(cube.ep[p]);}
  // Outside the cross: an F2L edge or a last-layer edge stays; a place a cross edge held is free.
  const open=[];
  for(let p=0;p<12;p++){if(cross.includes(p))continue;const j=cube.ep[p];
    if(f2l(j)||ll(j))used.add(j);else open.push(p);}
  // The pieces still out go there: skipped F2L edges first, never at home.
  const rest=[...Array(12).keys()].filter(j=>!used.has(j)).sort((a,b)=>f2l(b)-f2l(a));
  for(const j of rest){const k=open.findIndex(p=>!f2l(j)||homeAt(p).j!==j),p=open.splice(k<0?0:k,1)[0];
    const h=homeAt(p);ep[p]=j;eo[p]=h.j===j?1-h.o:0;}
  // Keep A0's edge parity and flip sum: swap or flip last-layer edges.
  const lls=[...Array(12).keys()].filter(p=>ll(ep[p]));
  const par=a=>{let n=0;const s=new Set();for(let i=0;i<a.length;i++){if(s.has(i))continue;let k=i,L=0;while(!s.has(k)){s.add(k);k=a[k];L++;}n+=L-1;}return n%2;};
  if(par(ep)!==par(cube.ep)){const [x,y]=lls;[ep[x],ep[y]]=[ep[y],ep[x]];}
  if(eo.reduce((a,b)=>a+b,0)%2!==cube.eo.reduce((a,b)=>a+b,0)%2)eo[lls[0]]^=1;
  const O0=new Cube(cube.cp.slice(),cube.co.slice(),ep,eo,cube.center.slice());
  return {T:O0.mul(cube.inverse()),ci,skip:skip.map(j=>f2ltKey(edgeColor[j][0],edgeColor[j][1]))};
}
// The whole-cube turn that puts the centers of c back at home: c·R has white up, green front.
const F2LT_TURNS=(()=>{const out=[];for(const a of ['','x','x2',"x'",'z',"z'"])for(const b of ['','y','y2',"y'"])out.push([a,b].filter(Boolean));return out;})();
function f2ltHome(c){for(const t of F2LT_TURNS){const R=applyAlg(new Cube(),t);if(c.mul(R).center.join()==='0,1,2,3,4,5')return c.mul(R);}return null;}
// O0 as a scramble: the moves from solved (white up, green front) that make it, and that cube. The
// first solution of 22 moves or fewer, as a WCA scramble takes (js/wca.js): quick.
// null if no cross color center, or no solution in time.
function f2ltOverlayScramble(cube,ci,o={}){
  const ov=f2ltOverlay(cube,ci);if(!ov)return null;
  const O=f2ltHome(ov.T.mul(cube));if(!O)return null;
  const sol=solveTwoPhase(O,{maxLen:22,target:22,timeMs:o.timeMs||1500});if(!sol)return null;
  const moves=parseAlg(invertAlg(sol));
  return applyAlg(new Cube(),moves).equals(O)?{moves,O,skip:ov.skip}:null;}
