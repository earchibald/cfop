// ================= Scanner stage 5: assemble and repair =================
// Pure functions, no DOM. Needs engine.js (fromFacelets, cornerFacelet, edgeFacelet,
// cornerColor, edgeColor, COLOR_NAMES_E). The site reads the 3x3 only; the 2x2
// (twoFromFacelets) and 4x4 (fourFromFacelets) fits still work when those modules are loaded.
// See docs/scanner-handoff.md.
//
// A scanned face is {stickers:[n*n color indices], margins?:[numbers], pinned?:[bools]}.
// stickers read left to right, top to bottom, as the camera saw them. The face may be
// turned by any multiple of 90 degrees. On the 3x3 the center color says which face it is
// (assembleScan), and five faces are enough when the sixth follows from them (fillFace). The
// 2x2 and the 4x4 have no fixed centers: any reading can be any side of the cube, and the
// pieces decide where each one goes (assembleFree); they need all six faces.

// Turn an n×n face reading 90 degrees clockwise, k times. n follows from the length.
function rotateFace(s,k){
  k=((k%4)+4)%4;let a=s.slice();const n=Math.round(Math.sqrt(s.length));
  for(let t=0;t<k;t++){const b=new Array(n*n);for(let r=0;r<n;r++)for(let c=0;c<n;c++)b[n*r+c]=a[n*(n-1-c)+r];a=b;}
  return a;
}

// Every legal color tuple for a corner (in the engine's facelet order for that corner, so any
// of its three cyclic turns) or for an edge (either way round).
// SCAN_CORNER_PART: the same triples with one sticker unknown (-1). Two stickers of a corner in
// their order name it, so each pattern comes from one corner; SCAN_CORNER_FILL gives that corner's
// third sticker.
const SCAN_CORNER_SET=new Set(),SCAN_EDGE_SET=new Set(),SCAN_CORNER_ID=new Map(),SCAN_CORNER_PART=new Set(),SCAN_CORNER_FILL=new Map();
cornerColor.forEach((cc,id)=>{for(let o=0;o<3;o++){const t=[0,1,2].map(n=>cc[(n+o)%3]),key=t.join();SCAN_CORNER_SET.add(key);SCAN_CORNER_ID.set(key,id);
  for(let h=0;h<3;h++){const part=t.map((x,n)=>n===h?-1:x).join();SCAN_CORNER_PART.add(part);SCAN_CORNER_FILL.set(part,t[h]);}}});
for(const ec of edgeColor){SCAN_EDGE_SET.add(ec.join());SCAN_EDGE_SET.add([ec[1],ec[0]].join());}

const SCAN_PIECES=(()=>{
  // Each slot is checked once all of its faces have a rotation. With a face missing, a corner
  // with one sticker unknown must match a pattern; an edge with one unknown fits anything.
  const slots=[];
  for(const fl of cornerFacelet)slots.push({fl,legal:SCAN_CORNER_SET,part:SCAN_CORNER_PART,last:Math.max(...fl.map(i=>Math.floor(i/9)))});
  for(const fl of edgeFacelet)slots.push({fl,legal:SCAN_EDGE_SET,part:null,last:Math.max(...fl.map(i=>Math.floor(i/9)))});
  return slots;
})();

// ---------- the cube of any size as stickers in space ----------
// Six n×n faces, 6*n*n stickers, index n*n*face + n*row + column, face order U R F D L B,
// rows top to bottom, columns left to right (the engine's scheme at n=3, js/draw.js's at
// every n). Each sticker has a place in space; the pieces and the 24 ways to hold the cube
// follow from it.
const SCAN_GEOM=[{n:[0,1,0],r:[1,0,0],d:[0,0,1]},{n:[1,0,0],r:[0,0,-1],d:[0,-1,0]},{n:[0,0,1],r:[1,0,0],d:[0,-1,0]},
  {n:[0,-1,0],r:[1,0,0],d:[0,0,-1]},{n:[-1,0,0],r:[0,0,1],d:[0,-1,0]},{n:[0,0,-1],r:[-1,0,0],d:[0,-1,0]}];
