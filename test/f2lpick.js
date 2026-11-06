// F2L Trainer's picks (js/f2lpick.js), without a DOM: the pairs of each cross color by their side
// colors, the stickers of a pair, the speed cost; on random scrambles with the cross solved, in any
// hold: Shortest lights a pair with the fewest moves, Fastest the one quickest to turn within two
// extra moves, Two at once two pairs that one solution makes together or the shortest and the pair
// after it; a pick holds while the pair gets no farther, and lets go when it is solved; a tie goes to
// the pick before; a cross far off, or every pair solved, lights no pick; an insert that opens the cross keeps it.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/algs.js','js/f2l.js','js/f2lpick.js');
const g=name=>run(name);
const J=x=>JSON.parse(JSON.stringify(x)),deq=(a,b,m)=>assert.deepStrictEqual(J(a),J(b),m);
const Cube=g('Cube'),applyAlg=g('applyAlg'),parseAlg=g('parseAlg'),solveCross=g('solveCross'),randomMoveScramble=g('randomMoveScramble'),reframe=g('reframe');
const f2lPairSolutions=g('f2lPairSolutions'),f2lLen=g('f2lLen'),f2lKeep=g('f2lKeep'),f2lOpen=g('f2lOpen'),F2L_COMBO_EXTRA=g('F2L_COMBO_EXTRA');
const f2ltFrame=g('f2ltFrame'),f2ltPairs=g('f2ltPairs'),f2ltPieces=g('f2ltPieces'),f2ltPick=g('f2ltPick'),f2ltStill=g('f2ltStill'),f2lSpeed=g('f2lSpeed'),F2L_FAST_EXTRA=g('F2L_FAST_EXTRA');
const cornerFacelet=g('cornerFacelet'),edgeFacelet=g('edgeFacelet');
// A cube with home centers has its cross on D: yellow, 3.
const CI=3;
const withCross=seed=>{const c=applyAlg(new Cube(),randomMoveScramble(seed,25));return applyAlg(c,solveCross(c).solutions[0]);};
const T0=Date.now(),lap=n=>console.log(n+' ('+(Date.now()-T0)+' ms)');

// The pairs of each cross color, as the site holds that cross: white down is z2, green in front.
deq(f2ltPairs(0),['2-4','1-2','1-5','4-5'],'white: green-orange front right, then FL, BL, BR');
deq(f2ltPairs(3),['1-2','2-4','4-5','1-5'],'yellow down, home: green-red front right');
for(let ci=0;ci<6;ci++){const k=f2ltPairs(ci);assert.strictEqual(new Set(k).size,4,'four pairs');
  assert.ok(k.every(x=>x.split('-').map(Number).every(c=>c!==ci&&c!==(ci+3)%6)),'no cross color, no opposite');}
// The frame: the cross color down in any hold, and the same keys for the same slots.
{const c=withCross('frame'),a=f2ltFrame(c,CI),b=f2ltFrame(applyAlg(c,parseAlg('z2 y')),CI);
  assert.strictEqual(a.P.center[3],CI,'the cross color down');assert.strictEqual(b.P.center[3],CI,'the cross color down, turned');
  deq(Object.keys(a.slot).sort(),Object.keys(b.slot).sort(),'the same four keys');}
// The stickers of a pair: its corner and its edge, found by color.
{const f=new Cube().toFacelets(),s=f2ltPieces(f,CI,'1-2');assert.strictEqual(s.length,5,'three corner stickers and two edge stickers');
  deq(s.map(i=>f[i]).sort(),[1,1,2,2,3],'red, green and yellow');}
// The cost to turn: U and R the least, then L and F; D and B the most; a half turn costs more.
assert.strictEqual(f2lSpeed("R U R' U'"),4);assert.ok(f2lSpeed('L')>f2lSpeed('R')&&f2lSpeed('F')>f2lSpeed('L')&&f2lSpeed('D')>f2lSpeed('F')&&f2lSpeed('B')>f2lSpeed('D'),'the order');
assert.ok(f2lSpeed('R2')>f2lSpeed('R')&&f2lSpeed('R2')<2*f2lSpeed('R'),'a half turn');

// No cross, every pair solved.
{const ct=g('buildCrossTable')(),ix=g('crossIndex');let k=0,c;do c=applyAlg(new Cube(),randomMoveScramble('far-'+(k++),25));while(ct[ix(c)]<=g('F2LT_CROSS_NEAR'));
  assert.strictEqual(f2ltPick(c,CI,'shortest').why,'cross','the cross far off: no pick');
  const near=applyAlg(new Cube(),parseAlg("R U R'"));assert.ok(f2ltStill(applyAlg(near,['R']),CI,f2ltPick(near,CI,'shortest')),'an insert that opens the cross for a move keeps the pick');}
