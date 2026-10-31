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
// How the user holds the cube: one of the 24 ways, as CUBE_TAB_HOLDS in js/cubetab.js builds them.
// moves: the shortest turns from white up, green front; cube: the cube after them (its centers say
// which of the cube's faces is at each place, so a turn of the white face is D when white is
// down); q: the turn of the picture (white up, green toward the viewer is no turn). The id names
// the top and the front: 'white-green'.
const QUEST_COLOR_NAMES=['white','red','green','yellow','orange','blue'];
const QUEST_HOLDS=(()=>{
  const s=Math.SQRT1_2,base={x:[-s,0,0,s],y:[0,-s,0,s],z:[0,0,-s,s]},conj=q=>[-q[0],-q[1],-q[2],q[3]];
  const qOf=m=>{const b=base[m[0]];return m.endsWith("'")?conj(b):m.endsWith('2')?quatMul(b,b):b;};
  const turns=['x','y','z',"x'","y'","z'",'x2','y2','z2'],out={},seen=new Set();
  let layer=[{moves:[],cube:new Cube(),q:[0,0,0,1]}];
  while(layer.length){
    const next=[];
    for(const h of layer){const k=h.cube.center.join();if(seen.has(k))continue;seen.add(k);
      const top=h.cube.center[0],front=h.cube.center[2];
      out[QUEST_COLOR_NAMES[top]+'-'+QUEST_COLOR_NAMES[front]]=Object.assign(h,{id:QUEST_COLOR_NAMES[top]+'-'+QUEST_COLOR_NAMES[front],top,front});
      for(const m of turns)next.push({moves:h.moves.concat(m),cube:applyAlg(h.cube,[m]),q:quatMul(qOf(m),h.q)});}
    layer=next;
  }
  return out;
})();
const QUEST_HOLD_FIRST=QUEST_HOLDS['white-green'];
// A kept id: the ids before 0.4.0 were the top alone, with green in front.
function questHoldFind(id){return QUEST_HOLDS[id]||QUEST_HOLDS[id+'-green']||QUEST_HOLD_FIRST;}
function questRelabel(m,hold){
  if(!hold||!hold.moves.length||!/^[URFDLB]/.test(m))return m;
  return FACE_NAMES[hold.cube.center.indexOf(FACE_NAMES.indexOf(m[0]))]+m.slice(1);
}
function questHeld(cube,hold){return cube&&hold&&hold.moves.length?applyAlg(cube,hold.moves):cube;}
// The tiles of the hold row, as on the Smart cube tab: Top white or yellow; Front green, orange,
// blue or red.
const QUEST_TOPS=[0,3],QUEST_FRONTS=[2,4,5,1];
// A tile: a top keeps the front where it can, else the hold fewest turns away; a front keeps the
// top where it can, else white goes on top.
function questHoldPick(cur,place,c){
  cur=cur||QUEST_HOLD_FIRST;
  const turns=h=>{const d=cur.cube.inverse().mul(h.cube).center.join();const via=Object.values(QUEST_HOLDS).find(x=>x.cube.center.join()===d);return via?via.moves.length:9;};
  const up=place==='up'?c:(c!==cur.top&&c!==(cur.top+3)%6?cur.top:0),front=place==='up'?null:c;
  const want=Object.values(QUEST_HOLDS).filter(h=>h.top===up&&(front==null||h.front===front));
  const score=h=>(h.front===cur.front?0:10)+turns(h);
  return want.sort((a,b)=>score(a)-score(b))[0]||cur;
}

// ----- the drill -----
// A case drilled on the real cube, whatever state it is in: the picture starts as the case, set up
// as the cube is held, and each turn of the real cube turns the picture. The picture's state is the
// case's state times the moves made since the start: setup · P0⁻¹ · P, with P0 the real cube at the
// start and P the real cube now. The moves between two pictures are the moves between the two real
// states, so the layer turns, the list and the stage work as they do for the real cube. When the
// picture is solved, "Solved" shows for QUEST_SOLVED_MS with a count of two, then the case comes again.
const QUEST_SOLVED_MS=2000;
// The cases there are: the two-look OLL and PLL (js/algs.js ALG_DB) and the full PLL. {id, name, alg}.
function questDrillCases(){
  const out=[];
  if(typeof ALG_DB!=='undefined')for(const g of Object.values(ALG_DB))for(const c of g)out.push({id:c.id,name:c.name,alg:c.alg});
  if(typeof PLL_FULL!=='undefined')for(const c of PLL_FULL)out.push({id:'pll-'+c.name,name:c.name+' perm',alg:c.alg});
  return out;
}
// A case by its id or its name, in any case: 'co-sune', 'Sune', 'T perm'. null when there is none.
function questDrillFind(name){
  const k=String(name||'').trim().toLowerCase(),all=questDrillCases();
  return all.find(c=>c.id.toLowerCase()===k)||all.find(c=>c.name.toLowerCase()===k)||null;
}
// The case's state, as the real cube must be for the case to show as held: the inverse of the
// algorithm from solved, in the held frame, then turned to the cube's own frame by the hold (H X H⁻¹,
// so a held R is the real face that the hold puts on the right). An algorithm whose whole-cube
// turns do not cancel (V perm has a y in it) leaves the centers turned: its face turns, each named
// as the cube is held at that point, are the algorithm and then its whole-cube turn undone, so the
// case is that turn, then the inverse (r X): its centers sit home.
function questDrillSetup(alg,hold){
  let X=applyAlg(new Cube(),invertAlg(alg));
  if(X.center.join()!=='0,1,2,3,4,5'){const back=Object.values(QUEST_HOLDS).find(h=>h.cube.mul(X).center.join()==='0,1,2,3,4,5');if(back)X=back.cube.mul(X);}
  const H=(hold||QUEST_HOLD_FIRST).cube;
  return H.mul(X).mul(H.inverse());
}
// The picture for the real state: setup · P0⁻¹ · P.
function questDrillState(d,real){return d.setup.mul(d.p0.inverse()).mul(real);}