const SCAN_SIZES={};
// {n, cells, corners:[{idx:[3 sticker indices in the engine's corner order], last}],
//  edges:[{idx:[2], last}], rots:[24 permutations, perm[j] = the sticker that lands on j]}
function scanSize(n){
  if(SCAN_SIZES[n])return SCAN_SIZES[n];
  const cells=n*n,pos=[],at=new Map();
  for(let f=0;f<6;f++)for(let i=0;i<n;i++)for(let j=0;j<n;j++){
    const g=SCAN_GEOM[f],p=[0,1,2].map(t=>g.n[t]*n+g.r[t]*(2*j-n+1)+g.d[t]*(2*i-n+1));
    pos.push(p);at.set(p.join(),pos.length-1);
  }
  // A piece: the stickers at one spot once the face coordinate is pulled in to its layer.
  const cub=new Map();
  pos.forEach((p,i)=>{const k=p.map(v=>Math.abs(v)===n?Math.sign(v)*(n-1):v).join();if(!cub.has(k))cub.set(k,[]);cub.get(k).push(i);});
  const faceOf=i=>Math.floor(i/cells),corners=[],edges=[];
  for(const idx of cub.values()){
    const fs=idx.map(faceOf);
    if(idx.length===3){
      // The engine orders a corner's stickers one way; follow it so the legal triples apply.
      const c=cornerFacelet.findIndex(fl=>fl.every(x=>fs.includes(Math.floor(x/9))));
      const order=cornerFacelet[c].map(x=>Math.floor(x/9));
      corners.push({idx:order.map(f=>idx[fs.indexOf(f)]),last:Math.max(...fs)});
    }else if(idx.length===2)edges.push({idx,last:Math.max(...fs)});
  }
  // The 24 ways to hold the cube, from quarter turns about the three axes.
  const turn=(v,a)=>{const dot=v[0]*a[0]+v[1]*a[1]+v[2]*a[2],c=[a[1]*v[2]-a[2]*v[1],a[2]*v[0]-a[0]*v[2],a[0]*v[1]-a[1]*v[0]];return [dot*a[0]-c[0],dot*a[1]-c[1],dot*a[2]-c[2]];};
  const gens=[[1,0,0],[0,1,0],[0,0,1]].map(a=>{const perm=new Array(pos.length);pos.forEach((p,i)=>{perm[at.get(turn(p,a).join())]=i;});return perm;});
  const id=pos.map((p,i)=>i),rots=[id],seen=new Set([id.join()]);
  for(let q=0;q<rots.length;q++)for(const g of gens){const r=g.map(x=>rots[q][x]);const key=r.join();if(!seen.has(key)){seen.add(key);rots.push(r);}}
  return SCAN_SIZES[n]={n,cells,corners,edges,rots};
}
function applyPerm(s,perm){const out=new Array(perm.length);for(let j=0;j<perm.length;j++)out[j]=s[perm[j]];return out;}

