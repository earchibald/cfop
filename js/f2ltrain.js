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
function f2ltSet(id){store.set('f2lPair',id);F2T.state='';if(!f2ltAuto(id))F2T.busy=false;drawMain();f2ltDraw();}
// ---- the row of chips ----
function f2ltSwatch(k){const s=document.createElement('span');s.className='f2lt-sw';s.setAttribute('aria-hidden','true');
  for(const c of f2ltKeyColors(k)){const i=document.createElement('i');i.style.background=stickerColor(c);s.append(i);}return s;}
// The pairs lit now, as keys: [] for the guide's pair or no pick yet.
function f2ltLit(){const id=f2ltChoiceId();if(id==='guide')return [];if(!f2ltAuto(id))return [id];const p=f2ltCurrent();return p?p.keys:[];}
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
  const ways=F2T_HOWS.map(h=>f2ltChip(h.id,h.title,word(h)));
  const pairs=f2ltPairs(ci).map(k=>{const x=f2ltChip(k,`Light the ${f2ltPairName(k)} pair`,[f2ltSwatch(k)]);x.classList.add('f2lt-pair');x.setAttribute('aria-label',`The ${f2ltPairName(k)} pair`);return x;});
  const gap=document.createElement('span');gap.className='f2lt-gap';gap.setAttribute('aria-hidden','true');
  r.replaceChildren(...ways,gap,...pairs);r.dataset.ci=ci;}
function f2ltDraw(){const r=$('#f2lPairRow');if(!r)return;
  r.hidden=!f2lTrainOn()||f2lTrainStyle()!==1;
  if(+r.dataset.ci!==crossColorIndex())f2ltBuild();
  const id=f2ltChoiceId(),note=f2ltNote(),lit=f2ltLit();
  for(const x of r.querySelectorAll('button[data-pair]')){const on=x.dataset.pair===id;x.setAttribute('aria-pressed',String(on));
    const t=on&&note?x.dataset.title+'. '+note:x.dataset.title;if(x.title!==t)x.title=t;
    // The pressed way shows the colors of each pair it lights.
    if(f2ltAuto(x.dataset.pair)){const sw=[...x.querySelectorAll('.f2lt-sw')],want=on?lit:[];
      if(sw.map(e=>e.dataset.k).join()!==want.join()){sw.forEach(e=>e.remove());x.append(...want.map(k=>{const e=f2ltSwatch(k);e.dataset.k=k;return e;}));}}}}
// ---- wiring ----
(()=>{const g=$('#f2lStyle');if(!g)return;
  const r=document.createElement('span');r.id='f2lPairRow';r.className='f2lstyle f2lt-row';r.setAttribute('role','group');r.setAttribute('aria-label','The pair F2L-1 lights');r.hidden=true;
  g.after(r);f2ltBuild();f2ltDraw();
  // Show the row while it is on with F2L-1: at once after a click on the chips or the button, and
  // after any other draw of F2L Trainer, which sets the style chips' aria-pressed and the group's hidden.
  g.addEventListener('click',f2ltDraw);const tb=$('#f2lTrainBtn');if(tb)tb.addEventListener('click',f2ltDraw);
  if(typeof MutationObserver==='function'){F2T.obs=new MutationObserver(()=>f2ltDraw());
    F2T.obs.observe(g,{attributes:true,attributeFilter:['hidden']});
    g.querySelectorAll('button[data-style]').forEach(x=>F2T.obs.observe(x,{attributes:true,attributeFilter:['aria-pressed']}));}
  document.addEventListener('cw:scramble',()=>{F2T.pick=null;F2T.state='';F2T.seq++;clearTimeout(F2T.timer);F2T.busy=false;f2ltDraw();});
  $('#crossColor').addEventListener('change',()=>{F2T.state='';f2ltDraw();});})();
