// The cube picture with a layer part way through a move.
// At t=0 the picture is the plain picture. At t=1 every sticker sits where the matching
// sticker of the cube after the move sits, with the same color, from any camera angle.
// Half way through, the picture has the cut faces and no bad numbers.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','js/draw.js');
const T=run(`({Cube,applyAlg,parseAlg,cubePolys,renderCube3D,polysViewBox,moveGeom})`);

const base=T.applyAlg(new T.Cube(),T.parseAlg("F R U' L2 D B' R2 U"));
const views=[[-32,28],[-32,-34],[140,10],[45,-20],[0,0],[90,89]];
const moves=[];for(const b of [..."URFDLBurfdlbMESxyz"])for(const s of ['',"'",'2'])moves.push(b+s);

// stickers as color + center, for matching
const stickers=polys=>polys.filter(p=>p.stroke).map(p=>({fill:p.fill,x:p.pts.reduce((a,q)=>a+q[0],0)/4,y:p.pts.reduce((a,q)=>a+q[1],0)/4}));
const same=(A,B)=>{if(A.length!==B.length)return false;const used=new Set();
  for(const a of A){let hit=-1;for(let i=0;i<B.length;i++){if(used.has(i))continue;const b=B[i];if(b.fill===a.fill&&Math.hypot(a.x-b.x,a.y-b.y)<0.05){hit=i;break;}}
    if(hit<0)return false;used.add(hit);}return true;};

// vm objects have their own prototypes: compare as JSON
const eq=(a,b)=>assert.strictEqual(JSON.stringify(a),JSON.stringify(b));
let checks=0;
for(const [yaw,pitch] of views){
  const plain=T.renderCube3D(base.toFacelets(),{yaw,pitch});
  for(const m of moves){
    const f=base.toFacelets();
    // t=0 and no move draw the same picture
    assert.strictEqual(T.renderCube3D(f,{yaw,pitch,move:m,t:0}),plain,`t=0 ${m}`);
    // t=1 lands on the moved cube
    const after=T.applyAlg(base,[m]).toFacelets();
    const A=stickers(T.cubePolys(f,{yaw,pitch,move:m,t:1}));const B=stickers(T.cubePolys(after,{yaw,pitch}));
    assert.ok(same(A,B),`t=1 ${m} at yaw ${yaw} pitch ${pitch}: ${A.length} vs ${B.length} stickers`);
    // half way: finite numbers
    const half=T.cubePolys(f,{yaw,pitch,move:m,t:0.5});
    assert.ok(half.every(p=>p.pts.every(q=>q.every(Number.isFinite))),`t=0.5 ${m} numbers`);
    checks++;
  }
}
// A turn of a hidden face draws behind the rest of the cube. Half way through D from the
// player view, the D layer's cut face must not paint over the U stickers: the layer is far,
// so it is drawn first. The same for every face the camera cannot see, from every view.
const rot3=(p,yaw,pitch)=>{const a=yaw*Math.PI/180,b=pitch*Math.PI/180;const [x,y,z]=p;const x1=x*Math.cos(a)+z*Math.sin(a),z1=-x*Math.sin(a)+z*Math.cos(a);return [x1,y*Math.cos(b)-z1*Math.sin(b),y*Math.sin(b)+z1*Math.cos(b)];};
const inside=(pt,poly)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];
  if((yi>pt[1])!==(yj>pt[1])&&pt[0]<(xj-xi)*(pt[1]-yi)/(yj-yi)+xi)c=!c;}return c;};
const NORMALS={U:[0,1,0],R:[1,0,0],F:[0,0,1],D:[0,-1,0],L:[-1,0,0],B:[0,0,-1]},OPP={U:'D',R:'L',F:'B',D:'U',L:'R',B:'F'};
let hiddenChecks=0;
for(const [yaw,pitch] of views)for(const face of 'URFDLB'){
  if(rot3(NORMALS[face],yaw,pitch)[2]>=0)continue; // the camera sees this face
  const front='URFDLB'.indexOf(OPP[face]);
  for(const m of [face,face+"'",face+'2',face.toLowerCase()]){
    const polys=T.cubePolys(base.toFacelets(),{yaw,pitch,move:m,t:0.5});
    polys.forEach((p,i)=>{if(p.idx===undefined||Math.floor(p.idx/9)!==front)return;
      const c=[p.pts.reduce((a,q)=>a+q[0],0)/4,p.pts.reduce((a,q)=>a+q[1],0)/4];
      const over=polys.slice(i+1).find(q=>q.idx===undefined&&inside(c,q.pts));
      assert.ok(!over,`${m} at yaw ${yaw} pitch ${pitch}: plastic drawn over sticker ${p.idx}`);});
    hiddenChecks++;}}