// All facelet arrays that come from some rotation of each face and pass fromFacelets.
// byFace: 6 arrays of 9 colors, indexed by face (center color). One entry may be null: that face
// was not read, and every way to fill it from the other five (fillFace) is tried. Returns
// [{facelets,rotations}]; the rotation of a face not read is 0.
function legalRotations(byFace,limit){
  limit=limit||8;const out=[],seen=new Set();
  const f=new Array(54),rot=new Array(6),miss=byFace.findIndex(s=>!s);
  const turned=byFace.map((s,c)=>s?[0,1,2,3].map(k=>rotateFace(s,k)):[new Array(9).fill(-1).map((x,p)=>p===4?c:x)]); // a face not read: its center, the rest unknown
  const fits=sl=>{const st=sl.fl.map(i=>f[i]);return st.includes(-1)?!sl.part||sl.part.has(st.join()):sl.legal.has(st.join());};
  (function place(face){
    if(out.length>=limit)return;
    if(face===6){
      for(const g of miss<0?[f.slice()]:fillFace(f,miss)){
        const key=g.join();if(seen.has(key))continue;seen.add(key);
        const res=fromFacelets(g);if(res.ok)out.push({facelets:g,rotations:rot.slice(),cube:res.cube});
        if(out.length>=limit)return;
      }
      return;
    }
    for(let k=0;k<turned[face].length;k++){
      const t=turned[face][k];for(let p=0;p<9;p++)f[9*face+p]=t[p];rot[face]=k;
      let good=true;
      for(const sl of SCAN_PIECES)if(sl.last===face&&!fits(sl)){good=false;break;}
      if(good)place(face+1);
    }
  })(0);
  return out;
}
// The face m of a 3x3 from the other five, in f (its stickers -1, its center set). Its four
// corners show two stickers each on the faces beside them, and two stickers of a corner in their
// order name it, so each hidden corner sticker follows. Its four edges show one sticker each.
// The four edge pieces not seen whole must fill those four slots, each with its shown color out.
// Returns every such filling as a 54-sticker array; the caller keeps the legal ones. The true
// cube is always among them, so one legal filling is the cube, and more than one means the
// face must be read.
function fillFace(f,m){
  const g=f.slice();
  for(const fl of cornerFacelet){
    const st=fl.map(i=>g[i]),h=st.indexOf(-1);if(h<0)continue;
    const fill=SCAN_CORNER_FILL.get(st.join());if(fill==null)return [];
    g[fl[h]]=fill;
  }
  const open=[],seen=new Set();
  edgeFacelet.forEach((fl,i)=>{const a=g[fl[0]],b=g[fl[1]];if(a<0||b<0)open.push(i);else seen.add(Math.min(a,b)+','+Math.max(a,b));});
  const left=edgeColor.map((ec,j)=>j).filter(j=>!seen.has(Math.min(...edgeColor[j])+','+Math.max(...edgeColor[j])));
  if(left.length!==open.length)return [];
  const out=[],used=new Array(left.length).fill(false);
  (function place(k){
    if(k===open.length){out.push(g.slice());return;}
    const fl=edgeFacelet[open[k]],h=g[fl[0]]<0?0:1,shown=g[fl[1-h]];
    for(let t=0;t<left.length;t++){
      if(used[t])continue;const ec=edgeColor[left[t]],o=ec.indexOf(shown);if(o<0)continue;
      used[t]=true;g[fl[h]]=ec[1-o];place(k+1);g[fl[h]]=-1;used[t]=false;
    }
  })(0);
  return out;
}

const SCAN_CONFUSE=[[1,4],[0,3]]; // red/orange, white/yellow
function confusePartner(c){for(const [a,b] of SCAN_CONFUSE){if(c===a)return b;if(c===b)return a;}return -1;}