assert.strictEqual(f2ltPick(new Cube(),CI,'two').why,'solved','every pair solved');
// One pair left: Two at once lights it alone.
{const p=f2ltPick(applyAlg(new Cube(),parseAlg("R U R'")),CI,'two');assert.strictEqual(p.kind,'last');deq(p.keys,['1-2'],'the front right pair');}

const N=12,cubes=[];for(let i=0;i<N;i++)cubes.push(withCross('pick-'+i));
const lens=c=>{const fr=f2ltFrame(c,CI),X=fr.X,keep=f2lKeep(X),o={};for(const n of f2lOpen(X))o[fr.key[n]]=f2lPairSolutions(X,n,keep,{limit:1}).optimal;return {fr,X,keep,o};};
// Shortest: a pair of the fewest moves; the same length in another hold.
for(const c of cubes){const p=f2ltPick(c,CI,'shortest'),L=lens(c),min=Math.min(...Object.values(L.o));
  assert.strictEqual(p.keys.length,1);assert.strictEqual(p.n,min,'the fewest moves');assert.strictEqual(L.o[p.keys[0]],min,'its pair takes that many');
  assert.strictEqual(f2ltPick(applyAlg(c,parseAlg("x2 y'")),CI,'shortest').n,min,'the same in another hold');}
lap('shortest');
// Fastest: no pair has a solution, up to two moves longer than its shortest, that costs less to turn.
for(const c of cubes.slice(0,6)){const p=f2ltPick(c,CI,'fastest'),L=lens(c);let best=Infinity;
  for(const n of f2lOpen(L.X)){const r=f2lPairSolutions(L.X,n,L.keep,{extra:F2L_FAST_EXTRA});for(const k in r.byLen)for(const s of r.byLen[k])best=Math.min(best,f2lSpeed(s));}
  assert.ok(Math.abs(p.cost-Math.round(best*10)/10)<1e-9,'the least cost to turn');
  assert.ok(p.n<=L.o[p.keys[0]]+F2L_FAST_EXTRA,'at most two moves past its shortest');}
lap('fastest');
// Two at once: two pairs; both: one solution of n moves makes them, at most F2L_COMBO_EXTRA past the
// shorter alone; else the first is a shortest pair.
const kinds={};
for(const c of cubes){const p=f2ltPick(c,CI,'two'),L=lens(c);kinds[p.kind]=(kinds[p.kind]||0)+1;
  assert.strictEqual(p.keys.length,2,'two pairs');assert.notStrictEqual(p.keys[0],p.keys[1]);
  if(p.kind==='both'){const [a,b]=p.keys.map(k=>L.fr.slot[k]);
    assert.strictEqual(f2lLen(L.X,[a,b,...L.keep]),p.n,'one solution of n moves makes both');
    assert.ok(p.n<=Math.min(L.o[p.keys[0]],L.o[p.keys[1]])+F2L_COMBO_EXTRA,'at most three moves past the shorter');
    assert.ok(L.o[p.keys[0]]<=L.o[p.keys[1]],'the shorter first');}
  else assert.strictEqual(L.o[p.keys[0]],Math.min(...Object.values(L.o)),'a shortest pair first');}
assert.ok(kinds.both>0,'some scrambles make two pairs at once');
lap('two '+JSON.stringify(kinds));
// A pick holds along its solution, and lets go when its pair is solved or gets farther.
{const c=cubes[0],p=f2ltPick(c,CI,'shortest'),L=lens(c),n=L.fr.slot[p.keys[0]];
  const sol=f2lPairSolutions(L.X,n,L.keep).byLen[p.n][0].split(' ');
  assert.ok(f2ltStill(c,CI,p),'at the start');
  // The solution is read as X holds the cube: turn the cube to that frame first, then make its moves.
  let Y=L.fr.P;for(let i=0;i<sol.length-1;i++){Y=applyAlg(Y,[sol[i]]);assert.ok(f2ltStill(Y,CI,p),'along the solution, move '+(i+1));}
  Y=applyAlg(Y,[sol[sol.length-1]]);assert.ok(!f2ltStill(Y,CI,p),'solved: a new pick');
  const away=['U','U2',"U'",'R','L',"F'"].map(m=>applyAlg(L.fr.P,[m])).find(z=>{const q=lens(z).o[p.keys[0]];return q!=null&&q>p.n;});
  if(away)assert.ok(!f2ltStill(away,CI,p),'farther: a new pick');}
// A tie goes to the pick before.
{for(const c of cubes){const L=lens(c),min=Math.min(...Object.values(L.o)),ties=Object.keys(L.o).filter(k=>L.o[k]===min);if(ties.length<2)continue;
  for(const k of ties)deq(f2ltPick(c,CI,'shortest',{prefer:[k]}).keys,[k],'the tie to the pick before');break;}}
console.log('f2lpick ok ('+(Date.now()-T0)+' ms)');
