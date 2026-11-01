// ===== Undo =====
// One queue of the things a user did on the page: a new scramble, a change of section, of method or
// of cube, a move on the virtual cube (or a drill or plan loaded on the player), the Animate, Hidden
// faces and Net buttons, the hold, the sheets of the stage view (fold, close, float) and Maximize
// cube. Undo (the button at the top right of the stage, or Cmd+Z, Ctrl+Z) takes the last one back.
// How: a snapshot of that state before each input of the user (a key, a click, a drag, a change)
// and after it. When they differ, the keys that changed go on the queue with their old values. A
// change with no input (a smart cube's turn, the timer's next scramble, a reply from the camera)
// is not on the queue: the next input takes it as the new start. The Settings window is not on the
// queue, nor are steps through the player (the arrows, the slider). A smart cube's turns are not
// either: the cube in the hands cannot turn back.
var UNDO={list:[],last:null,pending:0,armUntil:0,busy:false,ignore:false,max:200}; // var: tests read it
const UNDO_KEYS=['method','tab','src','scr','seq','anim','hidden','net','hold','sheets','max'];
function undoSnap(){const g=(f,d)=>{try{return f();}catch(e){return d;}};
  const s={method:g(()=>method,''),tab:g(()=>curTab,''),src:g(()=>cubeSrc(),''),
    anim:g(()=>animOn(),false),hidden:g(()=>hiddenOn(),false),net:g(()=>view.mode,'3d'),
    hold:g(()=>JSON.stringify(PLAYER.hold||null),'null'),sheets:g(()=>JSON.stringify(store.get('svSheets',{})||{}),'{}'),
    max:g(()=>!!store.get('svMax',false),false),scr:'',seq:''};
  if(typeof scr!=='undefined'){s.scr=scr.seed+'|'+scr.moves.join(' ');const inp=$('#seed');
    s._scr={seed:scr.seed,moves:scr.moves.slice(),custom:!inp||inp.value!==scr.seed};}
  if(typeof seqState!=='undefined'){const q=seqState;s.seq=q.moves.join(' ')+'|'+q.label+'|'+(q.drill||'')+'|'+(q.base&&q.base.key?q.base.key():'');
    s._seq={moves:q.moves.slice(),label:q.label,base:q.base,drill:q.drill,idx:q.idx,yours:q.yours};}
  return s;}
// The keys that differ between two snapshots.
function undoDiff(a,b){return UNDO_KEYS.filter(k=>a[k]!==b[k]);}
// A name for the change, for the button's title.
function undoName(e){const k=e.keys,a=e.before,b=e.after;
  if(k.includes('method'))return 'the change of method';
  if(k.includes('scr'))return 'the new scramble';
  if(k.includes('src'))return 'the change of cube';
  if(k.includes('tab'))return 'the change of section';
  if(k.includes('seq')){const x=a._seq.moves,y=b._seq.moves;
    if(y.length===x.length+1&&y.slice(0,-1).join()===x.join())return 'the move '+y[y.length-1];
    if(b._seq.drill&&b._seq.drill!==a._seq.drill)return b._seq.drill;return 'the moves on the player';}
  if(k.includes('max'))return b.max?'Maximize cube':'Minimize cube';
  return ({anim:'Animate',hidden:'Hidden faces',net:'Net',hold:'the hold',sheets:'the change to the sheets'})[k[0]]||'the last change';}
// Before an input: the state as it stands is the start (a change made with no input is taken in).
function undoPre(e){if(UNDO.busy)return;
  UNDO.ignore=!!(e&&e.target&&e.target.closest&&e.target.closest('#setBg'));
  if(!UNDO.pending)UNDO.last=undoSnap();
  UNDO.armUntil=Date.now()+700;undoSchedule();}