// faces: five or six scanned faces in any order. Returns
// {ok, facelets, cube, rotations, fits:[{facelets, cube, rotations}], changes:[text], errors:[text],
//  ambiguous, deduced?, need?}: deduced is the face worked out from five, need the face to read next.
function assembleScan(faces){
  const byFace=new Array(6).fill(null),src=new Array(6).fill(null);
  for(const fc of faces){
    const c=fc.stickers[4];
    if(!(c>=0&&c<6))return {ok:false,errors:['A face has no center color.'],changes:[]};
    if(byFace[c])return {ok:false,errors:[`Two faces have a ${COLOR_NAMES_E[c]} center.`],changes:[]};
    byFace[c]=fc.stickers.slice();src[c]=fc;
  }
  const missing=[0,1,2,3,4,5].filter(c=>!byFace[c]);
  if(missing.length>1)return {ok:false,errors:['Scan the '+missing.map(c=>COLOR_NAMES_E[c]).join(', ')+' faces.'],changes:[]};
  const m=missing.length?missing[0]:-1; // the face not read, on five faces
  // Every fit goes back in `fits`, the first one shown. Faces read at unknown turns can make more
  // than one legal cube (one move from solved, say: U and D' show the same six faces, each turned
  // half way round); the user checks the net and takes the next fit.
  const done=(sols,changes)=>{
    const s=sols[0];
    return {ok:true,facelets:s.facelets,cube:s.cube,rotations:s.rotations,fits:sols.map(x=>({facelets:x.facelets,cube:x.cube,rotations:x.rotations})),changes,errors:[],ambiguous:sols.length>1};
  };
  // Five faces: the sixth follows from them in most cases (fillFace), and the result names it as
  // `deduced`. Fits that differ on that face, however it is turned, are told apart by reading it:
  // `need` names it. Fits that agree there differ only in how the five faces are turned, and the
  // sixth face would not settle that, so they go to the user as fits, as six faces do. The repairs
  // below run on five faces as on six: a camera misreads a sticker now and then, and one misread
  // must not cost the user the sixth face. A repair's fits go through the same rule.
  const need=text=>({ok:false,need:m,errors:[`Show the ${COLOR_NAMES_E[m]} face too: ${text}`],changes:[]});
  const differ=sols=>{
    const faceKey=s=>{let best=null;for(let k=0;k<4;k++){const key=rotateFace(s.facelets.slice(9*m,9*m+9),k).join();if(best===null||key<best)best=key;}return best;};
    return new Set(sols.map(faceKey)).size>1;
  };
  const finish=(sols,changes)=>m<0?done(sols,changes):differ(sols)?need('more than one cube fits the other five.'):Object.assign(done(sols,changes),{deduced:m});
  // The count read, on every read: all stickers again against this cube's own center colors,
  // nine per color (at most nine on five faces). This settles red/orange and white/yellow when the
  // light leans warm, before the plain read is trusted. A joint read that differs and makes a
  // legal cube wins; else the plain read stands, and the repairs below follow it.
  const joint=jointColors(faces.map(fc=>fc));
  if(joint){
    const trial=new Array(6).fill(null);for(const fc of faces)trial[fc.stickers[4]]=joint.get(fc);
    let n=0;for(let c=0;c<6;c++)if(c!==m)for(let p=0;p<9;p++)if(trial[c][p]!==byFace[c][p])n++;
    if(n){const js=legalRotations(trial);
      if(js.length){const r=finish(js,[`I read ${n} sticker${n===1?'':'s'} again against the center colors.`]);r.joint=true;return r;}}
  }
  let sols=legalRotations(byFace);
  if(sols.length)return finish(sols,[]);

  // The repairs: one face read with red/orange or white/yellow swapped throughout (swaps), one
  // sticker misread as its usual confusion (ones), two such stickers (twos); least sure stickers
  // go first. On six faces the first repair that fits stands, the swaps first: nine of each color
  // leave a wrong one little room. On five faces a wrong repair fits more easily, the face not
  // read taking up the slack, so when one sticker and one face both fit the sixth face is asked
  // for; else the first of each kind stands, the ones before the swaps, the twos last.
  const swaps=[],ones=[],twos=[];
  for(let face=0;face<6;face++)for(const [a,b] of SCAN_CONFUSE){
    const s=byFace[face];if(!s||!s.some((x,p)=>p!==4&&(x===a||x===b)))continue;
    const trial=byFace.slice();trial[face]=s.map((x,p)=>p===4||(src[face].pinned&&src[face].pinned[p])?x:x===a?b:x===b?a:x);
    swaps.push({kind:'swap',trial,changes:[`On the ${COLOR_NAMES_E[face]} face, I swapped ${COLOR_NAMES_E[a]} and ${COLOR_NAMES_E[b]}.`]});
  }
  const cand=[];
  for(let face=0;face<6;face++)for(let p=0;p<9;p++){
    if(p===4||!byFace[face])continue;const fc=src[face];if(fc.pinned&&fc.pinned[p])continue;
    const to=confusePartner(byFace[face][p]);if(to<0)continue;
    cand.push({face,p,to,m:fc.margins?fc.margins[p]:0});
  }
  cand.sort((x,y)=>x.m-y.m);
  const counts=[0,0,0,0,0,0];for(const s of byFace)if(s)for(const x of s)counts[x]++;
  const flips=(list,...fl)=>{
    const c=counts.slice();for(const x of fl){c[byFace[x.face][x.p]]--;c[x.to]++;}
    if(!(m<0?c.every(k=>k===9):c.every((k,i)=>k<=(i===m?8:9))))return; // five faces: no color over nine, the one not read at most eight
    const trial=byFace.map(s=>s&&s.slice());for(const x of fl)trial[x.face][x.p]=x.to;
    list.push({kind:fl.length===1?'one':'two',trial,changes:fl.map(x=>`One ${COLOR_NAMES_E[byFace[x.face][x.p]]} sticker on the ${COLOR_NAMES_E[x.face]} face is now ${COLOR_NAMES_E[x.to]}.`)});
  };
  for(const a of cand)flips(ones,a);
  for(let i=0;i<cand.length;i++)for(let j=i+1;j<cand.length;j++)flips(twos,cand[i],cand[j]);
  if(m<0){for(const rep of [...swaps,...ones,...twos]){const r=legalRotations(rep.trial);if(r.length)return finish(r,rep.changes);}}
  else{
    let hit=null;
    for(const rep of [...ones,...swaps]){
      const r=legalRotations(rep.trial);if(!r.length)continue;
      if(!hit)hit={r,rep};else if(hit.rep.kind!==rep.kind)return need('more than one cube fits the other five.');
    }
    if(hit)return finish(hit.r,hit.rep.changes);
    for(const rep of twos){const r=legalRotations(rep.trial);if(r.length)return finish(r,rep.changes);}
  }

  // No repair worked. On five faces, the sixth is asked for. On six, report the errors for the
  // reading as scanned.
  if(m>=0)return need('the other five do not fit together as one cube by themselves.');
  const f=[];for(let face=0;face<6;face++)f.push(...byFace[face]);
  const bad=[0,1,2,3,4,5].filter(c=>counts[c]!==9);
  const errors=bad.length?['Each color must appear 9 times: '+bad.map(c=>`${COLOR_NAMES_E[c]} ${counts[c]}`).join(', ')+'.']
    :['The faces do not fit together as one cube. Check the stickers on the net, or scan a face again.'];
  return {ok:false,facelets:f,errors,changes:[]};
}

