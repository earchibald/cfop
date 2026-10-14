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
function stickerColor(ci){return `var(--sticker-${COLOR_VARS[ci]})`;}
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
// Rr is both, as the Rubik's Master guide writes it.
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
// fill, body for the plastic between stickers, cls(idx) for a class on each sticker, and
// move with t (0..1) for a part turn.
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
  const proj=p=>{const q=rot3(p,yaw,pitch);return [cx+q[0]*S,cy-q[1]*S];};
  const hs=1.5/n,layerAt=k=>-1.5+hs+2*hs*k; // half a cubie; the center of layer k, counted from the negative side
  let nv=[0,1,0],slabs=[{lo:0,hi:n-1,deg:0}];
  if(opts.move&&opts.t){const g=moveGeom(opts.move,n);nv=g.n;const deg=g.deg*opts.t;slabs=[];const pos=nv[0]+nv[1]+nv[2]>0;
    for(let c=0;c<n;c++){const depth=pos?n-1-c:c;const moving=g.depths.includes(depth);const last=slabs[slabs.length-1];
      if(last&&last.moving===moving)last.hi=c;else slabs.push({lo:c,hi:c,moving,deg:moving?deg:0});}
    // Slabs are listed from the negative end of the axis. Draw far to near: when the positive
    // end of the axis points away from the camera, the first slab is the nearest, so reverse.
    // The axis, not the face normal: D, L and B turn about a negative normal, but their slabs
    // are still counted from the negative end.
    if(rot3(nv.map(Math.abs),yaw,pitch)[2]<0)slabs.reverse();}
  const k=nv.findIndex(v=>v!==0);const polys=[];
  for(const sl of slabs){
    // the slab's box, and the turn it has made
    const lo=[-1.5,-1.5,-1.5],hi=[1.5,1.5,1.5];lo[k]=layerAt(sl.lo)-hs;hi[k]=layerAt(sl.hi)+hs; // layers are counted along the axis, so the sign of nv does not matter here
    const R=sl.deg?p=>rotAxis(p,nv,sl.deg):p=>p;
    const faces=[];for(let f=0;f<6;f++){const nz=rot3(R(FACE_GEOM[f].n),yaw,pitch)[2];if(nz>=0.02)faces.push({f,nz});}
    faces.sort((x,y)=>x.nz-y.nz);
    for(const {f} of faces){const g=FACE_GEOM[f];
      // the box face: plastic. A cut face inside the cube has no stickers.
      const corner=(su,sv)=>[0,1,2].map(i=>g.n[i]?(g.n[i]>0?hi[i]:lo[i]):g.r[i]?(g.r[i]*su>0?hi[i]:lo[i]):(g.d[i]*sv>0?hi[i]:lo[i]));
      polys.push({pts:[[-1,-1],[1,-1],[1,1],[-1,1]].map(([su,sv])=>proj(R(corner(su,sv)))),fill:body});
      for(let i=0;i<n;i++)for(let j=0;j<n;j++){const idx=n*n*f+n*i+j;const cu=(j-(n-1)/2)*2*hs,cv=(i-(n-1)/2)*2*hs;
        const cubie=[0,1,2].map(t=>g.n[t]*(1.5-hs)+g.r[t]*cu+g.d[t]*cv);const along=cubie[0]*Math.abs(nv[0])+cubie[1]*Math.abs(nv[1])+cubie[2]*Math.abs(nv[2]);
        const c=Math.round((along+1.5-hs)/(2*hs));if(c<sl.lo||c>sl.hi)continue; // this cubie is in another slab
        const h=0.88*hs,i54=to54(idx);const pts=[[cu-h,cv-h],[cu+h,cv-h],[cu+h,cv+h],[cu-h,cv+h]].map(([u,v])=>proj(R([0,1,2].map(t=>g.n[t]*1.5+g.r[t]*u+g.d[t]*v))));
        const poly={pts,fill:color(facelets[idx],i54),stroke:body,faded:!!(opts.fade&&!opts.fade.has(i54)),idx:i54};
        if(opts.cls){const c=opts.cls(i54);if(c)poly.cls=c;}
        polys.push(poly);
      }
    }
  }
  return polys;
}
function polysSVG(polys){return polys.map(p=>`<polygon${p.cls?` class="${p.cls}"`:''} points="${p.pts.map(q=>q.map(v=>v.toFixed(2)).join(',')).join(' ')}" fill="${p.fill}"${p.faded?' opacity="0.22"':''}${p.stroke?` stroke="${p.stroke}" stroke-width="0.6" stroke-linejoin="round"`:''}/>`).join('');}
// The kind of piece a facelet belongs to: 'center', 'edge' or 'corner'.
function pieceKind(idx,n){n=n||3;const p=idx%(n*n),i=Math.floor(p/n),j=p%n;const e=x=>x===0||x===n-1;return e(i)&&e(j)?'corner':e(i)||e(j)?'edge':'center';}
// A ring of three curved arrows in the plane of a face, the way the move turns it: clockwise
// as you look at that face for a plain move, counterclockwise for a prime. Projected with the
// same camera as cubePolys (yaw, pitch, scale, cx, cy), so it sits on the face in the picture.
// By default the ring floats just above the face center. Pass at:[x,y,z] to put its center
// somewhere else in space, for example beside the cube when the face is hidden; the ring
// keeps the plane of the face, so the arrows still show the true turn from this camera.
// Pass r for a wider ring where the camera sees the plane at a slant.
function turnRing(move,opts={}){
  const yaw=opts.yaw??-32,pitch=opts.pitch??28;const S=opts.scale||52;const cx=opts.cx??200,cy=opts.cy??185;
  const g=FACE_GEOM['URFDLB'.indexOf(move[0])];if(!g)return '';
  const proj=p=>{const q=rot3(p,yaw,pitch);return [cx+q[0]*S,cy-q[1]*S];};
  const dir=move.endsWith("'")?-1:1,r=opts.r||0.95,span=78,N=12;const f=n=>n.toFixed(1);
  const at=opts.at||g.n.map(v=>v*1.66);
  let out='';
  for(let k=0;k<3;k++){const a0=-90+k*120-dir*span/2;const pts=[];
    for(let i=0;i<=N;i++){const a=(a0+dir*span*i/N)*Math.PI/180;pts.push(proj([0,1,2].map(t=>at[t]+g.r[t]*r*Math.cos(a)+g.d[t]*r*Math.sin(a))));}
    const [x1,y1]=pts[N-1],[x2,y2]=pts[N];let dx=x2-x1,dy=y2-y1;const L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;
    const head=s=>{const c=Math.cos(s),sn=Math.sin(s);return [x2-0.26*S*(dx*c-dy*sn),y2-0.26*S*(dx*sn+dy*c)];};
    const [hx1,hy1]=head(0.55),[hx2,hy2]=head(-0.55);
    out+=`<polyline points="${pts.map(p=>f(p[0])+','+f(p[1])).join(' ')}"/><polyline points="${f(hx1)},${f(hy1)} ${f(x2)},${f(y2)} ${f(hx2)},${f(hy2)}"/>`;}
  // A dark halo under a white stroke: the ring reads on every sticker color, in both themes.
  return `<g class="turn-ring" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="rgba(0,0,0,.78)" stroke-width="${(0.2*S).toFixed(1)}">${out}</g><g stroke="#fff" stroke-width="${(0.09*S).toFixed(1)}">${out}</g></g>`;
}
// The box round the polygons, with a margin, as a viewBox string.
function polysViewBox(polys,margin=0){const xs=polys.flatMap(p=>p.pts.map(q=>q[0])),ys=polys.flatMap(p=>p.pts.map(q=>q[1]));
  const x0=Math.min(...xs)-margin,y0=Math.min(...ys)-margin,x1=Math.max(...xs)+margin,y1=Math.max(...ys)+margin;return [x0,y0,x1-x0,y1-y0].map(v=>v.toFixed(2)).join(' ');}
function renderCube3D(facelets,opts={}){return polysSVG(cubePolys(facelets,opts));}
function renderNet(facelets,opts={}){
  const n=opts.n||DRAW_N;if(n===2&&facelets.length===54)facelets=TWO_FACELET.map(i=>facelets[i]);
  const to54=n===2?i=>TWO_FACELET[i]:i=>i; // the index the options see: the 3×3 one for a 2×2, the native one otherwise
  const s=opts.size||(n===2?45:n===4?22.5:30);const pos=[[n,0],[2*n,n],[n,n],[n,2*n],[0,n],[3*n,n]];let out='';
  for(let f=0;f<6;f++){const [px,py]=pos[f];for(let i=0;i<n;i++)for(let j=0;j<n;j++){const idx=n*n*f+n*i+j;const faded=opts.fade&&!opts.fade.has(to54(idx));
    out+=`<rect x="${(px+j)*s+20}" y="${(py+i)*s+20}" width="${s-2}" height="${s-2}" rx="3" fill="${stickerColor(facelets[idx])}" ${faded?'opacity="0.22"':''} stroke="var(--sticker-line)" stroke-width="1"/>`;}}
  return out;
}
