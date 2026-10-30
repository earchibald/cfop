// ===================== DRAW =====================
// The cube pictures: the 3D view and the net. Pure functions, no DOM. app.js draws
// the player, the thumbnails and the mark with these. A test runs them in node.
//
// A layer can be part way through a move. Pass {move:'R', t:0.5} and the picture
// shows the cube half way through R. The facelets are the cube BEFORE the move.
// At t=1 the picture matches the facelets of the cube after the move.
//
// Axes: x right (R), y up (U), z toward the viewer (F). Cubies sit at -1, 0, 1 on
// each axis. Stickers lie on the surface at 1.5.
const COLOR_VARS=['W','R','G','Y','O','B'];
function stickerColor(ci){return `var(--sticker-${COLOR_VARS[ci]||'X'})`;} // an unknown color is gray
// For each face in the order U R F D L B: the outward normal, the direction a row
// reads left to right, and the direction rows go down. Facelet 9*f+3*i+j sits at
// n*1.5 + r*(j-1) + d*(i-1).
const FACE_GEOM=[
  {n:[0,1,0],r:[1,0,0],d:[0,0,1]},{n:[1,0,0],r:[0,0,-1],d:[0,-1,0]},{n:[0,0,1],r:[1,0,0],d:[0,-1,0]},
  {n:[0,-1,0],r:[1,0,0],d:[0,0,-1]},{n:[-1,0,0],r:[0,0,1],d:[0,-1,0]},{n:[0,0,-1],r:[-1,0,0],d:[0,-1,0]}];
// The camera: turn about y by yaw, then tip about x by pitch. +z points at the viewer.
function rot3(p,yaw,pitch){const a=yaw*Math.PI/180,b=pitch*Math.PI/180;let [x,y,z]=p;let x1=x*Math.cos(a)+z*Math.sin(a),z1=-x*Math.sin(a)+z*Math.cos(a);let y1=y*Math.cos(b)-z1*Math.sin(b),z2=y*Math.sin(b)+z1*Math.cos(b);return [x1,y1,z2];}
// Turn p about the unit axis n by deg degrees, right-hand rule (Rodrigues).
function rotAxis(p,n,deg){const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);const dot=n[0]*p[0]+n[1]*p[1]+n[2]*p[2];
  const x=[n[1]*p[2]-n[2]*p[1],n[2]*p[0]-n[0]*p[2],n[0]*p[1]-n[1]*p[0]];return [0,1,2].map(i=>p[i]*c+x[i]*s+n[i]*dot*(1-c));}
