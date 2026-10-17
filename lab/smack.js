// ================= Smart cube lab: the tilt as motion =================
// Pure functions for the lab page, lab/index.html. No DOM. The lab does not load cubetab.js (that
// drags the whole page with it), so the quaternion helpers live here too; keep them the same.
// Quaternions are [x,y,z,w], unit, in the frame of draw.js (x right, y up, z toward the viewer):
// the turn of the body, as ganGyro gives them. quatMul(a,b) is a after b: its matrix is the matrix
// of a times the matrix of b. quatMat gives the 3×3 matrix (three rows) that draw.js takes as rot.
function quatMul(a,b){const [ax,ay,az,aw]=a,[bx,by,bz,bw]=b;
  return [aw*bx+ax*bw+ay*bz-az*by,aw*by-ax*bz+ay*bw+az*bx,aw*bz+ax*by-ay*bx+az*bw,aw*bw-ax*bx-ay*by-az*bz];}
function quatNorm(q){const l=Math.hypot(...q)||1;return q.map(v=>v/l);}
function quatConj(q){return [-q[0],-q[1],-q[2],q[3]];}
function quatMat(q){const [x,y,z,w]=quatNorm(q);
  return [[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]];}
// Part of the way from a to b, the short way round. t=1 is b.
function quatSlerp(a,b,t){
  let d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];if(d<0){b=b.map(v=>-v);d=-d;}
  if(d>0.9995)return quatNorm(a.map((v,i)=>v+(b[i]-v)*t));
  const th=Math.acos(Math.min(1,d)),s=Math.sin(th),wa=Math.sin((1-t)*th)/s,wb=Math.sin(t*th)/s;
  return a.map((v,i)=>v*wa+b[i]*wb);
}
// The angle between two turns, in degrees.
function quatAngle(a,b){const d=Math.abs(a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]);return 2*Math.acos(Math.min(1,d))*180/Math.PI;}
// The turn from a to b (b is that turn after a): its axis, a unit vector in the world frame
// ([0,0,0] for no turn), and its angle in degrees.
function quatDelta(a,b){
  let [x,y,z,w]=quatNorm(quatMul(b,quatConj(a)));
  if(w<0){x=-x;y=-y;z=-z;w=-w;}
  const s=Math.hypot(x,y,z);
  return {deg:2*Math.atan2(s,w)*180/Math.PI,axis:s>1e-9?[x/s,y/s,z/s]:[0,0,0]};
}
// A quarter turn of the body about an axis of draw.js, right-hand rule: 'x','y','z' or a prime.
function quatAxisTurn(m){const s=Math.SQRT1_2,b={x:[s,0,0,s],y:[0,s,0,s],z:[0,0,s,s]}[m[0]];return m.endsWith("'")?quatConj(b):b;}
// The heading for a reading: the turn about the vertical that puts the cube's axes, seen from
// above, where `ref` puts them (cubeTabYawBasis in cubetab.js, with any reference pose in place of
// the hold). Of the three axes (green, red, white), the one most level in both frames sets it, so
// a tilt in the reading stays in the picture.
function yawBasis(raw,ref){
  const M=quatMat(raw),H=quatMat(ref||[0,0,0,1]);
  let best=-1,a=0;
  for(const c of [2,0,1]){
    const g=[M[0][c],M[2][c]],h=[H[0][c],H[2][c]],lv=Math.min(Math.hypot(g[0],g[1]),Math.hypot(h[0],h[1]));
    if(lv>best){best=lv;a=Math.atan2(h[0],h[1])-Math.atan2(g[0],g[1]);}
  }
  return [0,Math.sin(a/2),0,Math.cos(a/2)];
}
// Reset cube: the correction that makes the reading `raw` the reference pose `ref` (the hold; white
// up and green toward the viewer when not given). 'yaw' turns about the vertical only, so the
// tilt stays what gravity says: a cube held level shows level. 'full' takes the whole reading, so
// a cube held at a slant shows square, and shows the slant the other way once it is held level.
function resetBasis(raw,mode,ref){ref=ref||[0,0,0,1];return mode==='full'?quatMul(ref,quatConj(quatNorm(raw))):yawBasis(raw,ref);}

