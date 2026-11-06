// ===== Cross Trainer, Find the edges and F2L Trainer =====
// Two drills for the cross, on the Cross tab of CFOP (docs/cross-drill.md), and F2L Trainer on the F2L tab.
// Cross Trainer, the button on the cube (cw:crossTrain, off by default): the cube in view keeps the
// colors of the four cross edges and the centers, and every other piece is gray, as it turns: a
// virtual cube's keys, a smart cube's turns, the player's steps. drawMain (app.js) asks
// crossTrainFade for the stickers it draws, and crossTrainDim for how bright the other pieces show:
// Settings > Cross and F2L Trainer, cw:crossDim, 0 (black) to CROSS_DIM_MAX percent, 22 by default.
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
const CROSS_DIM_MAX=40,CROSS_DIM_DEF=22;
function crossDimPct(){const v=+store.get('crossDim',CROSS_DIM_DEF);return Number.isFinite(v)?Math.max(0,Math.min(CROSS_DIM_MAX,Math.round(v))):CROSS_DIM_DEF;}
function crossTrainDim(){return crossDimPct()/100;}
function crossTrainDraw(){const b=$('#crossTrainBtn');if(!b)return;const on=crossTrainOn();b.setAttribute('aria-pressed',String(on));
  b.title=on?'Cross Trainer is on: only the cross edges and the centers show their colors. Press to show every color':'Cross Trainer: gray every piece but the four cross edges and the centers, as you turn the cube';}
function crossTrainSet(on){store.set('crossTrain',!!on);crossTrainDraw();drawMain();}
// ---- F2L Trainer ----
// The F2L tab's twin of Cross Trainer, the button on the cube there (cw:f2lTrain, off by default).
// Three styles, the chips beside the button while it is on (#f2lStyle, cw:f2lStyle, 3 by default):
// F2L-1: the cross and one pair: the pair the F2L guide is on, else the next pair not solved in the
//   guide's order (cw:f2lOrder), named as the solve holds the cube (f2lTrainPair).
// F2L-2: the eight F2L pieces alone (1.69's view): the four corners with the cross color and the
//   four edges with neither the cross color nor its opposite.
// F2L-3: the first two layers: every piece with no sticker of the cross color's opposite, so the
//   cross edges too.
// The centers keep their colors in each. Every other piece shows at Cross Trainer's level, cw:crossDim.
const F2L_STYLES=[
  {n:1,label:'F2L-1',title:'F2L-1: the cross and one pair, the pair the guide is on or the next one to solve'},
  {n:2,label:'F2L-2',title:'F2L-2: the eight F2L pieces alone, with no cross'},
  {n:3,label:'F2L-3',title:'F2L-3: the first two layers, the cross and the four pairs'}];
function f2lTrainOn(){return !!store.get('f2lTrain',false);}
function f2lTrainStyle(){const v=+store.get('f2lStyle',3);return v===1||v===2?v:3;}
function f2lOnF2L(){return typeof method!=='undefined'&&method==='cfop'&&typeof curTab!=='undefined'&&curTab==='f2l';}
// Is the piece with stickers p at home in facelets f: each sticker the color of its face's center?
function f2lTrainHome(f,p){return p.every(i=>f[i]===f[i-i%9+4]);}
// The two side colors of F2L-1's pair: the centers of its slot's two side faces, with the cube held
// as the solve holds it (the cross color down), or as the guide holds a smart cube.
function f2lTrainPair(f){const G=typeof fg!=='undefined'?fg:null,act=!!G&&typeof fgActive==='function'&&fgActive();
  const held=act&&G.src==='smart'&&G.held?G.held:act&&G.X?phys(G.X):phys(new Cube()),c=held.center,ci=crossColorIndex();
  const cols=n=>[c[F2L_SLOT_FACES[n][0]],c[F2L_SLOT_FACES[n][1]]];
  const order=G&&Array.isArray(G.order)&&G.order.length===4?G.order:F2L_ORDER_DEFAULT;
  const pin=act?(G.step&&G.step.slot)||G.target:null;if(pin)return cols(pin);
  const solved=([a,b])=>cornerFacelet.concat(edgeFacelet).filter(p=>{const s=new Set(p.map(i=>f[i]));return s.has(a)&&s.has(b)&&(p.length===2||s.has(ci));}).every(p=>f2lTrainHome(f,p));
  return cols(order.find(n=>!solved(cols(n)))||order[0]);}
function f2lTrainFade(f){if(!f2lTrainOn()||!f2lOnF2L())return null;const ci=crossColorIndex(),op=(ci+3)%6,style=f2lTrainStyle(),keep=new Set([4,13,22,31,40,49]);
  const add=p=>p.forEach(i=>keep.add(i)),has=(p,x)=>p.some(i=>f[i]===x);
  if(style===3){for(const p of cornerFacelet.concat(edgeFacelet))if(!has(p,op))add(p);return keep;}
  if(style===1){const [a,b]=f2lTrainPair(f);for(const e of edgeFacelet)if(has(e,ci)||(has(e,a)&&has(e,b)))add(e);
    for(const c of cornerFacelet)if(has(c,ci)&&has(c,a)&&has(c,b))add(c);return keep;}
  for(const c of cornerFacelet)if(has(c,ci))add(c);
  for(const e of edgeFacelet)if(!has(e,ci)&&!has(e,op))add(e);return keep;}
function f2lTrainDraw(){const b=$('#f2lTrainBtn');if(!b)return;const on=f2lTrainOn(),st=F2L_STYLES[f2lTrainStyle()-1];b.setAttribute('aria-pressed',String(on));
  b.title=on?`F2L Trainer is on. ${st.title}. Press to show every color`:'F2L Trainer: gray every piece but the F2L pieces of the style you pick, as you turn the cube';
  const g=$('#f2lStyle');if(!g)return;g.hidden=!on;
  for(const x of g.querySelectorAll('button[data-style]'))x.setAttribute('aria-pressed',String(+x.dataset.style===st.n));}
function f2lTrainSet(on){store.set('f2lTrain',!!on);f2lTrainDraw();drawMain();}
function f2lTrainStyleSet(n){store.set('f2lStyle',n);store.set('f2lTrain',true);f2lTrainDraw();drawMain();}
// F2L-1 follows the guide: when its pair changes with no change of the cube, draw the cube again.
let f2lTrainLast='';
function f2lTrainGuide(){if(!f2lTrainOn()||f2lTrainStyle()!==1||!f2lOnF2L()||!displayedCube)return;
  const k=f2lTrainPair(displayedCube.toFacelets()).join();if(k!==f2lTrainLast){f2lTrainLast=k;drawMain();}}
// The stickers drawMain keeps in color: Cross Trainer's on the Cross tab, F2L Trainer's on the F2L tab.
function trainFade(f){return crossTrainFade(f)||f2lTrainFade(f);}
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
  const ft=$('#f2lTrainBtn'),fs=$('#f2lStyle');if(ft)ft.onclick=()=>f2lTrainSet(!f2lTrainOn());
  if(fs)fs.replaceChildren(...F2L_STYLES.map(x=>{const b=document.createElement('button');b.type='button';b.dataset.style=x.n;b.textContent=x.label;b.title=x.title;b.onclick=()=>f2lTrainStyleSet(x.n);return b;}));
  f2lTrainDraw();
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