// What a move turns: the axis (a face normal), the layers it moves counted from that face
// (0 is the face's own layer, 1 the slice behind it), and the whole turn in degrees. A
// clockwise face turn is -90 about the outward normal. The size matters for a small letter:
// on a 3×3 r is the face and the slice (wide), on a 4×4 it is the inside slice alone, and
// Rr is both, as the 4×4 beginner guide writes it.
function moveGeom(move,size){
  const n=size||DRAW_N;let face,depths;
  let m=/^([URFDLB])'([urfdlb])'$/.exec(move);if(m&&m[1].toLowerCase()===m[2])move=m[1]+m[2]+"'";
  m=/^([URFDLB])2([urfdlb])2$/.exec(move);if(m&&m[1].toLowerCase()===m[2])move=m[1]+m[2]+'2';
  m=/^([URFDLB])w(['2]?)$/.exec(move);if(m)move=m[1]+m[1].toLowerCase()+m[2];
  m=/^([URFDLB])([urfdlb])(['2]?)$/.exec(move);
  if(m&&m[1].toLowerCase()===m[2]){face=m[1];depths=[0,1];move=m[1]+m[3];}
  else{const b=move[0];
    if('URFDLB'.includes(b)){face=b;depths=[0];}
    else if('urfdlb'.includes(b)){face=b.toUpperCase();depths=n===4?[1]:[0,1];}
    else if(b==='M'){face='L';depths=[1];}else if(b==='E'){face='D';depths=[1];}else if(b==='S'){face='F';depths=[1];}
    else if(b==='x'){face='R';depths=[0,1,2,3];}else if(b==='y'){face='U';depths=[0,1,2,3];}else if(b==='z'){face='F';depths=[0,1,2,3];}
    else throw new Error('bad move '+move);}
  const sfx=move.slice(1);const k=sfx==="'"?-1:sfx==='2'?2:sfx===''?1:NaN;if(isNaN(k))throw new Error('bad move '+move);
  const layers=[...new Set(depths.map(d=>d===0?1:d===1?0:-1))].sort((a,b)=>a-b); // the 3×3 names: 1 the face layer, 0 the middle, -1 the far layer
  return {n:FACE_GEOM['URFDLB'.indexOf(face)].n,layers,depths,deg:-90*k};
}
// The polygons of the cube picture, far to near. Each is {pts,fill} and a sticker also
// has {stroke,faded}. Options: yaw, pitch, scale, cx, cy (the center on the page),
// fade (a Set of facelet indices that keep full color), color(ci,idx) for the sticker
// fill, body for the plastic between stickers, cls(idx) for a class on each sticker,
// move with t (0..1) for a part turn, and rot, a 3×3 matrix (three rows) that turns the
// whole cube before the camera: how a smart cube is held. Turning the body +90° about y
// shows the same picture as the move y' from the fixed camera.
//
// The cube is drawn as slabs: runs of layers along the move axis that move together.
// Each slab is a convex box, so its front faces never overlap and need no sort. The
// slabs are separated by planes across the axis, so they draw far to near along it.
// The cube is a 3×3 by default. setDrawN(2) draws the 2×2: two cubies a side, each half the
// cube, with 24 stickers. A 54-sticker array is accepted for either size: the 2×2 shows its
// corner stickers. Options fade, cls and color always get the 3×3 (54) index of a sticker.
let DRAW_N=3;function setDrawN(n){DRAW_N=n===2?2:n===4?4:3;}function drawN(){return DRAW_N;}
function cubePolys(facelets,opts={}){
  const n=opts.n||DRAW_N;if(n===2&&facelets.length===54)facelets=TWO_FACELET.map(i=>facelets[i]);
  const to54=n===2?i=>TWO_FACELET[i]:i=>i; // the index the options see: the 3×3 one for a 2×2, the native one otherwise
  const yaw=opts.yaw??-32,pitch=opts.pitch??28;const S=opts.scale||52;const cx=opts.cx??200,cy=opts.cy??185;
  const color=opts.color||((ci)=>stickerColor(ci));const body=opts.body||'var(--sticker-line)';
  const M=opts.rot,cam=M?p=>rot3([0,1,2].map(i=>M[i][0]*p[0]+M[i][1]*p[1]+M[i][2]*p[2]),yaw,pitch):p=>rot3(p,yaw,pitch);
  const proj=p=>{const q=cam(p);return [cx+q[0]*S,cy-q[1]*S];};
  const hs=1.5/n,layerAt=k=>-1.5+hs+2*hs*k; // half a cubie; the center of layer k, counted from the negative side
  let nv=[0,1,0],slabs=[{lo:0,hi:n-1,deg:0}];
  if(opts.move&&opts.t){const g=moveGeom(opts.move,n);nv=g.n;const deg=g.deg*opts.t;slabs=[];const pos=nv[0]+nv[1]+nv[2]>0;
    for(let c=0;c<n;c++){const depth=pos?n-1-c:c;const moving=g.depths.includes(depth);const last=slabs[slabs.length-1];
      if(last&&last.moving===moving)last.hi=c;else slabs.push({lo:c,hi:c,moving,deg:moving?deg:0});}
    // Slabs are listed from the negative end of the axis. Draw far to near: when the positive
    // end of the axis points away from the camera, the first slab is the nearest, so reverse.
    // The axis, not the face normal: D, L and B turn about a negative normal, but their slabs
    // are still counted from the negative end.
    if(cam(nv.map(Math.abs))[2]<0)slabs.reverse();}
  const k=nv.findIndex(v=>v!==0);const polys=[];
  // lift: {set, t, d, dir}: each piece with a sticker in set (54 indices) moves out from the cube by d·t
  // cubie widths (0.55 by default; along dir, a unit vector, when given: a layer moves as one), drawn over it as a box of its own with a glow behind it. Its
  // place shows the plastic, and the other stickers dim as t grows. 3×3 only, not in a part turn.
  const lift=opts.lift&&opts.lift.t>0&&n===3&&!(opts.move&&opts.t)?opts.lift:null;
  const cubieOf=idx=>{const g=FACE_GEOM[Math.floor(idx/9)],p=idx%9;return [0,1,2].map(t=>g.n[t]+g.r[t]*(p%3-1)+g.d[t]*(Math.floor(p/3)-1));};
  const lifted=new Map();if(lift)for(const i of lift.set)lifted.set(cubieOf(i).join(),[]);
  if(opts.hidden)polys.push(...hiddenFacePolys(facelets,{n,cam,proj,color,body,fade:opts.fade,to54,dist:opts.hiddenDist,flat:opts.hiddenFlat,labels:!opts.color||opts.labels,move:opts.move,t:opts.t,lift,lifted}));
  for(const sl of slabs){
    // the slab's box, and the turn it has made
    const lo=[-1.5,-1.5,-1.5],hi=[1.5,1.5,1.5];lo[k]=layerAt(sl.lo)-hs;hi[k]=layerAt(sl.hi)+hs; // layers are counted along the axis, so the sign of nv does not matter here
    const R=sl.deg?p=>rotAxis(p,nv,sl.deg):p=>p;
    const faces=[];for(let f=0;f<6;f++){const nz=cam(R(FACE_GEOM[f].n))[2];if(nz>=0.02)faces.push({f,nz});}
    faces.sort((x,y)=>x.nz-y.nz);
    for(const {f} of faces){const g=FACE_GEOM[f];
      // the box face: plastic. A cut face inside the cube has no stickers.
      const corner=(su,sv)=>[0,1,2].map(i=>g.n[i]?(g.n[i]>0?hi[i]:lo[i]):g.r[i]?(g.r[i]*su>0?hi[i]:lo[i]):(g.d[i]*sv>0?hi[i]:lo[i]));
      polys.push({pts:[[-1,-1],[1,-1],[1,1],[-1,1]].map(([su,sv])=>proj(R(corner(su,sv)))),fill:body});
      for(let i=0;i<n;i++)for(let j=0;j<n;j++){const idx=n*n*f+n*i+j;const cu=(j-(n-1)/2)*2*hs,cv=(i-(n-1)/2)*2*hs;
        const cubie=[0,1,2].map(t=>g.n[t]*(1.5-hs)+g.r[t]*cu+g.d[t]*cv);const along=cubie[0]*Math.abs(nv[0])+cubie[1]*Math.abs(nv[1])+cubie[2]*Math.abs(nv[2]);
        const c=Math.round((along+1.5-hs)/(2*hs));if(c<sl.lo||c>sl.hi)continue; // this cubie is in another slab
        const h=0.88*hs,i54=to54(idx);
        if(lift){const grp=lifted.get(cubie.map(Math.round).join());if(grp){grp.push({f,idx});continue;}}
        const pts=[[cu-h,cv-h],[cu+h,cv-h],[cu+h,cv+h],[cu-h,cv+h]].map(([u,v])=>proj(R([0,1,2].map(t=>g.n[t]*1.5+g.r[t]*u+g.d[t]*v))));
        const poly={pts,fill:color(facelets[idx],i54),stroke:body,faded:!!(opts.fade&&!opts.fade.has(i54)),idx:i54};
        if(!opts.color||opts.labels)poly.ci=facelets[idx]; // the color the Color Blind Assist letter names
        if(opts.cls){const c=opts.cls(i54);if(c)poly.cls=c;}
        if(lift)poly.op=1-0.45*lift.t;
        polys.push(poly);
      }
    }
  }
  if(lift)polys.push(...liftPolys(facelets,lifted,lift,{cam,proj,color,body,cls:opts.cls,labels:!opts.color||opts.labels}));
  return polys;
}
// The lifted pieces of cubePolys, far to near, each face as much of it as the cube leaves in view.
// The camera sees straight on (no perspective), so a point of a face is hidden when the cube stands
// between it and the camera: the part of the cube on the camera's side of the face's plane, a box.
// That box's outline on the screen, cut out of the face, leaves what shows (`cut`, drawn as a hole).
// So a piece that comes out past the edge of the cube shows, glow and all, from whichever face it
// left, a face turned away from the camera too; a face inside the cube shows nothing.
function liftPolys(facelets,lifted,lift,{cam,proj,color,body,cls,labels}){
  const d=(lift.d??0.55)*lift.t;
  const vis=[0,1,2,3,4,5].map(f=>({f,nz:cam(FACE_GEOM[f].n)[2]})).filter(x=>x.nz>=0.02).sort((x,y)=>x.nz-y.nz);
  const pieces=[...lifted].map(([key,st])=>{const c=key.split(',').map(Number),len=Math.hypot(...c);const C=lift.dir?c.map((x,i)=>x+lift.dir[i]*d):c.map(x=>x*(1+d/len));return {c,C,st,z:cam(C)[2]};}).sort((x,y)=>x.z-y.z);
  const out=[],glow=[];
  for(const {C,st} of pieces){
    for(const {f} of vis){const g=FACE_GEOM[f],P=[0,1,2].map(t=>C[t]+g.n[t]*0.5);
      const pt=(u,v)=>proj([0,1,2].map(t=>P[t]+g.r[t]*u+g.d[t]*v));const quad=(u0,u1,v0,v1)=>[pt(u0,v0),pt(u1,v0),pt(u1,v1),pt(u0,v1)];
      // the cube in front of this face's plane, as the screen sees it
      const a=g.n.findIndex(x=>x!==0),lo=[-1.5,-1.5,-1.5],hi=[1.5,1.5,1.5];if(g.n[a]>0)lo[a]=Math.max(lo[a],P[a]);else hi[a]=Math.min(hi[a],P[a]);
      const hide=hi[a]-lo[a]>1e-6?hull2([0,1,2,3,4,5,6,7].map(m=>proj([0,1,2].map(i=>m>>i&1?hi[i]:lo[i])))):null;
      const shown=q=>{if(!hide)return {pts:q};const cut=clipConvex(q,hide),A=Math.abs(area2(q)),B=cut.length>2?Math.abs(area2(cut)):0;
        return B<1e-6*A?{pts:q}:B>A*(1-1e-6)?null:{pts:q,cut};};
      const face=shown(quad(-0.5,0.5,-0.5,0.5));if(!face)continue;
      out.push({...face,fill:body});glow.push(face);
      const s=st.find(x=>x.f===f);if(!s)continue;
      const h=0.44,sq=shown(quad(-h,h,-h,h));if(!sq)continue;
      const i54=s.idx,poly={...sq,fill:color(facelets[s.idx],i54),stroke:body,idx:i54};
      if(labels&&(!sq.cut||Math.abs(area2(sq.cut))<0.25*Math.abs(area2(sq.pts))))poly.ci=facelets[s.idx]; // no letter on a sticker mostly hidden
      if(cls){const k=cls(i54);if(k)poly.cls=k;}out.push(poly);
    }
  }
  return [...glow.map(p=>({...p,fill:'var(--lift-glow,#ffe27a)',glow:Math.max(0.001,+lift.t.toFixed(3))})),...out];
}
// Twice the signed area of a polygon on the screen.
function area2(P){let a=0;for(let i=0;i<P.length;i++){const q=P[i],r=P[(i+1)%P.length];a+=q[0]*r[1]-r[0]*q[1];}return a;}
// The convex hull of points on the screen (monotone chain), counterclockwise in x right, y up.
function hull2(pts){const P=[...pts].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const half=list=>{const h=[];for(const p of list){while(h.length>=2&&cr(h[h.length-2],h[h.length-1],p)<=1e-9)h.pop();h.push(p);}h.pop();return h;};
  return [...half(P),...half(P.reverse())];}
// The part of a polygon inside a convex polygon `hull` (as hull2 gives it), Sutherland-Hodgman.
function clipConvex(poly,hull){let out=poly;
  for(let i=0;i<hull.length&&out.length;i++){const A=hull[i],B=hull[(i+1)%hull.length],side=p=>(B[0]-A[0])*(p[1]-A[1])-(B[1]-A[1])*(p[0]-A[0]);
    const inp=out;out=[];for(let j=0;j<inp.length;j++){const p=inp[j],q=inp[(j+1)%inp.length],sp=side(p),sq=side(q);
      if(sp>=0)out.push(p);if((sp>=0)!==(sq>=0)){const t=sp/(sp-sq);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}}
  return out;}
// Hidden faces: each face that looks away from the camera, moved out along its normal by `dist`
// (2.4 by default, in cubie widths) and drawn before the cube, a little faded. The camera sees such a
// face from inside the cube, so it reads as in a mirror behind the cube. A drag of the view shows
// the faces that are hidden then.
//
// During a part turn the mirrors turn too. A hidden face that the move turns spins in its own
// plane. On a hidden face beside the move, the moving strip rolls over the edge as a flattened
// 3D layer: each sticker of the turning layer turns about the move axis, and its height above
// the face is cut to `flat` (0.35 by default) so the strip stays near the mirror. A sticker shows
// on a mirror while it looks out of that face, and it fades as it tips away. At t=1 each mirror
// shows the stickers of the cube after the move.
//
// With a lift (cubePolys passes `lifted`, its pieces by place), a lifted piece's stickers on a mirror
// move as the piece does, the height cut to `flat` as above, with the same glow behind them; the
// other stickers dim as on the cube. So a piece that the cube hides still lights in its mirror.
function hiddenFacePolys(facelets,{n,cam,proj,color,body,fade,to54,dist,flat,labels,move,t,lift,lifted}){
  const hs=1.5/n,D=1.5+(dist??2.4),k=flat??0.35,h=0.88*hs,out=[];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  // the turn: the axis, the angle, and whether a cubie at c (counted from the negative end) moves
  let turn=null;
  if(move&&t){const g=moveGeom(move,n),pos=g.n[0]+g.n[1]+g.n[2]>0,ax=g.n.map(Math.abs);
    turn={nv:g.n,deg:g.deg*t,moves:p=>{const c=Math.round((dot(p,ax)+1.5-hs)/(2*hs));return g.depths.includes(pos?n-1-c:c);}};}
  const sticker=(f,i,j)=>{const g=FACE_GEOM[f],cu=(j-(n-1)/2)*2*hs,cv=(i-(n-1)/2)*2*hs;
    return {g,cubie:[0,1,2].map(q=>g.n[q]*(1.5-hs)+g.r[q]*cu+g.d[q]*cv),
      corners:[[cu-h,cv-h],[cu+h,cv-h],[cu+h,cv+h],[cu-h,cv+h]].map(([u,v])=>[0,1,2].map(q=>g.n[q]*1.5+g.r[q]*u+g.d[q]*v))};};
  const poly=(pts,idx,op)=>{const i54=to54(idx),p={pts:pts.map(proj),fill:color(facelets[idx],i54),stroke:body,faded:!!(fade&&!fade.has(i54)),op,idx:i54,hint:true};
    if(labels)p.ci=facelets[idx];return p;};
  // a point on or near the cube to its place on the mirror of face m: out by D, its height above the face cut to k
  const onMirror=(p,m)=>{const w=dot(p,m);return [0,1,2].map(q=>p[q]+m[q]*(D-w+k*(w-1.5)));};
  const mirrors=[];for(let f=0;f<6;f++)if(cam(FACE_GEOM[f].n)[2]<=-0.02)mirrors.push(f);
  // a lifted piece's move out from the cube, as liftPolys moves it
  const L=lift&&lifted&&lifted.size?lift:null,ld=L?(L.d??0.55)*L.t:0,glow=[];
  const liftOf=c=>{if(!L||!lifted.has(c.map(Math.round).join()))return null;const len=Math.hypot(...c);return L.dir?L.dir.map(x=>x*ld):c.map(x=>x*ld/len);};
  for(const f of mirrors){const m=FACE_GEOM[f].n;
    for(let i=0;i<n;i++)for(let j=0;j<n;j++){const s=sticker(f,i,j);
      if(turn&&turn.moves(s.cubie))continue; // drawn with the turning layer below
      const up=liftOf(s.cubie),mv=q=>up?q.map((v,x)=>v+up[x]):q;
      const pts=s.corners.map(c=>onMirror(mv(c),m)),p=poly(pts,n*n*f+n*i+j,L?+(up?0.6+0.4*L.t:0.6*(1-0.45*L.t)).toFixed(3):0.6);
      if(up){const g=s.g,c=s.cubie.map((v,x)=>v+g.n[x]*hs);
        glow.push({pts:[[-hs,-hs],[hs,-hs],[hs,hs],[-hs,hs]].map(([u,v])=>proj(onMirror(mv([0,1,2].map(x=>c[x]+g.r[x]*u+g.d[x]*v)),m))),
          fill:'var(--lift-glow,#ffe27a)',glow:Math.max(0.001,+L.t.toFixed(3))});}
      if(turn)p.z=cam(onMirror(s.cubie,m))[2];out.push(p);}}
  out.unshift(...glow);
  if(turn){const R=p=>rotAxis(p,turn.nv,turn.deg);
    for(let f=0;f<6;f++){const nr=R(FACE_GEOM[f].n);
      for(let i=0;i<n;i++)for(let j=0;j<n;j++){const s=sticker(f,i,j);if(!turn.moves(s.cubie))continue;
        const pts=s.corners.map(R);
        for(const mf of mirrors){const m=FACE_GEOM[mf].n,c=dot(nr,m);if(c<0.02)continue;
          const p=poly(pts.map(q=>onMirror(q,m)),n*n*f+n*i+j,+(0.6*(0.35+0.65*Math.min(1,c))).toFixed(3));
          p.z=cam(onMirror(pts.reduce((a,q)=>a.map((v,x)=>v+q[x]/4),[0,0,0]),m))[2];out.push(p);}}}
    // far to near, so a strip that rolls over its edge draws in the right order
    out.sort((a,b)=>a.z-b.z);for(const p of out)delete p.z;}
  return out;}
// The center of a 3x3 sticker in the 3D view, and how much a face looks at the camera. The same
// camera as cubePolys, so the What it moves marks sit on the stickers it draws.
function faceletPt(idx,opts={}){const g=FACE_GEOM[Math.floor(idx/9)],p=idx%9,i=Math.floor(p/3),j=p%3;
  const yaw=opts.yaw??-32,pitch=opts.pitch??28,S=opts.scale||52,cx=opts.cx??200,cy=opts.cy??185;
  const q=rot3([0,1,2].map(t=>g.n[t]*1.5+g.r[t]*(j-1)+g.d[t]*(i-1)),yaw,pitch);return [cx+q[0]*S,cy-q[1]*S];}
function faceFacing(f,opts={}){return rot3(FACE_GEOM[f].n,opts.yaw??-32,opts.pitch??28)[2];}
// A polygon with a `cut` (a part of it hidden, see liftPolys) is a path with that part as a hole.
function polysSVG(polys){const g=polys.find(p=>p.glow);
  const shape=(p,pre,rest)=>p.cut?`<path${pre} d="${[p.pts,p.cut].map(P=>'M'+P.map(q=>q.map(v=>v.toFixed(2)).join(',')).join('L')+'Z').join('')}" fill-rule="evenodd"${rest}/>`:
    `<polygon${pre} points="${p.pts.map(q=>q.map(v=>v.toFixed(2)).join(',')).join(' ')}"${rest}/>`;
  return (g?`<defs><filter id="cwLiftGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter></defs>`:'')+polys.map(p=>p.glow?
  shape(p,'',` fill="${p.fill}" filter="url(#cwLiftGlow)" opacity="${p.glow}"`):shape(p,p.cls?` class="${p.cls}"`:'',` fill="${p.fill}"${p.faded||p.op?` opacity="${+((p.faded?0.22:1)*(p.op||1)).toFixed(3)}"`:''}${p.stroke?` stroke="${p.stroke}" stroke-width="0.6" stroke-linejoin="round"`:''}`)+
  (p.ci!=null?polyLabel(p):'')).join('');}
// Color Blind Assist: a letter for each sticker color (W R G Y O B). The letter is always in the
// picture and hidden by CSS unless body.cba is set, so a change of the setting draws nothing again.
// A gray sticker (a color that does not matter, or is not known) has no letter.
function stickerLabel(ci,x,y,size,op){const L=COLOR_VARS[ci];if(!L||!(size>2))return '';
  return `<text class="cbl cb-${L}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-size="${size.toFixed(1)}" text-anchor="middle" dominant-baseline="central"${op?` opacity="${op}"`:''} aria-hidden="true">${L}</text>`;}
// The letter of a 3D sticker: at its center, sized by its area on the screen.
function polyLabel(p){const P=p.pts;let a=0,x=0,y=0;
  for(let i=0;i<P.length;i++){const q=P[i],r=P[(i+1)%P.length];a+=q[0]*r[1]-r[0]*q[1];x+=q[0];y+=q[1];}
  return stickerLabel(p.ci,x/P.length,y/P.length,0.62*Math.sqrt(Math.abs(a)/2),p.faded||p.op?+((p.faded?0.22:1)*(p.op||1)).toFixed(3):0);}
// The kind of piece a facelet belongs to: 'center', 'edge' or 'corner'.
function pieceKind(idx,n){n=n||3;const p=idx%(n*n),i=Math.floor(p/n),j=p%n;const e=x=>x===0||x===n-1;return e(i)&&e(j)?'corner':e(i)||e(j)?'edge':'center';}
// The box round the polygons, with a margin, as a viewBox string.
function polysViewBox(polys,margin=0){const xs=polys.flatMap(p=>p.pts.map(q=>q[0])),ys=polys.flatMap(p=>p.pts.map(q=>q[1]));
  const x0=Math.min(...xs)-margin,y0=Math.min(...ys)-margin,x1=Math.max(...xs)+margin,y1=Math.max(...ys)+margin;return [x0,y0,x1-x0,y1-y0].map(v=>v.toFixed(2)).join(' ');}
function renderCube3D(facelets,opts={}){return polysSVG(cubePolys(facelets,opts));}
// The net: the top face above, then left, front, right and back in a row, the bottom below. One
// layout for every net in the app: the player's, the smart cube dialog's, the scanner's, the
// painter's and the F2L flat diagram. NET_POS is each face's place in face widths, in the order
// U R F D L B. netCells gives every sticker's box: tile is its size, gap the space between two
// stickers of a face, pad the space round a face, ox and oy the corner of the net, faces the faces
// to draw (all six by default) and pos another layout of faces.
const NET_POS=[[1,0],[2,1],[1,1],[1,2],[0,1],[3,1]];
function netCells(n,{tile=28,gap=2,pad=1,ox=0,oy=0,faces=[0,1,2,3,4,5],pos=NET_POS}={}){
  const fw=n*tile+(n-1)*gap+2*pad,out=[];
  for(const f of faces){const [px,py]=pos[f];for(let i=0;i<n;i++)for(let j=0;j<n;j++)
    out.push({idx:n*n*f+n*i+j,f,p:n*i+j,x:ox+px*fw+pad+j*(tile+gap),y:oy+py*fw+pad+i*(tile+gap),s:tile});}
  return out;}
// A square sticker of a net or a top view, with its Color Blind Assist letter.
function netRect(c,x,y,w,h,attrs){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${stickerColor(c)}"${attrs?' '+attrs:''}/>`+(w>=8&&h>=8?stickerLabel(c,x+w/2,y+h/2,0.55*Math.min(w,h)):'');}
function renderNet(facelets,opts={}){
  const n=opts.n||DRAW_N;if(n===2&&facelets.length===54)facelets=TWO_FACELET.map(i=>facelets[i]);
  const to54=n===2?i=>TWO_FACELET[i]:i=>i; // the index the options see: the 3×3 one for a 2×2, the native one otherwise
  const s=opts.size||(n===2?45:n===4?22.5:30);let out='';
  for(const c of netCells(n,{tile:s-2,gap:2,pad:1,ox:19,oy:19})){const faded=opts.fade&&!opts.fade.has(to54(c.idx));
    out+=netRect(facelets[c.idx],c.x,c.y,c.s,c.s,`rx="3"${faded?' opacity="0.22"':''} stroke="var(--sticker-line)" stroke-width="1"`).replace(/<text /,faded?'<text opacity="0.22" ':'<text ');}
  return out;
}
// Every sticker of the piece that sticker idx (0..53) sits on: one for a center, two for an edge,
// three for a corner.
function pieceStickers(idx){const at=i=>{const g=FACE_GEOM[Math.floor(i/9)],p=i%9;return [0,1,2].map(t=>g.n[t]+g.r[t]*(p%3-1)+g.d[t]*(Math.floor(p/3)-1)).join();};
  const k=at(idx),out=[];for(let i=0;i<54;i++)if(at(i)===k)out.push(i);return out;}
