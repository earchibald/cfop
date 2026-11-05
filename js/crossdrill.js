// ===== Cross drill scrambles =====
// A scramble made for cross practice: a random state whose cross takes exactly n moves at best. A
// random state seldom has a short or a long cross (2 moves: 1 in 1200; 8 moves: 1 in 1900), so a pick
// from random scrambles cannot give one. Here the four cross edges come first: a place for them,
// picked at random from every place n moves from solved (the cross table of engine.js). The other
// pieces go anywhere, as in a WCA scramble. The cross is on the bottom in that frame; the cube as held
// for the cross color turns it back. The seed names it all, "x6w-amber-otter-42" (n, then the color's
// letter), so wcaFor (js/wca.js) makes the same scramble from it every time, in the history too.
// Pure, no DOM. Loads after wca.js; wca.js calls crossDrillState through its global name.
const CROSS_DRILL_ROT={w:'z2',y:'',g:"x'",b:'x',r:'z',o:"z'"}; // CROSS_ROT of app.js, by letter
const CROSS_DRILL_LETTER={white:'w',yellow:'y',green:'g',blue:'b',red:'r',orange:'o'};
const CROSS_DRILL_LENS=[2,3,4,5,6,7,8];
const CROSS_DRILL={at:{}}; // the cross places by length, made once each
function crossDrillSeed(n,color,name){return 'x'+n+(CROSS_DRILL_LETTER[color]||'w')+'-'+(name||randomSeedName());}
function crossDrillParse(seed){const m=String(seed).match(/^x([1-8])([wygbro])-/);return m?{n:+m[1],c:m[2]}:null;}
// Every cross index n moves from solved.
function crossDrillPlaces(n){if(CROSS_DRILL.at[n])return CROSS_DRILL.at[n];const t=buildCrossTable(),out=[];
  for(let i=0;i<t.length;i++)if(t[i]===n)out.push(i);return CROSS_DRILL.at[n]=out;}
// The state of a drill seed from the stream r, or null for a seed that is no drill seed.
function crossDrillState(seed,r){const p=crossDrillParse(seed);if(!p)return null;const places=crossDrillPlaces(p.n);if(!places.length)return null;
  // crossIndex read back: four (place, flip) pairs, the D edges 4 to 7 in turn.
  let idx=places[Math.floor(r()*places.length)];const ep=Array(12).fill(-1),eo=Array(12).fill(0);
  for(let e=7;e>=4;e--){const v=idx%24;idx=Math.floor(idx/24);ep[v>>1]=e;eo[v>>1]=v&1;}
  // The other eight edges in the places left, flipped at random but the last, which makes the sum even.
  const rest=[0,1,2,3,8,9,10,11],order=wcaPerm(r,8),free=[];for(let i=0;i<12;i++)if(ep[i]<0)free.push(i);
  let flips=eo.reduce((a,b)=>a+b,0);
  free.forEach((pos,k)=>{ep[pos]=rest[order[k]];if(k<7){eo[pos]=Math.floor(r()*2);flips+=eo[pos];}else eo[pos]=flips%2;});
  // The corners anywhere; a swap of two corners puts the parity right.
  const cp=wcaPerm(r,8);if(wcaParity(cp)!==wcaParity(ep))[cp[0],cp[1]]=[cp[1],cp[0]];
  const co=[];let s=0;for(let i=0;i<7;i++){co.push(Math.floor(r()*3));s+=co[i];}co.push((3-s%3)%3);
  const f=new Cube(cp,co,ep,eo),rot=CROSS_DRILL_ROT[p.c];
  return rot?applyAlg(new Cube(),rot).mul(f).mul(applyAlg(new Cube(),invertAlg(rot))):f;}
