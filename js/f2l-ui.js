// ================= The F2L Guide panel =================
// Guide mode of the F2L tab: the first two layers one pair at a time, on the screen cube, on a real
// cube read by the scanner or the painter, or on a smart cube. The solvers are in js/f2l.js (shared
// with the lab); the step logic follows the lab's window (lab/lab.js, labF2L*). See docs/f2l-site.md.
//
// The hint is a drill (fgHintTiles): the first move in clear, every other move covered until it is
// made. On the screen cube and a real cube the user makes a move by a click on the next covered
// tile or the Right arrow: the move goes on the player (the layer turns) and on fg.made, the list
// of moves since the reset point. The Left arrow covers the last move again (fgBack: the player
// steps back and the guide goes back to the snapshot it took before the move, fg.hist). On a smart
// cube the cube itself uncovers a move when the user makes it (fgSmartRead, from the cube tab's
// state through cw:smart events); a wrong move shows the way back and New hint from here.
//
// The reset point (fg.base, in the solving frame: the cross color down) is the scramble with the
// cross solved for you (fgPrepare, as the Live mode does), or the smart cube's state at Set up
// from current. Return to scramble says the moves back to it (the moves made, undone, or
// resyncReturn for a smart cube) and covers the screen cube's moves again. Set up from current
// loads the cube as it is as the scramble (scrambleFromCube), so the pairs solved so far stay
// solved and the guide starts over from here. Read my cube opens the scanner as a refresh scan
// (fgReadCube): the net starts as the state the guide expects, and two or three faces (or the
// stickers painted that differ) find the real state among the states near the hint (js/resync.js);
// Set up from current loads it, Return to scramble says the way back (fgReadBack).
//
// The tree of ways for the target (fg.step.ways): Shortest (the plain hint), Basic (f2lBasic: free a
// stuck piece, then one of the 41 cases, with the case group's reason), Also makes (two pairs in one
// go) and Sets up (the next pair becomes short). One way is in use as the hint; the others are
// buttons under the card, until the first move of the step. The arc (f2lArc) names what each move
// does under its tile.
// Storage: cw:f2lMode (shortest or corner), cw:f2lOrder (the four slot names).
const FG_WAIT_MS=200,FG_PART_NODES=4000000;
const FG_STICKER={white:'W',red:'R',green:'G',yellow:'Y',orange:'O',blue:'B'};
var fg={mode:'shortest',order:F2L_ORDER_DEFAULT.slice(),target:null,done:[],step:null,cross:null,log:[],base:null,extra:[],made:[],hist:[],X:null,held:null,src:'screen',seq:0,timer:0,working:false,broke:'',orderOpen:false,key:null,back:null,read:'',nMoves:0}; // var: tests read it
const fgPos=n=>F2L_POS[n],fgCap=t=>t?t[0].toUpperCase()+t.slice(1):'';
function fgEl(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!=null)x.textContent=text;return x;}
function fgActive(){return curTab==='f2l'&&f2lState.mode==='guide';}
// Where the state comes from: a smart cube that is connected, a cube read from the real one (the
// seed says scan, paint, state, cube or setup), else the screen.
function fgSource(){
  if(typeof cubeTab!=='undefined'&&cubeTab.conn&&cubeTab.target)return 'smart';
  return /^(scan|paint|state|cube|setup)-/.test(scr.seed||'')?'real':'screen';
}
function fgInit(){
  fg.mode=store.get('f2lMode','shortest')==='corner'?'corner':'shortest';
  const o=store.get('f2lOrder',null);fg.order=Array.isArray(o)&&o.length===4&&F2L_ORDER_DEFAULT.every(n=>o.includes(n))?o.slice():F2L_ORDER_DEFAULT.slice();
  $('#fgNew').onclick=()=>newScramble();
  $('#fgRead').onclick=fgReadCube;
  $('#fgReturn').onclick=fgReturn;$('#fgSetup').onclick=fgSetup;
  $('#fgShortest').onclick=()=>fgMode('shortest');$('#fgCorner').onclick=()=>fgMode('corner');
  $('#fgOrderBtn').onclick=()=>{fg.orderOpen=!fg.orderOpen;fgDraw();};
  $('#f2lGuide').addEventListener('click',fgClick);
  document.addEventListener('cw:scramble',()=>{fg.key=null;if(fgActive())fgShow();});
  document.addEventListener('cw:smart',e=>{const t=e.detail&&e.detail.type;if(!fgActive())return;
    if(t==='state'||t==='move'||t==='connect'){if(t==='move')fg.nMoves++;fgSmartRead();}else if(t==='disconnect'||t==='gone'){fg.key=null;fgShow();}});
}
// Guide mode is entered, the tab is entered, a scramble is loaded: show the cube and read it. A
// drill in the player pauses the guide, unless the player is being given back (Back to scramble,
// showForTab: `take`).
function fgShow(take){
  if(!fgActive())return;
  if(seqState.drill&&!take){fgDraw();return;}
  const src=fgSource();
  if(src!==fg.src){fg.src=src;fg.key=null;}
  if(src==='smart'){if(fg.key!=='smart'){fgReset();fg.key='smart';fg.base=null;}fgSmartRead();return;}
  const key=[scr.moves.join(' '),crossRotation(),scr.seed].join('|');
  const go=()=>{if(fg.key!==key){fgReset();fgPrepare();fg.key=key;}fgSequence();fgRead(applyAlg(fg.base,fg.made));};
  if(tablesReady)go();else{fg.working=true;fgDraw();ensureTables(go);}
}
// The reset point of the screen cube or a real cube: the scramble in the solving frame, the cross
// solved for you (the shortest cross), as the Live mode does. fg.extra is the rotation and the
// cross moves the player shows dashed.
function fgPrepare(){
  const r=crossRotation();let c=toFrame(scr.cube);const extra=r?[r]:[];
  const cs=parseAlg(solveCross(c,0,1).solutions[0]);c=applyAlg(c,cs);extra.push(...cs);
  fg.base=c;fg.extra=extra;
}
function fgReset(){clearTimeout(fg.timer);fg.timer=0;fg.seq++;Object.assign(fg,{target:null,done:[],step:null,cross:null,log:[],made:[],hist:[],X:null,held:null,broke:'',working:false,back:null,read:'',nMoves:0});}
// ----- the player -----
// The scramble, the dashed moves solved for you, then the moves made so far. Loaded afresh here;
// one move appended or taken off by fgSeqAppend and fgSeqPop, so the layer turns on the player.
function fgSequence(){
  if(fg.src==='smart')return;
  const n=scr.moves.length,label='scramble · seed '+scr.seed+' · dashed moves are solved for you: '+(crossRotation()?'rotation, ':'')+'cross';
  setSequence([...scr.moves,...fg.extra,...fg.made],label);fgSeqMark(n);
}
function fgSeqMark(n){$$('#scramble .m').forEach((el,i)=>{if(i>=n&&i<n+fg.extra.length){el.classList.add('rot');el.title='Solved for you, not a scramble move.';}});}
function fgSeqAppend(m){stopAuto();seqState.moves.push(m);renderSequence();fgSeqMark(scr.moves.length);seqState.idx=seqState.moves.length;applySequence();}
function fgSeqPop(){stopAuto();seqState.moves.pop();renderSequence();fgSeqMark(scr.moves.length);seqState.idx=seqState.moves.length;applySequence();}
// ----- the smart cube -----
function fgSmartRead(){
  if(fg.src!=='smart')return;
  const held=cubeTabHeld(cubeTab.target);if(!held)return;
  fg.held=held;const X=reframe(held);
  if(!fg.base)fg.base=X;
  if(seqState.label!=='your smart cube, as held')setSequence([],'your smart cube, as held',held);else showCube(held);
  fgRead(X);
}
// ----- the state machine (the lab's labF2LRead) -----
function fgRead(X){
  const f=fg,X0=f.X;f.X=X;
  const s=f.step;let n=-1;
  if(s&&s.moves.length){
    n=f2lDone(s.base,s.moves,X);const half=n<0?f2lPart(s.base,s.moves,X):-1;
    if((n>=0&&n<s.moves.length)||half>=0){s.n=n>=0?n:half;fgOn(s,n>0||half>=0);fgDraw();return;}
    if(n<0){const a=f2lAlong(s.base,s.moves,s.sols,X);
      if(a){const plain=s.moves.join(' ')===s.plain.join(' ');s.moves=a.moves;if(plain)s.plain=a.moves;s.n=a.n;s.then=null;fgOn(s,true);
        if(a.n<a.moves.length){fgDraw();fgThen(f.seq);return;}}}
  }
  const st=f2lStatus(X,f.done);
  if(!st.cross&&!(s&&s.moves.length))fgCrossRead(X,X0);else f.cross=null;
  if(!st.cross&&!s){fgIdle();return;}
  if(st.cross&&st.broken.length){f.done=f.done.filter(n=>!st.broken.includes(n));f.broke=st.broken.map(n=>`The ${fgPos(n)} pair came out.`).join(' ');}
  if(s&&st.cross&&st.solved.includes(s.slot))fgStepDone(X);
  if(st.cross&&st.solved.length===4){fgIdle();return;}
  if(f.step===s&&s&&s.moves.length&&s.begun&&n<0){fgAway(s,X0,X);fgIdle();return;}
  fgSchedule(f.src==='smart'?FG_WAIT_MS:0);
}
function fgOn(s,begun){s.away=false;s.off=[];s.begun=begun;}
// Off a begun hint (a smart cube): the moves since it was left, as the cube tab reads them.
function fgAway(s,X0,X){
  const p=X0&&typeof cubeTabPath==='function'?cubeTabPath(X0,X):null;
  if(!s.away){s.away=true;s.off=[];}
  if(s.off&&p)s.off=s.off.concat(p);else s.off=null;
}
function fgCrossRead(X,X0){
  const f=fg,c=f.cross;
  if(c&&c.moves.length){
    const n=f2lDone(c.base,c.moves,X),half=n<0?f2lPart(c.base,c.moves,X):-1;
    if(n>=0||half>=0){c.n=n>=0?n:half;fgOn(c,n>0||half>=0);return;}
    const a=f2lAlong(c.base,c.moves,c.sols,X);
    if(a){c.moves=a.moves;c.n=a.n;fgOn(c,true);return;}
    if(c.begun){fgAway(c,X0,X);return;}
  }
  const d0=buildCrossTable()[crossIndex(X)],sols=f2lSort(crossSolutions(X,d0).byLen[d0]||[]);
  f.cross={base:X,moves:sols.length?sols[0].split(' '):[],sols,n:0,begun:false,away:false,off:[]};
}
function fgRenew(){
  const f=fg,s=f.step,c=f.cross;
  if(s&&s.away){s.away=false;s.off=[];fgSchedule(0);return;}
  if(c&&c.away&&f.X){f.cross=null;fgCrossRead(f.X,null);fgDraw();}
}
function fgIdle(){clearTimeout(fg.timer);fg.timer=0;fg.seq++;fg.working=false;fgDraw();}
function fgStepDone(X){
  const f=fg,s=f.step,solved=f2lStatus(X,[]).solved;
  const slots=[s.slot,...f.order.filter(n=>n!==s.slot&&solved.includes(n)&&!f.done.includes(n))];
  const moves=f.src==='smart'?null:f.made.slice(s.at),n=f.src==='smart'?f.nMoves-s.at:moves.length;
  f.log.unshift({slots,n,best:s.best,moves:moves?moves.join(' '):'',way:s.way});
  f.done.push(...slots);if(slots.includes(f.target))f.target=null;
  f.step=null;f.broke='';
}
function fgSchedule(ms){
  const f=fg;clearTimeout(f.timer);const seq=++f.seq;f.working=true;fgDraw();
  f.timer=setTimeout(()=>{f.timer=0;if(seq===f.seq)fgCompute(seq);},ms);
}
function fgAt(){return fg.src==='smart'?fg.nMoves:fg.made.length;}
// The hint for the cube now: the clicked pair, else the current step's, else the mode's pick. A
// hint the cube is on stays; so does a hint the cube is away from, until New hint from here.
function fgCompute(seq){
  const f=fg,X=f.X;f.working=false;if(!X)return;
  const st=f2lStatus(X,f.done);
  if(st.cross&&st.solved.length===4){f.step=null;fgDraw();return;}
  const s=f.step;
  const pin=f.target&&!st.solved.includes(f.target)?f.target:(s?s.slot:null);
  if(!(s&&s.moves.length&&pin===s.slot&&(s.away||f2lDone(s.base,s.moves,X)>=0))){
    const r=f2lNext(X,{mode:f.mode,order:f.order,done:f.done,target:pin});
    if(!r){f.step=null;fgDraw();return;}
    const same=!!s&&s.slot===r.slot;
    f.step={slot:r.slot,at:s?s.at:fgAt(),best:same&&s.best!=null?s.best:r.optimal,base:X,moves:r.moves||[],plain:r.moves||[],optimal:r.optimal,sols:r.sols,
      n:0,begun:false,away:false,off:[],then:null,ways:null,way:'short',idx:f.log.length};
    fgWays(f.step);
  }
  fgDraw();
  fgThen(seq);
}
// The tree of ways for the step: Shortest, Basic, then the combinations one per turn of the event
// loop (as the lab does), each with its arc.
function fgWays(s){
  const X=s.base,keep=f2lKeep(X),ways=[];
  if(s.moves.length)ways.push({key:'short',label:'Shortest',moves:s.moves,n:s.moves.length,arc:f2lArc(X,s.slot,s.moves)});
  const b=f2lBasic(X,s.slot,keep);
  if(b&&b.n)ways.push({key:'basic',label:'Basic',moves:b.flat,n:b.n,arc:f2lArc(X,s.slot,b.flat),basic:b});
  s.ways=ways;s.busy=true;
  const others=F2L_ORDER_DEFAULT.filter(n=>n!==s.slot&&!keep.includes(n)),seq=fg.seq;
  const parts=others.map(o=>()=>{const a=f2lAlso(X,s.slot,keep,o,{max:s.optimal+F2L_COMBO_EXTRA,nodeLimit:FG_PART_NODES});
    if(a&&a.moves)ways.push({key:'also:'+o,label:'Also makes '+fgPos(o),moves:a.moves,n:a.n,arc:f2lArc(X,s.slot,a.moves)});});
  parts.push(()=>{const b={left:FG_PART_NODES},r=f2lSetup(X,s.slot,s.sols,{mode:fg.mode,order:fg.order,budget:b});
    if(r)ways.push({key:'setup',label:'Sets up '+fgPos(r.slot),moves:r.moves,n:r.moves.length,arc:f2lArc(X,s.slot,r.moves),after:r.after,plain:r.plain});});
  const run=()=>{if(seq!==fg.seq||fg.step!==s)return;const p=parts.shift();if(p){p();setTimeout(run,0);}else s.busy=false;fgDraw();};
  setTimeout(run,0);
}
function fgThen(seq){
  const f=fg,s=f.step;if(!s||!s.moves.length)return;
  setTimeout(()=>{if(seq!==f.seq||f.step!==s)return;s.then=f2lThen(applyAlg(s.base,s.moves),{mode:f.mode,order:f.order,nodeLimit:FG_PART_NODES});fgDraw();},0);
}
// A way from the tree becomes the hint, before the first move of the step.
function fgUse(key){
  const s=fg.step;if(!s||s.n||s.begun||!s.ways)return;
  const w=s.ways.find(x=>x.key===key);if(!w)return;
  s.moves=w.moves;s.way=key;s.sols=key==='short'?s.sols:[];s.then=null;fgDraw();fgThen(fg.seq);
}
// ----- the moves on the screen cube and a real cube -----
// The next covered move, made: on the player, on the list, and read by the guide.
function fgNextMove(){const s=fg.step,c=fg.cross;if(s&&s.moves.length&&!s.away&&s.n<s.moves.length)return s.moves[s.n];if(!s&&c&&c.moves.length&&!c.away&&c.n<c.moves.length)return c.moves[c.n];return null;}
function fgMake(m){
  if(fg.src==='smart'||!fg.X||seqState.drill)return;
  const s=fg.step,c=fg.cross;
  fg.hist.push({step:s&&{...s,off:s.off&&s.off.slice()},cross:c&&{...c},done:fg.done.slice(),log:fg.log.slice(),target:fg.target,broke:fg.broke,X:fg.X,back:fg.back});
  fg.made.push(m);fg.back=null;fg.read='';fgSeqAppend(m);fgRead(applyAlg(fg.X,[m]));
}
function fgNext(){const m=fgNextMove();if(m)fgMake(m);}
// The last move covered again: the player steps back, the guide goes back to before it.
function fgBack(){
  if(fg.src==='smart'||!fg.made.length)return;
  const h=fg.hist.pop();fg.made.pop();fgSeqPop();clearTimeout(fg.timer);fg.timer=0;fg.seq++;fg.working=false;
  Object.assign(fg,{step:h.step,cross:h.cross,done:h.done,log:h.log,target:h.target,broke:h.broke,X:h.X,back:h.back});
  const s=fg.step;if(s&&s.moves.length){if(s.busy||!s.ways)fgWays(s);if(!s.then)fgThen(fg.seq);} // work the move cut short
  fgDraw();
}
// The keys of the guide, from the page's key handler: Right makes the next move, Left covers the last.
function f2lGuideKey(e){
  if(!fgActive()||fg.src==='smart'||seqState.drill)return false;
  if(e.key==='ArrowRight'){e.preventDefault();fgNext();return true;}
  if(e.key==='ArrowLeft'){e.preventDefault();fgBack();return true;}
  return false;
}
// ----- Read my cube -----
// The guide's states are in the solving frame (the cross color down); the scanner reads the cube
// in the engine frame (white up, green front). fgEngine turns a state to the engine frame; toFrame
// (app.js) turns it back.
function fgEngine(X){const r=crossRotation();if(!r)return X;const R=applyAlg(new Cube(),r);return R.mul(X).mul(R.inverse());}
// The states the guide expects, nearest first: the cube now (the reset point after the moves
// made), then after each move still to make of the hint in use (the step's, or the cross line's),
// and back along the moves made; in the engine frame.
function fgReadBases(){
  const s=fg.step,c=fg.cross,h=s&&s.moves.length&&!s.away?s:(!s&&c&&c.moves.length&&!c.away?c:null);
  const hint=h?h.moves.slice(h.n):[];
  return resyncBases(fg.base,[...fg.made,...hint],fg.made.length).map(b=>({cube:fgEngine(b.cube),at:b.at,off:b.off}));
}
function fgReadCube(){
  if(typeof openScan!=='function')return;
  const re=fg.src!=='smart'&&fg.X&&fg.base&&!seqState.drill&&puzzleN()===3;
  if(!re){openScan();return;}
  openScan({n:3,resync:{bases:fgReadBases()},onCube:fgReadBack});
}
// The cube read: 'return' says the way back to the reset point (the screen cube goes back too);
// 'setup' and 'use' make the cube as read the scramble, so the guide starts over from it.
function fgReadBack(cube,how,info){
  if(how==='return'){
    const X=toFrame(cube),back=resyncReturn(X,fg.base,{timeMs:1500});
    while(fg.made.length)fgBack();
    fg.back=back?back.join(' '):null;fg.read=info&&info.off!=null?`Your cube was read ${info.off?`${info.off} move${info.off===1?'':'s'} off the hint`:'on the hint'}.`:'Your cube was read.';
    fgDraw();return;
  }
  const res=scrambleFromCube(cube,customName('scan'),true);
  if(!res.ok){fg.back=null;fg.broke=res.errors.join(' ');fgDraw();}
}
// ----- Return to scramble, Set up from current -----
// The way back to the reset point: the moves made, undone (the screen cube goes back too), or the
// shortest way for a smart cube.
function fgReturn(){
  if(!fg.X||!fg.base)return;
  if(fg.src==='smart'){const back=resyncReturn(fg.X,fg.base,{timeMs:1500});fg.back=back?back.join(' '):null;fgDraw();return;}
  const back=invertAlg(fg.made);
  while(fg.made.length)fgBack();
  fg.back=back||'';fg.read='';fgDraw();
}
// The cube as it is becomes the scramble. The screen cube and a real cube go through the scramble
// finder (the state turned back to white up); a smart cube keeps its own state and starts over.
function fgSetup(){
  if(!fg.X)return;
  if(fg.src==='smart'){const X=fg.X;fgReset();fg.base=X;fgRead(X);return;}
  const r=crossRotation(),R=r?applyAlg(new Cube(),r):null,c=R?R.mul(fg.X).mul(R.inverse()):fg.X;
  const res=scrambleFromCube(c,customName('setup'),true);
  if(!res.ok){fg.back=null;fg.broke=res.errors.join(' ');fgDraw();}
}
// ----- the controls -----
function fgMode(m){const f=fg;if(f.mode===m)return;f.mode=m;store.set('f2lMode',m);fgUnbegun();if(f.X&&!f.step)fgSchedule(0);else fgDraw();}
function fgUnbegun(){const f=fg,s=f.step;if(s&&!s.n&&!s.begun&&!f.target)f.step=null;}
function fgOrderMove(n,dir){
  const f=fg,o=f.order.slice(),i=o.indexOf(n),j=i+dir;if(i<0||j<0||j>3)return;
  [o[i],o[j]]=[o[j],o[i]];f.order=o;store.set('f2lOrder',o);fgUnbegun();if(f.X&&!f.step)fgSchedule(0);else fgDraw();
}
function fgPick(n){
  const f=fg,s=f.step;if(!f.X||(s&&s.slot===n)||f2lStatus(f.X,[]).solved.includes(n))return;
  f.target=n;if(s&&!s.n&&!s.begun)f.step=null;
  if(!f.step)fgSchedule(0);else fgDraw();
}
function fgClick(e){
  const t=e.target.closest('button,span.gm');if(!t)return;
  if(t.dataset.chip){if(t.getAttribute('aria-disabled')!=='true')fgPick(t.dataset.chip);return;}
  if(t.dataset.ord){fgOrderMove(t.dataset.ord,+t.dataset.dir);return;}
  if(t.dataset.use){fgUse(t.dataset.use);return;}
  if(t.dataset.renew){fgRenew();return;}
  if(t.dataset.case){const f=F2L_CASES.find(c=>c.n===+t.dataset.case);if(f)openCaseModal(modalForF2L(f));return;}
  if(t.classList.contains('gm')&&t.dataset.next){fgNext();return;}
}
// ----- the drawing -----
// The hint as tiles: the moves made dim, the first move in clear, every other move covered until
// it is made. The next covered move is a button on the screen cube and a real cube. Under each
// tile, what the move does to the pair (the arc), where it says something.
function fgHintTiles(moves,n,arc,click){
  const row=fgEl('div','fg-hint');
  const by={};for(const e of arc||[])by[e.i]=e.text;
  if(by[0]){const t=fgEl('span','fg-tile fg-lead');t.appendChild(fgEl('small',null,by[0]));row.appendChild(t);}
  moves.forEach((m,i)=>{
    const t=fgEl('span','fg-tile'),x=fgEl('span','gm '+(i<n?'f2l-did':i===0?'f2l-first':'sp-m'));x.textContent=m;
    if(click&&i===n){x.dataset.next='1';x.setAttribute('role','button');x.tabIndex=0;x.title='Make this move: click it, or press the Right arrow';x.classList.add('next');}
    t.appendChild(x);if(by[i+1])t.appendChild(fgEl('small',null,by[i+1]));row.appendChild(t);});
  row.title='Each move shows when you make it.';
  return row;
}
function fgOffLine(h){
  const el=fgEl,p=el('p','off'),k=h.off?h.off.length:0;
  p.appendChild(el('b',null,h.off?`Off the hint by ${k} move${k===1?'':'s'}.`:'Off the hint.'));
  if(k){p.appendChild(document.createTextNode(' Back: '));p.appendChild(el('code',null,invertAlg(h.off)));}
  const b=el('button','small',"New hint from here");b.type='button';b.dataset.renew='1';b.title='Drop this hint and find the shortest way from where the cube is now';p.appendChild(b);
  return p;
}
function fgWords(){const c=fg.src==='smart'?fg.held:fg.X?phys(fg.X):null;return c?f2lSlotWords(c):f2lSlotWords(new Cube());}
function fgColor(){const c=fg.src==='smart'?fg.held:fg.X?phys(fg.X):null;return c?COLOR_NAMES[c.center[3]]:$('#crossColor').value;}
function fgDraw(){
  const a=document.activeElement,box=$('#f2lGuide');
  const fo=a&&box&&box.contains(a)&&a.dataset?(a.dataset.ord?`[data-ord="${a.dataset.ord}"]`:a.dataset.chip?`[data-chip="${a.dataset.chip}"]`:a.dataset.use?`[data-use="${a.dataset.use}"]`:a.dataset.next?'.gm.next':null):null;
  const dir=a&&a.dataset&&a.dataset.dir;
  fgDrawAll();
  if(fo&&!box.contains(document.activeElement)){const b=(dir&&$(`#f2lGuide ${fo}[data-dir="${dir}"]:not(:disabled)`))||$(`#f2lGuide ${fo}:not(:disabled)`);if(b)b.focus();}
}
function fgDrawAll(){
  const f=fg,el=fgEl,X=f.X,s=f.step,st=X?f2lStatus(X,f.done):null,color=fgColor(),click=f.src!=='smart';
  // the cube line
  const cl=$('#fgCube');cl.textContent='';
  const who=f.src==='smart'?(typeof smartNiceName==='function'?smartNiceName(cubeTab.name):'your smart cube'):f.src==='real'?`your cube, ${/^scan/.test(scr.seed)?'scanned':/^paint/.test(scr.seed)?'painted':'read'} ${(scr.seed.match(/-(\d\d)(\d\d)(\d\d)$/)||[]).slice(1,3).join(':')||'earlier'}`:'the screen cube';
  cl.appendChild(el('b',null,`Your cube: ${who}.`));
  cl.appendChild(el('span','muted',f.src==='smart'?' Make each move on the cube: it uncovers as you turn.':f.src==='real'?' Make each move on your cube too: click the next move, or press the Right arrow. Left covers it again.':' Click the next move, or press the Right arrow. Left covers it again.'));
  if(f.back!=null){const p=el('p','fg-back');if(f.read)p.appendChild(el('span',null,f.read+' '));p.appendChild(el('b',null,f.back?'Back to the scramble: ':'The cube is at the scramble.'));if(f.back)p.appendChild(el('code',null,f.back));cl.appendChild(p);}
  $('#fgReturn').disabled=!(X&&f.base&&(f.src==='smart'?!X.equals(f.base):f.made.length>0));
  $('#fgSetup').disabled=!X||!!seqState.drill;
  // a drill in the player
  const dn=$('#fgDrill');dn.hidden=!seqState.drill;
  // the cross line
  const cr=$('#fgCross');cr.textContent='';
  if(seqState.drill)cr.appendChild(el('span','muted','A drill is in the player. Press Back to scramble to go on with the guide.'));
  else if(!X)cr.appendChild(el('span','muted',f.working?'Working.':'No cube yet.'));
  else if(st.cross)cr.appendChild(el('b',null,`${fgCap(color)} cross on the bottom: made.`));
  else if(s&&s.away)cr.appendChild(el('span',null,`The ${color} cross is apart.`));
  else if(s&&s.moves.length)cr.appendChild(el('span',null,crossSolved(s.base)?`The hint takes the ${color} cross apart for a few moves. It makes the cross again before it ends.`:`The ${color} cross is apart. The hint makes it again.`));
  else{
    const c=f.cross,ln=c?c.moves.length:0;
    cr.appendChild(el('b',null,s?`The ${color} cross is apart.`:`Make the ${color} cross first.`));
    if(c&&ln){cr.appendChild(document.createTextNode(` ${s?'Make it again. ':''}Shortest: ${ln} move${ln===1?'':'s'}`+(c.n?`, ${c.n} made.`:'.')));
      cr.appendChild(fgHintTiles(c.moves,c.n,null,click&&!c.away));if(c.away)cr.appendChild(fgOffLine(c));}
  }
  const main=!!X&&!seqState.drill&&(!!s||st.cross);
  $('#fgMain').hidden=!main;
  $('#fgCount').textContent=main?`${st.cross?st.solved.length:0} of 4 pairs`:'';
  if(!main)return;
  // the chips
  const words=fgWords(),chips=$('#fgChips');chips.textContent='';
  for(const n of f.order){
    const w=words[n],solved=st.solved.includes(n)||(!!s&&f.done.includes(n)),target=!!s&&s.slot===n||(!s&&f.target===n);
    const b=el('button','fg-chip'+(solved?' solved':target?' target':''));b.type='button';b.dataset.chip=n;
    const NS='http://www.w3.org/2000/svg',ck=document.createElementNS(NS,'svg'),p=document.createElementNS(NS,'path');
    ck.setAttribute('class','ck');ck.setAttribute('viewBox','0 0 24 24');ck.setAttribute('aria-hidden','true');p.setAttribute('d','M5 12.5l4.5 4.5L19 7.5');ck.appendChild(p);b.appendChild(ck);
    b.appendChild(el('span',null,`${fgCap(w.pos)} · ${w.colors.join(' ')}`));
    const sw=el('span','sw');sw.setAttribute('aria-hidden','true');for(const c of w.colors){const i=el('i');i.style.background=`var(--sticker-${FG_STICKER[c]})`;sw.appendChild(i);}b.appendChild(sw);
    if(solved){b.setAttribute('aria-disabled','true');b.title=`The ${w.pos} pair is solved`;}
    else if(target){b.setAttribute('aria-disabled','true');b.setAttribute('aria-current','true');b.title=`The ${w.pos} pair is the target`;}
    else b.title=`Make the ${w.pos} pair the target now`;
    chips.appendChild(b);
  }
  // the mode and the order
  $('#fgShortest').setAttribute('aria-pressed',String(f.mode==='shortest'));$('#fgCorner').setAttribute('aria-pressed',String(f.mode==='corner'));
  $('#fgOrderBtn').setAttribute('aria-expanded',String(f.orderOpen));
  const ord=$('#fgOrder');ord.hidden=!f.orderOpen;ord.textContent='';
  f.order.forEach((n,i)=>{
    const g=el('span','fg-ord'),mk=(dir,txt,lbl)=>{const b=el('button',null,txt);b.type='button';b.dataset.ord=n;b.dataset.dir=String(dir);b.setAttribute('aria-label',lbl);b.title=lbl;b.disabled=dir<0?i===0:i===3;return b;};
    g.appendChild(mk(-1,'←',`Move ${fgPos(n)} one place earlier`));g.appendChild(el('span',null,`${i+1}. ${fgCap(fgPos(n))}`));g.appendChild(mk(1,'→',`Move ${fgPos(n)} one place later`));
    ord.appendChild(g);
  });
  // the step card
  const card=$('#fgCard');card.textContent='';
  if(st.cross&&st.solved.length===4)card.appendChild(el('p','good','The first two layers are solved. Press N for a new scramble.'));
  else if(!s||f.working&&!s.moves.length)card.appendChild(el('p','muted','Working.'));
  else{
    const w=words[s.slot],tg=el('p','tgt');tg.appendChild(document.createTextNode('Target: '));tg.appendChild(el('b',null,w.pos));tg.appendChild(document.createTextNode(` (${w.colors.join(', ')}).`));card.appendChild(tg);
    if(!s.moves.length)card.appendChild(el('p','warn',`No hint in ${F2L_MAX_DEPTH} moves or fewer. Make the ${color} cross again, or press N for a new scramble.`));
    else{
      const way=s.ways&&s.ways.find(x=>x.key===s.way),arc=way?way.arc:f2lArc(s.base,s.slot,s.moves);
      card.appendChild(fgHintTiles(s.moves,s.n,arc,click&&!s.away));
      if(click&&!s.away){const k=el('span','hk fg-hk','→');k.setAttribute('aria-hidden','true');k.title='The Right arrow makes the next move; the Left arrow covers the last one again';card.appendChild(k);}
      const ln=s.moves.length;card.appendChild(el('span','cnt',`${ln} move${ln===1?'':'s'}`+(s.n?`, ${s.n} made`:'')+(way&&way.key!=='short'?` · ${way.label.toLowerCase()}`:'')));
      if(s.away)card.appendChild(fgOffLine(s));
      if(way&&way.basic){const b=way.basic,bk=el('p','fg-book');
        bk.appendChild(el('b',null,'As the book writes it: '));bk.appendChild(el('code',null,b.moves.join(' ')));
        for(const stp of b.steps){bk.appendChild(el('span',null,' '+stp.text));
          if(stp.kind==='case'){const lk=el('button','small ghost','Case details');lk.type='button';lk.dataset.case=String(stp.n);lk.title=`Open F2L case ${stp.n}: its picture, recognition and algorithm`;bk.appendChild(lk);bk.appendChild(el('span','muted',' '+stp.why));}}
        card.appendChild(bk);}
    }
    if(f.working)card.appendChild(el('p','muted','Working.'));
  }
  if(f.broke)card.appendChild(el('p','warn',f.broke));
  // the tree: the other ways
  const tr=$('#fgTree');tr.textContent='';
  tr.hidden=!(s&&s.moves.length&&!s.away&&!(st.cross&&st.solved.length===4));
  if(!tr.hidden){
    const open=!s.n&&!s.begun;
    tr.appendChild(el('span','muted',open?'Ways: ':'In use: '));
    for(const w of s.ways||[]){const on=w.key===s.way;if(!open&&!on)continue;
      const b=el('button','small'+(on?' on':''),`${w.label} · ${w.n} move${w.n===1?'':'s'}`+(w.basic?` · case ${w.basic.steps[w.basic.steps.length-1].n}`:'')+(w.after!=null?`, then ${w.after}`:''));
      b.type='button';b.dataset.use=w.key;b.setAttribute('aria-pressed',String(on));b.disabled=!open;b.title=on?'The hint in use':'Use this way as the hint';tr.appendChild(b);}
    if(s.busy)tr.appendChild(el('span','muted','Looking for combinations.'));
  }
  // then
  const th=$('#fgThen');th.textContent='';const then=s&&s.moves.length&&s.then;
  th.hidden=!(then&&then.length);
  if(!th.hidden){th.appendChild(document.createTextNode('Then '));
    then.forEach((t,i)=>{if(i)th.appendChild(document.createTextNode(' · '));th.appendChild(el('b',null,fgPos(t.slot)));th.appendChild(document.createTextNode(t.n==null?', no count':i?`, ${t.n}`:`, ${t.n} move${t.n===1?'':'s'}`));});}
  // the solved pairs
  const dl=$('#fgDone');dl.textContent='';dl.hidden=!f.log.length;
  if(f.log.length){dl.appendChild(el('h3',null,'Solved pairs'));
    for(const e of f.log){const d=el('div','ent');
      d.appendChild(el('span','name',`${fgCap(e.slots.map(fgPos).join(' and '))}: ${e.n} move${e.n===1?'':'s'}`+(e.best!=null?` (shortest was ${e.best})`:'')+(e.way&&e.way!=='short'?` · ${e.way.replace(/:.*/,'')}`:'')));
      if(e.moves)d.appendChild(el('code',null,e.moves));
      dl.appendChild(d);}}
}
tabShow.f2l=()=>{if(f2lState.mode==='guide')fgShow(true);else if(f2lState.mode==='live')showF2LState();else showScr();};
fgInit();
