// ===== F2L Trainer: the pair F2L-1 lights =====
// F2L Trainer's F2L-1 style (js/crosstrain.js) shows the cross and one pair. A second row of chips,
// after the style chips while F2L-1 is pressed (#f2lPairRow), picks the pair it lights (cw:f2lPair,
// 'guide' by default):
//   guide      the pair the F2L guide is on, else the next one in its order (f2lTrainPair, 1.70)
//   a key      one pair the user names by its colors, "1-2" for red and green (f2ltPairs)
//   shortest, fastest, two
//              picked from the cube in view by js/f2lpick.js; two lights two pairs
// f2lTrainFade asks f2ltChoice for the side colors of each pair to light; null is the guide's pair.
// A pick is read once the cube in view changes and then rests F2T_WAIT ms, one search per turn of
// the event loop, and it holds while its pairs are not solved and get no farther from solved
// (f2ltStill), so the light does not hop as the user works on a pair. Pieces are found by color, so
// the light follows them through every turn in the meantime. A new scramble starts the picks over.
const F2T={pick:null,state:'',busy:false,seq:0,timer:0,obs:null};
// Overlay (1.73, a scramble since 1.74): a chip after the style chips while F2L Trainer is on
// (#f2lOverBtn, not kept over a reload). On, the cube on the page as it is now (the home cube: the
// scramble and your moves) gets the cross put in, the F2L pieces where they are, and the rest put
// where they fit (f2ltOverlay). That cube is a real cube, so it becomes the scramble: the moves
// that make it from solved (f2ltOverlayScramble), with every piece in its own colors. Every part of
// the page reads that one cube: the player, the picks, the F2L guide, Patterns. Your moves turn it.
// With a smart cube, the cube in your hands turns it as the lab's drill does (js/live.js,
// liveMapSet): you look at the screen, as its colors are not your cube's. While it is on, a new
// scramble on the F2L tab gets the cross put in too, and another cross color puts that cross in.
// Off, or F2L Trainer off: the scramble from before, with your moves before and since. A new
// scramble on another tab ends it and stays as it is.
// F2O.real: {seed, moves, custom, yours}, the scramble before and your moves on it. F2O.seed: the
// name of the scramble Overlay loaded; any other scramble ends it.
const F2O={on:false,real:null,seed:'',busy:false,n:0};
const F2T_WAIT=150;
const F2T_HOWS=[
  {id:'guide',label:'Guide',title:"The pair the guide is on, else the next one in the guide's order"},
  {id:'shortest',label:'Shortest',title:'The pair with the fewest moves from here'},
  {id:'fastest',label:'Fastest',title:'The pair that is quickest to turn: R and U moves first, then L, then F, with few D and B moves. It can take a move or two more'},
  {id:'two',label:'Two at once',title:'Two pairs: two that one solution makes together, else a pair and the pair it sets up'}];
function f2ltColorName(c){return COLOR_NAMES_E[c]||'gray';}
function f2ltPairName(k){return f2ltKeyColors(k).map(f2ltColorName).join(' and ');}
function f2ltAuto(id){return id==='shortest'||id==='fastest'||id==='two';}
// The saved choice; a pair that the cross color has no slot for reads as the guide's pair.
function f2ltChoiceId(){const v=String(store.get('f2lPair','guide'));
  if(F2T_HOWS.some(h=>h.id===v))return v;return f2ltPairs(crossColorIndex()).includes(v)?v:'guide';}
// ---- Overlay ----
function f2loOv(){return F2O.on&&!!F2O.seed&&scr.seed===F2O.seed&&typeof f2lTrainOn==='function'&&f2lTrainOn()&&f2lOnF2L();}
// The smart cube drives the screen's cube: while it is the cube and its state is known.
function f2loSmart(){return typeof cubeTab!=='undefined'&&!!cubeTab.conn&&!!cubeTab.target&&(typeof cubeSrc!=='function'||cubeSrc()==='smart');}
// Every pair of cross color ci at home in cube c (the cross too): no drill left in it.
function f2loDone(c,ci){const f=c.toFacelets();
  return f2ltPairs(ci).every(k=>f2lPairHome(f,ci,...f2ltKeyColors(k)))&&edgeFacelet.filter(e=>e.some(i=>f[i]===ci)).every(e=>f2lTrainHome(f,e));}
