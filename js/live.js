// ===== Your moves: the player follows the cube in your hands =====
// The hold row on the player cube (Top: white, yellow; Front: green, orange, blue, red) turns the
// picture to the way you hold the cube. No turn goes on the list, and the keys of the virtual cube
// name the faces as the picture shows them (playerKeyMove). A press of the tile that is on puts
// the picture back as the player holds it (PLAYER.hold null).
// A smart cube's turns go on the player as your moves, as the virtual cube's keys do (cw:smartmoves
// from js/cubetab.js, cubePlayerTurn), while the cube on the page is the cube in your hands
// (liveInStep). When it is not, a note under the moves says so, with Use my cube. When a cube
// connects and is not in step, the page asks once whether to make it the scramble; Don't ask
// again turns the ask off, and Settings turns it on again (cw:smartAsk).
// The Cross tab's Check my plan follows the moves made on the player (a step back, then a move, backs
// out the moves after it), and moves typed there show on the player (crossFollow, crossTyped).
const PLAYER={hold:null}; // {top, front}: color indices, or null for the player's own hold
const LIVE={asked:false,typing:false};
const liveConj=q=>[-q[0],-q[1],-q[2],q[3]];
// An element: tag, attributes (class, id, title, type, ...), then children (text or elements).
function liveEl(tag,attrs,...kids){const x=document.createElement(tag);for(const [k,v] of Object.entries(attrs||{}))x.setAttribute(k,v);
  for(const k of kids)x.append(k);return x;}
