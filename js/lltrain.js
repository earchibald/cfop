// ===== OLL · PLL Trainer =====
// The OLL · PLL tab's twin of Cross Trainer and F2L Trainer (js/crosstrain.js, js/f2ltrain.js): a
// button on the cube (#llTrainBtn, cw:llTrain, off by default), three Show chips, an Overlay chip,
// and the drills of the tab (1.85; before, a case drill in the player with a probability menu, a
// realistic rest-of-layer box and per-case times).
// Show (#llStyle, cw:llStyle, 'oll' by default) picks the set to drill and what the cube shows:
//   oll   Two-look OLL: the 10 cases of OLL edges and OLL corners. The cube keeps the stickers of
//         the last layer's color (the cross color's opposite) and the centers; every other sticker
//         shows at the trainers' level (cw:crossDim, Settings > Trainers).
//   pll   Two-look PLL: the 6 cases of PLL corners and PLL edges. The eight last-layer pieces keep
//         their colors, whole.
//   pllf  Full PLL: the 21 cases. The same view as pll.
// Overlay (#llOverBtn, not kept over a reload): on, the next case of the set comes on the cube as
// a scramble of its own (lloDeal): from solved, the first two layers solved, the last layer as a
// real solve leaves it before that look (the later looks mixed, llCaseSetup), the case in it, a
// turn of the top before and after. The cases of the set come as a deck (llDeckDraw, cw:llDeck):
// each selected case once, in a shuffled order, before any comes again; none selected, all of
// them. The scramble is the first two-phase solution of 22 moves or fewer, so the player does not
// read as the algorithm backwards. Your moves turn it; with a smart cube, the cube in your hands
// turns it as the lab's drill does (js/live.js, liveMapSet): you look at the screen, as its colors
// are not your cube's. The look the case asks for done (the edges oriented, the top one color, the
// corners placed, the cube solved up to a top turn: LL_GOALS, judged by js/trainwin.js) brings the
// next case. Next case (N) turns the trainer and Overlay on and deals; a pick of another set while
// it is on deals from that set; a new scramble on the tab while it is on is the next case too.
// Off, or the trainer off: the scramble from before, with your moves before and since. Undo, Use
// my cube or a new scramble on another tab ends it, and that scramble stays.
// The pane (#llPane): the case dealt as a line (#llCurrent): the group, the name as ? until Reveal
// (H), then the name (a link to the details), the algorithm with the top turn it needs, how to
// recognize it, and Why does it work? (Lab); then the Show filter and the plan (js/start-app.js)
// and the cases. No per-case times (1.85): the tab's list of times is one.
const LLO={on:false,real:null,seed:'',map:null,busy:false,n:0,cas:null,hint:false,last:null,lab:false};
const LL_SETS=[
  {id:'oll',label:'Two-look OLL',short:'OLL',groups:['OLL edges','OLL corners'],
    title:'Two-look OLL: the 10 cases of OLL edges and OLL corners. The cube shows the stickers of the last layer\'s color alone'},
  {id:'pll',label:'Two-look PLL',short:'PLL',groups:['PLL corners','PLL edges'],
    title:'Two-look PLL: the 6 cases of PLL corners and PLL edges. The cube shows the last layer alone'},
  {id:'pllf',label:'Full PLL',short:'Full PLL',groups:['Full PLL'],
    title:'Full PLL: the 21 cases. The cube shows the last layer alone'}];
const LL_LOOKS=['OLL edges','OLL corners','PLL corners','PLL edges'];
function llTrainOn(){return !!store.get('llTrain',false);}
function llSetId(){const v=String(store.get('llStyle','oll'));return LL_SETS.some(s=>s.id===v)?v:'oll';}
function llSet(){return LL_SETS.find(s=>s.id===llSetId());}
function llOnLL(){return typeof method!=='undefined'&&method==='cfop'&&typeof curTab!=='undefined'&&curTab==='ll';}
// The last layer's color: the cross color's opposite.
function llColor(){return (crossColorIndex()+3)%6;}
// The cases of a set, each as {id, name, group, alg, recog, why, full}: the two-look entries of
// the algorithm database, or the full PLL with the id pllf-<name> (the status key) and the words of
// its two-look twin where it has one.
function llSetCases(set){set=set||llSetId();
  if(set==='pllf')return PLL_FULL.map(p=>{const two=LL_ALL.find(x=>x.name.startsWith(p.name+' '));
    return {id:'pllf-'+p.name,name:p.name+' perm',group:'Full PLL',alg:p.alg,recog:two?two.recog:'',why:two?two.why:'',full:p};});
  return LL_ALL.filter(a=>LL_SETS.find(s=>s.id===set).groups.includes(a.group));}
