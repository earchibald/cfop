// ================= Camera scanner =================
// Reads a real cube from the webcam, one face at a time. See docs/scanner-handoff.md.

// ---------- colour helpers ----------
// img is ImageData-like: {width, height, data: RGBA bytes}. All stages work on a ~320 px copy.
const SRGB_LIN=(()=>{const t=new Float32Array(256);for(let i=0;i<256;i++){const c=i/255;t[i]=c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}return t;})();
function labF(t){return t>0.008856?Math.cbrt(t):7.787*t+16/116;}
// Linear RGB (0..1) to CIE Lab, D65.
function linToLab(r,g,b){
  const x=labF((0.4124*r+0.3576*g+0.1805*b)/0.95047),y=labF(0.2126*r+0.7152*g+0.0722*b),z=labF((0.0193*r+0.1192*g+0.9505*b)/1.08883);
  return [116*y-16,500*(x-y),200*(y-z)];
}
const hexLin=h=>[0,2,4].map(i=>SRGB_LIN[parseInt(h.substr(i,2),16)]);
// Reference sticker colours in linear RGB, by colour index (white red green yellow orange blue).
const SCAN_REFS=['F4F4F4','C41E3A','009E60','FFD500','FF5800','0051BA'].map(hexLin);

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
  // Flood-fill regions of near-uniform colour.
  const lab=new Int32Array(N).fill(-1),stack=new Int32Array(N),blobs=[];
  const minA=opts.minArea||Math.max(12,N/4000),maxA=N/12;
  for(let s0=0;s0<N;s0++){
    if(dark[s0]||lab[s0]>=0)continue;
    const id=blobs.length;let sp=0,n=0,mL=0,mA=0,mB=0,sx=0,sy=0,sxx=0,syy=0,sxy=0,x0=W,x1=0,y0=H,y1=0;
    stack[sp++]=s0;lab[s0]=id;
    while(sp){
      const i=stack[--sp],x=i%W,y=(i-x)/W;
      n++;mL+=(sL[i]-mL)/n;mA+=(sA[i]-mA)/n;mB+=(sB[i]-mB)/n;
      sx+=x;sy+=y;sxx+=x*x;syy+=y*y;sxy+=x*y;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
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
    const cx=sx/n,cy=sy/n,vxx=sxx/n-cx*cx,vyy=syy/n-cy*cy,vxy=sxy/n-cx*cy;
    const tr=vxx+vyy,det=vxx*vyy-vxy*vxy,disc=Math.sqrt(Math.max(0,tr*tr/4-det));
    const l1=tr/2+disc,l2=tr/2-disc;if(l2<=0)continue;
    const fill=n/(12*Math.sqrt(det));
    // Square or round stickers, seen at an angle: compact and not too long.
    if(l1/l2>4||fill<0.75||fill>1.25)continue;
    blob.cx=cx;blob.cy=cy;blob.ok=true;
  }
  return {blobs:blobs.filter(b=>b.ok),labels:lab,dark,W,H};
}

