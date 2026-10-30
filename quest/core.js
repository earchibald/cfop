// ================= Quest cube lab: the pure part =================
// No DOM, no WebGL: the matrices, where each cubie and sticker sits, which cubies a move turns,
// the moves between two states, and the hold. test/quest.js runs it in node.
//
// Axes as in draw.js and WebXR alike: x right, y up, z toward the viewer. A cubie sits at -1, 0 or
// 1 on each axis and is one unit wide, so the cube spans -1.5..1.5; the renderer scales it to
// meters. Quaternions are [x,y,z,w] as in lab/smack.js (which this page loads for quatMul,
// quatSlerp, resetBasis). Matrices are 4×4, column-major Float32Arrays, as WebGL and WebXR use.

// ----- matrices -----
function m4(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);}
function m4Mul(a,b){
  const o=new Float32Array(16);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}
  return o;
}
// Translate, turn by the quaternion q, scale by s (one number, or [sx,sy,sz]).
function m4Trs(t,q,s){
  const [x,y,z,w]=q||[0,0,0,1],[sx,sy,sz]=Array.isArray(s)?s:[s??1,s??1,s??1];
  const xx=x*x,yy=y*y,zz=z*z,xy=x*y,xz=x*z,yz=y*z,wx=w*x,wy=w*y,wz=w*z;
  return new Float32Array([
    (1-2*(yy+zz))*sx,2*(xy+wz)*sx,2*(xz-wy)*sx,0,
    2*(xy-wz)*sy,(1-2*(xx+zz))*sy,2*(yz+wx)*sy,0,
    2*(xz+wy)*sz,2*(yz-wx)*sz,(1-2*(xx+yy))*sz,0,
    t[0],t[1],t[2],1]);
}
// Columns a, b, c (the local x, y and z axes), then the place t, then a scale s.
function m4Basis(a,b,c,t,s){s=s??1;return new Float32Array([a[0]*s,a[1]*s,a[2]*s,0,b[0]*s,b[1]*s,b[2]*s,0,c[0]*s,c[1]*s,c[2]*s,0,t[0],t[1],t[2],1]);}
function m4Persp(fovyDeg,aspect,near,far){
  const f=1/Math.tan(fovyDeg*Math.PI/360),nf=1/(near-far);
  return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);
}
function m4Point(m,p){return [0,1,2].map(i=>m[i]*p[0]+m[4+i]*p[1]+m[8+i]*p[2]+m[12+i]);}
// A turn of deg degrees about the unit axis n, right-hand rule.
function quatAxis(n,deg){const h=deg*Math.PI/360,s=Math.sin(h);return [n[0]*s,n[1]*s,n[2]*s,Math.cos(h)];}
// The vector v turned by the quaternion q.
function quatApply(q,v){const [x,y,z,w]=q,ix=w*v[0]+y*v[2]-z*v[1],iy=w*v[1]+z*v[0]-x*v[2],iz=w*v[2]+x*v[1]-y*v[0],iw=-x*v[0]-y*v[1]-z*v[2];
  return [ix*w+iw*-x+iy*-z-iz*-y,iy*w+iw*-y+iz*-x-ix*-z,iz*w+iw*-z+ix*-y-iy*-x];}
// The turn about the vertical that points +z from `from` toward `to` (two points), seen from above.
function quatFacing(from,to){const dx=to[0]-from[0],dz=to[2]-from[2];if(Math.hypot(dx,dz)<1e-6)return [0,0,0,1];return quatAxis([0,1,0],Math.atan2(dx,dz)*180/Math.PI);}
function v3Add(a,b){return [a[0]+b[0],a[1]+b[1],a[2]+b[2]];}
function v3Sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function v3Scale(a,s){return [a[0]*s,a[1]*s,a[2]*s];}
function v3Dist(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);}
function v3Cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}

