// ===== Beginner mode: the method chip, its popover, and the progress panel =====
// Loads after app.js, enter.js and scan.js. The beginner tabs live in their own files:
// learn.js (Learn, Cheat sheet), guide.js (Solve my cube), paint.js (Paint the colors),
// practice.js (Practice, Progress). They use the hooks below and the ones app.js exports:
//   method, setMethod(m), goTab(name), tabShow[tab], setSequence(moves,label,base,drill),
//   heldCube(), begProgress, stBtn('beg-N'), cycleStatus(id), and the events
//   cw:scramble, cw:status, cw:method, cw:tab on document.

// The cube as the beginner holds it: yellow up, green in front. The scramble is applied white
// up, so this is the scramble after z2. The beginner solver reads this frame.
function heldCube(){return applyAlg(scr.cube,['z2']);}
const BEG_STEP_COUNT=8;
const begStatusId=n=>'beg-'+n;

// ---------- progress: step status in llState.status, counts in cw:begProg ----------
const begProg=Object.assign({solves:0,practiced:0,steps:{}},store.get('begProg',{}));
if(begProg.practised!=null){begProg.practiced+=begProg.practised;delete begProg.practised;} // the key before the US spelling
var begProgress={ // var: tests read it from the window
  status(n){return llState.status[begStatusId(n)]||'';},
  counts(){let finished=0,learning=0;for(let n=1;n<=BEG_STEP_COUNT;n++){const s=this.status(n);if(s==='finished')finished++;else if(s==='learning')learning++;}return {finished,learning};},
  // The first step that is not finished, the basics included. null when all are finished.
  next(){return BEGINNER_STEPS.find(s=>this.status(s.n)!=='finished')||null;},
  solved(){begProg.solves++;store.set('begProg',begProg);renderProgress();},
  practiced(n){begProg.practiced++;begProg.steps[n]=(begProg.steps[n]||0)+1;store.set('begProg',begProg);renderProgress();},
  data(){return begProg;},
};
function begStepLabel(s){return s.n===0?'Basics, '+s.name:'Step '+s.n+', '+s.name;}
function renderProgress(){
  const sq=$('#progSq');if(!sq)return;
  sq.innerHTML=Array.from({length:BEG_STEP_COUNT},(_,i)=>{const n=i+1,s=begProgress.status(n);return `<i class="${s}" title="Step ${n}: ${BEGINNER_STEPS[n].name}, ${s||'unlearned'}"></i>`;}).join('');
  const {finished,learning}=begProgress.counts();
  $('#progText').textContent=finished===BEG_STEP_COUNT?'All eight steps finished.':finished||learning?`${finished} step${finished===1?'':'s'} finished${learning?`, ${learning} in learning`:''}.`:'No steps finished yet.';
  $('#progSolves').textContent=begProg.solves;$('#progPract').textContent=begProg.practiced;
  const nx=begProgress.next();$('#progNext').textContent=nx?begStepLabel(nx):'Try CFOP, from the chip in the top bar.';
  const note=$('#mnoteBeg');if(note)note.textContent=finished?`${finished} of ${BEG_STEP_COUNT} steps finished`:'Start here';
}
$('#progSolve').onclick=()=>goTab('bsolve');
// "Time my solves" puts the timer in the panel. "Progress" on the timer panel brings this back.
function showBegTimer(on){if(on)document.body.dataset.begtimer='1';else delete document.body.dataset.begtimer;store.set('begTimer',!!on);}
$('#progTimer').onclick=()=>showBegTimer(true);
$('#timerBack').onclick=()=>showBegTimer(false);
if(store.get('begTimer',false))showBegTimer(true);
document.addEventListener('cw:status',e=>{if(String(e.detail).startsWith('beg-'))renderProgress();});

// ---------- the method chip and its popover ----------
function renderChip(){$('#methodName').textContent=method==='beginner'?'Beginner':'CFOP';
  $$('#methodPop .mcard').forEach(c=>c.classList.toggle('on',c.dataset.method===method));}
function setMethod(m,opts){
  m=m==='beginner'?'beginner':'cfop';const changed=m!==method;method=m;document.body.dataset.method=m;store.set('method',m);
  renderChip();renderProgress();
  if(changed||(opts&&opts.force)){goTab(store.get(tabKey(),homeTab()));}
  document.dispatchEvent(new CustomEvent('cw:method',{detail:m}));
}
function openMethodPop(){const pop=$('#methodPop'),chip=$('#methodChip');renderChip();
  if(!mobileMQ.matches)pop.style.left=Math.max(8,chip.offsetLeft)+'px';else pop.style.left='';
  pop.classList.remove('hidden');chip.setAttribute('aria-expanded','true');
  setTimeout(()=>{const c=$('#methodPop .mcard.on');if(c)c.focus();},20);}
function closeMethodPop(){$('#methodPop').classList.add('hidden');$('#methodChip').setAttribute('aria-expanded','false');}
function methodPopOpen(){return !$('#methodPop').classList.contains('hidden');}
$('#methodChip').onclick=()=>{if(methodPopOpen())closeMethodPop();else openMethodPop();};
$$('#methodPop .mcard').forEach(c=>c.onclick=()=>{closeMethodPop();setMethod(c.dataset.method);});
document.addEventListener('click',e=>{if(!methodPopOpen())return;if(e.target.closest('#methodPop')||e.target.closest('#methodChip'))return;closeMethodPop();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&methodPopOpen()){closeMethodPop();$('#methodChip').focus();}});

// boot: the first visit opens the popover once
const begFirstVisit=store.get('method',null)==null;
setMethod(method,{force:true});
if(begFirstVisit)setTimeout(openMethodPop,300);