// ---- the view ----
function llTrainFade(f){if(!llTrainOn()||!llOnLL())return null;const op=llColor(),keep=new Set([4,13,22,31,40,49]);
  if(llSetId()==='oll'){for(let i=0;i<54;i++)if(f[i]===op)keep.add(i);return keep;}
  for(const p of cornerFacelet.concat(edgeFacelet))if(p.some(i=>f[i]===op))p.forEach(i=>keep.add(i));return keep;}
function llTrainDraw(){const b=$('#llTrainBtn');if(!b)return;const on=llTrainOn(),st=llSet();b.setAttribute('aria-pressed',String(on));
  b.title=on?`OLL · PLL Trainer is on. ${st.title}. Press to show every color`:'OLL · PLL Trainer: gray every piece but the last layer\'s, as you turn the cube. Its chips pick the set to drill: two-look OLL, two-look PLL or the full PLL';
  const g=$('#llStyle');if(g){g.hidden=!on;for(const x of g.querySelectorAll('button[data-set]'))x.setAttribute('aria-pressed',String(x.dataset.set===st.id));}
  const box=$('#llTrainer');if(box)box.hidden=!on;lloDraw();}
function llTrainSet(on){store.set('llTrain',!!on);if(!on&&LLO.on)lloSet(false);llTrainDraw();drawMain();}
// Another set: the trainer on, and with Overlay on, the next case from that set.
function llStyleSet(id){store.set('llStyle',id);store.set('llTrain',true);llTrainDraw();
  if(lloOv()){const r=LLO.real;lloDeal();LLO.real=r;}drawMain();lloDraw();llCaseDraw();}
// ---- the deck ----
function llDeckPool(set){const cs=llSetCases(set),sel=cs.filter(a=>llState.sel.has(a.id));return sel.length?sel:cs;}
function llDeckLeft(set){const pool=llDeckPool(set).map(a=>a.id),all=store.get('llDeck',{})||{};const d=all[set];return Array.isArray(d)?d.filter(id=>pool.includes(id)):[];}
function llDeckDraw(set){const pool=llDeckPool(set);let deck=llDeckLeft(set);
  if(!deck.length){deck=pool.map(a=>a.id);for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
    if(deck.length>1&&deck[0]===LLO.last)deck.push(deck.shift());}
  const id=deck.shift(),all=store.get('llDeck',{})||{};all[set]=deck;store.set('llDeck',all);LLO.last=id;return pool.find(a=>a.id===id);}
function llDeckNote(set){const all=llDeckPool(set).length,left=llDeckLeft(set).length;return `Case ${all-left} of ${all} in this round.`;}
// ---- a case as a scramble ----
// The setup of case a, from solved, with the top as the last layer (U), as a real solve leaves the
// layer before that look: the later looks mixed by the inverse of one of their algorithms, each
// four times in five (a skip the fifth), then a top turn, the inverse of the case, a top turn.
function llCaseSetup(a){const rnd=l=>l[Math.floor(Math.random()*l.length)],maybe=l=>Math.random()<0.8?rnd(l):null;
  const look=LL_LOOKS.indexOf(a.group),later=[];
  if(look>=0&&look<=2)later.push(ALG_DB.ep);if(look>=0&&look<=1)later.push(ALG_DB.cp);if(look===0)later.push(ALG_DB.co);
  const parts=[];for(const list of later){const x=maybe(list);if(x)parts.push(invertAlg(x.alg));}
  parts.push(rnd(AUFS),invertAlg(a.alg),rnd(AUFS));
  return simplify(parts.flatMap(p=>parseAlg(p)).filter(Boolean));}
