// ===== Getting started, in the site =====
// The parts of the onboarding storyboard that live in the sections (js/start.js has the pages):
//   the method menu: Your level with Change (the level picker again), and a Next mark on CFOP
//     when every beginner step is Learned (a suggestion, not a lock);
//   the beginner home: a line that names the cube in use, with Change (the cube menu);
//   the beginner Progress tab: all nine steps Learned → "You can solve the cube. Next: CFOP";
//   the Cross tab: the first lesson (Find, Plan, Do it) after the bridge of level 3;
//   the OLL · PLL tab: Show (Still to learn, Learning, Learned, All, cw:llShow), the plan in one
//     line, Drill Learning, and the full PLL as a group with its statuses (pllf-<name>);
//   the Scramble tab as home for level 5 (cw:timerHome): a large timer, Weak spots, Today.
// The first visit opens the level picker in place of the method menu (js/beginner-ui.js).

// ---------- the method menu ----------
function startLevelRow(){const pop=$('#methodPop');if(!pop)return;let row=$('#methodLevel');
  if(!row){row=document.createElement('div');row.id='methodLevel';row.className='mlevel';const head=pop.querySelector('.row');head.after(row);}
  const n=store.get('level',null),l=n?startLevel(n):null;
  row.innerHTML=`<span class="st-lbl">Your level</span><span class="lvbars" aria-hidden="true">${stBars(n||0)}</span><span>${l?esc(l.name):'Not set'}</span><span class="spacer"></span><button class="small ghost" id="methodLevelBtn" title="Pick your cube level again">${l?'Change':'Pick one'}</button>`;
  $('#methodLevelBtn').onclick=e=>{e.stopPropagation();closeMethodPop();startOpen('level');};
  const card=pop.querySelector('.mcard[data-method="cfop"]');if(card){let t=card.querySelector('.mnext');const next=method==='beginner'&&begAllLearned();
    if(next&&!t){t=document.createElement('span');t.className='tag mnext';t.textContent='Next';t.title='Every beginner step is Learned. CFOP is next. It is a suggestion, not a lock.';card.querySelector('.row').appendChild(t);}
    if(!next&&t)t.remove();}}
// Basics and the eight steps of the 3×3 beginner method, all Learned.
function begAllLearned(){for(let n=0;n<=8;n++)if(llState.status['beg-'+n]!=='finished')return false;return true;}
// ---------- the beginner home: the cube in use ----------
// The line in the Up next card of the Learn home (lnHomeHTML draws the box, #begCubeLine).
function begCubeLine(){const el=$('#begCubeLine');if(!el)return;
  const id=typeof smartLive==='function'&&smartLive()?'smart':cubeSrc();
  const lines={screen:'Virtual cube. The keyboard or the numeric keypad turns it.',mine:'Regular cube. You turn it by hand. Solve my cube asks how the app learns it.',smart:smartLive()?'Smart cube connected. The page sees each turn.':'Smart cube. Not connected yet.'};
  el.innerHTML=`<i class="cdot" data-src="${id}" aria-hidden="true"></i><span>${esc(lines[id])}</span><button class="small ghost" id="begCubeChange" title="Choose the cube: screen, your own or a smart cube">Change</button>`;
  $('#begCubeChange').onclick=e=>{e.stopPropagation();cubePopOpenNow();};}
// ---------- the beginner Progress tab: on to CFOP ----------
function begCfopCard(){const sec=$('#tab-progress');if(!sec)return;const body=sec;let el=$('#begCfop');
  const show=method==='beginner'&&begAllLearned();
  if(!show){if(el)el.remove();return;}
  if(!el){el=document.createElement('section');el.id='begCfop';el.className='panel begcfop';body.prepend(el);}
  const d=typeof begProg==='function'?begProg():{solves:0,practiced:0};
  el.innerHTML=`<div class="begcfop-pic" aria-hidden="true">${thumb3D(new Cube())}</div><div class="begcfop-text"><span class="tag good">9 of 9 learned</span><h2>You can solve the cube</h2><span class="muted">${d.solves} cubes solved · ${d.practiced} rounds practiced</span>
    <div class="begcfop-next"><span class="tag mnext">Recommended</span> <b>Next: CFOP</b><p>The method most speedcubers use. It has four parts. Your beginner steps help with each one.</p>
    <ul class="begcfop-parts"><li><b>Cross</b> Like the white cross, with no daisy.</li><li><b>F2L</b> Corner and edge together, in one go.</li><li><b>OLL</b> The yellow face, in two looks.</li><li><b>PLL</b> The last layer, in two looks.</li></ul></div>
    <div class="row"><button class="primary" id="begCfopGo" title="Switch to CFOP">Start CFOP →</button><button class="small ghost" id="begCfopStay" title="Stay on the beginner method">Keep practicing</button><span class="muted">Every method is in the menu.</span></div></div>`;
  $('#begCfopGo').onclick=()=>{setMethod('cfop');goTab('cross');};$('#begCfopStay').onclick=()=>goTab('practice');}
