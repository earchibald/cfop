// ===== Your level: the level chip, the level menu and the landing card =====
// The chip in the top bar, before the method chip, names the level (its bars, and a short name on the
// desktop). It is on every page, in every method: the way back to the getting-started pages
// (js/start.js) from anywhere. A click opens the level menu: Pick up where you left off (cw:startAt,
// while a track is not finished), the pages and the places of the level's own track, and the four
// levels (a click starts that level's track). The level and the place are kept as they are made, so
// a reload keeps them.
// The landing card: when a track ends in a section, one card above the section says where the user
// is and that the chip brings them back (startLanding, called by startFinish). It goes with Got it or
// with another tab.

const LEVEL_SHORT={1:'New to the cube',3:'Have solved it',4:'Know algorithms',5:'Speedcuber'};
// What each level's track offers from the menu: a page of the track (go) or a place in the site (to).
const LEVEL_TRACK={
  1:[{name:'The basics',note:'The cube, the hold, the pieces, the moves',go:'t1-what'},{name:'Which cube will you use?',note:'Regular, smart or virtual',go:'t2-cube'},
     {name:'Solve my cube with help',note:'Every move, part by part',to:['beginner','bsolve']},{name:'The lessons',note:'One step at a time',to:['beginner','learn']}],
  3:[{name:'Check off what you know',note:'The beginner steps',go:'t3-check'},{name:'What you know, in CFOP',note:'Your steps, as CFOP parts',go:'t3-bridge'},
     {name:'The first CFOP lesson',note:'The cross',to:['cfop','cross'],lesson:true},{name:'The beginner lessons',note:'Practice a step again',to:['beginner','learn']}],
  4:[{name:'Which sets do you know?',note:'F2L, OLL and PLL',go:'t4-sets'},{name:'Quiz me',note:'The cases you marked Learned',go:'t4-quiz'},
     {name:'Cases still to learn',note:'On OLL · PLL',to:['cfop','ll'],left:true},{name:'F2L cases',note:'The 41 cases',to:['cfop','f2l']}],
  5:[{name:'Set up, then time',note:'Inspection, scrambles, the sets',go:'t5-setup'},{name:'The timer',note:'On the Scramble tab',to:['cfop','solve']},
     {name:'Cases still to learn',note:'On OLL · PLL',to:['cfop','ll'],left:true},{name:'F2L cases',note:'The 41 cases',to:['cfop','f2l']}]};
function levelNow(){const n=store.get('level',null);const l=n!=null&&typeof startLevel==='function'?startLevel(n):null;return l?l.n:null;}
function levelChipDraw(){const c=$('#levelChip');if(!c)return;const n=levelNow();
  c.innerHTML=`<span class="lvbars" aria-hidden="true">${stBars(n||0)}</span><span class="lvname desktop-only">${esc(n?LEVEL_SHORT[n]:'Your level')}</span><span class="lvcaret" aria-hidden="true">▾</span>`;
  c.title=n?`Your level: ${startLevel(n).name} Change it, or go back to the getting-started pages`:'Pick your level. It picks where the pages start';
  c.setAttribute('aria-label',n?'Your level: '+LEVEL_SHORT[n]:'Pick your level');
  c.classList.toggle('resume',!!startSaved());}
function levelPopOpen(){const p=$('#levelPop');return !!p&&!p.classList.contains('hidden');}
function levelPopClose(){const p=$('#levelPop');if(!p)return;p.classList.add('hidden');$('#levelChip').setAttribute('aria-expanded','false');}
function levelPopOpenNow(){if(typeof closeMethodPop==='function')closeMethodPop();if(typeof cubePopClose==='function')cubePopClose();
  const p=$('#levelPop'),chip=$('#levelChip');levelPopDraw();
  if(!mobileMQ.matches)p.style.left=Math.max(8,chip.offsetLeft)+'px';else p.style.left='';
  p.classList.remove('hidden');chip.setAttribute('aria-expanded','true');setTimeout(()=>{const b=p.querySelector('.cact.main,.lvrow.on,.lvrow');if(b)b.focus();},20);}
