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
console.log('draw ok:',checks,'move/view checks,',hiddenChecks,'hidden-face turns');