// A fresh drill (1.78): a random state, as a WCA scramble picks one, held with the cross color down.
function f2loFresh(){const r=crossRotation();return applyAlg(wcaState(randomSeedName()),r?[r]:[]);}
// Load the overlay of cube A as the scramble. False if there is none (no solution in time). When
// it leaves no pair to solve (a solved cube in your hands, or the F2L just solved), a fresh drill
// in its place: the screen's cube is not the cube in your hands, so it can be any cube.
function f2loLoad(A){const ci=crossColorIndex();let o=f2ltOverlayScramble(A,ci);
  for(let i=0;i<4&&(!o||f2loDone(o.O,ci));i++)o=f2ltOverlayScramble(f2loFresh(),ci);
  if(!o)return false;
  // A smart cube: M = setup · P0⁻¹, the setup being the cube the new scramble makes.
  if(typeof liveMapSet==='function')liveMapSet(f2loSmart()?o.O.mul(liveReal(cubeTab.target).inverse()):null);
  // A name of its own: two drills in one second are two scrambles.
  let seed=customName('overlay');if(seed===F2O.seed||F2O.seed.startsWith(seed+'-'))seed+='-'+(++F2O.n);
  F2O.on=true;F2O.seed=seed;F2O.busy=true;
  try{loadScramble(F2O.seed,o.moves,true);}finally{F2O.busy=false;}
  return true;}
// The next drill after a win (js/trainwin.js): the cube as it is, solved, gives a fresh one.
function f2loNext(){const r=F2O.real;if(!f2loOv())return false;const ok=f2loLoad(homeNow().cube);F2O.real=r;f2loDraw();return ok;}
// Overlay ends: no map, the scramble on the page stays.
function f2loEnd(){F2O.on=false;F2O.real=null;F2O.seed='';if(typeof liveMapSet==='function'&&LIVE.map)liveMapSet(null);}
function f2loOn(){const h=homeNow(),e=history.find(x=>x.seed===scr.seed);
  F2O.real={seed:scr.seed,moves:scr.moves.slice(),custom:!!(e&&e.moves),yours:h.yours.slice()};
  if(!f2loLoad(h.cube))F2O.real=null;}
// Off: the scramble from before, with your moves before and since.
function f2loOff(){const r=F2O.real,mine=F2O.on&&scr.seed===F2O.seed,since=mine?homeNow().yours:[];f2loEnd();
  if(r&&mine){loadScramble(r.seed,r.moves,r.custom);homeAppend([...r.yours,...since]);}}
function f2loSet(on){if(on)f2loOn();else f2loOff();F2T.state='';drawMain();f2loDraw();f2ltDraw();}
// loadScramble asks this first: true when Overlay loaded its own scramble in place of this one.
// Undo puts a scramble back as it was: Overlay ends. So does a new scramble on another tab.
function f2loScramble(seed,moves,custom){
  if(!F2O.on||F2O.busy)return false;
  if(!f2lTrainOn()||!f2lOnF2L()||typeof UNDO!=='undefined'&&UNDO.busy){f2loEnd();return false;}
  const r=crossRotation(),A=applyAlg(applyAlg(puzzleCube(),moves),r?[r]:[]);
  const real={seed,moves:moves.slice(),custom:!!custom,yours:[]};
  if(!f2loLoad(A)){f2loEnd();return false;}
  F2O.real=real;return true;}
function f2loTitle(){
  if(!f2loOv())return "Overlay: a new scramble from your cube as it is, with the cross solved. The F2L pieces stay where they are. Your moves turn it. With a smart cube, look at the screen: its colors are not your cube's";
  return 'Overlay is on: the scramble has the cross solved. With a smart cube, look at the screen, not your cube. Press to go back to your scramble';}
function f2loDraw(){const b=$('#f2lOverBtn'),g=$('#f2lOverGrp'),x=$('#f2lTrainer');if(x)x.hidden=!f2lTrainOn();if(!b||!g)return;g.hidden=!f2lTrainOn();
  b.setAttribute('aria-pressed',String(!!f2loOv()));const t=f2loTitle();if(b.title!==t)b.title=t;}