function levelPopDraw(){const p=$('#levelPop');if(!p)return;const n=levelNow(),a=startSaved(),track=n?LEVEL_TRACK[n]||[]:[];
  const resume=a?`<button class="cact main lvresume" data-lv="resume" title="Open the getting-started pages where you left them"><b>Pick up where you left off →</b><span>Getting started · ${esc(START_NAMES[a.screen]||'')}</span></button>`:'';
  p.innerHTML=`<div class="cpop-head"><h3>Your level</h3><span class="muted">It picks where the pages start.</span></div>
    ${resume}
    ${track.length?`<span class="st-lbl">${esc(startLevel(n).name)}</span><div class="cacts">${track.map((t,i)=>`<button class="cact" data-lv="track" data-i="${i}" title="${esc(t.go?'Open the getting-started page: '+t.name:'Go to '+t.name)}"><b>${esc(t.name)}</b><span>${esc(t.note)}</span></button>`).join('')}</div>`:''}
    <span class="st-lbl">${n?'Change your level':'Pick your level'}</span>
    <div class="lvlist">${LEVELS.map(l=>`<button class="lvrow${l.n===n?' on':''}" data-lv="level" data-n="${l.n}" aria-pressed="${l.n===n}" title="${esc(l.tip)}"><span class="lvbars" aria-hidden="true">${stBars(l.n)}</span><b>${esc(l.name)}</b><span class="muted">${esc(l.goes)}</span></button>`).join('')}</div>
    <span class="muted cfoot">A new level starts its own pages. Your times, history and statuses stay.</span>`;
  p.querySelectorAll('[data-lv]').forEach(b=>b.onclick=e=>{e.stopPropagation();levelDo(b);});}
// From the menu the user has a method already: leaving these pages keeps it (START.first off).
function levelDo(b){const k=b.dataset.lv;levelPopClose();if(k!=='resume')START.first=false;
  if(k==='resume'){startResume();return;}
  if(k==='level'){startPick(+b.dataset.n);return;}
  const t=(LEVEL_TRACK[levelNow()]||[])[+b.dataset.i];if(!t)return;
  if(t.go){Object.assign(START,{level:levelNow(),check:null,sets:null,quiz:null,five:null});startOpen(t.go);return;}
  if(START.on)startClose();setMethod(t.to[0]);goTab(t.to[1]);
  if(t.lesson){store.set('crossLesson',0);if(typeof crossLessonShow==='function')crossLessonShow(0);}
  if(t.left&&typeof llShowSet==='function')llShowSet('left');}
// ---------- the landing card ----------
const LANDING={bsolve:['Solve my cube','The app tells you each move, one part at a time.'],learn:['Learn','Up next is your next step. Each step has a lesson.'],
  cross:['Cross','Your first CFOP lesson is at the top.'],ll:['OLL · PLL','It shows the cases you still have to learn.'],solve:['Scramble','The scramble, the cube and the timer. Hold Space to start the timer.']};
function startLanding(tab){const t=LANDING[tab];levelLandingClose();if(!t)return;
  const el=document.createElement('section');el.id='landing';el.className='panel landing';el.dataset.tab=tab;el.setAttribute('aria-label','Getting started is done');
  el.innerHTML=`<div class="landing-text"><span class="st-lbl">Getting started · Done</span><h2>You are on ${esc(t[0])}.</h2><p>${esc(t[1])} Your level is in the top bar. It brings you back to the getting-started pages.</p></div>
    <button class="small" id="landingOk" title="Close this note">Got it</button>`;
  $('.page>.wrap').before(el);$('#landingOk').onclick=levelLandingClose;}
function levelLandingClose(){const el=$('#landing');if(el)el.remove();}
// ---------- the chip ----------
(function levelMenuInit(){
  const chip=document.createElement('button');chip.className='lvchip';chip.id='levelChip';chip.setAttribute('aria-expanded','false');chip.setAttribute('aria-controls','levelPop');
  const pop=document.createElement('div');pop.id='levelPop';pop.className='method-pop cube-pop level-pop hidden';pop.setAttribute('role','dialog');pop.setAttribute('aria-label','Your level');
  $('#methodChip').before(chip);chip.after(pop);
  chip.onclick=e=>{e.stopPropagation();if(levelPopOpen())levelPopClose();else levelPopOpenNow();};
  document.addEventListener('click',e=>{if(!levelPopOpen())return;if(e.target.closest('#levelPop')||e.target.closest('#levelChip'))return;levelPopClose();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&levelPopOpen()){levelPopClose();$('#levelChip').focus();}});
  document.addEventListener('cw:level',levelChipDraw);document.addEventListener('cw:start',levelChipDraw);
  document.addEventListener('cw:tab',e=>{const l=$('#landing');if(l&&l.dataset.tab!==e.detail)levelLandingClose();});
  levelChipDraw();
})();
