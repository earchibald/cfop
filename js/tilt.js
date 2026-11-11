// ===== The tilt of a smart cube: the picture turns as the cube turns in your hands =====
// A gen 2 or gen 4 GAN cube reports its tilt many times a second (a `gyro` message, `q` in gan.js:
// the turn of the body, cube frame to world, in the axes of draw.js: x right, y up, z toward the
// viewer). js/live.js turns the player's picture with it. This file is the arithmetic (pure, no DOM).
//
// What 1.6 to 1.63 taught (docs/smart-cube.md):
// - The tilt drives the picture only. The moves and the stage read by the hold (cubeTab.hold, the
//   player's hold row). 1.6 to 1.9 took the hold from the tilt; it twitched and put turns on the
//   list that nobody made. Here the hold changes only when the user says so: a tile, a voice
//   command, or the gesture L L' L L'.
// - Never take the heading again on its own with a jump. 1.11.0 did it part way through a y turn,
//   and the picture swung back the other way, which read as a reversed axis.
// - The sign of the reading is settled (gan.js): do not negate it.
// The heading drifts: the cube has a gyro and gravity but no compass, so a turn about the vertical
// is never checked against anything. Five things hold the drift down here:
// 1. The basis. Q, the turn the picture shows, is T · Ry(psi) · raw. Ry(psi) is the heading: a turn
//    about the vertical (y in the reading's world; gravity tells the cube which way is up) that
//    lines the reading up with the way you face. T is a small tilt, at most `squareDeg`, so a cube
//    held a little tipped toward you shows square. A reset sets both: the cube as it sits now is the
//    hold, squared (`reset`). The correction must stay on the world side and stay a heading and a
//    small tilt: a whole hold there (z2, say) turns every later turn of the cube inside out, so the
//    picture tips away as the cube tips toward you. A cube held with another face up than the hold
//    says is past squareDeg: gravity wins, only the heading is set, and the picture shows the cube
//    as it is. Nothing but a reset sets T; psi takes the corrections below.
// 2. Zero speed. While the cube turns slower than `stillDps`, a hand is not turning it: what turn
//    about the vertical the reading shows then is drift, and psi takes it back. A tilt (pitch,
//    roll) is left alone: gravity keeps it true. The speed is measured over at least `speedMs`, so
//    readings that come in a bunch (a busy link) do not read as fast.
// 3. The drift rate (1.87). A gyro drifts at a near steady rate. While the cube is still, that rate
//    is learned (`bias`, an average over `biasMs`, at most `biasMaxDps`); while it moves, psi takes
//    the same rate back, so the drift does not build up through a long drill with no rest.
// 4. Square at rest. Once the cube has been still for `stillMs` and the heading sits within
//    `snapDeg` of square about the vertical (and the picture within `snapTiltDeg` of the hold in
//    every other way, so the face on top is clear), the heading eases toward square: faster the
//    farther off it is (about `snapMs` to take the error away), no faster than `snapDps` degrees a
//    second, and only about the vertical. A cube held square stays square over a long solve; a cube
//    held at a slant on purpose (past snapDeg) is left as it is. (Before 1.87 the window was 12
//    degrees off a hold in all, so a cube tipped toward you was never squared.)
// 5. A turn of a face (1.87, `nudge`; js/live.js calls it on each move). You turn a face with the
//    cube held toward you, so a move says the heading is near square: it takes `moveFrac` of the
//    heading's error away, at most `moveMaxDeg`, within the same window as 4. A drill with no rest
//    still comes back to square.
// The two gestures (tiltGesture, js/live.js acts on them) are the way back from anything else:
// R R' R R' (or R' R R' R) squares the picture to the hold (`reset`); L L' L L' (or L' L L' L) takes the hold
// the picture is nearest as the new hold, and squares the picture to it (`adopt`).
const TILT_DEFAULTS={stillDps:6,stillMs:400,speedMs:60,biasMs:4000,biasMaxDps:3,snapDeg:30,snapTiltDeg:20,snapMs:1500,snapDps:6,
  moveFrac:0.2,moveMaxDeg:3,gapMs:250,squareDeg:45};
// stillDps: deg/s, under this the cube is still and a turn about the vertical is drift. stillMs: ms
// still before the square pull starts. speedMs: ms, the shortest span the speed is measured over.
// biasMs: ms, the span the drift rate is averaged over. biasMaxDps: deg/s, the most drift rate taken.
// snapDeg: deg, the farthest the heading may be from square for the pull and the nudge. snapTiltDeg:
// deg, the most the picture may be off the hold in any other way. snapMs: ms, the pull's time
// constant. snapDps: deg/s, the fastest the pull turns the picture. moveFrac: the part of the
// heading's error a move takes away. moveMaxDeg: deg, the most one move takes. gapMs: ms, a longer
// gap between two readings (a slow link) says nothing about speed, so no correction acts on it.
// squareDeg: deg, the most tilt a reset squares away; past it the cube is held another way than the hold.
const TILT_RAD=Math.PI/180;
function tiltMul(a,b){const [ax,ay,az,aw]=a,[bx,by,bz,bw]=b;
  return [aw*bx+ax*bw+ay*bz-az*by,aw*by-ax*bz+ay*bw+az*bx,aw*bz+ax*by-ay*bx+az*bw,aw*bw-ax*bx-ay*by-az*bz];}
