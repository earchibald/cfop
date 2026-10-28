// ================= Camera scanner =================
// Reads a real cube from the webcam, one face at a time. See docs/scanner-handoff.md.
// The face size n (2, 3 or 4) runs through every stage: the 2x2 and the 4x4 have no fixed
// centers, so their faces are told apart by their own stickers and placed by stage 5.

// ---------- color helpers ----------
// img is ImageData-like: {width, height, data: RGBA bytes}. All stages work on a ~320 px copy.
const SRGB_LIN=(()=>{const t=new Float32Array(256);for(let i=0;i<256;i++){const c=i/255;t[i]=c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}return t;})();
function labF(t){return t>0.008856?Math.cbrt(t):7.787*t+16/116;}
// Linear RGB (0..1) to CIE Lab, D65.
function linToLab(r,g,b){
  const x=labF((0.4124*r+0.3576*g+0.1805*b)/0.95047),y=labF(0.2126*r+0.7152*g+0.0722*b),z=labF((0.0193*r+0.1192*g+0.9505*b)/1.08883);
  return [116*y-16,500*(x-y),200*(y-z)];
}
const hexLin=h=>[0,2,4].map(i=>SRGB_LIN[parseInt(h.substr(i,2),16)]);
// Reference sticker colors in linear RGB, by color index (white red green yellow orange blue):
// the classic sticker colors, and stickerless plastic (GAN) from the light-mode palette of css/app.css
// (docs/design-language.md). classifySamples tries both and keeps the set the face sits nearer,
// unless opts.style pins one.
const SCAN_REFS=['F4F4F4','C41E3A','009E60','FFD500','FF5800','0051BA'].map(hexLin);
const SCAN_REFS_PLASTIC=['FCFCFC','E3262B','25B83C','F8D000','FB8500','1E78E6'].map(hexLin);
const SCAN_STYLES={stickers:SCAN_REFS,stickerless:SCAN_REFS_PLASTIC};

// ---------- stage 1: sticker candidates ----------
function findBlobs(img,opts){
  opts=opts||{};const W=img.width,H=img.height,N=W*H,d=img.data;
  const L=new Float32Array(N),A=new Float32Array(N),B=new Float32Array(N);
  for(let i=0,j=0;i<N;i++,j+=4){const lab=linToLab(SRGB_LIN[d[j]],SRGB_LIN[d[j+1]],SRGB_LIN[d[j+2]]);L[i]=lab[0];A[i]=lab[1];B[i]=lab[2];}
  // 3x3 box blur for segmentation; it takes the edge off sensor noise.
  const blur=src=>{const o=new Float32Array(N);for(let y=0;y<H;y++)for(let x=0;x<W;x++){let s=0,n=0;for(let dy=-1;dy<=1;dy++){const yy=y+dy;if(yy<0||yy>=H)continue;for(let dx=-1;dx<=1;dx++){const xx=x+dx;if(xx<0||xx>=W)continue;s+=src[yy*W+xx];n++;}}o[y*W+x]=s/n;}return o;};
  const sL=blur(L),sA=blur(A),sB=blur(B);
  // Local mean brightness over a wider box, from an integral image.
  const R=Math.max(3,Math.round(W/50)),ii=new Float64Array((W+1)*(H+1));
  for(let y=0;y<H;y++){let row=0;for(let x=0;x<W;x++){row+=L[y*W+x];ii[(y+1)*(W+1)+x+1]=ii[y*(W+1)+x+1]+row;}}
  const dark=new Uint8Array(N);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const x0=Math.max(0,x-R),x1=Math.min(W,x+R+1),y0=Math.max(0,y-R),y1=Math.min(H,y+R+1);
    const mean=(ii[y1*(W+1)+x1]-ii[y0*(W+1)+x1]-ii[y1*(W+1)+x0]+ii[y0*(W+1)+x0])/((x1-x0)*(y1-y0));
    const i=y*W+x,c=Math.hypot(A[i],B[i]);
    // The black plastic: very dark, or dark against its surroundings and not saturated.
    if(L[i]<12||(L[i]<0.6*mean&&c<35&&L[i]<45))dark[i]=1;
  }
  // Grooves: stickerless cubes have no black gaps, only thin light or dark lines between
  // pieces. A second difference across 2 px finds a line that differs from both sides.
  const gL=opts.grooveBlur?sL:L,gA=opts.grooveBlur?sA:A,gB=opts.grooveBlur?sB:B;
  const d2=(i,k)=>{const dL=gL[i]-(gL[i-k]+gL[i+k])/2,da=gA[i]-(gA[i-k]+gA[i+k])/2,db=gB[i]-(gB[i-k]+gB[i+k])/2;return 0.5*dL*dL+da*da+db*db;};
  // Sensor noise also gives second differences. Measure it on a sparse sample and stay above it.
  let gT=opts.grooveT;
  if(gT==null){const smp=[];for(let y=2;y<H-2;y+=3)for(let x=2+(y%5);x<W-2;x+=7)smp.push(d2(y*W+x,1));smp.sort((a,b)=>a-b);gT=Math.max(25,14*smp[smp.length>>1]);}
  if(gT>0)for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){
    const i=y*W+x;if(dark[i])continue;
    if(d2(i,2)>gT||d2(i,2*W)>gT)dark[i]=2;
  }
  // Flood-fill regions of near-uniform color.
  const lab=new Int32Array(N).fill(-1),stack=new Int32Array(N),blobs=[];
  // A sticker is at most three quarters of the frame shared out over one face's cells.
  const n=opts.n||3,minA=opts.minArea||Math.max(12,N/4000),maxA=opts.maxArea||0.75*N/(n*n);
  for(let s0=0;s0<N;s0++){
    if(dark[s0]||lab[s0]>=0)continue;
    const id=blobs.length;let sp=0,n=0,mL=0,mA=0,mB=0,x0=W,x1=0,y0=H,y1=0;
    const rows=new Map(); // each row's first and last pixel of the blob
    stack[sp++]=s0;lab[s0]=id;
    while(sp){
      const i=stack[--sp],x=i%W,y=(i-x)/W;
      n++;mL+=(sL[i]-mL)/n;mA+=(sA[i]-mA)/n;mB+=(sB[i]-mB)/n;
      const row=rows.get(y);if(!row)rows.set(y,[x,x]);else{if(x<row[0])row[0]=x;if(x>row[1])row[1]=x;}
      if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
      const nb=[x>0?i-1:-1,x<W-1?i+1:-1,y>0?i-W:-1,y<H-1?i+W:-1];
      for(const k of nb){
        if(k<0||dark[k]||lab[k]>=0)continue;
        const dn=(sL[k]-sL[i])**2*0.5+(sA[k]-sA[i])**2+(sB[k]-sB[i])**2;
        if(dn>64)continue;
        const dm=(sL[k]-mL)**2*0.5+(sA[k]-mA)**2+(sB[k]-mB)**2;
        if(dm>400)continue;
        lab[k]=id;stack[sp++]=k;
      }
    }
    const blob={id,area:n,lab:[mL,mA,mB],bbox:[x0,y0,x1,y1]};blobs.push(blob);
    if(n<minA||n>maxA)continue;
    // The shape and the center come from the rows filled from end to end, so a glare hole or
    // a cut from a reflection in the middle of a sticker does not change them.
    let hn=0,sx=0,sy=0,sxx=0,syy=0,sxy=0;
    for(const [y,[a,b]] of rows){const c=b-a+1,s1=(a+b)*c/2,s2=(b*(b+1)*(2*b+1)-(a-1)*a*(2*a-1))/6;hn+=c;sx+=s1;sy+=y*c;sxx+=s2;syy+=y*y*c;sxy+=y*s1;}
    const cx=sx/hn,cy=sy/hn,vxx=sxx/hn-cx*cx,vyy=syy/hn-cy*cy,vxy=sxy/hn-cx*cy;
    const tr=vxx+vyy,det=vxx*vyy-vxy*vxy,disc=Math.sqrt(Math.max(0,tr*tr/4-det));
    const l1=tr/2+disc,l2=tr/2-disc;if(l2<=0)continue;
    const fill=hn/(12*Math.sqrt(det));
    // Square or round stickers, seen at an angle, or half a tile split by a reflection:
    // compact and not too long. The lattice fit rejects the rest.
    if(l1/l2>7||fill<0.75||fill>1.25)continue;
    blob.area=hn;blob.cx=cx;blob.cy=cy;blob.ok=true;
  }
  return {blobs:blobs.filter(b=>b.ok),labels:lab,dark,W,H,grooveT:gT};
}