// ----- the cube's parts -----
// The 26 cubies, each a place [x,y,z].
const QUEST_CUBIES=(()=>{const o=[];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)if(x||y||z)o.push([x,y,z]);return o;})();
// The 54 stickers in facelet order (9*face + 3*row + column, faces U R F D L B), from FACE_GEOM in
// draw.js: the cubie it sits on, the outward normal n, and the face's right r and down d.
const QUEST_STICKERS=Array.from({length:54},(_,idx)=>{
  const g=FACE_GEOM[Math.floor(idx/9)],p=idx%9,i=Math.floor(p/3),j=p%3;
  const cubie=[0,1,2].map(t=>g.n[t]+g.r[t]*(j-1)+g.d[t]*(i-1));
  return {idx,cubie,n:g.n,r:g.r,d:g.d,up:v3Cross(g.n,g.r)};
});
// Does the move (moveGeom of draw.js) turn the cubie at p? The layers count along the face normal:
// 1 is the face's own layer, 0 the middle, -1 the far one.
function questMoves(g,p){return g.layers.includes(g.n[0]*p[0]+g.n[1]*p[1]+g.n[2]*p[2]);}

// ----- the moves between two states (labPath in lab/lab.js) -----
const QUEST_FACE_MOVES=['U',"U'",'U2','R',"R'",'R2','F',"F'",'F2','D',"D'",'D2','L',"L'",'L2','B',"B'",'B2'];
const questKey=c=>c.cp.join()+'/'+c.co.join()+'/'+c.ep.join()+'/'+c.eo.join();
// The shortest list of up to four moves from one state to the next: two moves out meet two moves
// back. [] for the same state, null for five or more apart (the picture then jumps).
function questPath(from,to){
  if(!from||!to)return null;
  const inv=m=>m.endsWith("'")?m[0]:m.endsWith('2')?m:m+"'";
  const grow=layer=>{const next=[];for(const {c,ms} of layer)for(const m of QUEST_FACE_MOVES){if(ms.length&&ms[ms.length-1][0]===m[0])continue;next.push({c:applyAlg(c,[m]),ms:ms.concat(m)});}return next;};
  const back=new Map();let bl=[{c:to,ms:[]}];
  for(let d=0;d<=2;d++){for(const {c,ms} of bl){const k=questKey(c);if(!back.has(k))back.set(k,ms.map(inv).reverse());}if(d<2)bl=grow(bl);}
  let layer=[{c:from,ms:[]}],best=null;
  for(let d=0;d<=2;d++){
    if(best&&best.length<=d)return best;
    for(const {c,ms} of layer){const b=back.get(questKey(c));if(b&&(!best||ms.length+b.length<best.length))best=ms.concat(b);}
    if(best&&best.length<=d+1)return best;
    if(d<2)layer=grow(layer);
  }
  return best;
}
// A move onto the list: the same face as the last move merges with it (R R is R2, R R' is nothing).
function questTurns(m){return m.endsWith('2')?2:m.endsWith("'")?3:1;}
function questMerge(moves,m){
  const last=moves[moves.length-1];
  if(!last||last[0]!==m[0])return moves.concat(m);
  const t=(questTurns(last)+questTurns(m))%4;
  return moves.slice(0,-1).concat(t?[m[0]+['','','2',"'"][t]]:[]);
}

// ----- the hold -----
// How the user holds the cube. q turns the picture (white up, green toward the viewer is no turn);
// moves turn a state into the cube as held (for cfopStage); faces names each face of the cube as it
// sits in the hands, so a turn of the white face is D when white is down.
const QUEST_HOLDS={
  white:{id:'white',words:'white up, green toward you',q:[0,0,0,1],moves:[],faces:{U:'U',D:'D',R:'R',L:'L',F:'F',B:'B'}},
  yellow:{id:'yellow',words:'yellow up, green toward you',q:[0,0,1,0],moves:['z2'],faces:{U:'D',D:'U',R:'L',L:'R',F:'F',B:'B'}},
};
function questRelabel(m,hold){return (hold||QUEST_HOLDS.white).faces[m[0]]+m.slice(1);}
function questHeld(cube,hold){return cube&&hold&&hold.moves.length?applyAlg(cube,hold.moves):cube;}