// ---------- the Cross tab: the first lesson ----------
const CROSS_LESSON=[
  {label:'1 · Find',tip:'Find the four white edges',head:'Find the four white edges.',text:'Hold it yellow up. Look at the top and the sides. The lit stickers are white edges. Count them: four.'},
  {label:'2 · Plan',tip:'Plan the cross in inspection',head:'Plan it before you turn.',text:'You get 15 seconds to look. Pick the first two edges, and see where they go. Turn the cube in your hands, not the faces.'},
  {label:'3 · Do it',tip:'Make the cross in one go',head:'Make the cross in one go.',text:'Turn it white side down. Make all four edges without a stop. Stuck? Reveal shows the shortest crosses, one move at a time.'}];
function crossLessonShow(part){const sec=$('#tab-cross');if(!sec)return;const body=sec;let el=$('#crossLesson');
  if(part==null||method!=='cfop'){if(el)el.remove();return;}
  if(!el){el=document.createElement('section');el.id='crossLesson';el.className='panel crosslesson';body.prepend(el);}
  const p=CROSS_LESSON[part];
  el.innerHTML=`<div class="row" style="justify-content:space-between"><h2>Cross <span class="tag">First lesson</span></h2><button class="small ghost" id="crossLessonEnd" title="Close the lesson. The Cross tab stays as it is">Close the lesson</button></div>
    <div class="st-seg" role="group" aria-label="The parts of the lesson">${CROSS_LESSON.map((x,i)=>`<button data-part="${i}" aria-pressed="${i===part}" title="${esc(x.tip)}">${esc(x.label)}</button>`).join('')}</div>
    <p><b>${esc(p.head)}</b> ${esc(p.text)}</p>
    ${part===0?`<button class="small" id="crossLessonLight" title="Light the white edges on the cube">Light the white edges</button>`:''}${part===2?`<button class="small primary" id="crossLessonReveal" title="Reveal the shortest crosses under the spoiler rule">Reveal the moves</button>`:''}
    <p class="muted" style="margin:0">The Cross tab's drills (every solution, by length) follow below.</p>`;
  el.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>{store.set('crossLesson',+b.dataset.part);crossLessonShow(+b.dataset.part);});
  $('#crossLessonEnd').onclick=()=>{store.set('crossLesson',null);crossLessonShow(null);};
  const lt=$('#crossLessonLight');if(lt)lt.onclick=()=>crossLessonLight();
  const rv=$('#crossLessonReveal');if(rv)rv.onclick=()=>{if(!crossState.revealed)$('#crossReveal').click();focusPlayer();};
  if(part===0&&curTab==='cross')crossLessonLight();}
// The white edges of the cube in view, both stickers of each, lit and lifted out with the button in
// one short bump (CROSS_LIGHT_T.bump ms); they stay lit for CROSS_LIGHT_T.stay ms, then the cube
// shows as it was. A step of the player ends it.
const CROSS_LIGHT_T={bump:500,stay:2000};
let crossLightTimer=0;
function crossLessonLight(){if(typeof displayedCube==='undefined'||!displayedCube||displayedCube.isFour)return;const cube=displayedCube,f=cube.toFacelets(),lit=new Set();
  for(let i=0;i<54;i++)if(f[i]===0&&[1,3,5,7].includes(i%9))pieceStickers(i).forEach(j=>lit.add(j));
  clearTimeout(crossLightTimer);showCube(cube,lit);const T=CROSS_LIGHT_T;mainBump(lit,{up:T.bump*0.4,hold:T.bump*0.2,down:T.bump*0.4});
  const b=$('#crossLessonLight');if(b){b.classList.add('bumping');setTimeout(()=>b.classList.remove('bumping'),T.bump);}
  crossLightTimer=setTimeout(()=>{if(displayedCube===cube&&fadeSet===lit)showCube(cube);},T.bump+T.stay);}