// ---------- faces with no center: the 2x2 and the 4x4 ----------
// reads: six readings of n*n colors. The first is held on top as read; the other five go to
// R, F, D, L and B in some order and at some turn. Every corner must be a real corner, each
// once; every edge pair a real edge, each pair on at most two wings; each color n*n times;
// the corner twists must add up. Returns up to limit [{facelets, rotations, order}], where
// order[slot] is the reading at that slot and rotations[slot] its turn.
function freeSolutions(reads,n,limit){
  limit=limit||8;const S=scanSize(n),cells=S.cells;
  const f=new Array(6*cells).fill(-1),rot=new Array(6),ord=new Array(6),out=[],seen=new Set();
  const turned=reads.map(s=>[0,1,2,3].map(k=>rotateFace(s,k))),used=new Array(reads.length).fill(false);
  const put=(slot,r,k)=>{const t=turned[r][k];for(let p=0;p<cells;p++)f[cells*slot+p]=t[p];rot[slot]=k;ord[slot]=r;};
  const pairMax=n===3?1:2;
  const good=slot=>{
    const ids=new Set();
    for(const c of S.corners){
      if(c.last>slot)continue;const key=c.idx.map(i=>f[i]).join();
      if(!SCAN_CORNER_SET.has(key))return false;const id=SCAN_CORNER_ID.get(key);if(ids.has(id))return false;ids.add(id);
    }
    const pairs=new Map();
    for(const e of S.edges){
      if(e.last>slot)continue;const a=f[e.idx[0]],b=f[e.idx[1]];
      if(!SCAN_EDGE_SET.has(a+','+b))return false;const key=a<b?a+','+b:b+','+a,m=(pairs.get(key)||0)+1;if(m>pairMax)return false;pairs.set(key,m);
    }
    return true;
  };
  (function place(slot){
    if(out.length>=limit)return;
    if(slot===6){
      const counts=[0,0,0,0,0,0];for(const x of f)counts[x]++;if(counts.some(c=>c!==cells))return;
      let tw=0;for(const c of S.corners){const st=c.idx.map(i=>f[i]);tw+=st.indexOf(cornerColor[SCAN_CORNER_ID.get(st.join())][0]);}
      if(tw%3)return;
      // The same cube held another way is the same fit.
      const key=canonicalKey(f,n);if(seen.has(key))return;seen.add(key);
      out.push({facelets:f.slice(),rotations:rot.slice(),order:ord.slice()});return;
    }
    for(let r=0;r<reads.length;r++){
      if(used[r])continue;used[r]=true;
      for(let k=0;k<4;k++){put(slot,r,k);if(good(slot))place(slot+1);}
      used[r]=false;
    }
  })((put(0,0,0),used[0]=true,1));
  return out;
}
// One key for a cube however it is held: the smallest of its 24 sticker strings.
function canonicalKey(facelets,n){
  let best=null;for(const p of scanSize(n).rots){const k=applyPerm(facelets,p).join();if(best===null||k<best)best=k;}return best;
}
// Of the 24 ways to hold a cube, the one with the most white on top, then the most green in front.
function bestHolding(facelets,n){
  const S=scanSize(n),cells=S.cells;let best=null,bs=-1;
  for(const p of S.rots){
    const g=applyPerm(facelets,p);let s=0;
    for(let i=0;i<cells;i++){if(g[i]===0)s+=10;if(g[2*cells+i]===2)s+=1;}
    if(s>bs){bs=s;best=g;}
  }
  return best;
}
// Which reading sits at each slot of facelets, and at what turn: [{face, k}] per slot.
function matchSlots(facelets,reads,n){
  const cells=n*n,used=new Array(reads.length).fill(false),out=[];
  for(let slot=0;slot<6;slot++){
    const want=facelets.slice(cells*slot,cells*slot+cells).join();let hit=null;
    for(let r=0;r<reads.length&&!hit;r++){if(used[r])continue;for(let k=0;k<4;k++)if(rotateFace(reads[r],k).join()===want){hit={face:r,k};used[r]=true;break;}}
    out.push(hit);
  }
  return out;
}
// faces: six or more scanned faces of a 2x2 (n=2) or a 4x4 (n=4), in any order and at any
// turn. Without centers, more than one cube can fit the same six faces (about one 2x2 state
// in fourteen). Every distinct fit is returned, the first one shown:
// {ok, fits:[{facelets, cube, slots:[{face, k}] per side U R F D L B, used:[face indices]}],
//  facelets, cube, slots, used, ambiguous, changes:[text], errors:[text]}.
// cube is a Cube for the 2x2, held with the most white on top; for the 4x4 it is a FourCube
// when js/four.js is loaded, else null, and facelets holds the 96 stickers.
function assembleFree(faces,n){
  const cells=n*n;
  if(faces.length<6){const m=6-faces.length;return {ok:false,errors:[`Show ${m} more face${m>1?'s':''}.`],changes:[]};}
  const reads=faces.map(fc=>fc.stickers);
  const fitOf=(sol,subset,rs)=>{
    const held=bestHolding(sol.facelets,n);
    const slots=matchSlots(held,subset.map(i=>rs[i]),n).map(s=>s&&{face:subset[s.face],k:s.k});
    let cube=null;
    if(n===2&&typeof twoFromFacelets==='function')cube=twoFromFacelets(held).cube||null;
    else if(n===4&&typeof fourFromFacelets==='function')cube=fourFromFacelets(held).cube||null;
    return {facelets:held,cube,slots,used:subset};
  };
  const done=(fits,changes)=>Object.assign({ok:true,fits,ambiguous:fits.length>1,changes,errors:[]},fits[0]);
  // Any six of the faces that fit together. With exactly six, the repairs below may follow.
  const six=[0,1,2,3,4,5],fitsOf=(sols,rs)=>sols.map(s=>fitOf(s,six,rs));
  // The count read, on every read of exactly six faces: all stickers again as six groups of n*n
  // by their colors (as assembleScan does against the centers). A joint read that differs and
  // makes a legal cube wins; else the plain read stands.
  const joint=faces.length===6?jointColors(faces,n):null;
  if(joint){
    const trial=faces.map(fc=>joint.get(fc));
    let m=0;for(let i=0;i<6;i++)for(let p=0;p<cells;p++)if(trial[i][p]!==reads[i][p])m++;
    if(m){const sols=freeSolutions(trial,n,64);
      if(sols.length){const r=done(fitsOf(sols,trial),[`I read ${m} sticker${m===1?'':'s'} again by their colors.`]);r.joint=true;return r;}}
  }
  const subsets=[];
  (function pick(start,cur){if(cur.length===6){subsets.push(cur.slice());return;}for(let i=start;i<faces.length;i++){cur.push(i);pick(i+1,cur);cur.pop();}})(0,[]);
  const fits=[],seen=new Set();
  for(const sub of subsets)for(const sol of freeSolutions(sub.map(i=>reads[i]),n,64)){
    const key=canonicalKey(sol.facelets,n);if(seen.has(key))continue;seen.add(key);fits.push(fitOf(sol,sub,reads));
  }
  if(fits.length)return done(fits,[]);
  if(faces.length!==6)return {ok:false,errors:[`${faces.length} faces are read, but no six of them fit together as one cube. Press Start again.`],changes:[]};
  // Repair 1: one face read with red/orange or white/yellow swapped throughout.
  for(let i=0;i<6;i++)for(const [a,b] of SCAN_CONFUSE){
    const s=reads[i];if(!s.some(x=>x===a||x===b))continue;
    const t=s.map((x,p)=>(faces[i].pinned&&faces[i].pinned[p])?x:x===a?b:x===b?a:x);
    const trial=reads.slice();trial[i]=t;
    const sols=freeSolutions(trial,n);
    if(sols.length)return done(fitsOf(sols,trial),[`On face ${i+1}, I swapped ${COLOR_NAMES_E[a]} and ${COLOR_NAMES_E[b]}.`]);
  }
  // Repair 2: one or two stickers misread as their usual confusion. Least sure stickers go first.
  const cand=[];
  for(let i=0;i<6;i++)for(let p=0;p<cells;p++){
    const fc=faces[i];if(fc.pinned&&fc.pinned[p])continue;
    const to=confusePartner(reads[i][p]);if(to<0)continue;
    cand.push({i,p,to,m:fc.margins?fc.margins[p]:0});
  }
  cand.sort((x,y)=>x.m-y.m);
  const counts=[0,0,0,0,0,0];for(const s of reads)for(const x of s)counts[x]++;
  const countsFit=flips=>{const c=counts.slice();for(const fl of flips){c[reads[fl.i][fl.p]]--;c[fl.to]++;}return c.every(k=>k===cells);};
  const tryFlips=flips=>{
    if(!countsFit(flips))return null;
    const trial=reads.map(s=>s.slice());for(const fl of flips)trial[fl.i][fl.p]=fl.to;
    const sols=freeSolutions(trial,n);return sols.length?{sols,trial}:null;
  };
  const describe=flips=>flips.map(fl=>`One ${COLOR_NAMES_E[reads[fl.i][fl.p]]} sticker on face ${fl.i+1} is now ${COLOR_NAMES_E[fl.to]}.`);
  for(const a of cand){const r=tryFlips([a]);if(r)return done(fitsOf(r.sols,r.trial),describe([a]));}
  const few=cand.slice(0,12);
  for(let i=0;i<few.length;i++)for(let j=i+1;j<few.length;j++){
    const fl=[few[i],few[j]];const r=tryFlips(fl);if(r)return done(fitsOf(r.sols,r.trial),describe(fl));
  }
  const bad=[0,1,2,3,4,5].filter(c=>counts[c]!==cells);
  const errors=bad.length?[`Each color must appear ${cells} times: `+bad.map(c=>`${COLOR_NAMES_E[c]} ${counts[c]}`).join(', ')+'.']
    :['The faces do not fit together as one cube. Check the stickers on the net, or show a face again.'];
  return {ok:false,errors,changes:[]};
}