// ----- the hidden faces -----
// As draw.js draws them (hiddenFacePolys): each face that looks away from the eye has a mirror out
// along its normal, dist past the face, and its stickers show on it from behind, as in a mirror.
// A sticker of a turning layer rolls over onto the mirror beside it, its height above the face cut
// to flat. In the cube's units (a cubie is 1, the cube spans -1.5..1.5).
const QUEST_MIRROR={dist:2.4,flat:0.35,alpha:0.6};
// The matrix that puts a point of the cube on the mirror of the face with normal m: out by dist,
// its height above the face cut to flat. p' = p + m*(D - w + flat*(w - 1.5)), w = p·m.
function questMirror(m,dist,flat){
  const D=1.5+(dist??QUEST_MIRROR.dist),k=flat??QUEST_MIRROR.flat,o=m4();
  for(let c=0;c<3;c++)for(let r=0;r<3;r++)o[c*4+r]=(r===c?1:0)-(1-k)*m[r]*m[c];
  for(let r=0;r<3;r++)o[12+r]=m[r]*(D-1.5*k);
  return o;
}
// The faces whose mirrors show: those that look away from the eye. model: the cube's matrix; eye: a
// point in the same space as the model's result.
function questHiddenFaces(model,eye){
  const c=m4Point(model,[0,0,0]),v=v3Sub(eye,c),lv=Math.hypot(...v)||1,out=[];
  for(let f=0;f<6;f++){const n=FACE_GEOM[f].n,w=[0,1,2].map(i=>model[i]*n[0]+model[4+i]*n[1]+model[8+i]*n[2]),lw=Math.hypot(...w)||1;
    if((w[0]*v[0]+w[1]*v[1]+w[2]*v[2])/(lw*lv)<=-0.02)out.push(f);}
  return out;
}
// How far from the center a mirror reaches, at most: the plane out at 1.5+dist, and a face's half width.
function questMirrorReach(){return Math.hypot(1.5+QUEST_MIRROR.dist,1.5);}

// ----- the panel -----
// The color of a move's face as held: the center on that face of the held cube.
const QUEST_HEX=['#f3f2ec','#d8283b','#14a85f','#ffd21e','#ff6a1c','#2c6fdc'];
function questMoveColor(m,heldCube){const f='URFDLB'.indexOf(m[0]);return f<0?'#8f8f97':QUEST_HEX[(heldCube?heldCube.center:[0,1,2,3,4,5])[f]];}
// The lines of the floating panel: the link, the stage (or the drill, while one runs: its case and
// the count solved), the last moves. Plain data; render.js draws it.
function questPanel(s){
  const head=s.name?s.name+(s.battery!=null?' · '+s.battery+'%':''):'No cube';
  const stage=s.drill?s.drill:s.stage?(s.stage.name+(s.stage.sub?' · '+s.stage.sub:'')):'';
  const moves=(s.moves||[]).slice(-12);
  return {head,status:s.status||'',stage,moves,count:(s.moves||[]).length,tilt:!!s.tilt,hint:s.hint||''};
}