assert.ok(hiddenChecks>=20,'hidden faces were checked');
// A quarter turn and a half turn go the right way: R takes the front-right column up.
const g=T.moveGeom('R');eq(g,{n:[1,0,0],layers:[1],depths:[0],deg:-90});
assert.strictEqual(T.moveGeom("U'").deg,90);assert.strictEqual(T.moveGeom('F2').deg,-180);
eq(T.moveGeom('r').layers,[0,1]);eq(T.moveGeom('M').layers,[0]);eq(T.moveGeom('M').n,[-1,0,0]);
eq(T.moveGeom('x').layers,[-1,0,1]);
assert.throws(()=>T.moveGeom('Q'));assert.throws(()=>T.moveGeom('R3'));
// Half way through R from the player view, the layer's right face is visible and the cut face shows.
const half=T.cubePolys(new T.Cube().toFacelets(),{move:'R',t:0.5});
assert.ok(half.filter(p=>!p.stroke).length>3,'cut face and strips drawn');
// The mark's view box is stable
assert.strictEqual(T.polysViewBox(T.cubePolys(new T.Cube().toFacelets(),{move:'R',t:0.5,scale:10,cx:0,cy:0}),0.5),'-21.17 -23.45 45.63 46.41');
// rot turns the whole cube before the camera. The body turned +90° about y is the move y' seen
// from the fixed camera; 180° is y2; 90° about x is x'. The same stickers in the same places.
const ry=a=>{const c=Math.cos(a*Math.PI/180),s=Math.sin(a*Math.PI/180);return [[c,0,s],[0,1,0],[-s,0,c]];};
const rx=a=>{const c=Math.cos(a*Math.PI/180),s=Math.sin(a*Math.PI/180);return [[1,0,0],[0,c,-s],[0,s,c]];};
for(const [yaw,pitch] of views)for(const [rot,mv] of [[ry(90),"y'"],[ry(180),'y2'],[ry(-90),'y'],[rx(90),"x'"],[rx(-90),'x']]){
  const A=stickers(T.cubePolys(base.toFacelets(),{yaw,pitch,rot})),B=stickers(T.cubePolys(T.applyAlg(base,[mv]).toFacelets(),{yaw,pitch}));
  assert.ok(same(A,B),`rot ${mv} from ${yaw},${pitch}`);
}
assert.strictEqual(T.renderCube3D(base.toFacelets(),{rot:[[1,0,0],[0,1,0],[0,0,1]]}),T.renderCube3D(base.toFacelets()),'the identity changes nothing');
// A part turn with the body turned lands on the moved cube.
{const after=T.applyAlg(base,['R']);const A=stickers(T.cubePolys(base.toFacelets(),{rot:ry(60),move:'R',t:1})),B=stickers(T.cubePolys(after.toFacelets(),{rot:ry(60)}));assert.ok(same(A,B),'a part turn with rot');}
// The hidden faces turn with the move. At t=1 the mirrors show the cube after the move, from any
// view, for every move. A hidden face that the move turns spins in its own plane at full strength;
// a strip beside the move rolls over the edge and fades as it tips away.
let mirrorChecks=0;
const hints=polys=>stickers(polys.filter(p=>p.hint));
for(const [yaw,pitch] of views)for(const m of moves){
  const f=base.toFacelets(),after=T.applyAlg(base,[m]).toFacelets();
  assert.ok(same(hints(T.cubePolys(f,{yaw,pitch,hidden:true,move:m,t:1})),hints(T.cubePolys(after,{yaw,pitch,hidden:true}))),`mirrors after ${m} at yaw ${yaw} pitch ${pitch}`);
  assert.ok(T.cubePolys(f,{yaw,pitch,hidden:true,move:m,t:0.5}).every(p=>p.pts.every(q=>q.every(Number.isFinite))),`mirrors half way through ${m}`);
  mirrorChecks++;}
{const solved=new T.Cube().toFacelets();
  const B=T.cubePolys(solved,{hidden:true,move:'B',t:0.5}).filter(p=>p.hint&&Math.floor(p.idx/9)===5);
  assert.strictEqual(B.length,9,'B half way: the back mirror keeps its nine stickers');
  assert.ok(B.every(p=>p.op===0.6),'a face that spins in its own plane does not fade');
  const R=T.cubePolys(solved,{hidden:true,move:'R',t:0.5}).filter(p=>p.hint);
  assert.ok(R.some(p=>p.op<0.6),'R half way: the strips beside the move fade as they tip');
  assert.ok(R.some(p=>Math.floor(p.idx/9)===0),'R half way: the U strip rolls onto the back mirror');
  assert.strictEqual(T.cubePolys(solved,{hidden:true,move:'R',t:0}).filter(p=>p.hint).length,27,'t=0: the mirrors at rest');}
