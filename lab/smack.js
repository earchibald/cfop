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
// Experiment 3: one face turned and turned back, three times over (R R' R R' R R', or
// U' U U' U U' U), is a gesture: the lab does Reset cube. Fed each move as the cube reports it,
// before the list merges it (R then R' merge to nothing). A move of another face, a half turn, or
// the same quarter turn twice starts the count over; `count` quarter turns in a row is a hit, and
// the count starts over after it.
const TWIST_DEFAULTS={count:6};
function twistDetector(opts){
  const o=Object.assign({},TWIST_DEFAULTS,opts);
  const st={moves:[]};
  function reset(){st.moves=[];}
  function feed(m){
    const quarter=/^[URFDLB]'?$/.test(m),last=st.moves[st.moves.length-1];
    if(!quarter)st.moves=[];
    else if(last&&last[0]===m[0]&&last!==m)st.moves.push(m);
    else st.moves=[m];
    if(st.moves.length<o.count)return false;
    st.moves=[];return true;
  }
  return {feed,reset,state:st,opts:o,set(k,v){o[k]=v;}};
}

// ----- fat moves -----
// Experiment 4. The cube counts the turns of its six faces against its core, and the tilt sensor
// sits in the core. A fat move turns a face and the middle layer next to it together: r is R with
// the middle layer. The middle layer carries four centers, and the centers are the core, so the
// core turns with it. Against the core, only the far face moved: the cube reports r as L, and the
// core (so the tilt) turns a quarter about the same axis, as x. That is the whole signal: r = L x.
// For each move the cube reports, the detector takes the core's turn from `pre` ms before the
// report to `post` ms after it, in the cube's own frame, and splits it into the twist about the
// reported face's axis and the swing off that axis. A face turn leaves the core still. A fat turn
// twists it the other way from the face's own turn ("against" the face): L turns clockwise as seen
// from the left, the core of r turns clockwise as seen from the right. Twist against the face past
// `min` degrees (90 + min for a half turn), with swing under `swing` degrees, is a fat move.
// pre, post: ms, the window about the report. min: deg, the least twist against the face for a fat
// move. swing: deg, the most turn off the axis (a cube turned in the hands some other way is not
// a fat move). flip: take the twist the other way, should the real cube show it with the sign turned.
const FAT_DEFAULTS={pre:350,post:250,min:45,swing:45,flip:false};
// FAT_WIDE: ms each side of a report that a record keeps, so a change of the knobs can judge the
// moves already made again. FAT_KEEP: ms of readings the detector holds.
const FAT_WIDE=800,FAT_KEEP=2000;
// The outward axis of each face in the cube's own frame, in the axes of draw.js: white up +y, red
// right +x, green front +z.
const FAT_AXES={U:[0,1,0],D:[0,-1,0],R:[1,0,0],L:[-1,0,0],F:[0,0,1],B:[0,0,-1]};
const FAT_OPP={U:'D',D:'U',R:'L',L:'R',F:'B',B:'F'};
// The whole-cube turn that goes with a fat turn of each face, the way the fat turn goes: r = L x.
const FAT_ROT={R:'x',L:"x'",U:'y',D:"y'",F:'z',B:"z'"};
// The fat move the cube reports as `m` (a face move): the far face, small, the same way round.
// L is r, R' is l', U2 is d2.
function fatName(m){return FAT_OPP[m[0]].toLowerCase()+m.slice(1);}
// The whole-cube turn inside a fat move: r is x, r' is x', l is x', u2 is y2.
function fatRot(f){const b=FAT_ROT[f[0].toUpperCase()],s=f.slice(1);
  if(s==='2')return b[0]+'2';if(s==="'")return b.endsWith("'")?b[0]:b+"'";return b;}