// ---------- OLL · PLL: what to show ----------
const LL_SHOW=[['left','Still to learn','Cases you are learning or have not started'],['learning','Learning','Cases you are learning'],['learned','Learned','Cases you know'],['all','All','Every case']];
function llShow(){return store.get('llShow','all');}
function llShowSet(v){store.set('llShow',v);renderLLGroups();}
function llShowKeep(st){const f=llShow();return f==='left'?st!=='finished':f==='learning'?st==='learning':f==='learned'?st==='finished':true;}
// The plan in one line, from the statuses.
function llPlanText(){const two=LL_ALL.map(a=>llState.status[a.id]||''),full=PLL_FULL.map(p=>llState.status['pllf-'+p.name]||'');
  const c=(arr,v)=>arr.filter(x=>x===v).length;const twoLeft=two.length-c(two,'finished');const known=startKnown();
  if(twoLeft)return `Finish two-look OLL and PLL first: ${c(two,'learning')} learning, ${c(two,'')} not started. Then the full PLL.`;
  const fl=c(full,'learning'),fn=c(full,'');
  if(fl+fn)return `Finish PLL first: ${fl} ${fl===1?'is':'are'} Learning, ${fn} ${fn===1?'is':'are'} not started. Then full OLL, 57 cases, a few a week.`;
  return known.oll===2?'Every last-layer case is Learned. Drill the slow ones on the Scramble tab.':'Every PLL is Learned. Full OLL is next: 57 cases, a few a week. It is not in Twistwright yet.';}
function llShowPanel(){const groups=$('#llGroups');if(!groups)return;let el=$('#llShowBar');
  if(!el){el=document.createElement('div');el.id='llShowBar';el.className='llshow';groups.before(el);}
  el.innerHTML=`<div class="st-seg" role="group" aria-label="Show">${LL_SHOW.map(([v,l,t])=>`<button data-show="${v}" aria-pressed="${v===llShow()}" title="${esc(t)}">${esc(l)}</button>`).join('')}</div>
    <div class="llplan"><span class="st-lbl">Your plan</span><span>${esc(llPlanText())}</span><button class="small" id="llDrillLearning" title="Drill the cases you are learning">Drill Learning</button></div>`;
  el.querySelectorAll('[data-show]').forEach(b=>b.onclick=()=>llShowSet(b.dataset.show));
  $('#llDrillLearning').onclick=()=>{let ids=LL_ALL.filter(a=>llState.status[a.id]==='learning').map(a=>a.id);if(!ids.length)ids=LL_ALL.filter(a=>llState.status[a.id]!=='finished').map(a=>a.id);if(!ids.length)return;
    llState.sel=new Set(ids);saveLL();renderLLGroups();$('#llNext').click();};}
// The full PLL group under the two-look ones, then the filter on every case.
function llFullGroup(){const g=$('#llGroups');if(!g)return;
  g.insertAdjacentHTML('beforeend',`<h3 class="llfull" style="margin:10px 0 6px;font-size:14px;color:var(--muted)">Full PLL</h3><div class="cases llfull">${PLL_FULL.map(p=>`<div class="case" data-pll="${esc(p.name)}" tabindex="0" title="Open details">${thumbTop(phys(derotate(applyAlg(new Cube(),invertAlg(p.alg)))),'pll')}<div>${esc(p.name)} perm</div>${stBtn('pllf-'+p.name)}</div>`).join('')}</div>`);
  g.querySelectorAll('.case[data-pll]').forEach(el=>{el.onclick=e=>{if(e.target.closest('.stbtn'))return;openCaseModal(modalForPLL(PLL_FULL.find(p=>p.name===el.dataset.pll)));};
    el.onkeydown=e=>{if(e.key==='Enter'&&e.target===el)el.click();};});}
function llShowApply(){const g=$('#llGroups');if(!g)return;
  g.querySelectorAll('.case').forEach(el=>{const id=el.dataset.id?el.dataset.id:'pllf-'+el.dataset.pll;el.classList.toggle('llhide',!llShowKeep(llState.status[id]||''));});
  g.querySelectorAll('.cases').forEach(c=>{const empty=!c.querySelector('.case:not(.llhide)');c.classList.toggle('llhide',empty);const h=c.previousElementSibling;if(h&&h.tagName==='H3')h.classList.toggle('llhide',empty);});
  let none=$('#llShowNone');if(!g.querySelector('.case:not(.llhide)')){if(!none){none=document.createElement('p');none.id='llShowNone';none.className='muted';g.appendChild(none);}none.textContent='No case to show. Pick All to see every case.';}else if(none)none.remove();}