// ----- smacks -----
// The cube reports its tilt, not its acceleration. A smack on a face shows as a short jolt of the
// whole cube that comes back: the body turns a few degrees and the hand brings it back within a
// fraction of a second. A turn of the cube in the hands goes and stays. The face: a push on a face
// turns the body about an axis across that face (the torque is r × F, and F lies along the face's
// normal), so the face hit is the axis with the least of the jolt in it. The right and the left
// face lie across the same axis; the tilt alone cannot tell them apart.
const SMACK_FACES=['right or left','top or bottom','front or back'];
const SMACK_DEFAULTS={jolt:5,settle:2.5,within:350,maxDeg:45,back:0.5,stillSpeed:40,restTc:400,perp:0.45,face:0,gap:1500,count:3};
// jolt: deg, a jolt starts past this from the rest pose. settle: deg, and is over under this.
// within: ms, a jolt that lasts longer is a turn. maxDeg: deg, a jolt past this is a turn.
// back: the share of the peak the cube must come back by, else it is a turn. stillSpeed: deg/s,
// under this the cube is still, which also ends a jolt. restTc: ms, how fast the rest pose
// follows a still cube. perp: the largest share of the jolt axis the face's own axis may have for
// the face to be named. face: the face a series counts (an index in SMACK_FACES, null for any).
// gap: ms, the longest wait between two smacks of one series. count: the smacks in a series.
// feed(t,q) takes one reading at time t (ms) and returns the events it makes:
//   {type:'smack',t,deg,ms,axis,share,face,name}  a jolt that came back
//   {type:'turn',t,deg,axis}                       a jolt that stayed: the cube turned in the hands
//   {type:'series',t,smacks}                       `count` smacks on `face`, each within `gap` of the last
// state holds the live numbers: deg (from the rest pose), speed (deg/s), n (readings), series.
function smackDetector(opts){
  const o=Object.assign({},SMACK_DEFAULTS,opts);
  const st={rest:null,restAt:0,last:null,lastAt:0,cand:null,series:[],deg:0,speed:0,n:0};
  function reset(){st.rest=null;st.cand=null;st.series=[];st.last=null;st.deg=0;st.speed=0;}
  function smack(c,t){
    const share=c.axis.map(Math.abs);let f=0;for(let i=1;i<3;i++)if(share[i]<share[f])f=i;
    const face=share[f]<=o.perp?f:null;
    return {type:'smack',t,deg:c.peak,ms:t-c.t0,axis:c.axis,share,face,name:face==null?'unclear':SMACK_FACES[face]};
  }
  function feed(t,q){
    q=quatNorm(q);st.n++;const out=[];
    if(st.last){const d=quatDelta(st.last,q);st.speed=d.deg/Math.max(1,t-st.lastAt)*1000;}
    st.last=q;st.lastAt=t;
    if(!st.rest){st.rest=q;st.restAt=t;return out;}
    const d=quatDelta(st.rest,q);st.deg=d.deg;
    const c=st.cand;
    if(!c){
      if(d.deg>o.jolt)st.cand={t0:t,peak:d.deg,axis:d.axis,peakAt:t};
      else st.rest=quatSlerp(st.rest,q,1-Math.exp(-(t-st.restAt)/o.restTc)); // still: the rest pose follows the cube
      st.restAt=t;return out;
    }
    if(d.deg>c.peak){c.peak=d.deg;c.axis=d.axis;c.peakAt=t;}
    const stays=t-c.t0>o.within||c.peak>o.maxDeg;
    const still=t-c.peakAt>=40&&st.speed<o.stillSpeed;
    if(!stays&&d.deg>=o.settle&&!still)return out; // the jolt goes on
    st.cand=null;st.rest=q;st.restAt=t;
    if(stays||d.deg>c.peak*(1-o.back)){st.series=[];out.push({type:'turn',t,deg:c.peak,axis:c.axis});return out;}
    const s=smack(c,t);out.push(s);
    if(o.face!=null&&s.face!==o.face){st.series=[];return out;}
    if(st.series.length&&t-st.series[st.series.length-1].t>o.gap)st.series=[];
    st.series.push(s);
    if(st.series.length>=o.count){out.push({type:'series',t,smacks:st.series});st.series=[];}
    return out;
  }
  return {feed,reset,state:st,opts:o,set(k,v){o[k]=v;}};
}

