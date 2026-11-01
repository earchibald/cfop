// ===== WCA scrambles =====
// The scramble of a WCA competition: a random state, any position of the cube as likely as any
// other, and the moves that make it from solved. A seed name picks the state (rng in engine.js),
// and the two-phase solver (solver.js) finds the moves, so the same seed always gives the same
// scramble. The solver takes the first solution of 22 moves or fewer: that bound keeps it fast and
// the answer the same on every machine. The first scramble builds the solver's tables (about half a
// second). A state one move or less from solved is not used, as the WCA does not use one.
// Pure, no DOM. Loads after solver.js.
function wcaPerm(r,n){const p=[...Array(n).keys()];for(let i=n-1;i>0;i--){const j=Math.floor(r()*(i+1));[p[i],p[j]]=[p[j],p[i]];}return p;}
function wcaParity(p){let s=0;for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++)if(p[j]<p[i])s^=1;return s;}
// One random state from the stream r: the corners and edges shuffled (an edge swap fixes the
// parity), each piece twisted or flipped at random but the last, which makes the sum right.
function wcaRandomState(r){
  const cp=wcaPerm(r,8),ep=wcaPerm(r,12);if(wcaParity(cp)!==wcaParity(ep))[ep[10],ep[11]]=[ep[11],ep[10]];
  const co=[],eo=[];let s=0,t=0;
  for(let i=0;i<7;i++){co.push(Math.floor(r()*3));s+=co[i];}co.push((3-s%3)%3);
  for(let i=0;i<11;i++){eo.push(Math.floor(r()*2));t+=eo[i];}eo.push(t%2);
  return new Cube(cp,co,ep,eo);}
var WCA={max:22,cache:new Map()}; // var: tests read it from the window
// The scramble of a seed: {state, moves}. Kept, as a seed is asked for again (history, the cross drill).
function wcaFor(seed){seed=String(seed);if(WCA.cache.has(seed))return WCA.cache.get(seed);
  const r=rng('wca:'+seed);let state,sol;
  for(;;){state=wcaRandomState(r);sol=solveTwoPhase(state,{maxLen:WCA.max,target:WCA.max,timeMs:1e9});if(sol&&sol.length>=2)break;}
  const out={state,moves:parseAlg(invertAlg(sol))};
  if(WCA.cache.size>60)WCA.cache.delete(WCA.cache.keys().next().value);
  WCA.cache.set(seed,out);return out;}
// The state alone, with no search: for a check of many seeds (the Cross tab's easy and hard).
function wcaState(seed){const r=rng('wca:'+seed);return wcaRandomState(r);}
function wcaScramble(seed){return wcaFor(seed).moves.slice();}