// ---------- stage 2: fit an n×n lattice ----------
// How many cells must land on a blob: three of a 2x2, six of a 3x3, eight of a 4x4.
function latticeNeed(n){return n===2?3:n===4?8:6;}
// Returns {ok, points:[n*n {x,y}] in reading order, spacing, matched, residual, confidence} or {ok:false, reason}.
function fitLattice(blobs,n){
  n=n||3;const need=latticeNeed(n),span=n-1;
  if(blobs.length<Math.min(need,4))return {ok:false,reason:'few'};
  const P=blobs.map(b=>[b.cx,b.cy]);
  // Shortest basis for the lattice that u and v make (Lagrange reduction).
  const reduce=(u,v)=>{for(let k=0;k<8;k++){if(u[0]*u[0]+u[1]*u[1]>v[0]*v[0]+v[1]*v[1])[u,v]=[v,u];const m=Math.round((u[0]*v[0]+u[1]*v[1])/(u[0]*u[0]+u[1]*u[1]));if(!m)break;v=[v[0]-m*u[0],v[1]-m*u[1]];}return [u,v];};
  const score=(o,u,v,area)=>{
    const det=u[0]*v[1]-u[1]*v[0];if(Math.abs(det)<1)return null;
    const pts=[];
    for(let k=0;k<P.length;k++){
      const b=blobs[k];if(b.area>area*2.5||b.area<area/2.5)continue;
      const dx=P[k][0]-o[0],dy=P[k][1]-o[1];
      const s=(dx*v[1]-dy*v[0])/det,t=(u[0]*dy-u[1]*dx)/det,ri=Math.round(s),rj=Math.round(t);
      const e=Math.hypot(s-ri,t-rj);
      if(e<0.22&&Math.abs(ri)<=span&&Math.abs(rj)<=span)pts.push({k,i:ri,j:rj,e});
    }
    let best=null;
    for(let i0=-span;i0<=0;i0++)for(let j0=-span;j0<=0;j0++){
      const inw=pts.filter(p=>p.i>=i0&&p.i<=i0+span&&p.j>=j0&&p.j<=j0+span);
      // One blob per cell; keep the closest.
      const cell=new Map();for(const p of inw){const key=p.i*16+p.j,q=cell.get(key);if(!q||p.e<q.e)cell.set(key,p);}
      const ps=[...cell.values()];if(ps.length<Math.min(need,4))continue;
      const is=new Set(ps.map(p=>p.i)),js=new Set(ps.map(p=>p.j));
      if(is.size<n||js.size<n)continue; // the matches must reach every row and column
      const err=ps.reduce((a,p)=>a+p.e,0)/ps.length;
      if(!best||ps.length>best.ps.length||(ps.length===best.ps.length&&err<best.err))best={ps,err,i0,j0};
    }
    return best;
  };
  let best=null;
  for(let a=0;a<P.length;a++){
    const near=[];
    for(let b=0;b<P.length;b++){if(b===a)continue;const r=blobs[b].area/blobs[a].area;if(r>2.5||r<0.4)continue;near.push([Math.hypot(P[b][0]-P[a][0],P[b][1]-P[a][1]),b]);}
    near.sort((x,y)=>x[0]-y[0]);const nb=near.slice(0,6).map(x=>x[1]);
    const side=Math.sqrt(blobs[a].area);
    for(let x=0;x<nb.length;x++)for(let y=x+1;y<nb.length;y++){
      let u=[P[nb[x]][0]-P[a][0],P[nb[x]][1]-P[a][1]],v=[P[nb[y]][0]-P[a][0],P[nb[y]][1]-P[a][1]];
      [u,v]=reduce(u,v);
      const lu=Math.hypot(...u),lv=Math.hypot(...v);
      if(lu<0.9*side||lv>2.6*side||lv/lu>1.7)continue;
      if(Math.abs(u[0]*v[1]-u[1]*v[0])/(lu*lv)<0.6)continue;
      const r=score(P[a],u,v,blobs[a].area);
      if(r&&(!best||r.ps.length>best.r.ps.length||(r.ps.length===best.r.ps.length&&r.err<best.r.err)))best={r,o:P[a],u,v};
    }
  }
  if(!best)return {ok:false,reason:'nogrid'};
  // Least-squares affine map from cell (i,j) to frame (x,y) over the matched blobs.
  const ps=best.r.ps,i0=best.r.i0,j0=best.r.j0;
  const fit=lsAffine(ps.map(p=>[p.i-i0,p.j-j0,P[p.k][0],P[p.k][1]]));
  if(!fit)return {ok:false,reason:'fit'};
  let [ox,ux,vx,oy,uy,vy]=fit;let u=[ux,uy],v=[vx,vy],o=[ox,oy];
  // Reading order must not be mirrored: u goes right-ish, v goes down-ish, u x v > 0.
  if(u[0]*v[1]-u[1]*v[0]<0)[u,v]=[v,u];
  const map=(i,j)=>[o[0]+i*u[0]+j*v[0],o[1]+i*u[1]+j*v[1]];
  // Of the four turns of the reading, pick the one whose top row runs most to the right.
  const grid=[];for(let j=0;j<n;j++)for(let i=0;i<n;i++){const q=map(i,j);grid.push({x:q[0],y:q[1]});}
  let points=grid,bestx=-Infinity;
  for(let k=0;k<4;k++){const g=rotateFace(grid,k),dx=g[n-1].x-g[0].x;if(dx>bestx){bestx=dx;points=g;}}
  // Residual in cell units.
  const lu=Math.hypot(...u),lv=Math.hypot(...v);
  let res=0;for(const p of ps){const [c,r]=[p.i-i0,p.j-j0];const q=[ox+c*ux+r*vx,oy+c*uy+r*vy];res+=Math.hypot(q[0]-P[p.k][0],q[1]-P[p.k][1]);}
  res/=ps.length*Math.min(lu,lv);
  const matched=ps.length;
  // Three blobs fix a 2x2 lattice exactly, so the residual says nothing. Ask instead for a
  // square lattice at sticker spacing: a blob is smaller than its tile, so the spacing is
  // about one and a half blob widths.
  if(n===2&&matched<4){
    const side=Math.sqrt(ps.reduce((a,p)=>a+blobs[p.k].area,0)/ps.length),sin=Math.abs(u[0]*v[1]-u[1]*v[0])/(lu*lv);
    const sq=Math.max(lu,lv)/Math.min(lu,lv)<1.4&&sin>0.9&&lu/side>1&&lu/side<1.75&&lv/side>1&&lv/side<1.75;
    if(!sq)return {ok:false,reason:'nogrid'};
  }
  return {ok:matched>=need&&res<0.15,reason:matched<need?'cover':res>=0.15?'residual':'',points,spacing:Math.min(lu,lv),matched,residual:res,confidence:Math.max(0,Math.min(1,(matched-need+1)/(n*n-need+1)*(1-res/0.15)))};
}
// Least squares x = o + i*u + j*v for rows [i,j,x,y]. Returns [ox,ux,vx,oy,uy,vy].
function lsAffine(rows){
  const M=[[0,0,0],[0,0,0],[0,0,0]],bx=[0,0,0],by=[0,0,0];
  for(const [i,j,x,y] of rows){const f=[1,i,j];for(let a=0;a<3;a++){for(let b=0;b<3;b++)M[a][b]+=f[a]*f[b];bx[a]+=f[a]*x;by[a]+=f[a]*y;}}
  const sx=solve3(M,bx),sy=solve3(M,by);return sx&&sy?[...sx,...sy]:null;
}
function solve3(M,b){
  const a=M.map((r,i)=>[...r,b[i]]);
  for(let c=0;c<3;c++){let p=c;for(let r=c+1;r<3;r++)if(Math.abs(a[r][c])>Math.abs(a[p][c]))p=r;if(Math.abs(a[p][c])<1e-9)return null;[a[c],a[p]]=[a[p],a[c]];
    for(let r=0;r<3;r++){if(r===c)continue;const f=a[r][c]/a[c][c];for(let k=c;k<4;k++)a[r][k]-=f*a[c][k];}}
  return [0,1,2].map(i=>a[i][3]/a[i][i]);
}