// ----- the hands -----
// Hands first: the user holds the real cube, so every control works with one free hand, and a
// controller is only a second way. Two rows of buttons float under the cube, square to the user:
// the controls, then the hold (Top, Front, as the Smart cube tab's tiles) and Exit. An index
// fingertip that goes through a button's face presses it once. Sizes in meters: w and h a button,
// tile a hold tile (square), gap between two, group between two groups.
const QUEST_BAR={w:0.05,h:0.04,tile:0.04,gap:0.007,group:0.024,hover:0.03,armed:0.012,deep:0.04};
// A third row has the drill (Drill mode, or Stop drill while one runs), New scramble, Real cube
// state (off while the picture is the real cube) and Listen (the voice, with or without a drill).
// In the Quest app (quest/native.js) the second row has Bring here (the cube and the panel come
// back in front of the user) and In my hands (the cube rides between the hands that hold the real
// one) in place of Exit, and the third row ends with Quit, which asks for a second poke too.
// s: {tilt, still (the tilt is on, a cube is live and no reading came yet), moves (a count),
// panel, hidden, top, front (the hold's colors), exit (armed), drill (one runs), over (a drill or
// a scramble is on the picture), listen (the voice is on), app, follow (In my hands is on)}.
function questBarButtons(s){
  const tile=(place,c)=>({id:(place==='up'?'top-':'front-')+QUEST_COLOR_NAMES[c],label:place==='up'?'Top':'Front',row:1,tile:true,
    color:QUEST_HEX[c],on:(place==='up'?s.top:s.front)===c,group:c===QUEST_FRONTS[0]});
  const quit=s.app?[{id:'exit',label:s.exit?'Poke again':'Quit',row:2,group:true,warn:!!s.exit}]:[];
  return [
    {id:'tilt',label:!s.tilt?'Tilt off':s.still?'No tilt yet':'Tilt on',on:!!s.tilt,row:0},
    {id:'level',label:'Level',row:0},
    {id:'clear',label:'Clear',off:!s.moves,row:0},
    {id:'hidden',label:'Hidden faces',on:!!s.hidden,row:0},
    {id:'smaller',label:'Smaller',row:0},
    {id:'larger',label:'Larger',row:0},
    {id:'panel',label:s.panel?'Hide panel':'Show panel',row:0},
    ...QUEST_TOPS.map(c=>tile('up',c)),...QUEST_FRONTS.map(c=>tile('front',c)),
    ...(s.app?[{id:'here',label:'Bring here',row:1,group:true},{id:'follow',label:'In my hands',on:!!s.follow,row:1}]:
      [{id:'exit',label:s.exit?'Poke again':'Exit',row:1,group:true,warn:!!s.exit}]),
    {id:'drill',label:s.drill?'Stop drill':'Drill mode',on:!!s.drill,row:2},
    {id:'scramble',label:'New scramble',row:2},
    {id:'real',label:'Real cube state',off:!s.over,row:2},
    {id:'listen',label:s.listen?'Stop listening':'Listen',on:!!s.listen,row:2,group:true},
    ...quit,
  ];
}
// Where each button sits, in the row's frame (x right, y up, from the middle of the first row):
// {x, y, w, h} at its center. Each row is centered; a button with group starts a new group.
function questBarLayout(buttons){
  const B=QUEST_BAR,rows=[];
  for(const b of buttons)(rows[b.row||0]=rows[b.row||0]||[]).push(b);
  const out=new Map();
  rows.forEach((row,r)=>{
    const w=b=>b.tile?B.tile:B.w;
    const width=row.reduce((s,b,i)=>s+w(b)+(i?(b.group?B.group:B.gap):0),0);
    let x=-width/2;const y=-r*(B.h+B.gap);
    row.forEach((b,i)=>{if(i)x+=b.group?B.group:B.gap;out.set(b,{x:x+w(b)/2,y,w:w(b),h:B.h});x+=w(b);});
  });
  return buttons.map(b=>out.get(b));
}
// The box round the layout: {x0, x1, y0, y1}.
function questBarBox(rects){return {x0:Math.min(...rects.map(r=>r.x-r.w/2)),x1:Math.max(...rects.map(r=>r.x+r.w/2)),y0:Math.min(...rects.map(r=>r.y-r.h/2)),y1:Math.max(...rects.map(r=>r.y+r.h/2))};}
// Where the rows sit: under the cube, clear of the space where a pinch takes the cube, and clear of
// the mirrors when the hidden faces show.
function questGrabRadius(edge){return Math.max(0.12,edge*0.85);}
function questBarCenter(pos,edge,hidden){
  const clear=Math.max(questGrabRadius(edge),hidden?edge/3*questMirrorReach():0);
  return v3Add(pos,[0,-(clear+QUEST_BAR.h/2+0.02),0]);
}
// A point in the row's own frame: x right, y up, z toward the user (face: the row's yaw).
function questBarLocal(p,center,face){return quatApply([-face[0],-face[1],-face[2],face[3]],v3Sub(p,center));}
// The button under a local point, by x and y only: an index into rects, or -1.
function questBarHit(local,rects){
  return rects.findIndex(r=>Math.abs(local[0]-r.x)<=r.w/2&&Math.abs(local[1]-r.y)<=r.h/2);
}
// One fingertip, one frame. st: {armed} for that fingertip, kept by the caller. A press needs the
// tip in front of the button first (armed) and then through its face, not more than deep behind
// it; it comes once, and the tip must come back out in front to press again. A tip that comes in
// from behind or from the side presses nothing. Returns {press, hover} as button indexes or -1.
function questPoke(st,local,rects){
  const i=local?questBarHit(local,rects):-1,z=local?local[2]:1;
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
