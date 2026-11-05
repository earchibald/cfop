// ===== Cross Trainer and Find the edges =====
// Two drills for the cross, on the Cross tab of CFOP (docs/cross-drill.md).
// Cross Trainer, the button on the cube (cw:crossTrain, off by default): the cube in view keeps the
// colors of the four cross edges and the centers, and every other piece is gray, as it turns: a
// virtual cube's keys, a smart cube's turns, the player's steps. drawMain (app.js) asks
// crossTrainFade for the stickers it draws.
// Find the edges, in the Cross drill sheet: a clock starts, and a click on each cross edge on the
// cube lifts it out with a glow. The fourth stops the clock. A click on another piece is a miss. A
// change of the cube in view (a turn, a step) stops it. Cross Trainer waits while a find runs.
// cw:crossFinds keeps the last 100 finds: ms, misses, the cross length (n), when (t).
const CF={on:false,t0:0,found:new Set(),lit:new Set(),miss:0,tick:0,state:'',last:null,down:null,drop:0};
const CROSS_COLOR_INDEX={white:0,red:1,green:2,yellow:3,orange:4,blue:5};
function crossColorName(){const s=$('#crossColor');return s&&s.value||'white';}
function crossColorIndex(){return CROSS_COLOR_INDEX[crossColorName()]??0;}
function crossOnCross(){return typeof method!=='undefined'&&method==='cfop'&&typeof curTab!=='undefined'&&curTab==='cross';}
// ---- Cross Trainer ----
function crossTrainOn(){return !!store.get('crossTrain',false);}
// The stickers that keep their colors in facelets f: the centers and both stickers of each cross
// edge. null: no fade (off, another tab, a find running).
function crossTrainFade(f){if(!crossTrainOn()||!crossOnCross()||CF.on)return null;const ci=crossColorIndex(),keep=new Set([4,13,22,31,40,49]);
  for(const e of edgeFacelet)if(f[e[0]]===ci||f[e[1]]===ci){keep.add(e[0]);keep.add(e[1]);}return keep;}
function crossTrainDraw(){const b=$('#crossTrainBtn');if(!b)return;const on=crossTrainOn();b.setAttribute('aria-pressed',String(on));
  b.title=on?'Cross Trainer is on: only the cross edges and the centers show their colors. Press to show every color':'Cross Trainer: gray every piece but the four cross edges and the centers, as you turn the cube';}
function crossTrainSet(on){store.set('crossTrain',!!on);crossTrainDraw();drawMain();}
// ---- Find the edges ----
function crossFindCls(){return CF.on?i=>'pk'+i:null;}
// The cross edge with a sticker at i in facelets f, by the color of its other sticker; null for another piece.
function crossFindEdge(f,i){const e=edgeFacelet.find(x=>x.includes(i)),ci=crossColorIndex();
  if(!e||(f[e[0]]!==ci&&f[e[1]]!==ci))return null;return {key:f[e[0]]===ci?f[e[1]]:f[e[0]],st:e};}
function crossFindStart(){if(!crossOnCross())return;crossFindStop();clearTimeout(CF.drop);
  if(view.mode!=='3d')setViewNet(false);
  Object.assign(CF,{on:true,t0:performance.now(),found:new Set(),lit:new Set(),miss:0,state:displayedCube.toFacelets().join('')});
  mainBump(null,{quiet:true});drawMain();crossFindDraw();CF.tick=setInterval(crossFindDraw,100);}
// note: words for why it stopped, in place of the count.
function crossFindStop(note){if(CF.tick){clearInterval(CF.tick);CF.tick=0;}if(!CF.on)return;CF.on=false;
  mainBump(null);drawMain();crossFindDraw();if(note){const o=$('#crossFindOut');if(o)o.textContent=note;}}
function crossFindPick(i){if(!CF.on)return;
  if(displayedCube.toFacelets().join('')!==CF.state){crossFindStop('Find stopped: the cube changed. Press Find the edges to start again.');return;}
  const hit=crossFindEdge(displayedCube.toFacelets(),i);
  if(!hit){CF.miss++;const c=$('#cube');if(c){c.classList.remove('cfmiss');void c.getBoundingClientRect();c.classList.add('cfmiss');setTimeout(()=>c.classList.remove('cfmiss'),300);}crossFindDraw();return;}
  if(CF.found.has(hit.key))return;CF.found.add(hit.key);hit.st.forEach(j=>CF.lit.add(j));
  // The found edges stay out of the cube, lit, till the fourth.
  mainBump(null,{quiet:true});mainLift={set:new Set(CF.lit),t:0.6,raf:0,timer:0};
  if(CF.found.size===4)crossFindDone();else{drawMain();crossFindDraw();}}