function undoSchedule(){if(UNDO.pending)return;UNDO.pending=setTimeout(undoCheck,0);}
// After it: what changed goes on the queue.
function undoCheck(){UNDO.pending=0;if(UNDO.busy)return;const now=undoSnap(),was=UNDO.last;UNDO.last=now;if(!was)return;
  const running=typeof timer!=='undefined'&&timer.state!=='idle';
  if(UNDO.ignore||running)return;
  const keys=undoDiff(was,now);if(!keys.length)return;
  UNDO.list.push({keys,before:was,after:now});if(UNDO.list.length>UNDO.max)UNDO.list.shift();undoDraw();}
// Put back what the last entry changed.
function undoRun(){const e=UNDO.list.pop();if(!e){undoDraw();return false;}
  if(UNDO.pending){clearTimeout(UNDO.pending);UNDO.pending=0;}
  if(typeof siStop==='function')siStop();
  const b=e.before,k=new Set(e.keys);UNDO.busy=true;
  try{
    if(k.has('method')&&b.method!==method&&typeof setMethod==='function')setMethod(b.method);
    if(k.has('src')&&typeof setCubeSrc==='function')setCubeSrc(b.src);
    if(k.has('scr')&&b._scr)loadScramble(b._scr.seed,b._scr.moves,b._scr.custom);
    if(k.has('tab')&&b.tab!==curTab)goTab(b.tab);
    if((k.has('seq')||k.has('scr'))&&b._seq){const q=b._seq;setSequence(q.moves,q.label,q.base,q.drill);seqState.idx=q.idx;seqState.yours=q.yours;applySequence();}
    if(k.has('anim'))setAnim(b.anim);
    if(k.has('hidden'))setHidden(b.hidden);
    if(k.has('net'))setViewNet(b.net==='net');
    if(k.has('hold')&&typeof PLAYER!=='undefined'){PLAYER.hold=JSON.parse(b.hold);drawMain();if(typeof playerHoldDraw==='function')playerHoldDraw();}
    if(k.has('sheets')){store.set('svSheets',JSON.parse(b.sheets));if(typeof svSheets==='function')svSheets();}
    if(k.has('max')&&typeof svMaxSet==='function')svMaxSet(b.max);
  }finally{UNDO.busy=false;UNDO.last=undoSnap();}
  undoDraw();return true;}
function undoDraw(){const b=$('#undoBtn');if(!b)return;const e=UNDO.list[UNDO.list.length-1],mac=/Mac|iPhone|iPad/.test(navigator.platform||'');
  b.disabled=!e;b.title=e?`Undo ${undoName(e)} (${mac?'⌘':'Ctrl+'}Z)`:'Nothing to undo';}
// Cmd+Z or Ctrl+Z, outside a text field (a field keeps its own undo).
function undoKey(e){if(!(e.metaKey||e.ctrlKey)||e.shiftKey||e.altKey||(e.key!=='z'&&e.key!=='Z'))return false;
  const el=document.activeElement,tag=el?el.tagName:'';
  if(tag==='TEXTAREA'||(tag==='INPUT'&&!/^(range|checkbox|radio|button)$/.test(el.type))||(el&&el.isContentEditable))return false;
  if($('#setBg'))return false;
  e.preventDefault();e.stopPropagation();undoRun();return true;}
if(typeof window!=='undefined'){
  // Capture on the window: before any handler on the page changes anything.
  addEventListener('keydown',e=>{if(undoKey(e))return;undoPre(e);},true);
  for(const t of ['pointerdown','pointerup','click','change'])addEventListener(t,e=>{if(e.target&&e.target.closest&&e.target.closest('#undoBtn'))return;undoPre(e);},true);
  // A change that comes a moment after the input (a drill that waits for its tables) is the input's.
  for(const t of ['cw:scramble','cw:sequence','cw:tab','cw:cubesrc','cw:method'])document.addEventListener(t,()=>{if(!UNDO.busy&&Date.now()<UNDO.armUntil)undoSchedule();});
  // A smart cube's turn is no input.
  document.addEventListener('cw:yourmove',e=>{if(e.detail&&e.detail.src==='smart'&&!UNDO.pending)UNDO.last=undoSnap();});
}