// A lifted piece shows what the cube leaves in view, from any face it came out of: a point of a
// lifted face is drawn exactly when no part of the cube stands between it and the camera.
let liftChecks=0;
{const L=run(`({rot3,FACE_GEOM,pieceStickers})`),solved=new T.Cube().toFacelets(),S=52,cx=200,cy=185;
  const inConvex=(P,q)=>{let s=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length],c=(b[0]-a[0])*(q[1]-a[1])-(b[1]-a[1])*(q[0]-a[0]);if(Math.abs(c)<1e-9)continue;if(s&&Math.sign(c)!==s)return false;s=Math.sign(c);}return true;};
  const nearEdge=(P,q)=>P.some((a,i)=>{const b=P[(i+1)%P.length],dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dy)/l)):0;return Math.hypot(a[0]+dx*t-q[0],a[1]+dy*t-q[1])<0.5;});
  const drawn=(P,q)=>inConvex(P.pts,q)&&!(P.cut&&inConvex(P.cut,q));
  // the ray from p toward the camera meets the cube (the slab test)
  const blocked=(p,v)=>{let t0=1e-9,t1=1e9;for(let i=0;i<3;i++){if(Math.abs(v[i])<1e-12){if(p[i]<=-1.5||p[i]>=1.5)return false;continue;}
    let a=(-1.5-p[i])/v[i],b=(1.5-p[i])/v[i];if(a>b)[a,b]=[b,a];t0=Math.max(t0,a);t1=Math.min(t1,b);}return t0<t1;};
  for(const [yaw,pitch] of [[-32,28],[-32,-34],[140,10],[45,-20],[10,5],[-60,70]])for(const sticker of [1,3,5,7,0,4,28,30,32,34,37,39,41,43])for(const t of [0.15,0.5,1]){
    const polys=T.cubePolys(solved,{yaw,pitch,lift:{set:new Set(L.pieceStickers(sticker)),t}});
    const faces=polys.slice(polys.findIndex(p=>p.glow)).filter(p=>!p.glow&&!p.stroke); // the plastic of the lifted piece, one per face drawn
    const v=[0,1,2].map(a=>L.rot3([0,1,2].map(b=>a===b?1:0),yaw,pitch)[2]); // toward the camera, in cube space
    const proj=p=>{const q=L.rot3(p,yaw,pitch);return [cx+q[0]*S,cy-q[1]*S];};
    const g0=L.FACE_GEOM[Math.floor(sticker/9)],p0=sticker%9,c=[0,1,2].map(i=>g0.n[i]+g0.r[i]*(p0%3-1)+g0.d[i]*(Math.floor(p0/3)-1)),len=Math.hypot(...c),C=c.map(x=>x*(1+0.55*t/len));
    for(const g of L.FACE_GEOM){if(L.rot3(g.n,yaw,pitch)[2]<0.02)continue;
      for(let i=0;i<=10;i++)for(let j=0;j<=10;j++){const p=[0,1,2].map(k=>C[k]+g.n[k]*0.5+g.r[k]*(i/10-0.5)*0.98+g.d[k]*(j/10-0.5)*0.98),q=proj(p);
        if(faces.some(P=>nearEdge(P.pts,q)||P.cut&&nearEdge(P.cut,q)))continue; // too close to call
        const seen=faces.some(P=>drawn(P,q)),want=!blocked(p,v);
        assert.strictEqual(seen,want,`lift ${sticker} t=${t} at ${yaw},${pitch}: a point ${want?'in view is not drawn':'behind the cube is drawn'}`);liftChecks++;}}}
  // seen from a little above, the bottom left edge leaves the cube past two faces turned away from
  // the camera; it still shows below the cube, with its glow, the part the cube hides cut out
  const dl=T.renderCube3D(solved,{yaw:-32,pitch:8,lift:{set:new Set(L.pieceStickers(43)),t:1}});
  assert.ok(/cwLiftGlow/.test(dl)&&/fill-rule="evenodd"/.test(dl),'the bottom left edge shows past the cube');}
console.log('draw ok:',checks,'move/view checks,',liftChecks,'lift points,',hiddenChecks,'hidden-face turns,',mirrorChecks,'mirror turns');