// ----- the panel -----
// The color of a move's face as held: the center on that face of the held cube.
const QUEST_HEX=['#f3f2ec','#d8283b','#14a85f','#ffd21e','#ff6a1c','#2c6fdc'];
function questMoveColor(m,heldCube){const f='URFDLB'.indexOf(m[0]);return f<0?'#8f8f97':QUEST_HEX[(heldCube?heldCube.center:[0,1,2,3,4,5])[f]];}
// The lines of the floating panel: the link, the stage, the last moves. Plain data; render.js draws it.
function questPanel(s){
  const head=s.name?s.name+(s.battery!=null?' · '+s.battery+'%':''):'No cube';
  const stage=s.stage?(s.stage.name+(s.stage.sub?' · '+s.stage.sub:'')):'';
  const moves=(s.moves||[]).slice(-12);
  return {head,status:s.status||'',stage,moves,count:(s.moves||[]).length,tilt:!!s.tilt,hint:s.hint||''};
}

// ----- the hands -----
// Hands first: the user holds the real cube, so every control works with one free hand, and a
// controller is only a second way. A row of buttons floats under the cube, square to the user; an
// index fingertip that goes through a button's face presses it once. Sizes in meters.
const QUEST_BAR={w:0.054,h:0.04,gap:0.008,hover:0.03,armed:0.012,deep:0.04};
function questBarButtons(s){
  return [
    {id:'tilt',label:s.tilt?'Tilt on':'Tilt off',on:!!s.tilt},
    {id:'level',label:'Level'},
    {id:'clear',label:'Clear',off:!s.moves},
    {id:'smaller',label:'Smaller'},
    {id:'larger',label:'Larger'},
    {id:'panel',label:s.panel?'Hide panel':'Show panel'},
  ];
}
// Where the row sits: under the cube, clear of the space where a pinch takes the cube.
function questGrabRadius(edge){return Math.max(0.12,edge*0.85);}
function questBarCenter(pos,edge){return v3Add(pos,[0,-(questGrabRadius(edge)+QUEST_BAR.h/2+0.02),0]);}
function questBarWidth(n){return n*QUEST_BAR.w+(n-1)*QUEST_BAR.gap;}
// A point in the row's own frame: x right, y up, z toward the user (face: the row's yaw).
function questBarLocal(p,center,face){return quatApply([-face[0],-face[1],-face[2],face[3]],v3Sub(p,center));}
// The button under a local point, by x and y only.
function questBarHit(local,n){
  const half=questBarWidth(n)/2,i=Math.floor((local[0]+half)/(QUEST_BAR.w+QUEST_BAR.gap));
  if(i<0||i>=n||Math.abs(local[1])>QUEST_BAR.h/2)return -1;
  const x=local[0]+half-i*(QUEST_BAR.w+QUEST_BAR.gap);
  return x<=QUEST_BAR.w?i:-1;
}
// One fingertip, one frame. st: {armed} for that fingertip, kept by the caller. A press needs the
// tip in front of the button first (armed) and then through its face, not more than deep behind
// it; it comes once, and the tip must come back out in front to press again. A tip that comes in
// from behind or from the side presses nothing. Returns {press, hover} as button indexes or -1.
function questPoke(st,local,n){
  const i=local?questBarHit(local,n):-1,z=local?local[2]:1;
  let press=-1;
  if(i<0||z>QUEST_BAR.hover){st.armed=i>=0&&z>QUEST_BAR.armed;}
  else if(z>QUEST_BAR.armed)st.armed=true;
  else if(z<=0&&z>-QUEST_BAR.deep&&st.armed){press=i;st.armed=false;}
  else if(z<=-QUEST_BAR.deep)st.armed=false;
  return {press,hover:i>=0&&z<=QUEST_BAR.hover&&z>-QUEST_BAR.deep?i:-1};
}
// A pinch away from the cube brings it back only when held this long, and only by a free hand.
const QUEST_HOLD_MS=600,QUEST_FREE_M=0.2;
// A hand is free when no other hand is near it: two hands on the real cube are close together.
function questHandFree(p,others){return others.every(o=>!o||v3Dist(p,o)>QUEST_FREE_M);}