function f2ltOn(){return typeof f2lTrainOn==='function'&&f2lTrainOn()&&f2lTrainStyle()===1&&f2lOnF2L();}
// The pick for the choice and the cross color now, or null.
function f2ltCurrent(){const p=F2T.pick,id=f2ltChoiceId();return p&&p.how===id&&p.ci===crossColorIndex()?p:null;}
// For f2lTrainFade: [[a, b], ...], the side colors of each pair to light; null for the guide's pair.
function f2ltChoice(){const id=f2ltChoiceId();if(id==='guide')return null;
  if(!f2ltAuto(id))return [f2ltKeyColors(id)];
  f2ltWatch();const p=f2ltCurrent();return p&&p.keys.length?p.keys.map(f2ltKeyColors):null;}
// ---- the pick ----
function f2ltWatch(){if(!displayedCube)return;
  const s=displayedCube.toFacelets().join('')+'|'+crossColorIndex()+'|'+f2ltChoiceId();if(s===F2T.state)return;
  F2T.state=s;clearTimeout(F2T.timer);F2T.seq++;F2T.timer=setTimeout(f2ltRun,f2ltCurrent()?F2T_WAIT:0);}
function f2ltRun(){
  const id=f2ltChoiceId(),ci=crossColorIndex(),seq=++F2T.seq;
  if(!f2ltAuto(id)||!f2ltOn()||!displayedCube){F2T.busy=false;return;}
  if(typeof tablesReady!=='undefined'&&!tablesReady){F2T.timer=setTimeout(f2ltRun,300);return;}
  const cube=displayedCube,p=f2ltCurrent();
  if(p&&p.track&&f2ltStill(cube,ci,p)){F2T.busy=false;f2ltDraw();return;}
  const it=f2ltSteps(cube,ci,id,{prefer:F2T.pick&&F2T.pick.ci===ci?F2T.pick.keys:[]});
  F2T.busy=true;f2ltDraw();
  const step=()=>{if(seq!==F2T.seq)return;const t0=performance.now();let r;
    do r=it.next();while(!r.done&&performance.now()-t0<30);
    if(!r.done){F2T.timer=setTimeout(step,0);return;}
    F2T.busy=false;F2T.pick={...r.value,ci};drawMain();f2ltDraw();};
  step();}
// A pick under F2L-2 or F2L-3 (the Pair part shows dimmed there) turns F2L-1 on: a pair lights only in F2L-1.
function f2ltSet(id){store.set('f2lPair',id);F2T.state='';if(!f2ltAuto(id))F2T.busy=false;
  if(typeof f2lTrainStyleSet==='function'&&(f2lTrainStyle()!==1||!f2lTrainOn()))f2lTrainStyleSet(1);drawMain();f2ltDraw();}
// ---- the row of chips ----
function f2ltSwatch(k){const s=document.createElement('span');s.className='f2lt-sw';s.setAttribute('aria-hidden','true');
  for(const c of f2ltKeyColors(k)){const i=document.createElement('i');i.style.background=stickerColor(c);s.append(i);}return s;}
// What is lit and why, for the pressed chip's tooltip.
function f2ltNote(){const id=f2ltChoiceId();
  if(id==='guide')return '';
  if(!f2ltAuto(id))return '';
  const p=f2ltCurrent();
  if(!p)return f2ltOn()?'Finding the pair.':'';
  if(p.why==='cross')return "Solve the cross first. Until then the guide's pair shows.";
  if(p.why==='solved')return 'Every pair is solved.';
  const [a,b]=p.keys.map(f2ltPairName),mv=n=>n===1?'1 move':n+' moves';
  if(p.how==='shortest')return `Lit: the ${a} pair. It takes ${mv(p.n)}.`;
  if(p.how==='fastest')return `Lit: the ${a} pair. Its quickest way to turn takes ${mv(p.n)}.`;
  if(p.kind==='last')return `Lit: the ${a} pair, the last one. It takes ${mv(p.n)}.`;
  if(p.kind==='both')return `Lit: the ${a} pair and the ${b} pair. One way of ${mv(p.n)} solves both.`;
  if(p.kind==='setup')return `Lit: the ${a} pair, then the ${b} pair. A way for the first leaves the second ${mv(p.n2)} away, not ${p.plain}.`;
  return `Lit: the ${a} pair (${mv(p.n)}), then the ${b} pair, the shortest after it.`;}