// ---------- stage 3: read colors ----------
// Median linear RGB in a small disc at each point. Glare and sticker edges stay out of the median.
// Glare is bright and gray. When a fair share of the disc is saturated, only those pixels count.
// inner: optional per-point inner radius. The center cell often carries a logo, so it is read in a ring.
function sampleDiscs(img,points,radius,inner){
  const W=img.width,H=img.height,d=img.data,out=[];
  const med=a=>{if(!a.length)return 0;a.sort((x,y)=>x-y);return a[a.length>>1];};
  points.forEach((p,n)=>{
    const ri=inner&&inner[n]||0,r=Math.max(1.5,ri?ri+Math.max(1.5,radius-ri):radius);
    const all=[],sat=[];
    for(let y=Math.floor(p.y-r);y<=Math.ceil(p.y+r);y++)for(let x=Math.floor(p.x-r);x<=Math.ceil(p.x+r);x++){
      const q=(x-p.x)**2+(y-p.y)**2;
      if(x<0||y<0||x>=W||y>=H||q>r*r||q<ri*ri)continue;const j=4*(y*W+x);
      const px=[SRGB_LIN[d[j]],SRGB_LIN[d[j+1]],SRGB_LIN[d[j+2]]];all.push(px);
      const l=linToLab(...px);if(Math.hypot(l[1],l[2])>22)sat.push(px);
    }
    const use=sat.length>=0.3*all.length?sat:all;
    out.push([0,1,2].map(c=>med(use.map(q=>q[c]))));
  });
  return out;
}
function colorDist(l1,l2){return Math.sqrt(0.35*(l1[0]-l2[0])**2+(l1[1]-l2[1])**2+(l1[2]-l2[2])**2);}
// Classify linear RGB samples against the references. The light tint is unknown, so fit per-channel
// gains that pull the samples onto their nearest references, then classify again. With no
// opts.refs and no opts.style (or 'auto'), both reference sets are tried and the one with the
// lower total distance over the face is kept; the result names it as `style`.
// Returns {colors, margins, dists, gains, style}.
function classifySamples(samples,opts){
  opts=opts||{};
  if(!opts.refs){
    const style=opts.style&&SCAN_STYLES[opts.style]?opts.style:'';
    if(style)return Object.assign(classifySamples(samples,Object.assign({},opts,{refs:SCAN_STYLES[style]})),{style});
    let best=null;
    for(const s of Object.keys(SCAN_STYLES)){const r=classifySamples(samples,Object.assign({},opts,{refs:SCAN_STYLES[s]})),d=r.dists.reduce((a,x)=>a+x,0);
      if(!best||d<best.d)best={r,d,s};}
    return Object.assign(best.r,{style:best.s});
  }
  const refs=opts.refs,refLab=refs.map(r=>linToLab(...r));
  let g=opts.gains?opts.gains.slice():[1,1,1];
  // A bright, low-chroma sample is most likely white: use it to start the gains.
  if(!opts.gains){
    let w=null,wl=0;for(const s of samples){const l=linToLab(...s);if(Math.hypot(l[1],l[2])<30&&l[0]>wl){wl=l[0];w=s;}}
    if(w&&wl>45){const m=(w[0]+w[1]+w[2])/3;g=w.map(c=>c>1e-4?m/c:1);}
  }
  const norm=g=>{const m=Math.cbrt(g[0]*g[1]*g[2]);return g.map(x=>Math.min(1.6,Math.max(0.6,x/m)));};g=norm(g);
  let res;
  for(let it=0;it<4;it++){
    res=samples.map(s=>{
      const l=linToLab(s[0]*g[0],s[1]*g[1],s[2]*g[2]);
      const ds=refLab.map(r=>colorDist(l,r));const order=ds.map((d,i)=>i).sort((a,b)=>ds[a]-ds[b]);
      return {c:order[0],d1:ds[order[0]],d2:ds[order[1]]};
    });
    // Gains that match chromaticity only; overall brightness is left to the camera.
    const num=[0,0,0],den=[0,0,0];
    samples.forEach((s,k)=>{const r=refs[res[k].c];const ss=s[0]+s[1]+s[2],rs=r[0]+r[1]+r[2];if(ss<1e-3)return;for(let c=0;c<3;c++){const a=s[c]/ss,b=r[c]/rs;num[c]+=a*b;den[c]+=a*a;}});
    const lam=0.02; // pulls the gains toward 1 when the face has few colors
    const ng=norm([0,1,2].map(c=>(num[c]+lam)/(den[c]+lam)));
    if(Math.max(...ng.map((x,c)=>Math.abs(x-g[c])))<0.005){g=ng;break;}
    g=ng;
  }
  return {colors:res.map(r=>r.c),margins:res.map(r=>r.d2-r.d1),dists:res.map(r=>r.d1),gains:g};
}
// Stages 1-3 on one frame. opts.n is the face size (3 unless given).
// Returns {ok, n, colors, margins, points, lattice, blobs, reason}.
function readFace(img,opts){
  opts=opts||{};const n=opts.n||3;
  const st1=findBlobs(img,opts),lat=fitLattice(st1.blobs,n);lat.grooveT=st1.grooveT;
  if(!lat.ok)return {ok:false,n,reason:lat.reason,blobs:st1.blobs,lattice:lat};
  // On a 2x2 a cell with no blob must still sit on a lit sticker, inside the frame: most of
  // the disc read there must be neither plastic nor a groove. A glare ring is a small share.
  if(n===2&&lat.matched<4)for(const p of lat.points){
    const r=Math.max(2,lat.spacing*0.3),x0=Math.round(p.x),y0=Math.round(p.y);let lit=0,all=0;
    if(x0<r||y0<r||x0>=img.width-r||y0>=img.height-r)return {ok:false,n,reason:'nogrid',blobs:st1.blobs,lattice:lat};
    for(let y=y0-r;y<=y0+r;y++)for(let x=x0-r;x<=x0+r;x++){if((x-x0)**2+(y-y0)**2>r*r)continue;all++;if(!st1.dark[y*img.width+x])lit++;}
    if(lit<0.6*all)return {ok:false,n,reason:'nogrid',blobs:st1.blobs,lattice:lat};
  }
  // The 3x3 center often carries a logo, so it is read in a ring.
  const sp=lat.spacing,inner=new Array(n*n).fill(0);if(n===3)inner[4]=sp*0.3;
  const samples=sampleDiscs(img,lat.points,sp*0.3,inner);
  const cl=classifySamples(samples,opts);
  return {ok:true,n,colors:cl.colors,margins:cl.margins,gains:cl.gains,style:cl.style,samples,points:lat.points,lattice:lat,blobs:st1.blobs};
}