function lloSmart(){return typeof cubeTab!=='undefined'&&!!cubeTab.conn&&!!cubeTab.target&&(typeof cubeSrc!=='function'||cubeSrc()==='smart');}
function lloOv(){return LLO.on&&!!LLO.seed&&scr.seed===LLO.seed&&llTrainOn()&&llOnLL();}
// The next case of the set as the scramble. False if none (no solution in time).
function lloDeal(){const set=llSetId(),a=llDeckDraw(set);if(!a)return false;const setup=llCaseSetup(a),hold=crossRotation();
  const A=applyAlg(new Cube(),[...(hold?[hold]:[]),...setup]),O=f2ltHome(A);if(!O)return false;
  const sol=solveTwoPhase(O,{maxLen:22,target:22,timeMs:1500});if(!sol)return false;
  const moves=parseAlg(invertAlg(sol));if(!applyAlg(new Cube(),moves).equals(O))return false;
  // The other trainers' Overlays end first: their end drops any map.
  if(typeof f2loEnd==='function'&&F2O.on)f2loEnd();if(typeof cxoEnd==='function'&&CXO.on)cxoEnd();
  // A smart cube: M = the case · P0⁻¹, P0 the cube in your hands now.
  LLO.map=null;if(typeof liveMapSet==='function'){LLO.map=lloSmart()?O.mul(liveReal(cubeTab.target).inverse()):null;liveMapSet(LLO.map);}
  let seed=customName('case');if(seed===LLO.seed||LLO.seed.startsWith(seed+'-'))seed+='-'+(++LLO.n);
  // Your moves on the case it replaces count for Off: your cube took them too.
  if(LLO.on&&LLO.real&&LLO.seed&&scr.seed===LLO.seed)LLO.real.yours.push(...homeNow().yours);
  LLO.cas={a,set,setup,cube:applyAlg(new Cube(),setup)};LLO.hint=false;
  LLO.on=true;LLO.seed=seed;LLO.busy=true;
  try{loadScramble(seed,moves,true);}finally{LLO.busy=false;}
  currentLabel=()=>a.name;LLO.lab=true;lloDraw();llCaseDraw();return true;}
// The next case after a win (js/trainwin.js), the scramble from before kept for Off.
function lloNext(){if(!lloOv())return false;const r=LLO.real,ok=lloDeal();LLO.real=r;return ok;}
// Overlay ends: its map goes, the scramble on the page stays.
function lloEnd(){const m=LLO.map;LLO.on=false;LLO.real=null;LLO.seed='';LLO.map=null;LLO.cas=null;LLO.hint=false;
  if(m&&typeof liveMapSet==='function'&&LIVE.map===m)liveMapSet(null);}
function lloOn(){const h=homeNow(),e=history.find(x=>x.seed===scr.seed);
  LLO.real={seed:scr.seed,moves:scr.moves.slice(),custom:!!(e&&e.moves),yours:h.yours.slice()};
  if(!lloDeal()){LLO.on=false;LLO.real=null;}}
// Off: the scramble from before, with your moves before and since.
function lloOff(){const r=LLO.real,mine=LLO.on&&!!LLO.seed&&scr.seed===LLO.seed,since=mine?homeNow().yours:[];lloEnd();
  if(r&&mine){loadScramble(r.seed,r.moves,r.custom);homeAppend([...r.yours,...since]);}}
function lloSet(on){if(on)lloOn();else lloOff();drawMain();lloDraw();llCaseDraw();}
// Next case: the trainer and Overlay on, and the next case of the set.
function llNextCase(){if(!llTrainOn()){store.set('llTrain',true);llTrainDraw();}
  if(lloOv())lloNext();else lloSet(true);drawMain();}
// loadScramble asks this: true when Overlay dealt a case in place of this scramble. Undo puts a
// scramble back as it was: Overlay ends. So does a new scramble on another tab.
function lloScramble(seed,moves,custom){
  if(!LLO.on||LLO.busy)return false;
  if(!llTrainOn()||!llOnLL()||typeof UNDO!=='undefined'&&UNDO.busy){lloEnd();return false;}
  const real={seed,moves:moves.slice(),custom:!!custom,yours:[]};
  if(!lloDeal()){lloEnd();return false;}
  LLO.real=real;return true;}
function lloTitle(){
  if(!lloOv())return 'Overlay: the next case of the set on the cube, as a scramble of its own. Your moves turn it. Each case you solve brings the next. You do not scramble your cube. With a smart cube, look at the screen: its colors are not your cube\'s';
  return 'Overlay is on: the cube shows a case of its own. Each case you solve brings the next. With a smart cube, look at the screen, not your cube. Press to go back to your scramble';}
function lloDraw(){const b=$('#llOverBtn'),g=$('#llOverGrp');if(!b||!g)return;g.hidden=!llTrainOn();
  b.setAttribute('aria-pressed',String(!!lloOv()));const t=lloTitle();if(b.title!==t)b.title=t;
  if(typeof liveFreshDraw==='function')liveFreshDraw();}