function tiltConj(q){return [-q[0],-q[1],-q[2],q[3]];}
function tiltNorm(q){const l=Math.hypot(...q)||1;return q.map(v=>v/l);}
// A turn of `deg` degrees about the unit `axis`, right-hand rule.
function tiltAbout(axis,deg){const h=deg*TILT_RAD/2,s=Math.sin(h);return [axis[0]*s,axis[1]*s,axis[2]*s,Math.cos(h)];}
// The vector v turned by q.
function tiltApply(q,v){const p=tiltMul(tiltMul(q,[v[0],v[1],v[2],0]),tiltConj(q));return [p[0],p[1],p[2]];}
// The angle between two turns, in degrees (q and -q are the same turn).
function tiltAngle(a,b){const d=Math.abs(a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]);return 2*Math.acos(Math.min(1,d))/TILT_RAD;}
// Part way from a to b (t from 0 to 1), on the short way round.
function tiltSlerp(a,b,t){let d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];if(d<0){b=b.map(v=>-v);d=-d;}
  if(d>0.9995)return tiltNorm(a.map((v,i)=>v+(b[i]-v)*t));
  const th=Math.acos(d),s=Math.sin(th),wa=Math.sin((1-t)*th)/s,wb=Math.sin(t*th)/s;return a.map((v,i)=>v*wa+b[i]*wb);}
// The part of the turn q about the unit `axis`, in degrees, -180 to 180 (the twist of a swing-twist split).
function tiltTwist(q,axis){const s=q[3]<0?-1:1,p=s*(q[0]*axis[0]+q[1]*axis[1]+q[2]*axis[2]);return 2*Math.atan2(p,s*q[3])/TILT_RAD;}
// The heading for a reading when the tilt cannot be squared away: the turn about the vertical that
// puts the cube's axes, seen from above, where the hold puts them, by whichever of the three axes is
// most level in both (cubeTabYawBasis before 1.64, yawBasis in lab/smack.js). In degrees.
function tiltYawFor(raw,holdQ){
  const ax=[[1,0,0],[0,1,0],[0,0,1]];let best=-1,a=0;
  for(const c of [2,0,1]){const g=tiltApply(raw,ax[c]),h=tiltApply(holdQ,ax[c]),lv=Math.min(Math.hypot(g[0],g[2]),Math.hypot(h[0],h[2]));
    if(lv>best){best=lv;a=Math.atan2(h[0],h[2])-Math.atan2(g[0],g[2]);}}
  return a/TILT_RAD;}