// ---------- stage 4: vote across frames ----------
// Pure state machine. Feed it readFace results; it locks a face when every cell agrees
// over a run of frames. Locked faces keep the reading orientation of their frames.
// On the 3x3 the center color names the face. The 2x2 and the 4x4 have no fixed centers,
// so a face is named by a number in the order it was read, and a reading belongs to the
// face it agrees with: most cells for the face in view now, every cell for a face read
// before (a retake). A reading that agrees with no face starts a new one.
function makeVoter(opts){
  opts=Object.assign({n:3,window:10,need:7,lead:3,switchAfter:2},opts||{});
  const cells=opts.n*opts.n;
  return {opts,n:opts.n,cells,faces:{},order:[],center:-1,run:[],pending:-1,pendingReads:[],justLocked:-1,conflict:-1,next:0,
    // Cells a reading must share with the face in view to count as that face.
    same:Math.ceil(0.75*cells)};
}
// How many cells two readings share at their best turn, and that turn: [count, k].
function agreeCount(ref,r){
  let best=-1,bk=0;
  for(let k=0;k<4;k++){const t=rotateFace(r,k);let n=0;for(let i=0;i<ref.length;i++)if(t[i]===ref[i])n++;if(n>best){best=n;bk=k;}}
  return [best,bk];
}
// Turn reading r to agree best with the reference reading.
function alignReading(ref,r){return agreeCount(ref,r)[1];}
// Which face a reading belongs to when faces have no center.
function freeKey(v,cols){
  const ref=v.run.length?voteTally(v).colors:v.center>=0&&v.faces[v.center]?v.faces[v.center].stickers:null;
  if(ref&&agreeCount(ref,cols)[0]>=v.same)return v.center;
  for(const id of v.order)if(agreeCount(v.faces[id].stickers,cols)[0]===v.cells)return id;
  if(v.pending>=0&&agreeCount(v.pendingReads[0].colors,cols)[0]>=v.same)return v.pending;
  return v.next++;
}
// Current winner per cell for the run: {colors, counts, lead, ready}.
function voteTally(v){
  const colors=[],counts=[];let ready=v.run.length>=v.opts.window;
  for(let i=0;i<v.cells;i++){
    const c=[0,0,0,0,0,0];for(const r of v.run)c[r.colors[i]]++;
    const order=[0,1,2,3,4,5].sort((a,b)=>c[b]-c[a]);colors.push(order[0]);counts.push(c[order[0]]);
    if(c[order[0]]<v.opts.need||c[order[0]]-c[order[1]]<v.opts.lead)ready=false;
  }
  return {colors,counts,ready,n:v.run.length};
}
// Add one frame. Returns {event:'none'|'reading'|'locked'|'held'|'conflict', center, tally}.
// center is the face's key: its center color on the 3x3, its number otherwise.
function voteFrame(v,read,key){
  if(!read||!read.ok)return {event:'none',center:v.center};
  const c=key!=null?key:v.n===3?read.colors[4]:freeKey(v,read.colors);
  if(c!==v.center){
    // A new face must hold for a few frames before the tally moves to it.
    if(c===v.pending)v.pendingReads.push(read);else{v.pending=c;v.pendingReads=[read];}
    if(v.pendingReads.length<v.opts.switchAfter)return {event:'none',center:v.center};
    const reads=v.pendingReads;v.center=c;v.run=[];v.pending=-1;v.pendingReads=[];
    if(c!==v.justLocked)v.justLocked=-1;
    if(c!==v.conflict)v.conflict=-1;
    // Count the frames that confirmed the switch.
    let ev;for(const r of reads)ev=voteFrame(v,r,c);return ev;
  }
  v.pending=-1;v.pendingReads=[];
  // After a lock, the same face stays in view until the user turns the cube. Do not lock it again.
  if(c===v.justLocked)return {event:v.conflict===c?'conflict':'held',center:c};
  const cells=v.cells;
  let cols=read.colors,margins=read.margins||new Array(cells).fill(0);
  const g=read.gains||[1,1,1];let lab=read.samples?read.samples.map(s=>linToLab(s[0]*g[0],s[1]*g[1],s[2]*g[2])):null;
  if(v.run.length){const k=alignReading(voteTally(v).colors,cols);cols=rotateFace(cols,k);margins=rotateFace(margins,k);if(lab)lab=rotateFace(lab,k);}
  v.run.push({colors:cols,margins,lab});if(v.run.length>v.opts.window)v.run.shift();
  const t=voteTally(v);
  if(!t.ready)return {event:'reading',center:c,tally:t};
  // Lock. A retake keeps the user's pinned stickers, turned to match the new reading.
  // A face the dialog filled in before any read (read:false, the state the guide expects) is
  // replaced by the camera's reading, its painted stickers kept.
  const old=v.faces[c];let stickers=t.colors.slice(),pinned=new Array(cells).fill(false);
  if(old&&v.n===3&&old.read!==false){
    // A retake must look like the face read before. If not, a center was misread (a logo, say),
    // and the new face must not overwrite the old one.
    const k=alignReading(stickers,old.stickers),os=rotateFace(old.stickers,k);
    let same=0;for(let i=0;i<9;i++)if(i!==4&&os[i]===stickers[i])same++;
    if(same<5){v.run=[];v.justLocked=c;v.conflict=c;return {event:'conflict',center:c,tally:t};}
  }
  const margin=[],labs=[];
  for(let i=0;i<cells;i++){
    const agree=v.run.filter(r=>r.colors[i]===stickers[i]);
    margin.push(agree.reduce((a,r)=>a+r.margins[i],0)/Math.max(1,agree.length));
    // Mean color of the agreeing frames, for the joint read in stage 5.
    const ls=agree.filter(r=>r.lab).map(r=>r.lab[i]);
    labs.push(ls.length?[0,1,2].map(c=>ls.reduce((a,l)=>a+l[c],0)/ls.length):null);
  }
  if(old&&old.pinned.some(Boolean)){
    const k=alignReading(stickers,old.stickers),os=rotateFace(old.stickers,k),op=rotateFace(old.pinned,k);
    for(let i=0;i<cells;i++)if(op[i]){stickers[i]=os[i];pinned[i]=true;}
  }
  v.faces[c]={stickers,pinned,margins:margin,lab:labs.every(Boolean)?labs:null,read:true};v.run=[];v.justLocked=c;v.conflict=-1;
  if(!old)v.order.push(c);
  return {event:'locked',center:c,retake:!!old&&old.read!==false,tally:t};
}
// Forget a locked face: a seventh one that fit nowhere.
function voteDrop(v,id){delete v.faces[id];v.order=v.order.filter(x=>x!==id);if(v.justLocked===id)v.justLocked=-1;if(v.center===id)v.center=-1;}