// ---- the looks, on the cube as held ----
// The last layer's face in facelets f: the one whose center is the last layer's color.
function llFaceOf(f){const op=llColor();for(let k=0;k<6;k++)if(f[9*k+4]===op)return k;return -1;}
function llEO(f){const k=llFaceOf(f);return k>=0&&[1,3,5,7].every(p=>f[9*k+p]===f[9*k+4]);}
function llOLL(f){const k=llFaceOf(f);return k>=0&&[0,1,2,3,5,6,7,8].every(p=>f[9*k+p]===f[9*k+4]);}
// The pieces `pick` names each at home (every sticker the color of its face's center) after one of
// the four turns of the last layer, on cube c.
function llHomeUp(c,pick){const k=llFaceOf(c.toFacelets());if(k<0)return false;const F='URFDLB'[k];
  return ['',F,F+"'",F+'2'].some(u=>{const g=applyAlg(c,u?[u]:[]).toFacelets();return pick(g).every(p=>p.every(i=>g[i]===g[i-i%9+4]));});}
function llCP(c){return llOLL(c.toFacelets())&&llHomeUp(c,g=>cornerFacelet.filter(p=>p.some(i=>g[i]===llColor())));}
function llPLL(c){return llHomeUp(c,()=>cornerFacelet.concat(edgeFacelet));}
const LL_GOALS={'OLL edges':(f,c)=>llEO(f),'OLL corners':(f,c)=>llOLL(f),'PLL corners':(f,c)=>llCP(c),'PLL edges':(f,c)=>llPLL(c),'Full PLL':(f,c)=>llPLL(c)};
// The stickers of the last layer's pieces in f: 'e' the edges, 'c' the corners, else all eight.
function llStickers(f,kind){const op=llColor(),out=new Set(),ps=kind==='e'?edgeFacelet:kind==='c'?cornerFacelet:cornerFacelet.concat(edgeFacelet);
  for(const p of ps)if(p.some(i=>f[i]===op))p.forEach(i=>out.add(i));return out;}
// What a turn from `before` to `now` won on the OLL · PLL tab, for js/trainwin.js: undefined when
// the trainer is not on there, null for no win, else {set, done, goal}. With a case dealt, its
// look done is the win and the next case can come. Else each look of the set done is a win, and
// the set's last look done lets a next drill come.
function llJudge(before,now){
  if(typeof llTrainOn!=='function'||!llTrainOn()||!llOnLL())return undefined;
  const fb=before.toFacelets(),fn=now.toFacelets(),cas=lloOv()?LLO.cas:null;
  if(cas){const g=LL_GOALS[cas.a.group];if(g(fb,before)||!g(fn,now))return null;
    const kind=cas.a.group==='OLL edges'?'e':/corners/.test(cas.a.group)?'c':'';
    return {set:llStickers(fn,kind),done:true,goal:(f,c)=>g(f,c)};}
  const set=llSetId(),looks=set==='oll'?[['e',(f,c)=>llEO(f)],['c',(f,c)=>llOLL(f)]]:set==='pll'?[['c',(f,c)=>llCP(c)],['',(f,c)=>llPLL(c)]]:[['',(f,c)=>llPLL(c)]];
  const last=looks[looks.length-1][1];
  for(const [kind,g] of looks)if(!g(fb,before)&&g(fn,now))return {set:llStickers(fn,kind),done:last(fn,now),goal:last};
  return null;}
// ---- the pane: the case dealt ----
function llAlgsFor(a){return a.full?PLL_FULL:{'OLL edges':ALG_DB.eo,'OLL corners':ALG_DB.co,'PLL corners':ALG_DB.cp,'PLL edges':ALG_DB.ep}[a.group];}
function llTestFor(a){return {'OLL edges':eoSolved,'OLL corners':ollSolved,'PLL corners':cpSolvedLL}[a.group]||(c=>AUFS.some(u=>applyAlg(c,u).isSolved()));}
function llModalFor(a){return a.full?modalForPLL(a.full):modalForLL(a);}
// An element: tag, attributes, then children (text or elements).
function llEl(tag,attrs,...kids){const x=document.createElement(tag);for(const [k,v] of Object.entries(attrs||{}))x.setAttribute(k,v);for(const k of kids)x.append(k);return x;}
// The algorithm from the case as dealt: the top turn it needs first, then the moves, then how to recognize it.
function llHintEls(a,c){const r=findLLStep(c.cube,llAlgsFor(a),llTestFor(a));
  if(!r)return [llEl('div',{class:'big'},a.alg)];
  return [llEl('div',{class:'big'},(r.pre?r.pre+' · ':'')+r.alg),llEl('div',{class:'muted'},(r.pre?'Turn the top '+r.pre+' first. ':'')+(a.recog||''))];}