// The hold of the 24 whose centers are `c`'s.
function liveHoldOf(c){return c&&c.center?CUBE_TAB_HOLD_BY.get(c.center.join())||null:null;}
// The picture's turn for the cube `P` under the hold row: rot (a matrix for renderCube3D) and the
// whole-cube moves that give the same cube for the net. Null when the picture is as P holds it.
function playerHoldView(P){
  if(!PLAYER.hold||!P||P.isFour||!P.center)return null;
  const hp=liveHoldOf(P),t=CUBE_TAB_HOLDS.find(h=>h.cube.center[0]===PLAYER.hold.top&&h.cube.center[2]===PLAYER.hold.front);
  if(!hp||!t||hp===t)return null;
  const moves=(CUBE_TAB_HOLDS.find(h=>applyAlg(P,h.moves).center.join()===t.cube.center.join())||{moves:[]}).moves;
  return {rot:quatMat(quatMul(t.q,liveConj(hp.q))),moves};
}
// A face move as the picture shows it (a key of the virtual cube), named as the player holds the
// cube: the face with the same center.
function playerKeyMove(m){
  const P=displayedCube,H=playerHoldView(P);if(!H||!/^[URFDLB]/.test(m))return m;
  const D=applyAlg(P,H.moves);return FACE_NAMES[P.center.indexOf(D.center[FACE_NAMES.indexOf(m[0])])]+m.slice(1);
}
// The cube as the picture shows it.
function playerHeldCube(){const P=displayedCube;if(!P||P.isFour||!P.center)return null;const H=playerHoldView(P);return H?applyAlg(P,H.moves):P;}
// The tiles: one press sets that color on top (the front stays where it can) or in front (the top
// stays where it can, else white goes on top). A press of a tile that is on goes back to the
// player's own hold.
function playerHoldPick(place,c){
  const D=playerHeldCube(),cur=D?{top:D.center[0],front:D.center[2]}:{top:0,front:2};
  if(PLAYER.hold&&PLAYER.hold[place==='up'?'top':'front']===c)PLAYER.hold=null;
  else if(place==='up'){const front=cur.front!==c&&cur.front!==(c+3)%6?cur.front:CUBE_TAB_FRONTS.find(f=>f!==c&&f!==(c+3)%6);PLAYER.hold={top:c,front};}
  else{const top=cur.top!==c&&cur.top!==(c+3)%6?cur.top:0;PLAYER.hold={top,front:c};}
  if(view.mode==='net')setViewNet(false);else drawMain();playerHoldDraw();
}
// A tile is on when the picture shows that color there.
function playerHoldDraw(){
  const D=playerHeldCube();
  $$('#viewHold .ht').forEach(b=>{const at=b.parentNode.dataset.place==='up'?0:2;b.setAttribute('aria-pressed',String(!!D&&D.center[at]===+b.dataset.c));});
  const box=$('#viewHold');if(box)box.classList.toggle('held',!!PLAYER.hold);
}
function playerHoldMount(){
  for(const [place,cs] of [['up',CUBE_TAB_TOPS],['front',CUBE_TAB_FRONTS]]){
    const g=$(`#viewHold .grp[data-place="${place}"]`);if(!g)continue;
    for(const c of cs){const name=COLOR_NAMES[c][0].toUpperCase()+COLOR_NAMES[c].slice(1),t=place==='up'?`${name} on top`:`${name} in front`;
      const b=liveEl('button',{type:'button',class:'ht','data-c':c,'data-cb':'WRGYOB'[c],'aria-label':t,title:`${t}: turn the picture to the way you hold the cube. No turn goes on the list. Press again for the player's hold`});
      b.style.setProperty('--c',stickerColor(c));b.onclick=()=>playerHoldPick(place,c);g.appendChild(b);}
  }
  playerHoldDraw();
}
// ----- the smart cube on the player -----
function liveOn(){return typeof cubeTab!=='undefined'&&!!cubeTab.conn&&puzzleN()===3&&!isBeg();}
// The cube on the player turned back to white up, green front, as a smart cube names its state.
function liveNorm(c){const h=liveHoldOf(c);if(!h||c.isFour)return null;return h.moves.length?applyAlg(c,invertAlg(h.moves)):c;}
function liveSame(a,b){const n=liveNorm(a);return !!n&&!!b&&cubeTabKey(n)===cubeTabKey(b);}
// The F2L guide reads a smart cube itself.
function liveFgOwns(){return typeof fgActive==='function'&&fgActive()&&typeof fg!=='undefined'&&fg.src==='smart';}
function livePlayerCube(){return cubeAtSeq(seqState.idx);}
// Does the player show the cube in your hands?
function liveInStep(state){return !!state&&liveSame(livePlayerCube(),state);}
// A smart cube moved: from `from` to `to` by `moves` (the cube's own names), or a first state.
function liveSmartMoves(d){
  if(!liveOn()||liveFgOwns())return liveNoteDraw();
  if(!d.from){liveConnected(d.to);return liveNoteDraw();}
  if(d.moves&&liveInStep(d.from)){
    for(const m of d.moves){const P=livePlayerCube();cubePlayerTurn(FACE_NAMES[P.center.indexOf(FACE_NAMES.indexOf(m[0]))]+m.slice(1),'smart');}
  }
  liveNoteDraw();
}
// The first state after a connect: in step, nothing to ask. Else ask, once per connect, unless the
// ask is off.
function liveConnected(state){
  if(!state||liveInStep(state)||LIVE.asked||!store.get('smartAsk',true))return;
  LIVE.asked=true;liveAsk();
}
// Use my cube: the cube in your hands becomes the scramble, on the tab in view.
function liveUse(){const st=typeof cubeTab!=='undefined'&&cubeTab.target;if(!st)return;
  scrambleFromCube(st,customName('smart'),true);liveNoteDraw();}
