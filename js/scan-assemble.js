// ================= Scanner stage 5: assemble and repair =================
// Pure functions, no DOM. Needs engine.js (fromFacelets, cornerFacelet, edgeFacelet,
// cornerColor, edgeColor, COLOR_NAMES_E). See docs/scanner-handoff.md.
//
// A scanned face is {stickers:[9 colour indices], margins?:[9 numbers], pinned?:[9 bools]}.
// stickers read left to right, top to bottom, as the camera saw them. The face may be
// turned by any multiple of 90 degrees; the centre colour says which face it is.

// Turn a 3x3 face reading 90 degrees clockwise, k times.
function rotateFace(s,k){
  k=((k%4)+4)%4;let a=s.slice();
  for(let n=0;n<k;n++){const b=new Array(9);for(let r=0;r<3;r++)for(let c=0;c<3;c++)b[3*r+c]=a[3*(2-c)+r];a=b;}
  return a;
}

const SCAN_PIECES=(()=>{
  // Every legal colour tuple for a corner or edge slot, in the slot's facelet order.
  const corners=new Set(),edges=new Set();
  for(const cc of cornerColor)for(let o=0;o<3;o++)corners.add([0,1,2].map(n=>cc[(n+o)%3]).join());
  for(const ec of edgeColor){edges.add(ec.join());edges.add([ec[1],ec[0]].join());}
  // Each slot is checked once all of its faces have a rotation.
  const slots=[];
  for(const fl of cornerFacelet)slots.push({fl,legal:corners,last:Math.max(...fl.map(i=>Math.floor(i/9)))});
  for(const fl of edgeFacelet)slots.push({fl,legal:edges,last:Math.max(...fl.map(i=>Math.floor(i/9)))});
  return slots;
})();

// All facelet arrays that come from some rotation of each face and pass fromFacelets.
// byFace: 6 arrays of 9 colours, indexed by face (centre colour). Returns [{facelets,rotations}].
function legalRotations(byFace,limit){
  limit=limit||8;const out=[],seen=new Set();
  const f=new Array(54),rot=new Array(6);
  const turned=byFace.map(s=>[0,1,2,3].map(k=>rotateFace(s,k)));
  (function place(face){
    if(out.length>=limit)return;
    if(face===6){
      const key=f.join();if(seen.has(key))return;seen.add(key);
      const res=fromFacelets(f.slice());if(res.ok)out.push({facelets:f.slice(),rotations:rot.slice(),cube:res.cube});
      return;
    }
    for(let k=0;k<4;k++){
      const t=turned[face][k];for(let p=0;p<9;p++)f[9*face+p]=t[p];rot[face]=k;
      let good=true;
      for(const sl of SCAN_PIECES)if(sl.last===face&&!sl.legal.has(sl.fl.map(i=>f[i]).join())){good=false;break;}
      if(good)place(face+1);
    }
  })(0);
  return out;
}

const SCAN_CONFUSE=[[1,4],[0,3]]; // red/orange, white/yellow
function confusePartner(c){for(const [a,b] of SCAN_CONFUSE){if(c===a)return b;if(c===b)return a;}return -1;}