function llCaseDraw(){const el=$('#llCurrent');if(!el)return;const c=LLO.cas;
  if(!c||!lloOv()){el.replaceChildren(llEl('p',{class:'muted'},'Press Next case to start. The cube shows the case. Your scramble is kept: Overlay off brings it back.'));return;}
  const a=c.a,h=LLO.hint;
  const name=h?llEl('b',{id:'llNameBtn',style:'cursor:pointer;text-decoration:underline dotted',title:'Open the details of this case'},a.name):llEl('b',{},'?');
  if(h)name.onclick=()=>openCaseModal(llModalFor(a));
  const head=llEl('div',{class:'row',style:'justify-content:space-between;gap:8px'},llEl('div',{},llEl('span',{class:'tag'},a.group),' ',name,' ',llEl('span',{class:'muted',style:'font-size:13px'},llDeckNote(c.set))));
  const body=llEl('div',{style:'margin-top:8px'});
  if(h){const lab=llEl('button',{class:'small',id:'llLab',title:'Open this algorithm in the Lab to see what each move does'},'Why does it work? (Lab)');lab.onclick=()=>loadLab(a.alg,a.name);
    body.append(...llHintEls(a,c),llEl('div',{class:'row',style:'margin-top:6px'},lab));}
  else body.append(llEl('span',{class:'muted'},'Answer hidden. Press H or Reveal.'));
  el.replaceChildren(head,body);}
// ---- wiring ----
(()=>{const tb=$('#llTrainBtn'),g=$('#llStyle');if(!tb||!g)return;
  tb.onclick=()=>llTrainSet(!llTrainOn());
  // The chips: the long label in the stage view, the short one in the cube box (.f2lt-more hides).
  g.replaceChildren(...LL_SETS.map(s=>{const b=document.createElement('button');b.type='button';b.dataset.set=s.id;b.title=s.title;
    const more=s.label.slice(0,s.label.length-s.short.length);if(more){const m=document.createElement('span');m.className='f2lt-more';m.textContent=more;b.append(m);}
    b.append(document.createTextNode(s.short));b.onclick=()=>llStyleSet(s.id);return b;}));
  // Overlay: one chip in a group of its own, after the chips.
  const og=document.createElement('span');og.id='llOverGrp';og.className='f2lstyle llo-grp';og.hidden=true;
  const ob=document.createElement('button');ob.type='button';ob.id='llOverBtn';ob.textContent='Overlay';ob.setAttribute('aria-pressed','false');
  ob.onclick=()=>lloSet(!LLO.on);og.append(ob);
  // One box for the trainer's parts, as F2L Trainer's: Show (the sets) and Overlay.
  const box=document.createElement('span');box.id='llTrainer';box.className='f2lt-box';box.hidden=true;
  const sl=document.createElement('span');sl.className='f2lt-lab';sl.textContent='Show';g.prepend(sl);
  g.before(box);box.append(g,og);llTrainDraw();
  const nx=$('#llNext'),hb=$('#llHint');if(nx)nx.onclick=llNextCase;
  if(hb)hb.onclick=()=>{if(!LLO.cas||!lloOv())return;LLO.hint=!LLO.hint;llCaseDraw();};
  // A scramble it did not deal ends it; another scramble takes the label back.
  document.addEventListener('cw:sequence',()=>{if(LLO.on&&!LLO.busy&&scr.seed!==LLO.seed){lloEnd();lloDraw();llCaseDraw();}});
  document.addEventListener('cw:scramble',()=>{if(LLO.lab&&scr.seed!==LLO.seed){LLO.lab=false;currentLabel=scrLabel;}lloDraw();llCaseDraw();});
  document.addEventListener('cw:tab',()=>{lloDraw();llCaseDraw();});
  // Another cross color: another last layer; with Overlay on, a case for it.
  $('#crossColor').addEventListener('change',()=>{if(lloOv()){const r=LLO.real;lloDeal();LLO.real=r;}drawMain();lloDraw();llCaseDraw();});
  llCaseDraw();})();