// ---------- stage 2: fit a 3x3 lattice ----------
// Returns {ok, points:[9 {x,y}] in reading order, u, v, matched, residual, confidence} or {ok:false, reason}.
function fitLattice(blobs){
  if(blobs.length<4)return {ok:false,reason:'few'};
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
      if(e<0.22&&Math.abs(ri)<=2&&Math.abs(rj)<=2)pts.push({k,i:ri,j:rj,e});
    }
    let best=null;
    for(let i0=-2;i0<=0;i0++)for(let j0=-2;j0<=0;j0++){
      const inw=pts.filter(p=>p.i>=i0&&p.i<=i0+2&&p.j>=j0&&p.j<=j0+2);
      // One blob per cell; keep the closest.
      const cell=new Map();for(const p of inw){const key=p.i*8+p.j,q=cell.get(key);if(!q||p.e<q.e)cell.set(key,p);}
      const ps=[...cell.values()];if(ps.length<4)continue;
      const is=new Set(ps.map(p=>p.i)),js=new Set(ps.map(p=>p.j));
      if(is.size<3||js.size<3)continue; // the matches must reach every row and column
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
  const grid=[];for(let j=0;j<3;j++)for(let i=0;i<3;i++){const q=map(i,j);grid.push({x:q[0],y:q[1]});}
  let points=grid,bestx=-Infinity;
  for(let k=0;k<4;k++){const g=rotateFace(grid,k),dx=g[2].x-g[0].x;if(dx>bestx){bestx=dx;points=g;}}
  // Residual in cell units.
  const lu=Math.hypot(...u),lv=Math.hypot(...v);
  let res=0;for(const p of ps){const [c,r]=[p.i-i0,p.j-j0];const q=[ox+c*ux+r*vx,oy+c*uy+r*vy];res+=Math.hypot(q[0]-P[p.k][0],q[1]-P[p.k][1]);}
  res/=ps.length*Math.min(lu,lv);
  const matched=ps.length;
  return {ok:matched>=6&&res<0.15,reason:matched<6?'cover':res>=0.15?'residual':'',points,spacing:Math.min(lu,lv),matched,residual:res,confidence:Math.max(0,Math.min(1,(matched-5)/4*(1-res/0.15)))};
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

// ---------- stage 3: read colours ----------
// Median linear RGB in a small disc at each point. Glare and sticker edges stay out of the median.
// Glare is bright and grey. When a fair share of the disc is saturated, only those pixels count.
function sampleDiscs(img,points,radius){
  const W=img.width,H=img.height,d=img.data,r=Math.max(1.5,radius),out=[];
  const med=a=>{if(!a.length)return 0;a.sort((x,y)=>x-y);return a[a.length>>1];};
  for(const p of points){
    const all=[],sat=[];
    for(let y=Math.floor(p.y-r);y<=Math.ceil(p.y+r);y++)for(let x=Math.floor(p.x-r);x<=Math.ceil(p.x+r);x++){
      if(x<0||y<0||x>=W||y>=H||(x-p.x)**2+(y-p.y)**2>r*r)continue;const j=4*(y*W+x);
      const px=[SRGB_LIN[d[j]],SRGB_LIN[d[j+1]],SRGB_LIN[d[j+2]]];all.push(px);
      const l=linToLab(...px);if(Math.hypot(l[1],l[2])>22)sat.push(px);
    }
    const use=sat.length>=0.3*all.length?sat:all;
    out.push([0,1,2].map(c=>med(use.map(q=>q[c]))));
  }
  return out;
}
function colourDist(l1,l2){return Math.sqrt(0.35*(l1[0]-l2[0])**2+(l1[1]-l2[1])**2+(l1[2]-l2[2])**2);}
// Classify linear RGB samples against the references. The light tint is unknown, so fit per-channel
// gains that pull the samples onto their nearest references, then classify again.
// Returns {colours, margins, dists, gains}.
function classifySamples(samples,opts){
  opts=opts||{};const refs=opts.refs||SCAN_REFS,refLab=refs.map(r=>linToLab(...r));
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
      const ds=refLab.map(r=>colourDist(l,r));const order=ds.map((d,i)=>i).sort((a,b)=>ds[a]-ds[b]);
      return {c:order[0],d1:ds[order[0]],d2:ds[order[1]]};
    });
    // Gains that match chromaticity only; overall brightness is left to the camera.
    const num=[0,0,0],den=[0,0,0];
    samples.forEach((s,k)=>{const r=refs[res[k].c];const ss=s[0]+s[1]+s[2],rs=r[0]+r[1]+r[2];if(ss<1e-3)return;for(let c=0;c<3;c++){const a=s[c]/ss,b=r[c]/rs;num[c]+=a*b;den[c]+=a*a;}});
    const lam=0.02; // pulls the gains toward 1 when the face has few colours
    const ng=norm([0,1,2].map(c=>(num[c]+lam)/(den[c]+lam)));
    if(Math.max(...ng.map((x,c)=>Math.abs(x-g[c])))<0.005){g=ng;break;}
    g=ng;
  }
  return {colours:res.map(r=>r.c),margins:res.map(r=>r.d2-r.d1),dists:res.map(r=>r.d1),gains:g};
}
// Stages 1-3 on one frame. Returns {ok, colours, margins, points, lattice, blobs, reason}.
function readFace(img,opts){
  const st1=findBlobs(img,opts),lat=fitLattice(st1.blobs);
  if(!lat.ok)return {ok:false,reason:lat.reason,blobs:st1.blobs,lattice:lat};
  const samples=sampleDiscs(img,lat.points,lat.spacing*0.3);
  const cl=classifySamples(samples,opts);
  return {ok:true,colours:cl.colours,margins:cl.margins,gains:cl.gains,samples,points:lat.points,lattice:lat,blobs:st1.blobs};
}

// ---------- UI ----------
let scanStream=null;
function openScan(){
  if($('#scanBg'))return;
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='scanBg';
  bg.innerHTML=`<div class="modal scan" role="dialog" aria-label="Scan cube">
   <button class="close small ghost" id="scanClose" aria-label="Close">✕</button>
   <h2>Scan cube</h2>
   <p class="muted" style="margin-top:0">Hold one face of the cube to the camera. Turn the cube to show the next face.</p>
   <div class="scan-view mirror" id="scanView"><video id="scanVideo" autoplay playsinline muted></video><canvas id="scanOverlay"></canvas></div>
   <div class="scan-row"><label><input type="checkbox" id="scanMirror" checked> Mirror</label></div>
   <div id="scanStatus" class="notice">Asking for camera access.</div>
  </div>`;
  document.body.appendChild(bg);
  bg.addEventListener('click',e=>{if(e.target===bg)closeScan();});
  $('#scanClose').onclick=closeScan;
  $('#scanMirror').onchange=e=>$('#scanView').classList.toggle('mirror',e.target.checked);
  document.addEventListener('keydown',scanKeys,true);
  startCamera();
}
async function startCamera(){
  const st=$('#scanStatus');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){st.textContent='This browser cannot open the camera here. Use https or localhost.';return;}
  try{
    const s=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},facingMode:'user'},audio:false});
    if(!$('#scanBg')){s.getTracks().forEach(t=>t.stop());return;} // closed while the prompt was open
    scanStream=s;const v=$('#scanVideo');v.srcObject=s;await v.play().catch(()=>{});
    const t=s.getVideoTracks()[0],cfg=t.getSettings?t.getSettings():{};
    st.textContent=`Camera on: ${t.label||'webcam'}${cfg.width?` at ${cfg.width}x${cfg.height}`:''}.`;
  }catch(e){
    st.textContent=e.name==='NotAllowedError'?'Camera access was refused. Allow the camera for this site in the browser settings, then open the scanner again.'
      :e.name==='NotFoundError'?'No camera was found.':'The camera did not start: '+(e.message||e.name);
  }
}
function stopCamera(){if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null;}}
function closeScan(){document.removeEventListener('keydown',scanKeys,true);stopCamera();const b=$('#scanBg');if(b)b.remove();}
function scanKeys(e){
  if(!$('#scanBg'))return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeScan();return;}
  e.stopPropagation(); // keep tab/timer keys out while the scanner is open
}
if(typeof document!=='undefined'&&$('#camBtn'))$('#camBtn').onclick=openScan;