if(typeof renderLLGroups==='function'){const draw=renderLLGroups;renderLLGroups=function(){draw();llFullGroup();llShowPanel();llShowApply();};}
// A status click on a full PLL case draws the groups again, as it does for a two-look case.
document.addEventListener('cw:status',e=>{if(String(e.detail).startsWith('pllf-'))renderLLGroups();});
// ---------- the timer as home for level 5 ----------
function timerHomeOn(){return !!store.get('timerHome',false)&&method==='cfop';}
function timerHomeApply(){document.body.classList.toggle('timerhome',timerHomeOn());weakDraw();}
// Weak spots: the slowest cases by the mean of their last five times, from the case drills.
function weakSpots(){const out=[];for(const [k,arr] of Object.entries(times)){if(!arr||!arr.length)continue;let name=null,id=null;
    if(k.startsWith('ll:')){const a=LL_ALL.find(x=>x.id===k.slice(3));if(!a)continue;name=a.name;id=a.id;}else if(k.startsWith('f2l:')){name='F2L case '+k.slice(4);}else continue;
    const last=arr.slice(-5);out.push({name,id,ms:last.reduce((t,x)=>t+x.ms,0)/last.length});}
  return out.sort((a,b)=>b.ms-a.ms).slice(0,3);}
// Weak spots sit over the CFOP plan, under the timer (#everyMore; an Everywhere sheet in the stage view).
function weakDraw(){const body=$('#everyMore');if(!body)return;let el=$('#weakSpots');
  if(!timerHomeOn()){if(el)el.remove();return;}
  if(!el){el=document.createElement('section');el.id='weakSpots';el.className='panel weakspots';body.prepend(el);}
  const w=weakSpots(),today=(times.solve||[]).filter(x=>new Date(x.t).toDateString()===new Date().toDateString());
  el.innerHTML=`<div><h3>Weak spots</h3>${w.length?`<ol class="weaklist">${w.map(x=>`<li><span>${esc(x.name)}</span><b class="mono">${fmt(x.ms)}</b></li>`).join('')}</ol><button class="small" id="weakDrill" title="Drill the slowest cases"${w.some(x=>x.id)?'':' disabled'}>Drill these</button>`:'<p class="muted">No case times yet. Drill cases on OLL · PLL and F2L: the slow ones show here.</p>'}
    <p class="muted st-small">From the case drills only. Stage times from a smart cube are not built yet.</p></div>
    <div><h3>Today</h3><p>${today.length} solve${today.length===1?'':'s'}${today.length>=5?' · session ao5 '+fmt(avg(today,5)):''}</p><button class="st-link" id="weakMenu" title="Open the method menu">The beginner method is in the menu</button></div>`;
  const d=$('#weakDrill');if(d)d.onclick=()=>{const ids=w.filter(x=>x.id).map(x=>x.id);llState.sel=new Set(ids);saveLL();goTab('ll');renderLLGroups();$('#llNext').click();};
  $('#weakMenu').onclick=e=>{e.stopPropagation();openMethodPop();};}
// ---------- events ----------
document.addEventListener('cw:status',()=>{begCfopCard();if($('#methodLevel'))startLevelRow();});
document.addEventListener('cw:tab',e=>{if(e.detail==='progress')begCfopCard();if(e.detail==='cross')crossLessonShow(store.get('crossLesson',null));});
document.addEventListener('cw:method',()=>{begCubeLine();begCfopCard();timerHomeApply();crossLessonShow(store.get('crossLesson',null));});
document.addEventListener('cw:cubesrc',begCubeLine);
document.addEventListener('cw:smart',e=>{const t=e.detail&&e.detail.type;if(t==='connect'||t==='disconnect'||t==='gone')begCubeLine();});
if(typeof recordTime==='function'){const rec=recordTime;recordTime=function(ms){rec(ms);if(timerHomeOn())weakDraw();};}
begCubeLine();begCfopCard();timerHomeApply();crossLessonShow(store.get('crossLesson',null));renderLLGroups();