// Of `holds` (each with `q`), the one nearest the turn q.
function tiltNearest(q,holds){let best=null,bd=-1;for(const h of holds){const d=Math.abs(q[0]*h.q[0]+q[1]*h.q[1]+q[2]*h.q[2]+q[3]*h.q[3]);if(d>bd){bd=d;best=h;}}return best;}
// The face of the cube (an index in U R F D L B, the cube's own names) that the turn q puts most
// toward `dir` in the picture: [1,0,0] the right, [-1,0,0] the left.
const TILT_NORMALS=[[0,1,0],[1,0,0],[0,0,1],[0,-1,0],[-1,0,0],[0,0,-1]];
function tiltFaceToward(q,dir){let best=0,bd=-2;TILT_NORMALS.forEach((n,f)=>{const v=tiltApply(q,n),d=v[0]*dir[0]+v[1]*dir[1]+v[2]*dir[2];if(d>bd){bd=d;best=f;}});return best;}
// The tracker. feed(t, raw) takes a reading at time t (ms) and returns the turn the picture shows,
// or null before the first reset. reset(holdQ): the cube as it sits now is the hold `holdQ`, squared.
// adopt(holds): the hold the picture is nearest becomes the cube as it sits, squared; returns it.
// `holds` for the square pull: the 24 holds (CUBE_TAB_HOLDS), each with `q`.
function tiltTracker(opts){
  const o=Object.assign({},TILT_DEFAULTS,opts),holds=o.holds||[];
  const st={basis:null,psi:0,raw:null,t:0,speed:0,stillAt:null,ref:null,bias:0,drift:0,squared:0,nudged:0,level:false};
  const up=[0,1,0];
  // basis: T, the small tilt. level: the last reset could not square the cube (gravity won).
  // ref: the reading the speed is measured from. bias: the drift rate learned, deg/s about the vertical.
  const pose=()=>st.basis&&st.raw?tiltNorm(tiltMul(st.basis,tiltMul(tiltAbout(up,st.psi),st.raw))):null;
  function reset(holdQ){
    if(!st.raw)return null;holdQ=holdQ||[0,0,0,1];
    const A=tiltNorm(tiltMul(holdQ,tiltConj(st.raw))),psi=tiltTwist(A,up),T=tiltNorm(tiltMul(A,tiltConj(tiltAbout(up,psi)))); // A = T · Ry(psi), T a tilt alone
    if(tiltAngle(T,[0,0,0,1])<=o.squareDeg){st.basis=T;st.psi=psi;st.level=false;}
    else{st.basis=[0,0,0,1];st.psi=tiltYawFor(st.raw,holdQ);st.level=true;}
    return pose();}
  function adopt(list){const Q=pose();if(!Q)return null;const h=tiltNearest(Q,list||holds);if(h)reset(h.q);return h;}
  function clear(){st.basis=null;st.psi=0;st.raw=null;st.t=0;st.speed=0;st.stillAt=null;st.ref=null;st.bias=0;}
  // The heading's error from square, in degrees about the picture's vertical; null when the picture
  // is too far from every hold to say (past snapDeg about the vertical, or past snapTiltDeg in any
  // other way: a cube on its side, tipped well toward you).
  function offSquare(){
    const Q=pose();if(!Q||!holds.length)return null;
    const h=tiltNearest(Q,holds),E=tiltMul(Q,tiltConj(h.q)),a=tiltApply(st.basis,up),th=tiltTwist(E,a);
    if(Math.abs(th)>=o.snapDeg||tiltAngle(E,tiltAbout(a,th))>=o.snapTiltDeg)return null;
    return th;}
  // A move: the heading takes part of its error from square away. Returns the step, in degrees.
  function nudge(frac){
    const th=offSquare();if(th==null)return 0;
    const step=Math.max(-o.moveMaxDeg,Math.min(o.moveMaxDeg,th*(frac==null?o.moveFrac:frac)));
    st.psi-=step;st.nudged+=Math.abs(step);return step;}
  function feed(t,raw){
    raw=tiltNorm(raw);const prev=st.raw,dt=t-st.t;
    if(prev&&raw[0]*prev[0]+raw[1]*prev[1]+raw[2]*prev[2]+raw[3]*prev[3]<0)raw=raw.map(v=>-v); // the same turn, kept on one side
    st.raw=raw;st.t=t;
    if(!prev||dt<0||dt>o.gapMs){st.stillAt=null;st.ref={raw,t};return pose();}
    // The speed since ref, over speedMs at the least; ref moves on once speedMs has gone by.
    if(!st.ref)st.ref={raw:prev,t:t-dt};
    const span=t-st.ref.t;
    st.speed=tiltAngle(raw,st.ref.raw)/(Math.max(span,o.speedMs)/1000);
    if(span>=o.speedMs)st.ref={raw,t};
    const d=tiltMul(raw,tiltConj(prev)),yaw=tiltTwist(d,up),s=dt/1000; // the turn since the last reading, in the reading's world
    if(st.speed>=o.stillDps){ // a hand turns it: the drift rate learned is taken back
      st.stillAt=null;st.psi-=st.bias*s;st.drift+=Math.abs(st.bias*s);return pose();}
    if(st.stillAt==null)st.stillAt=t;
    st.psi-=yaw;st.drift+=Math.abs(yaw); // a turn about the vertical while still is drift
    if(s>0)st.bias=Math.max(-o.biasMaxDps,Math.min(o.biasMaxDps,st.bias+(yaw-st.bias*s)/(Math.max(o.biasMs,dt)/1000)));
    if(s>0&&t-st.stillAt>=o.stillMs){
      const th=offSquare();
      if(th!=null){ // proportional, at least a degree a second so it ends, at most snapDps
        const mag=Math.min(Math.abs(th),o.snapDps*s,Math.max(Math.abs(th)*dt/o.snapMs,s)),step=Math.sign(th)*mag;
        st.psi-=step;st.squared+=mag;}
    }
    return pose();
  }
  return {feed,reset,adopt,clear,pose,nudge,offSquare,state:st,opts:o};
}
// The gestures: one face turned and turned back, twice over, X X' X X' or X' X X' X, so the cube ends
// as it began; each turn within
// `gapMs` of the one before. feed(t, m) takes a move as the cube names it and returns the face
// (U R F D L B) when a gesture is complete, else null. A half turn, a slice or another face starts over.
const TILT_GESTURE_DEFAULTS={gapMs:800,count:4};
function tiltGesture(opts){
  const o=Object.assign({},TILT_GESTURE_DEFAULTS,opts),st={moves:[],t:0};
  function reset(){st.moves=[];}
  function feed(t,m){
    const quarter=/^[URFDLB]'?$/.test(m),last=st.moves[st.moves.length-1];
    if(!quarter)st.moves=[];
    else if(last&&t-st.t<=o.gapMs&&last[0]===m[0]&&last!==m)st.moves.push(m);
    else st.moves=[m];
    st.t=t;
    if(st.moves.length<o.count)return null;
    st.moves=[];return m[0];
  }
  return {feed,reset,state:st,opts:o};
}