function f2ltChip(id,title,kids){const x=document.createElement('button');x.type='button';x.dataset.pair=id;x.dataset.title=title;x.title=title;
  x.append(...kids);x.onclick=()=>f2ltSet(id);return x;}
// The chips: the four ways, then the four pairs of the cross color by their colors.
function f2ltBuild(){const r=$('#f2lPairRow');if(!r)return;const ci=crossColorIndex();
  // "Two at once" says "Two" on the small cube of the classic layout (.f2lt-more hides).
  const word=h=>{const [a,...b]=h.label.split(' ');if(!b.length)return [document.createTextNode(a)];
    const m=document.createElement('span');m.className='f2lt-more';m.textContent=' '+b.join(' ');return [document.createTextNode(a),m];};
  const lab=document.createElement('span');lab.className='f2lt-lab';lab.textContent='Pair';
  const wg=document.createElement('span');wg.className='f2lt-ways';wg.append(...F2T_HOWS.map(h=>f2ltChip(h.id,h.title,word(h))));
  const pairs=f2ltPairs(ci).map(k=>{const x=f2ltChip(k,`Light the ${f2ltPairName(k)} pair`,[f2ltSwatch(k)]);x.classList.add('f2lt-pair');x.setAttribute('aria-label',`The ${f2ltPairName(k)} pair`);return x;});
  // The pairs in a group of their own: after a thin line in a row (the stage view), a 2 by 2 grid
  // under the ways in the cube box's column.
  const g=document.createElement('span');g.className='f2lt-pairs';g.append(...pairs);
  const lit=document.createElement('span');lit.id='f2lLit';lit.className='f2lt-lit';lit.hidden=true;lit.setAttribute('aria-live','polite');
  r.replaceChildren(lab,wg,g,lit);r.dataset.ci=ci;}
// The Pair part shows while F2L Trainer is on; with F2L-2 or F2L-3 it is off (data-off: dimmed, and
// a pick turns F2L-1 on), so what is engaged shows at a glance. In the cube box it hides then.
function f2ltDraw(){const r=$('#f2lPairRow');if(!r)return;
  r.hidden=!f2lTrainOn();const off=f2lTrainStyle()!==1;r.toggleAttribute('data-off',off);
  if(+r.dataset.ci!==crossColorIndex())f2ltBuild();
  const id=f2ltChoiceId(),note=f2ltNote();
  for(const x of r.querySelectorAll('button[data-pair]')){const on=x.dataset.pair===id;x.setAttribute('aria-pressed',String(on));
    const t=off?x.dataset.title+'. Turns F2L-1 on':on&&note?x.dataset.title+'. '+note:x.dataset.title;if(x.title!==t)x.title=t;}
  // The two kinds of pick: the ways the page picks a pair, and the pairs you name. The kind not in use dims.
  const auto=id==='guide'||f2ltAuto(id);
  for(const [sel,act] of [['.f2lt-ways',auto],['.f2lt-pairs',!auto]]){const g=r.querySelector(sel);if(g)g.toggleAttribute('data-idle',!act);}
  f2ltLitDraw();}
// What is lit now: Lit, a swatch for each pair the cube shows in color, and a word: how many moves,
// solved (✓), finding, or why none. It reads what the cube draws (f2lTrainPairs), so it never says
// one thing while the cube shows another.
function f2ltLitNow(){if(!displayedCube||!f2lTrainOn()||f2lTrainStyle()!==1)return null;
  const f=displayedCube.toFacelets(),ci=crossColorIndex(),id=f2ltChoiceId(),p=f2ltAuto(id)?f2ltCurrent():null;
  const pairs=f2lTrainPairs(f).map(([a,b])=>({k:f2ltKey(a,b),solved:f2lPairHome(f,ci,a,b)}));
  let word='';
  if(!pairs.length)word='every pair solved';
  else if(pairs.every(x=>x.solved))word='solved';
  else if(f2ltAuto(id)&&!p)word='finding…';
  else if(p&&p.why==='cross')word="cross first: the guide's pair";
  else if(p&&p.n!=null)word=p.n===1?'1 move':p.n+' moves';
  return {pairs,word};}