function fatSameAxis(a,b){return a[0]===b[0]||FAT_OPP[a[0]]===b[0];}
// The turn of the core from q0 to q1 in the cube's own frame, split about `axis`: twist, signed by
// the right-hand rule (counterclockwise seen from the tip of the axis), and swing, the rest, in degrees.
function fatTwist(q0,q1,axis){
  let [x,y,z,w]=quatNorm(quatMul(quatConj(quatNorm(q0)),quatNorm(q1)));
  if(w<0){x=-x;y=-y;z=-z;w=-w;}
  const p=x*axis[0]+y*axis[1]+z*axis[2],l=Math.hypot(p,w)||1;
  const tw=[axis[0]*p/l,axis[1]*p/l,axis[2]*p/l,w/l],s=quatMul([x,y,z,w],quatConj(tw));
  return {twist:2*Math.atan2(p,w)*180/Math.PI,swing:2*Math.acos(Math.min(1,Math.abs(s[3])))*180/Math.PI};
}
// The reading at dt ms from the report, part way between the two readings about it. Before the
// first reading, the first; after the last, the last.
function fatAt(samples,dt){
  if(!samples.length)return null;
  if(dt<=samples[0][0])return samples[0][1];
  for(let i=1;i<samples.length;i++)if(samples[i][0]>=dt){const [a,qa]=samples[i-1],[b,qb]=samples[i];return quatSlerp(qa,qb,b>a?(dt-a)/(b-a):1);}
  return samples[samples.length-1][1];
}
// The window of a record under the knobs: from pre before to post after, cut at the half-way
// point to a move on the same axis before it, or after it when that one came within post. Two
// fat turns in a row (r r) then each get their own quarter.
function fatWindow(rec,o){
  let a=-o.pre,b=o.post;
  if(rec.prev!=null)a=Math.max(a,rec.prev/2);
  if(rec.next!=null&&rec.next<=o.post)b=Math.min(b,rec.next/2);
  return [a,b];
}
// The twist against the face: positive the way a fat move turns the core.
function fatAgainst(m,twist,o){const s=m.slice(1);return s==='2'?Math.abs(twist):twist*(s==="'"?-1:1)*(o.flip?-1:1);}
// Judge one record: {m, samples:[[dt,q]...], prev, next} where m is the move as the cube names it,
// dt is ms from the report, prev and next the ms to the moves on the same axis (null for none).
// Returns {fat, against, swing, n (readings in the window), a, b, name}.
function fatJudge(rec,opts){
  const o=Object.assign({},FAT_DEFAULTS,opts),[a,b]=fatWindow(rec,o);
  const n=rec.samples.filter(s=>s[0]>=a&&s[0]<=b).length;
  if(!rec.samples.length)return {fat:false,against:null,swing:null,n:0,a,b,name:rec.m};
  const {twist,swing}=fatTwist(fatAt(rec.samples,a),fatAt(rec.samples,b),FAT_AXES[rec.m[0]]);
  const against=fatAgainst(rec.m,twist,o),fat=against>=(rec.m.endsWith('2')?90+o.min:o.min)&&swing<=o.swing;
  return {fat,against,swing,n,a,b,name:fat?fatName(rec.m):rec.m};
}
// The twist against the face over the whole record, from the start of the record (or the half-way
// point to the move before it on the same axis), for the trace: [[dt,deg]...].
function fatCurve(rec,opts){
  const o=Object.assign({},FAT_DEFAULTS,opts);
  const a=rec.prev!=null?Math.max(-FAT_WIDE,rec.prev/2):-FAT_WIDE,q0=fatAt(rec.samples,a);
  if(!q0)return [];
  return rec.samples.filter(s=>s[0]>=a).map(([dt,q])=>[dt,fatAgainst(rec.m,fatTwist(q0,q,FAT_AXES[rec.m[0]]).twist,o)]);
}
// When the core turns, about the report: the ms at which the curve has made 10%, 50% and 90% of
// its way. null for a curve that hardly moves (under 30 degrees).
function fatSpan(curve){
  if(!curve.length)return null;
  const end=curve[curve.length-1][1],top=Math.max(...curve.map(c=>c[1])),full=Math.max(end,top*0.9);
  if(full<30)return null;
  const at=f=>{const c=curve.find(c=>c[1]>=full*f);return c?c[0]:null;};
  return {t10:at(0.1),t50:at(0.5),t90:at(0.9),deg:full};
}
// The moves the user said were fat and the ones they said were face turns (truth 'fat', 'face'),
// judged under the knobs: counts, the share judged right, and the knobs that would judge them
// best: the window that holds the fat turns (from 50 ms before the earliest 10% to 50 ms after
// the latest 90%), and in it the least twist half-way between the groups (or the one with the
// fewest wrong when they overlap).
function fatStats(recs,opts){
  const o=Object.assign({},FAT_DEFAULTS,opts),g={fat:[],face:[],any:[]};
  for(const r of recs){const v=fatJudge(r,o);(g[r.truth]||g.any).push({r,v});}
  const out={fat:g.fat.length,face:g.face.length,any:g.any.length,fatRight:g.fat.filter(x=>x.v.fat).length,faceRight:g.face.filter(x=>!x.v.fat).length,suggest:null,spanFat:null};
  out.right=out.fatRight+out.faceRight;out.told=out.fat+out.face;
  const spans=g.fat.map(x=>fatSpan(fatCurve(x.r,o))).filter(Boolean);
  if(spans.length){
    const med=a=>{const s=a.filter(v=>v!=null).sort((p,q)=>p-q);return s.length?s[Math.floor(s.length/2)]:null;};
    out.spanFat={t10:med(spans.map(s=>s.t10)),t50:med(spans.map(s=>s.t50)),t90:med(spans.map(s=>s.t90))};
  }
  if(g.fat.length&&g.face.length){
    const t10=spans.map(s=>s.t10).filter(v=>v!=null),t90=spans.map(s=>s.t90).filter(v=>v!=null);
    const pre=t10.length?Math.max(0,Math.round((50-Math.min(...t10))/10)*10):o.pre;
    const post=t90.length?Math.max(0,Math.round((Math.max(...t90)+50)/10)*10):o.post;
    const o2=Object.assign({},o,{pre:Math.min(FAT_WIDE,pre),post:Math.min(FAT_WIDE,post)});
    // quarter turns as they are; a half turn needs 90 more, so it counts 90 less
    const val=x=>{const v=fatJudge(x.r,o2);return v.against==null?null:(x.r.m.endsWith('2')?v.against-90:v.against);};
    const fv=g.fat.map(val).filter(v=>v!=null),hv=g.face.map(val).filter(v=>v!=null);
    if(fv.length&&hv.length){
      let min=o.min;const lo=Math.min(...fv),hi=Math.max(...hv);
      if(lo>hi)min=(lo+hi)/2;
      else{let best=Infinity;for(const c of fv.concat(hv)){const wrong=fv.filter(v=>v<c).length+hv.filter(v=>v>=c).length;if(wrong<best){best=wrong;min=c;}}}
      out.suggest={pre:o2.pre,post:o2.post,min:Math.max(10,Math.min(90,Math.round(min))),apart:lo>hi};
    }
  }
  return out;
}
// The live detector. feedGyro(t,q) takes each reading (q as the cube reports it, the turn of the
// body; any heading, since only the turn between two readings counts), feedMove(t,m,extra) each
// move as the cube names it, at the time of its move message, and gives back an id (extra goes
// on the record: the truth, the lag). feedGyro, poll(t) and flush() return the events that are due:
//   {type:'verdict',id,m,t,fat,against,swing,n,name}  post ms after a move: fat or not
//   {type:'record',rec}                                 FAT_WIDE ms after it: the readings about it, for the data
// reset() drops what is open.
function fatDetector(opts){
  const o=Object.assign({},FAT_DEFAULTS,opts);
  const st={buf:[],open:[],seq:0};
  function reset(){st.buf=[];st.open=[];}
  const verdict=r=>{r.judged=true;r.v=fatJudge(r,o);return Object.assign({type:'verdict',id:r.id,m:r.m,t:r.t},r.v);};
  function poll(t){
    const out=[];
    for(const r of st.open)if(!r.judged&&t>=r.t+o.post)out.push(verdict(r));
    while(st.open.length&&st.open[0].judged&&t-st.open[0].t>FAT_WIDE)out.push({type:'record',rec:st.open.shift()});
    return out;
  }
  function feedGyro(t,q){
    q=quatNorm(q);st.buf.push([t,q]);while(st.buf.length&&t-st.buf[0][0]>FAT_KEEP)st.buf.shift();
    for(const r of st.open)if(t-r.t<=FAT_WIDE)r.samples.push([t-r.t,q]);
    return poll(t);
  }
  function feedMove(t,m,extra){
    if(!/^[URFDLB]['2]?$/.test(m))return null;
    const rec=Object.assign({id:++st.seq,t,m,samples:st.buf.filter(s=>t-s[0]<=FAT_WIDE).map(([u,q])=>[u-t,q]),prev:null,next:null,judged:false,v:null},extra);
    for(const r of st.open)if(fatSameAxis(r.m,m)){if(r.next==null)r.next=t-r.t;rec.prev=r.t-t;}
    st.open.push(rec);
    return rec.id;
  }
  // Every open move judged now, with the readings there are: for a jump, a clear or a drop.
  function flush(){return st.open.filter(r=>!r.judged).map(verdict);}
  return {feedGyro,feedMove,poll,flush,reset,state:st,opts:o,set(k,v){o[k]=v;}};
}