// faces: array of scanned faces in any order. Returns
// {ok, facelets, cube, rotations, changes:[text], errors:[text], ambiguous}.
function assembleScan(faces){
  const byFace=new Array(6).fill(null),src=new Array(6).fill(null);
  for(const fc of faces){
    const c=fc.stickers[4];
    if(!(c>=0&&c<6))return {ok:false,errors:['A face has no centre colour.'],changes:[]};
    if(byFace[c])return {ok:false,errors:[`Two faces have a ${COLOR_NAMES_E[c]} centre.`],changes:[]};
    byFace[c]=fc.stickers.slice();src[c]=fc;
  }
  const missing=[0,1,2,3,4,5].filter(c=>!byFace[c]);
  if(missing.length)return {ok:false,errors:['Scan the '+missing.map(c=>COLOR_NAMES_E[c]).join(', ')+' face'+(missing.length>1?'s':'')+'.'],changes:[]};
  const done=(sols,changes)=>{
    const s=sols[0];
    return {ok:true,facelets:s.facelets,cube:s.cube,rotations:s.rotations,changes,errors:[],ambiguous:sols.length>1};
  };
  let sols=legalRotations(byFace);
  if(sols.length)return done(sols,[]);

  // Repair 0: read all stickers again against this cube's own centre colours, nine per colour.
  // This settles red/orange and white/yellow when the light shifts the colours.
  const joint=jointColours(faces.map(fc=>fc));
  if(joint){
    const trial=new Array(6);for(const fc of faces)trial[fc.stickers[4]]=joint.get(fc);
    let n=0;for(let c=0;c<6;c++)for(let p=0;p<9;p++)if(trial[c][p]!==byFace[c][p])n++;
    sols=legalRotations(trial);
    if(sols.length){const r=done(sols,[`I read ${n} sticker${n===1?'':'s'} again against the centre colours.`]);r.joint=true;return r;}
  }

  // Repair 1: one face read with red/orange or white/yellow swapped throughout.
  for(let face=0;face<6;face++)for(const [a,b] of SCAN_CONFUSE){
    const s=byFace[face];if(!s.some((x,p)=>p!==4&&(x===a||x===b)))continue;
    const t=s.map((x,p)=>p===4||(src[face].pinned&&src[face].pinned[p])?x:x===a?b:x===b?a:x);
    const trial=byFace.slice();trial[face]=t;
    sols=legalRotations(trial);
    if(sols.length)return done(sols,[`On the ${COLOR_NAMES_E[face]} face, I swapped ${COLOR_NAMES_E[a]} and ${COLOR_NAMES_E[b]}.`]);
  }

  // Repair 2: one or two stickers misread as their usual confusion. Least sure stickers go first.
  const cand=[];
  for(let face=0;face<6;face++)for(let p=0;p<9;p++){
    if(p===4)continue;const fc=src[face];if(fc.pinned&&fc.pinned[p])continue;
    const to=confusePartner(byFace[face][p]);if(to<0)continue;
    cand.push({face,p,to,m:fc.margins?fc.margins[p]:0});
  }
  cand.sort((x,y)=>x.m-y.m);
  const counts=[0,0,0,0,0,0];for(const s of byFace)for(const x of s)counts[x]++;
  const fits=flips=>{
    const c=counts.slice();for(const fl of flips){c[byFace[fl.face][fl.p]]--;c[fl.to]++;}
    return c.every(n=>n===9);
  };
  const tryFlips=flips=>{
    if(!fits(flips))return null;
    const trial=byFace.map(s=>s.slice());for(const fl of flips)trial[fl.face][fl.p]=fl.to;
    const r=legalRotations(trial);return r.length?r:null;
  };
  const describe=flips=>flips.map(fl=>`One ${COLOR_NAMES_E[byFace[fl.face][fl.p]]} sticker on the ${COLOR_NAMES_E[fl.face]} face is now ${COLOR_NAMES_E[fl.to]}.`);
  for(const a of cand){const r=tryFlips([a]);if(r)return done(r,describe([a]));}
  for(let i=0;i<cand.length;i++)for(let j=i+1;j<cand.length;j++){
    const fl=[cand[i],cand[j]];const r=tryFlips(fl);if(r)return done(r,describe(fl));
  }

  // No repair worked. Report the errors for the reading as scanned, at the best guess of rotations.
  const f=[];for(let face=0;face<6;face++)f.push(...byFace[face]);
  const bad=[0,1,2,3,4,5].filter(c=>counts[c]!==9);
  const errors=bad.length?['Each colour must appear 9 times: '+bad.map(c=>`${COLOR_NAMES_E[c]} ${counts[c]}`).join(', ')+'.']
    :['The faces do not fit together as one cube. Check the stickers on the net, or scan a face again.'];
  return {ok:false,facelets:f,errors,changes:[]};
}

// Assign the 48 non-centre stickers to the six colours, eight each, by distance to the centre
// colours in Lab. faces need .lab (9 Lab values). Pinned stickers keep their colour.
// Returns a Map face -> 9 colours, or null.
function jointColours(faces){
  if(faces.length!==6||!faces.every(f=>f.lab))return null;
  const anchor=[];for(const f of faces)anchor[f.stickers[4]]=f.lab[4];
  const dist=(a,b)=>Math.sqrt(0.35*(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2);
  const slots=[8,8,8,8,8,8],items=[],out=new Map();
  for(const f of faces){
    const s=f.stickers.slice();out.set(f,s);
    for(let p=0;p<9;p++){
      if(p===4)continue;
      if(f.pinned&&f.pinned[p]){slots[s[p]]--;continue;}
      items.push({f,p});
    }
  }
  if(slots.some(n=>n<0))return null;
  const cols=[];for(let c=0;c<6;c++)for(let k=0;k<slots[c];k++)cols.push(c);
  if(cols.length!==items.length)return null;
  const cost=items.map(it=>cols.map(c=>dist(it.f.lab[it.p],anchor[c])));
  const asg=hungarian(cost);
  items.forEach((it,i)=>{out.get(it.f)[it.p]=cols[asg[i]];});
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