// drawMain draws F2L-1 (f2lTrainFade): the readout follows once the draw is done.
let f2ltLitT=0;function f2ltLitSoon(){if(!f2ltLitT)f2ltLitT=setTimeout(()=>{f2ltLitT=0;f2ltLitDraw();},0);}
function f2ltLitDraw(){const el=$('#f2lLit');if(!el)return;const L=f2ltLitNow();
  const key=L?L.pairs.map(x=>x.k+(x.solved?'+':'')).join()+'|'+L.word:'';if(el.dataset.key===key)return;el.dataset.key=key;
  if(!L){el.replaceChildren();el.hidden=true;return;}el.hidden=false;
  const lab=document.createElement('span');lab.className='f2lt-lab';lab.textContent='Lit';
  const sw=L.pairs.map(x=>{const e=f2ltSwatch(x.k);e.dataset.k=x.k;if(x.solved)e.classList.add('solved');return e;});
  const w=document.createElement('span');w.className='f2lt-word'+(L.pairs.length&&L.pairs.every(x=>x.solved)?' good':'');w.textContent=L.word;
  el.replaceChildren(lab,...sw,w);
  el.title=L.pairs.length?`Lit: ${L.pairs.map(x=>`the ${f2ltPairName(x.k)} pair${x.solved?' (solved)':''}`).join(' and ')}.`:'Every pair is solved: no pair to light.';}
// ---- wiring ----
(()=>{const g=$('#f2lStyle');if(!g)return;
  const r=document.createElement('span');r.id='f2lPairRow';r.className='f2lstyle f2lt-row';r.setAttribute('role','group');r.setAttribute('aria-label','The pair F2L-1 lights');r.hidden=true;
  // Overlay: one chip in a group of its own, after the style chips.
  const og=document.createElement('span');og.id='f2lOverGrp';og.className='f2lstyle f2lo-grp';og.hidden=true;
  const ob=document.createElement('button');ob.type='button';ob.id='f2lOverBtn';ob.textContent='Overlay';ob.setAttribute('aria-pressed','false');
  ob.onclick=()=>f2loSet(!F2O.on);og.append(ob);
  // One box for F2L Trainer's parts (1.78): Show (the styles), Overlay, and Pair (F2L-1's pick and
  // what is lit). In the stage view a strip of its own in the action bar; in the cube box display:
  // contents, so each part keeps its place there.
  const box=document.createElement('span');box.id='f2lTrainer';box.className='f2lt-box';box.hidden=true;
  const sl=document.createElement('span');sl.className='f2lt-lab';sl.textContent='Show';g.prepend(sl);
  g.before(box);box.append(g,og,r);f2ltBuild();f2ltDraw();f2loDraw();
  // Show the row while it is on with F2L-1: at once after a click on the chips or the button, and
  // after any other draw of F2L Trainer, which sets the style chips' aria-pressed and the group's hidden.
  // F2L Trainer off turns Overlay off: the scramble from before.
  g.addEventListener('click',f2ltDraw);const tb=$('#f2lTrainBtn');
  if(tb)tb.addEventListener('click',()=>{if(!f2lTrainOn()&&F2O.on)f2loSet(false);f2ltDraw();f2loDraw();});
  if(typeof MutationObserver==='function'){F2T.obs=new MutationObserver(()=>{f2ltDraw();f2loDraw();});
    F2T.obs.observe(g,{attributes:true,attributeFilter:['hidden']});
    g.querySelectorAll('button[data-style]').forEach(x=>F2T.obs.observe(x,{attributes:true,attributeFilter:['aria-pressed']}));}
  // A new scramble starts the picks over. A scramble Overlay did not load (Undo puts one back) ends it.
  document.addEventListener('cw:scramble',()=>{F2T.pick=null;F2T.state='';F2T.seq++;clearTimeout(F2T.timer);F2T.busy=false;
    f2ltDraw();f2loDraw();});
  document.addEventListener('cw:sequence',()=>{if(F2O.on&&!F2O.busy&&scr.seed!==F2O.seed){f2loEnd();f2loDraw();}});
  document.addEventListener('cw:tab',f2loDraw);
  // Another cross color: that cross put in, on the cube as it is (the page has dropped your moves).
  $('#crossColor').addEventListener('change',()=>{F2T.state='';
    if(F2O.on){const r=F2O.real;if(f2lTrainOn()&&f2lOnF2L()&&r&&f2loLoad(homeNow().cube))F2O.real=r;else f2loEnd();drawMain();}
    f2ltDraw();f2loDraw();});})();