function crossFindDone(){const ms=Math.round(performance.now()-CF.t0),miss=CF.miss,n=typeof crossState!=='undefined'&&crossState.sol?crossState.sol.optimal:null;
  clearInterval(CF.tick);CF.tick=0;CF.on=false;CF.last={ms,miss};
  const log=(store.get('crossFinds',[])||[]).concat({ms,miss,n,t:Date.now()}).slice(-100);store.set('crossFinds',log);
  const L=mainLift;drawMain();crossFindDraw();CF.drop=setTimeout(()=>{if(mainLift===L)mainBump(null);},900);}
// The line under the button: words, then the part in bold, then words.
function crossFindSay(o,a,b,c){const s=document.createElement('b');s.textContent=b;o.replaceChildren(a,s,c);}
function crossFindDraw(){const o=$('#crossFindOut');if(!o)return;const name=crossColorName();
  const miss=k=>k?` · ${k} miss${k>1?'es':''}`:'';
  if(CF.on)crossFindSay(o,`Find the four ${name} edges: `,`${CF.found.size} of 4`,` · ${((performance.now()-CF.t0)/1000).toFixed(1)} s${miss(CF.miss)}`);
  else if(CF.last){const log=store.get('crossFinds',[])||[],a=log.slice(-5),best=Math.min(...log.map(x=>x.ms));
    crossFindSay(o,'Found in ',`${fmt(CF.last.ms)} s`,`${miss(CF.last.miss)}${a.length===5?` · mean of 5: ${fmt(a.reduce((x,y)=>x+y.ms,0)/5)} s`:''} · best ${fmt(best)} s`);}
  else o.textContent=`Find the four ${name} edges on the cube: a click on each. Drag the cube to see its back.`;
  const b=$('#crossFindBtn');if(b){const t=CF.on?'Stop':'Find the edges';if(b.textContent!==t)b.textContent=t;}}
// ---- wiring ----
(()=>{const cube=$('#cube'),tb=$('#crossTrainBtn'),fb=$('#crossFindBtn'),auto=$('#crossFindAuto');
  if(tb)tb.onclick=()=>crossTrainSet(!crossTrainOn());crossTrainDraw();
  if(fb)fb.onclick=()=>{if(CF.on)crossFindStop('Find stopped.');else crossFindStart();};
  if(auto){auto.checked=!!store.get('crossFindAuto',false);auto.onchange=()=>store.set('crossFindAuto',auto.checked);}
  // A click with no drag picks the sticker under the pointer. The drag of the cube captures the
  // pointer, so the click's target is the picture: the point names the sticker.
  if(cube){cube.addEventListener('pointerdown',e=>{CF.down={x:e.clientX,y:e.clientY};});
    cube.addEventListener('click',e=>{if(!CF.on)return;const d=CF.down;if(d&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>5)return;
      const el=(document.elementFromPoint&&document.elementFromPoint(e.clientX,e.clientY))||e.target;
      const m=String(el&&el.getAttribute&&el.getAttribute('class')||'').match(/(?:^|\s)pk(\d+)/);if(m)crossFindPick(+m[1]);});}
  document.addEventListener('cw:yourmove',()=>{if(CF.on)crossFindStop('Find stopped: the cube turned. Press Find the edges to start again.');});
  document.addEventListener('cw:step',()=>{if(CF.on&&displayedCube.toFacelets().join('')!==CF.state)crossFindStop('Find stopped: the cube changed. Press Find the edges to start again.');});
  document.addEventListener('cw:tab',()=>{crossFindStop();drawMain();});
  document.addEventListener('cw:method',()=>crossFindStop());
  // A new scramble: a find from fresh when the box is on.
  document.addEventListener('cw:scramble',()=>{crossFindStop();CF.last=null;crossFindDraw();if(auto&&auto.checked&&crossOnCross())setTimeout(crossFindStart,0);});
  $('#crossColor').addEventListener('change',()=>{crossFindStop();crossFindDraw();drawMain();});})();
