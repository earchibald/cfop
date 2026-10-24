// ===================== CASE PICTURES IN MOTION =====================
// Play case pictures (Settings, cw:playPics): a case picture turns its algorithm on a 3D cube, holds
// the solved cube, and starts again. loopPlay(el, {start, moves, n, viewBox}) puts the loop in el
// and keeps the still picture; loopStop(el) puts the still picture back. A loop stops by itself when
// el leaves the page. Each move turns as the player's moves do: an ease in and out, a quarter turn
// in 380 ms, a half turn in 520 ms. Loads after draw.js and engine.js.
const LOOP={turn:380,half:520,gap:140,hold:900,rest:600};
function loopPlay(el,{start,moves,n=3,viewBox='40 30 320 300',scale=48}){
  loopStop(el);if(!el||!start||!moves||!moves.length)return;
  const still=el.innerHTML,ms=Array.isArray(moves)?moves:parseAlg(moves);
  el.innerHTML=`<svg viewBox="${viewBox}" aria-hidden="true" class="loopsvg"></svg>`;const svg=el.firstChild;
  const st={still,raf:0,timer:0,on:true};el._loop=st;
  const o={yaw:-32,pitch:28,scale,n},draw=(c,move,t)=>{svg.innerHTML=renderCube3D(c.toFacelets(),move?{...o,move,t:Math.max(t,0.01)}:o);};
  const wait=(ms,f)=>{st.timer=setTimeout(()=>{if(st.on&&el.isConnected)f();else loopStop(el);},ms);};
  const run=(c,i)=>{if(i>=ms.length){draw(c);wait(LOOP.hold,()=>{draw(start);wait(LOOP.rest,()=>run(start,0));});return;}
    const m=ms[i],dur=m.endsWith('2')?LOOP.half:LOOP.turn,t0=performance.now(),next=applyAlg(c,[m]);
    const step=()=>{if(!st.on)return;if(!el.isConnected){loopStop(el);return;}const x=Math.min(1,(performance.now()-t0)/dur);
      if(x>=1){draw(next);wait(LOOP.gap,()=>run(next,i+1));return;}
      draw(c,m,0.5-0.5*Math.cos(Math.PI*x));st.raf=requestAnimationFrame(step);};
    st.raf=requestAnimationFrame(step);};
  draw(start);wait(LOOP.rest,()=>run(start,0));}
function loopStop(el){const st=el&&el._loop;if(!st)return;st.on=false;cancelAnimationFrame(st.raf);clearTimeout(st.timer);el._loop=null;el.innerHTML=st.still;}
function loopRunning(el){return !!(el&&el._loop);}