// The ask: Use my cube or Skip, with Don't ask again. Enter uses it, Esc skips.
function liveAsk(){
  if($('#liveAskBg'))return;
  const hk=k=>liveEl('span',{class:'hk'},k);
  const no=liveEl('input',{type:'checkbox',id:'liveAskNo'});
  const skip=liveEl('button',{id:'liveAskSkip',title:'Keep the scramble on the page'},'Skip',hk('Esc'));
  const use=liveEl('button',{id:'liveAskUse',class:'primary',title:'Make the cube in your hands the scramble'},'Use my cube',hk('Enter'));
  const box=liveEl('div',{class:'modal ask',role:'dialog','aria-modal':'true','aria-labelledby':'liveAskTitle'},
    liveEl('h2',{id:'liveAskTitle'},'Use your cube as the scramble?'),
    liveEl('p',{},'Your smart cube is not at the scramble on the page. Use my cube makes the cube in your hands the scramble. Every section then follows your turns.'),
    liveEl('label',{class:'setrow',title:'Keep the scramble when a cube connects, with no question'},no,' Don’t ask again. You can turn the question on again in Settings.'),
    liveEl('div',{class:'row',style:'justify-content:flex-end;margin-top:14px'},skip,use));
  const bg=liveEl('div',{class:'modal-bg ask-bg',id:'liveAskBg'},box);
  document.body.appendChild(bg);
  const close=yes=>{document.removeEventListener('keydown',keys,true);if(no.checked)store.set('smartAsk',false);bg.remove();if(yes)liveUse();};
  const keys=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(false);}else if(e.key==='Enter'&&e.target.tagName!=='BUTTON'){e.preventDefault();e.stopPropagation();close(true);}};
  document.addEventListener('keydown',keys,true);
  skip.onclick=()=>close(false);use.onclick=()=>close(true);
  bg.addEventListener('click',e=>{if(e.target===bg)close(false);});
  setTimeout(()=>{if(use.isConnected)use.focus();},20);
}
// The note under the moves, while a smart cube is connected and the player shows another cube.
function liveNoteDraw(){
  let el=$('#liveNote');const st=typeof cubeTab!=='undefined'&&cubeTab.target;
  const show=liveOn()&&!liveFgOwns()&&!!st&&!liveInStep(st);
  if(!el){if(!show)return;const head=$('#player .seqhead');if(!head)return;
    const b=liveEl('button',{class:'small',id:'liveNoteUse',title:'Make the cube in your hands the scramble'},'Use my cube');b.onclick=liveUse;
    el=liveEl('div',{id:'liveNote',class:'livenote'},liveEl('span',{},'Your smart cube is not at this cube. Turn it to match, or use it as it is.'),b);head.after(el);}
  el.hidden=!show;
}
// ----- the Cross tab: Check my plan follows the player -----
// Where your moves start on the player: after the scramble and its turn to the solving grip, or at
// the start of a plan typed in Check my plan. -1: the player shows something else.
function crossYourStart(){
  if(seqState.drill)return -1;const l=seqState.label||'';
  if(/^your cross plan/.test(l))return 0;
  if(/^scramble/.test(l)){const n=scr.moves.length+(crossRotation()?1:0);return seqState.moves.length>=n&&seqState.moves.slice(0,scr.moves.length).join(' ')===scr.moves.join(' ')?n:-1;}
  return -1;
}
// The moves from the start to the step in view, with a move and its undo taken off (cubeTabMerge).
function crossYourMoves(){const k=crossYourStart();if(k<0)return null;let out=[];for(const m of seqState.moves.slice(k,seqState.idx))out=/^[xyz]/.test(m)?out.concat(m):cubeTabMerge(out,m);return out;}
function crossFollow(){
  if(typeof curTab==='undefined'||curTab!=='cross'||LIVE.typing)return;const ms=crossYourMoves(),inp=$('#crossTry');if(!ms||!inp)return;
  const txt=ms.join(' ');if(inp.value.trim()===txt)return;inp.value=txt;
  crossCheckNow(true);
}
// Moves typed in Check my plan go on the player as they are typed, when they read as moves.
let crossTypeTimer=0;
function crossTyped(){clearTimeout(crossTypeTimer);crossTypeTimer=setTimeout(()=>{
  const v=$('#crossTry').value;let ms;try{ms=parseAlg(v);applyAlg(new Cube(),ms);}catch(e){return;}
  const {cube}=orientedScramble(),pc=phys(cube);LIVE.typing=true;
  try{setSequence(ms,'your cross plan · '+holdText(pc),pc);}finally{LIVE.typing=false;}
  crossCheckNow(true);},250);}
if(typeof document!=='undefined'){
  playerHoldMount();
  document.addEventListener('cw:smartmoves',e=>liveSmartMoves(e.detail||{}));
  document.addEventListener('cw:smart',e=>{const t=e.detail&&e.detail.type;if(t==='connect')LIVE.asked=false;if(t==='disconnect'||t==='gone'||t==='connect')liveNoteDraw();});
  for(const ev of ['cw:sequence','cw:scramble','cw:tab','cw:method'])document.addEventListener(ev,()=>{liveNoteDraw();playerHoldDraw();});
  document.addEventListener('cw:step',playerHoldDraw);
  document.addEventListener('cw:yourmove',crossFollow);
  // A plan belongs to its scramble: a new one empties Check my plan.
  document.addEventListener('cw:scramble',()=>{const inp=$('#crossTry');if(inp)inp.value='';});
  const inp=$('#crossTry');if(inp)inp.addEventListener('input',crossTyped);
}