// ---------- UI ----------
// The Read my cube dialog: the camera fills the net face by face, and the palette beside the net
// paints one sticker at a time (a painted sticker is pinned: the camera does not change it). The
// dialog's markup is built from this module's own fixed strings, the face size and the color
// names; nothing from outside goes into it.
//
// On the 3x3 five faces go to stage 5 as soon as they are read (assembleScan works the sixth out
// where it can, and names the face to show where it cannot); the 2x2 and the 4x4 need all six.
// A cube read puts a card over the dialog (scanConfirm): the net again, Use this cube on Enter,
// Back on Escape to the dialog as it stands, Next fit when more than one cube fits. On a phone
// the dialog's own button sits under the net and is easy to miss; the card is not.
//
// A refresh scan (opts.resync, from the F2L guide): the net starts as the state the guide expects
// (the first base), dimmed. The user shows a face, or paints the stickers that differ. Each face
// read or touched goes to resyncFind over the bases; one candidate left is the cube found. Set up
// from current and Return to scramble hand it to opts.onCube(cube, how, info). With six faces
// given and no candidate near the bases, the faces go through assembleScan as a full read.
let scanStream=null,scanTimer=0,scanVoter=null,scanRes=null,scanWork=null,scanLast=null,scanN=3,scanOnCube=null,scanOnClose=null,scanColor=0,scanResync=null;
// The palette: white, yellow, green, blue, red, orange. Keys 1 to 6 pick these in order (the
// painter's order, PAINT_PALETTE in js/paint.js).
const SCAN_PALETTE=[{c:0,label:'white'},{c:3,label:'yellow'},{c:2,label:'green'},{c:5,label:'blue'},{c:1,label:'red'},{c:4,label:'orange'}];
// The working frame: 320 px wide, 480 for the 4x4 so its small tiles keep their grooves.
function scanWidth(n){return n===4?480:320;}
// The sticker style the user pinned: 'auto' (the default), 'stickers' or 'stickerless'. cw:scanStyle.
function scanStyle(){const s=store.get('scanStyle','auto');return SCAN_STYLES[s]?s:'auto';}
function scanSetStyle(s){store.set('scanStyle',SCAN_STYLES[s]?s:'auto');$$('#scanStyle button').forEach(b=>b.classList.toggle('on',b.dataset.s===scanStyle()));}
// Open the scanner for the current puzzle, or for opts.n (2, 3 or 4). With opts.onCube, Use this
// cube hands the Cube to it and closes, instead of loading a scramble; opts.onClose is called
// when the dialog closes any other way (the Smart cube dialog, which opens again). opts.resync
// ({bases}, engine-frame cubes as resyncBases gives them) makes it a refresh scan of a 3x3.
function openScan(opts){
  if($('#scanBg'))return;
  opts=opts||{};
  scanN=opts.n||(typeof puzzleN==='function'?puzzleN():3);scanOnCube=opts.onCube||null;scanOnClose=opts.onClose||null;
  scanResync=scanN===3&&opts.resync&&opts.resync.bases&&opts.resync.bases.length&&typeof resyncFind==='function'?{bases:opts.resync.bases,full:false}:null;
  scanVoter=makeVoter({n:scanN});scanRes=null;scanLast=null;scanColor=0;
  const free=scanN!==3,re=!!scanResync;
  const bg=document.createElement('div');bg.className='modal-bg scan-bg';bg.id='scanBg';
  const swatches=SCAN_PALETTE.map((p,i)=>`<button type="button" class="pt-swatch${p.c===scanColor?' on':''}" data-c="${p.c}" aria-label="${p.label}" title="${cap(p.label)}: key ${i+1}" style="background:${stickerColor(p.c)}"></button>`).join('');
  bg.innerHTML=`<div class="modal scan" role="dialog" aria-label="Read my cube">
   <button class="close small ghost" id="scanClose" aria-label="Close" title="Close this window (Esc)">✕</button>
   <h2>${re?'Read my cube':'Scan cube'}</h2>
   <p class="muted" style="margin-top:0">${re?'The net shows the cube the guide expects. Show the camera a face that differs, or pick a color and paint the stickers that differ. Two or three faces are usually enough; start with the top.'
     :`Hold one face of the ${scanN}×${scanN} to the camera and keep it still. When the face is read, turn the cube to show the next face. You can show the faces in any order and at any angle.${free?` A ${scanN}×${scanN} has no fixed centers, so I work out where each face goes once all six are read.`:' Five faces are usually enough: I work out the sixth from them, and I ask for it when they do not settle it.'}`} A glossy cube reflects the screen. If the read jumps, tilt the cube a little or dim the screen.</p>
   <div class="scan-grid">
    <div><div class="scan-view mirror" id="scanView"><video id="scanVideo" autoplay playsinline muted></video><canvas id="scanOverlay"></canvas></div>
     <div class="scan-row"><label title="Flip the camera preview left to right, as a mirror does"><input type="checkbox" id="scanMirror" checked> Mirror</label><span class="muted" style="font-size:13px">Mirror flips the preview only.</span></div>
     <div class="scan-row"><span class="muted" style="font-size:13px">Sticker style</span><div class="status-sel" id="scanStyle" role="group" aria-label="Sticker style"><button type="button" data-s="auto" title="Try both sets of colors and keep the nearer">Auto</button><button type="button" data-s="stickers" title="Printed stickers">Stickers</button><button type="button" data-s="stickerless" title="Colored plastic, as on a GAN cube">Stickerless</button></div><span class="muted" style="font-size:13px">Auto keeps the set of colors the face sits nearer.</span></div></div>
    <div><div class="scan-net" id="scanNet"></div>
     <div class="scan-row scan-pal" id="scanPal" role="group" aria-label="Paint colors">${swatches}</div>
     <p class="muted" style="font-size:13px;margin:6px 0">Pick a color, then click a sticker to paint it. Keys 1 to 6 pick a color. A painted sticker stays fixed.</p>
     <div class="scan-row"><button class="primary" id="scanUse" disabled title="${re?'Your cube as it is becomes the scramble':'Load a scramble that gives the cube as the net shows it'}">${re?'Set up from current':'Use this cube'}</button><button class="${re?'':'hidden'}" id="scanReturn" disabled title="The moves that bring your cube back to the scramble">Return to scramble</button><button class="small ghost hidden" id="scanNextFit" title="The faces fit together another way: show the next one">Next fit</button><button class="small ghost" id="scanReset" title="Forget every face read and scan from the start">Start again</button><button class="small ghost hidden" id="scanSave" title="Save the frames of each face read, for the scanner tests">Save frames</button></div></div>
   </div>
   <div id="scanStatus" class="notice">Asking for camera access.</div>
  </div>`;
  document.body.appendChild(bg);
  bg.addEventListener('click',e=>{if(e.target===bg)closeScan();});
  $('#scanClose').onclick=closeScan;
  $('#scanMirror').onchange=e=>$('#scanView').classList.toggle('mirror',e.target.checked);
  $('#scanUse').onclick=()=>scanUse(re&&!scanResync.full?'setup':'use');
  $('#scanReturn').onclick=()=>scanUse('return');
  $('#scanNextFit').onclick=scanNextFit;
  $('#scanReset').onclick=scanRestart;
  $('#scanStyle').addEventListener('click',e=>{const b=e.target.closest('button[data-s]');if(b)scanSetStyle(b.dataset.s);});
  $('#scanPal').addEventListener('click',e=>{const b=e.target.closest('button[data-c]');if(b)scanPick(+b.dataset.c);});
  $('#scanNet').addEventListener('click',scanNetClick);
  document.addEventListener('keydown',scanKeys,true);
  scanSetStyle(scanStyle());
  if(re)scanExpect();
  if(typeof scanRecOpen==='function')scanRecOpen();
  drawNet();startCamera();
}
// Start again: an empty net, or the expected state again on a refresh scan.
function scanRestart(){
  scanVoter=makeVoter({n:scanN});scanRes=null;if(scanResync)scanResync.full=false;scanConfirmClose();
  $('#scanUse').disabled=true;$('#scanReturn').disabled=true;$('#scanNextFit').classList.add('hidden');
  if(scanResync){scanExpect();$('#scanUse').textContent='Set up from current';scanStatus('The net shows the cube the guide expects again. Show a face, or paint the stickers that differ.');}
  else scanStatus('Show a face to the camera.');
  drawNet();
}
// The expected state on the net: six faces not read, none pinned.
function scanExpect(){
  const f=scanResync.bases[0].cube.toFacelets();
  for(let c=0;c<6;c++){scanVoter.faces[c]={stickers:f.slice(9*c,9*c+9),pinned:new Array(9).fill(false),margins:null,lab:null,read:false};if(!scanVoter.order.includes(c))scanVoter.order.push(c);}
}
function scanPick(c){scanColor=c;$$('#scanPal .pt-swatch').forEach(b=>b.classList.toggle('on',+b.dataset.c===c));}
function scanStatus(t){const e=$('#scanStatus');if(e)e.textContent=t;}
async function startCamera(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){scanStatus('This browser cannot use the camera on this page. Try another browser, or open Twistwright from its web address.'+(scanResync?' You can still paint the stickers that differ.':''));return;}
  try{
    // A phone or tablet points its rear camera at the cube; a computer uses its webcam.
    const rear=!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
    const s=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},facingMode:rear?{ideal:'environment'}:'user'},audio:false});
    if(!$('#scanBg')){s.getTracks().forEach(t=>t.stop());return;} // closed while the prompt was open
    // Mirror the preview for a camera that faces the user, not for a rear camera.
    const tr=s.getVideoTracks()[0],fm=tr&&tr.getSettings?tr.getSettings().facingMode:'';
    const mir=fm?fm==='user':!rear;
    $('#scanMirror').checked=mir;$('#scanView').classList.toggle('mirror',mir);
    scanStream=s;const v=$('#scanVideo');v.srcObject=s;await v.play().catch(()=>{});
    scanStatus(scanResync?'Show a face to the camera, or paint the stickers that differ.':'Show a face to the camera.');scanLoop();
  }catch(e){
    scanStatus(e.name==='NotAllowedError'?'The browser blocked the camera. Allow the camera for this site in the browser settings, then open the scanner again.'
      :e.name==='NotFoundError'?'Twistwright cannot find a camera. Connect one, then open the scanner again.':'The camera did not start. Close other apps that use the camera, then open the scanner again.');
  }
}
function stopCamera(){clearTimeout(scanTimer);scanTimer=0;if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null;}}
function closeScan(){document.removeEventListener('keydown',scanKeys,true);stopCamera();scanConfirmClose();scanOnCube=null;scanResync=null;const b=$('#scanBg');if(b)b.remove();const f=scanOnClose;scanOnClose=null;if(f)f();}
function scanKeys(e){
  if(!$('#scanBg'))return;
  if($('#scanOkBg')){ // the card: Enter uses the cube, Escape goes back to the dialog
    e.stopPropagation();
    if(e.key==='Escape'){e.preventDefault();scanConfirmClose();}else if(e.key==='Enter'){e.preventDefault();scanConfirmYes();}
    return;
  }
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeScan();return;}
  const k=+e.key;
  if(Number.isInteger(k)&&k>=1&&k<=6&&!e.metaKey&&!e.ctrlKey&&!e.altKey){e.preventDefault();e.stopPropagation();scanPick(SCAN_PALETTE[k-1].c);return;}
  e.stopPropagation(); // keep tab/timer keys out while the scanner is open
}
// Grab a downscaled frame. The pixels are never mirrored; only the preview is.
function grabFrame(v){
  const vw=v.videoWidth,vh=v.videoHeight;if(!vw||!vh)return null;
  const W=scanWidth(scanN),H=Math.round(W*vh/vw);
  if(!scanWork){scanWork=document.createElement('canvas');}
  if(scanWork.width!==W||scanWork.height!==H){scanWork.width=W;scanWork.height=H;}
  const g=scanWork.getContext('2d',{willReadFrequently:true});g.drawImage(v,0,0,W,H);
  return g.getImageData(0,0,W,H);
}
function scanLoop(){
  if(!$('#scanBg')||!scanStream)return;
  const v=$('#scanVideo'),t0=performance.now();
  if(v.readyState>=2){
    const img=grabFrame(v);
    if(img){const r=readFace(img,{n:scanN,style:scanStyle()});scanLast=r;if(typeof scanRecFrame==='function')scanRecFrame(img,r);drawOverlay(img,r);scanStep(r);}
  }
  scanTimer=setTimeout(scanLoop,Math.max(10,70-(performance.now()-t0)));
}
// The faces read or painted, in order: by center color on the 3x3, by the order read otherwise.
// On a refresh scan, a face the user has not shown or touched is only expected and does not count.
function scanFaceGiven(f){return !!f&&(f.read!==false||f.pinned.some(Boolean));}
function scanFaceIds(){return (scanN===3?[0,1,2,3,4,5]:scanVoter.order.slice()).filter(c=>scanFaceGiven(scanVoter.faces[c]));}
// "the white face" on the 3x3; "face 3" on a cube with no centers.
function scanFaceName(id){return scanN===3?`the ${COLOR_NAMES_E[id]} face`:`face ${scanVoter.order.indexOf(id)+1}`;}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}
// Which set of colors the last frame read as, for the status line.
function scanStyleNote(r){return r&&r.style&&scanStyle()==='auto'?` Read as ${r.style==='stickerless'?'stickerless plastic':'stickers'}.`:'';}
function scanStep(r){
  const ev=voteFrame(scanVoter,r),name=scanFaceName;
  const nLocked=scanFaceIds().length;
  if(ev.event==='locked'){
    if(typeof scanRecLock==='function')scanRecLock(ev.center,scanVoter.faces[ev.center].stickers);
    // Keep at most eight faces: a misread one may sit beside its retake until the fit drops it.
    if(scanN!==3&&scanVoter.order.length>8)voteDrop(scanVoter,scanVoter.order[0]);
    flashNet(ev.center);drawNet();
    if(scanResync)return scanRefresh(`${cap(name(ev.center))} is read.`);
    const count=scanFaceIds().length;
    if(count>6)return scanAssemble(`Another face is read: that makes ${count}, but a cube has six. One of them was misread, so I use the six that fit together.`,true);
    if(count===6||(count===5&&scanN===3))return scanAssemble(ev.retake?`${cap(name(ev.center))} is read again.`:'',true);
    const left=scanN===3?` Still to scan: ${[0,1,2,3,4,5].filter(c=>!scanFaceGiven(scanVoter.faces[c])).map(c=>COLOR_NAMES_E[c]).join(', ')}.`:` ${count} of 6 faces read.`;
    scanStatus(`${cap(name(ev.center))} is read${ev.retake?' again':''}. Turn the cube to show the next face.${left}${scanStyleNote(r)}`);
  }else if(ev.event==='conflict'){
    scanStatus(`This face has a ${COLOR_NAMES_E[ev.center]} center, but its other stickers differ from the ${COLOR_NAMES_E[ev.center]} face you showed before. Show the face again, or press Start again.`);
  }else if(ev.event==='reading'){
    scanStatus(`Hold still. Reading ${scanN===3?name(ev.center):'a face'}: ${ev.tally.n} of ${scanVoter.opts.window}.${scanStyleNote(r)}`);
  }else if(ev.event==='held'){
    if(nLocked<6&&!scanResync&&!scanRead())scanStatus(scanRes&&scanRes.need!=null?`${cap(name(ev.center))} is read. Show the ${COLOR_NAMES_E[scanRes.need]} face.`:`${cap(name(ev.center))} is read. Turn the cube to show the next face.`);
  }else if(!r.ok&&nLocked<6&&!scanVoter.run.length&&!(scanResync&&nLocked)&&!scanRead()){
    scanStatus(r.reason==='cover'?'I can see part of a face. Show the whole face, closer to the camera.':scanRes&&scanRes.need!=null?`Show the ${COLOR_NAMES_E[scanRes.need]} face to the camera.`:scanResync?'Show a face to the camera, or paint the stickers that differ. Keep your fingers off the stickers.':'Show a face to the camera. Keep your fingers off the stickers.');
  }
}
// A cube is read and can be used: the status stays with it while the camera sees nothing new.
function scanRead(){return !!(scanRes&&scanRes.ok&&scanRes.cube);}
// A refresh scan: the faces given so far against the states the guide expects. Fills scanRes with
// {ok, cube, found:{off, at, moves}} when one candidate is left.
function scanRefresh(prefix){
  const faces={};let given=0;
  for(let c=0;c<6;c++){const f=scanVoter.faces[c];if(scanFaceGiven(f)){faces[c]=f.stickers;given++;}}
  scanRes=null;scanResync.full=false;$('#scanUse').disabled=true;$('#scanReturn').disabled=true;$('#scanNextFit').classList.add('hidden');$('#scanUse').textContent='Set up from current';
  const pre=prefix?prefix+' ':'';
  if(!given){drawNet();return scanStatus(pre+'Show a face to the camera, or paint the stickers that differ.');}
  const r=resyncFind(scanResync.bases,faces);
  if(r.unique){
    const c=r.candidates[0],off=c.moves.length;
    scanRes={ok:true,cube:c.cube,facelets:c.cube.toFacelets(),found:{off,at:c.at,moves:c.moves},fits:[],changes:[],errors:[]};
    $('#scanUse').disabled=false;$('#scanReturn').disabled=false;drawNet();
    return scanStatus(pre+`Found it: your cube is ${off?`${off} move${off===1?'':'s'} off the hint`:'on the hint'}. Press Set up from current to go on from here, or Return to scramble for the way back.`);
  }
  drawNet();
  if(r.candidates.length){
    const k=r.candidates.length;
    return scanStatus(pre+`${k} states fit so far. ${r.ask!=null?`Show the ${COLOR_NAMES_E[r.ask]} face.`:'Show another face.'}`);
  }
  if(given>=5){scanResync.full=true;$('#scanUse').textContent='Use this cube';return scanAssemble(pre+'No state near the hint fits these faces, so I read the whole cube.');}
  scanStatus(pre+`No state within ${r.depth} moves of the hint fits these faces. Show another face; with five, I read the whole cube.`);
}
// Stage 5 on the locked faces: six of them, or five of a 3x3. Fills scanRes: {ok, cube, facelets,
// slots:[{id,k}] per side, fits:[{cube, facelets, slots}], pick, changes, errors, ambiguous,
// deduced (the face worked out from five), need (the face to show next)}.
// A cube read brings the card up (scanConfirm): always from the camera (cam), and from a paint
// on the net only when the cube read is new.
function scanAssemble(prefix,cam){
  const ids=scanFaceIds(),faces=ids.map(id=>scanVoter.faces[id]),was=scanRead()?scanRes.facelets.join():'';
  if(faces.length<(scanN===3?5:6)){scanRes=null;$('#scanUse').disabled=true;$('#scanNextFit').classList.add('hidden');scanConfirmClose();drawNet();return;}
  if(scanN===3){
    const r=assembleScan(faces),toFit=f=>({cube:f.cube,facelets:f.facelets,slots:f.rotations.map((k,c)=>({id:c,k}))});
    scanRes=Object.assign(r,{pick:0,fits:r.ok?r.fits.map(toFit):[]});
    if(r.ok)Object.assign(scanRes,scanRes.fits[0]);else scanRes.slots=null;
  }else{
    const r=assembleFree(faces,scanN),toIds=f=>({cube:f.cube,facelets:f.facelets,slots:f.slots.map(s=>s&&{id:ids[s.face],k:s.k})});
    scanRes=Object.assign(r,{pick:0,fits:r.ok?r.fits.map(toIds):[]});
    if(r.ok){
      Object.assign(scanRes,scanRes.fits[0]);
      // A face that fit nowhere was a misread; its retake took its place.
      ids.forEach((id,i)=>{if(!r.used.includes(i))voteDrop(scanVoter,id);});
    }
  }
  $('#scanNextFit').classList.toggle('hidden',scanRes.fits.length<2);
  $('#scanUse').disabled=!scanRead();$('#scanReturn').disabled=!scanRead();drawNet();
  const pre=prefix?prefix+' ':'';
  if(!scanRes.ok){scanConfirmClose();return scanStatus(pre+scanRes.errors.join(' ')+(faces.length>=6?' Click a sticker on the net to fix it, or show a face again to rescan it.':''));}
  let t=scanRes.deduced!=null?`Five faces are read. I worked out the ${COLOR_NAMES_E[scanRes.deduced]} face from them: check it on the net. If it is wrong, show it to the camera. `:'All six faces are read and the cube fits together. ';
  if(scanRes.changes.length)t+=scanRes.changes.join(' ')+' Check the net. ';
  if(scanRes.fits.length>1)t+=`${scanRes.fits.length} different cubes fit these faces. Check the net against your cube. If it is not your cube, press Next fit. `;
  else if(scanRes.ambiguous)t+='More than one reading fits. Check the net. ';
  scanStatus(pre+t+(scanRes.cube?'Press Use this cube.':`Twistwright cannot load a ${scanN}×${scanN} yet.`));
  if(scanRead()&&(cam||scanRes.facelets.join()!==was))scanConfirm(t.trim());
}
// Show the next of several cubes that fit the same faces.
function scanNextFit(){
  if(!scanRes||!scanRes.ok||scanRes.fits.length<2)return;
  scanRes.pick=(scanRes.pick+1)%scanRes.fits.length;Object.assign(scanRes,scanRes.fits[scanRes.pick]);
  $('#scanUse').disabled=!scanRes.cube;drawNet();
  const t=`Fit ${scanRes.pick+1} of ${scanRes.fits.length}. Check the net against your cube.`;
  scanStatus(t+(scanRes.cube?' If it is your cube, press Use this cube.':''));
  const card=$('#scanOkText');if(card)card.textContent=t+' If it is not, press Next fit.';
}
// The card over the dialog once a cube is read: the net again, so the cube can be checked where
// the card is, Use this cube (Enter), Back (Escape) to the dialog as it stands, and Next fit when
// more than one cube fits. The text is the status line's: this module's fixed strings, color
// names and counts.
function scanConfirm(text){
  scanConfirmClose();
  if(!scanRead())return;
  const bg=document.createElement('div');bg.className='modal-bg ask-bg scan-ok';bg.id='scanOkBg';
  bg.innerHTML=`<div class="modal ask" role="alertdialog" aria-modal="true" aria-labelledby="scanOkTitle" aria-describedby="scanOkText">
   <h2 id="scanOkTitle">Is this your cube?</h2>
   <p id="scanOkText" class="muted">${text}</p>
   <div class="scan-net scan-oknet" id="scanOkNet"></div>
   <div class="row" style="justify-content:flex-end;margin-top:14px"><button id="scanOkBack" title="Back to the scan: paint a sticker, or show a face again">Back<span class="hk">Esc</span></button><button class="small ghost${scanRes.fits.length>1?'':' hidden'}" id="scanOkNext" title="The faces fit together another way: show the next one">Next fit</button><button class="primary" id="scanOkYes" title="${scanResync&&!scanResync.full?'Your cube as it is becomes the scramble':'Load a scramble that gives the cube as the net shows it'}">Use this cube<span class="hk">Enter</span></button></div>
  </div>`;
  document.body.appendChild(bg);
  bg.addEventListener('click',e=>{if(e.target===bg)scanConfirmClose();});
  $('#scanOkBack').onclick=scanConfirmClose;$('#scanOkNext').onclick=scanNextFit;$('#scanOkYes').onclick=scanConfirmYes;
  drawNet();
  setTimeout(()=>{const b=$('#scanOkYes');if(b)b.focus();},20);
}
function scanConfirmClose(){const e=$('#scanOkBg');if(e)e.remove();}
function scanConfirmYes(){scanConfirmClose();scanUse(scanResync&&!scanResync.full?'setup':'use');}
// how: 'use' (a full read), 'setup' or 'return' (a refresh scan). opts.onCube gets (cube, how, info):
// info.off is the moves off the hint when the resync found the cube, info.full says a full read.
function scanUse(how){
  if(!scanRes||!scanRes.ok||!scanRes.cube)return;
  if(scanOnCube){const f=scanOnCube,c=scanRes.cube,info={off:scanRes.found?scanRes.found.off:null,full:!scanRes.found};scanOnClose=null;closeScan();f(c,how,info);return;}
  const r=scrambleFromCube(scanRes.cube,customName('scan'));
  if(r.ok)closeScan();else scanStatus(r.errors.join(' '));
}
// The net: U on top, L F R B across, D below. Before all six faces fit, each face shows as read:
// at its center's side on the 3x3, in the order read otherwise. Once the cube fits (or is found),
// the net shows the cube itself, so a repaired sticker shows repaired.
// A face worked out from the other five (scanRes.deduced) has no reading behind it: it shows the
// cube's stickers, dashed, and takes no paint (`worked`). On a refresh scan the face the guide
// expected stands behind it and still takes paint.
function netSlot(slot){
  let id,k=0;
  if(scanRes&&scanRes.ok){const s=scanRes.slots?scanRes.slots[slot]:{id:slot,k:0};if(!s)return null;id=s.id;k=s.k;}
  else id=scanN===3?slot:scanVoter.order[slot];
  const f=id==null?null:scanVoter.faces[id],worked=!!(scanRes&&scanRes.ok&&scanRes.deduced===id);
  if(!f&&!worked)return null;
  const cells=scanN*scanN,shown=scanRes&&scanRes.ok&&scanRes.facelets?scanRes.facelets.slice(cells*slot,cells*slot+cells):rotateFace(f.stickers,k);
  return {id,stickers:shown,pinned:f?rotateFace(f.pinned,k):new Array(cells).fill(false),k,given:!!(f&&scanFaceGiven(f))||!!(scanRes&&scanRes.ok),worked,paint:!!f};
}
// The net in the dialog, and in the card over it while that is up. Only the dialog's takes a click.
function drawNet(){
  const el=$('#scanNet'),card=$('#scanOkNet');if(!el)return;
  el.innerHTML=netMarkup(true);if(card)card.innerHTML=netMarkup(false);
}
function netMarkup(live){
  const n=scanN,s=Math.round((70-(n-1)*2)/n),g=2,fw=n*s+(n-1)*g+6;
  let out=`<svg viewBox="0 0 ${4*fw} ${3*fw}" role="img" aria-label="${scanResync?'The cube the guide expects, and the faces read':live?'Scanned faces':'The cube read'}">`;
  // The places come from netCells in js/draw.js, the one net layout of the app.
  const cells=netCells(n,{tile:s,gap:g,pad:3});
  for(let slot=0;slot<6;slot++){
    const nf=netSlot(slot),cls=[nf&&!nf.given?'expect':'',nf&&nf.worked?'worked':''].filter(Boolean).join(' ');
    out+=`<g data-slot="${slot}"${nf?` data-id="${nf.id}"`:''}${cls?` class="${cls}"`:''}>`;
    for(const {p,x,y} of cells.filter(c=>c.f===slot)){
      const center=n===3&&p===4,ci=nf?nf.stickers[p]:center?slot:-1,paint=live&&nf&&nf.paint&&!center;
      const attrs=`${paint?`data-id="${nf.id}" data-pos="${p}" `:''}rx="3" stroke="${nf&&nf.pinned[p]?'var(--accent)':'var(--sticker-line,#111)'}" stroke-width="${nf&&nf.pinned[p]?2.5:1}" style="${paint?'cursor:pointer':''}"${!live?'':nf&&nf.worked&&!nf.paint?' title="Worked out from the other faces"':nf?(center?' title="The center: fixed"':` title="Click to paint this sticker ${SCAN_PALETTE.find(q=>q.c===scanColor).label}"`):''}`;
      out+=ci<0?`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="var(--panel2)" ${attrs}/>`:netRect(ci,x,y,s,s,attrs);
    }
    out+='</g>';
  }
  return out+'</svg>';
}
function flashNet(id){setTimeout(()=>{const h=$(`#scanNet g[data-id="${id}"]`);if(h){h.classList.add('flash');setTimeout(()=>h.classList.remove('flash'),600);}},0);}
// A click paints the chosen color on the sticker and pins it.
function scanNetClick(e){
  const r=e.target.closest('rect[data-pos]');if(!r)return;
  const id=+r.dataset.id,p=+r.dataset.pos,f=scanVoter.faces[id];if(!f||(scanN===3&&p===4))return;
  // Map the shown position back to the stored reading, which may be turned.
  const slot=+r.closest('g').dataset.slot,nf=netSlot(slot),k=nf?nf.k:0,idx=rotateFace([...Array(scanN*scanN).keys()],k)[p];
  f.stickers[idx]=scanColor;f.pinned[idx]=true;
  if(scanResync)scanRefresh('');else if(scanFaceIds().length>=(scanN===3?5:6))scanAssemble('');else drawNet();
}
// Overlay: the fitted lattice and the color read at each cell. Drawn in frame pixels.
function drawOverlay(img,r){
  const cv=$('#scanOverlay');if(!cv)return;
  if(cv.width!==img.width||cv.height!==img.height){cv.width=img.width;cv.height=img.height;}
  const g=cv.getContext('2d');g.clearRect(0,0,cv.width,cv.height);
  const cs=getComputedStyle(document.documentElement);
  for(const b of r.blobs||[]){g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;g.strokeRect(b.bbox[0],b.bbox[1],b.bbox[2]-b.bbox[0],b.bbox[3]-b.bbox[1]);}
  if(!r.ok)return;
  const P=r.points,sp=r.lattice.spacing,n=r.n||3;
  g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=1.5;
  const ln=(a,b)=>{g.beginPath();g.moveTo(P[a].x,P[a].y);g.lineTo(P[b].x,P[b].y);g.stroke();};
  for(let i=0;i<n;i++){ln(n*i,n*i+n-1);ln(i,i+n*(n-1));}
  P.forEach((q,i)=>{
    g.beginPath();g.arc(q.x,q.y,sp*0.22,0,2*Math.PI);
    g.fillStyle=cs.getPropertyValue('--sticker-'+COLOR_VARS[r.colors[i]]).trim()||'#888';g.fill();
    g.lineWidth=2;g.strokeStyle='#000';g.stroke();
  });
}
if(typeof document!=='undefined'&&$('#camBtn'))$('#camBtn').onclick=()=>openScan();