// Assign the stickers to the six colors, the same number each, by distance in Lab. On the
// 3x3 the 48 non-center stickers go eight per color, each color anchored at its center; from
// five faces, forty stickers go at most eight per color, the color not read anchored at the
// mean of the stickers read as it. On the 2x2 and the 4x4 all stickers go n*n per color,
// anchored at the mean of the stickers first read as that color, then settled over a few
// rounds. faces need .lab (one Lab value per cell). Pinned stickers keep their color. Returns a
// Map face -> colors, or null.
function jointColors(faces,n){
  n=n||3;const cells=n*n,center=n===3;
  if(!(faces.length===6||center&&faces.length===5)||!faces.every(f=>f.lab))return null;
  const dist=(a,b)=>Math.sqrt(0.35*(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2);
  const slots=new Array(6).fill(center?8:cells),items=[],out=new Map();
  for(const f of faces){
    const s=f.stickers.slice();out.set(f,s);
    for(let p=0;p<cells;p++){
      if(center&&p===4)continue;
      if(f.pinned&&f.pinned[p]){slots[s[p]]--;continue;}
      items.push({f,p});
    }
  }
  if(slots.some(k=>k<0))return null;
  let anchor;
  if(center){
    anchor=[];for(const f of faces)anchor[f.stickers[4]]=f.lab[4];
    for(let c=0;c<6;c++){if(anchor[c])continue; // a face not read
      const sum=[0,0,0,0];for(const f of faces)f.stickers.forEach((x,p)=>{if(x===c){for(let i=0;i<3;i++)sum[i]+=f.lab[p][i];sum[3]++;}});
      if(sum[3])anchor[c]=[sum[0]/sum[3],sum[1]/sum[3],sum[2]/sum[3]];else slots[c]=0;
    }
  }
  const cols=[];for(let c=0;c<6;c++)for(let k=0;k<slots[c];k++)cols.push(c);
  // Slots left over (eight, from five faces) go to blank rows at no cost.
  if(cols.length<items.length)return null;
  const blank=cols.length-items.length;
  for(let round=0;round<(center?1:3);round++){
    if(!center){
      // The mean Lab of the stickers now labeled with each color.
      const sum=[0,1,2,3,4,5].map(()=>[0,0,0,0]);
      for(const f of faces){const s=out.get(f);for(let p=0;p<cells;p++){const a=sum[s[p]];for(let c=0;c<3;c++)a[c]+=f.lab[p][c];a[3]++;}}
      if(sum.some(a=>!a[3]))return null;
      anchor=sum.map(a=>[a[0]/a[3],a[1]/a[3],a[2]/a[3]]);
    }
    const cost=items.map(it=>cols.map(c=>dist(it.f.lab[it.p],anchor[c])));
    for(let i=0;i<blank;i++)cost.push(cols.map(()=>0));
    const asg=hungarian(cost);
    items.forEach((it,i)=>{out.get(it.f)[it.p]=cols[asg[i]];});
  }
  return out;
}
// Minimum-cost assignment for a square cost matrix. Returns col index per row.
function hungarian(a){
  const n=a.length,INF=1e18,u=new Array(n+1).fill(0),v=new Array(n+1).fill(0),p=new Array(n+1).fill(0),way=new Array(n+1).fill(0);
  for(let i=1;i<=n;i++){
    p[0]=i;let j0=0;const minv=new Array(n+1).fill(INF),used=new Array(n+1).fill(false);
    do{
      used[j0]=true;const i0=p[j0];let d=INF,j1=0;
      for(let j=1;j<=n;j++)if(!used[j]){const cur=a[i0-1][j-1]-u[i0]-v[j];if(cur<minv[j]){minv[j]=cur;way[j]=j0;}if(minv[j]<d){d=minv[j];j1=j;}}
      for(let j=0;j<=n;j++){if(used[j]){u[p[j]]+=d;v[j]-=d;}else minv[j]-=d;}
      j0=j1;
    }while(p[j0]!==0);
    do{const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0);
  }
  const ans=new Array(n);for(let j=1;j<=n;j++)ans[p[j]-1]=j-1;return ans;
}