// ----- whole-cube turns -----
// A turn of the cube in the hands, from the tilt alone: the body leaves its rest pose and comes
// to rest again somewhere else. The detector cuts the readings into turns and says when each one
// starts, how it goes on, and when it is over; what the new pose means (which of the 24 holds it
// is nearest, if any) is for the caller, who knows the hold.
const TURN_DEFAULTS={start:15,settle:4,still:300,updateMs:250,restTc:1500};
// start: deg from the rest pose, a turn begins past this. settle: deg, the body moved less than
// this since the last anchor counts as still. still: ms still, and the turn is over. updateMs: ms
// between two update events. restTc: ms, how fast the rest pose follows a still cube (a slow lean).
// The name of a turn: the move letter for the axis with the most of it (x right, y up, z toward
// the viewer), plain for a turn the way x, y and z go, a prime the other way, 2 past 135 degrees.
function turnName(axis,deg){
  let i=0;for(let k=1;k<3;k++)if(Math.abs(axis[k])>Math.abs(axis[i]))i=k;
  const m='xyz'[i];return deg>135?m+'2':axis[i]<0?m:m+"'";
}
// feed(t,q) takes one reading and returns the events it makes:
//   {type:'tstart',t,deg,axis,name}         the body left the rest pose
//   {type:'tupdate',t,deg,axis,name,ms}     every updateMs while it moves
//   {type:'tfinish',t,deg,axis,name,ms,q}   still again: the turn from the rest pose, and the new rest pose
// deg and axis are the turn from the rest pose so far. state: turning (bool), deg, rest.
function turnDetector(opts){
  const o=Object.assign({},TURN_DEFAULTS,opts);
  const st={rest:null,restAt:0,anchor:null,anchorAt:0,turning:false,t0:0,lastUpd:0,deg:0};
  function reset(){st.rest=null;st.anchor=null;st.turning=false;st.deg=0;}
  function feed(t,q){
    q=quatNorm(q);const out=[];
    if(!st.rest){st.rest=q;st.restAt=t;st.anchor=q;st.anchorAt=t;return out;}
    const d=quatDelta(st.rest,q);st.deg=d.deg;
    if(quatAngle(st.anchor,q)>o.settle){st.anchor=q;st.anchorAt=t;}
    if(!st.turning){
      if(d.deg>o.start){st.turning=true;st.t0=t;st.lastUpd=t;out.push({type:'tstart',t,deg:d.deg,axis:d.axis,name:turnName(d.axis,d.deg)});}
      else{st.rest=quatSlerp(st.rest,q,1-Math.exp(-(t-st.restAt)/o.restTc));st.restAt=t;}
      return out;
    }
    if(t-st.anchorAt>=o.still){
      st.turning=false;st.rest=q;st.restAt=t;
      out.push({type:'tfinish',t,deg:d.deg,axis:d.axis,name:turnName(d.axis,d.deg),ms:t-st.t0,q});return out;
    }
    if(t-st.lastUpd>=o.updateMs){st.lastUpd=t;out.push({type:'tupdate',t,deg:d.deg,axis:d.axis,name:turnName(d.axis,d.deg),ms:t-st.t0});}
    return out;
  }
  return {feed,reset,state:st,opts:o,set(k,v){o[k]=v;}};
}
