// ===== Patterns: the cube on the page, named =====
// The Patterns sheet (#patPanel in #everyMore: a sheet of the stage view, and under the timer in the
// classic layout) brings the lab's Patterns window (lab/lab.js) to the cube on the page, whatever
// turns it: the player's steps, the virtual cube's keys or a smart cube (js/live.js). The reading is
// js/patterns.js, shared with the lab. Three toggles, not exclusive: Cross, F2L and OLL · PLL. Each
// section keeps its own set (cw:patOn, by tab); a section starts with its own kind on and the others
// off: Cross on the Cross tab, F2L on F2L, OLL · PLL on OLL · PLL. The sheet shows on those three
// tabs of CFOP.
// The cube is read as the picture holds it (playerHeldCube), once it has been still for PAT_STILL ms.
// Cross: a new scramble adds the cross on the bottom as held, its shortest length, its solutions
// counted by length and the shortest ones, covered (patCross); once the cross is made, an entry
// with the moves it took (crossYourMoves), kept plain. F2L: each free pair as one of the 41 cases,
// with the book's moves covered. OLL · PLL: the two-look case, with its algorithm covered. A case
// goes in once until another comes (patStep). The entries are newest first, in cw:patLog
// (PAT_LOG_MAX); Clear empties it. A new entry goes on top with no redraw of the rest, so a line the
// user uncovered stays uncovered.
const PAT_TABS=['cross','f2l','ll'];
const PAT_LOG_MAX=40,PAT_SOLS_SHOWN=3;
const PAT={T:patTracker(),goal:null,timer:0,log:[]};
function patOnFor(tab){
  const o=(store.get('patOn',{})||{})[tab];
  if(o&&typeof o==='object')return {cross:!!o.cross,f2l:!!o.f2l,ll:!!o.ll};
  return {cross:tab==='cross',f2l:tab==='f2l',ll:tab==='ll'};
}
function patOn(){return patOnFor(curTab);}
// Not while the getting-started pages are open: a first visit writes no key until the user picks.
function patWanted(){return !isBeg()&&PAT_TABS.includes(curTab)&&!document.body.classList.contains('starting');}
function patToggle(kind){
  const all=store.get('patOn',{})||{},o=patOn();o[kind]=!o[kind];all[curTab]=o;store.set('patOn',all);
  patTogglesDraw();if(!o[kind])return;
  if(kind==='cross')patScramble();patSchedule(0);
}
function patTogglesDraw(){const o=patOn();$$('#patPanel .pat-tog').forEach(b=>b.setAttribute('aria-pressed',String(!!o[b.dataset.pat])));}
// ----- reading -----
function patPrefer(){const s=$('#crossColor');return s&&s.value||'white';}
function patCube(){return typeof playerHeldCube==='function'?playerHeldCube():displayedCube;}
function patSchedule(ms=PAT_STILL){clearTimeout(PAT.timer);PAT.timer=0;if(patWanted())PAT.timer=setTimeout(patRead,ms);}
function patRead(){
  PAT.timer=0;if(!patWanted())return;const held=patCube();if(!held||!held.center)return;
  const on=patOn(),add=[];
  if(PAT.goal&&!PAT.goal.done&&on.cross&&patCrossMade(held,PAT.goal.color)){
    const g=PAT.goal,ms=typeof crossYourMoves==='function'?crossYourMoves():null;PAT.goal={...g,done:true};
    add.push(ms?{kind:'cross',step:'Cross',name:ms.length+(ms.length===1?' move':' moves'),moves:ms.join(' '),plain:true,
      sub:`The ${g.color} cross, made in ${ms.length} moves. The shortest was ${g.optimal}.`}:{kind:'cross',step:'Cross',name:'Made',sub:`The ${g.color} cross is made.`});
  }
  for(const e of patStep(PAT.T,held,on,patPrefer()))add.push(e.moves?{...e,moves:e.moves.join(' ')}:e);
  if(add.length)patAdd(add);
}
// A new scramble: the cross on the bottom as held, once per scramble and cross color, and the goal.
// A goal made stays spent for its scramble (done).
function patScramble(){
  if(!patWanted()||!patOn().cross||typeof orientedScramble!=='function')return;
  const key=scr.moves.join(' ')+'|'+patPrefer();if(PAT.goal&&PAT.goal.scr===key)return;
  const o=orientedScramble(),held=playerHeldCube(o.phys)||o.phys,r=patCross(held);
  PAT.goal={color:r.color,optimal:r.optimal,scr:key,done:r.made};PAT.T=patTracker();
  if(r.made||PAT.log.some(e=>e.scr===key))return;
  patAdd([{kind:'cross',step:'Scramble',name:'Cross first',scr:key,cross:r,
    sub:`The cross on the bottom is ${r.color}. Each solution is counted once, up to ${PAT_CROSS_MAX} moves.`}]);
}
// ----- the list -----
function patAdd(es){
  const t=Date.now();es.forEach((e,i)=>e.t=t+i);
  PAT.log=[...es.slice().reverse(),...PAT.log].slice(0,PAT_LOG_MAX);patSave();
  const list=$('#patList');if(!list)return;const none=list.querySelector('.pat-none');if(none)none.remove();
  for(const e of es)list.prepend(patEntry(e));
  while(list.children.length>PAT_LOG_MAX)list.lastChild.remove();
  patCountDraw();
}
function patSave(){store.set('patLog',PAT.log);}
function patLoad(){const a=store.get('patLog',[]);PAT.log=Array.isArray(a)?a.filter(e=>e&&e.name&&e.kind).slice(0,PAT_LOG_MAX):[];}
function patClear(){PAT.log=[];PAT.T=patTracker();patSave();patDraw();}
function patCountDraw(){const n=PAT.log.length,c=$('#patCount');if(c)c.textContent=n?n+(n===1?' pattern':' patterns'):'';const b=$('#patClear');if(b)b.disabled=!n;}
// A line of moves under the spoiler rule (spoilAlg escapes the moves): the first move in clear, a
// click for the next, Reveal for the rest.
function patAlg(moves){const c=liveEl('code',{class:'mono'});c.insertAdjacentHTML('beforeend',spoilAlg(moves));return c;}
// One entry: the time, the step and the name, then the moves (covered, but for the cross the user
// made), the cross counts and the shortest crosses, or one line per free pair.
function patEntry(e){
  const d=liveEl('div',{class:'pat-ent','data-kind':e.kind}),t=new Date(e.t),p=x=>String(x).padStart(2,'0');
  d.append(liveEl('time',{},`${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}`),liveEl('span',{class:'pat-line'},liveEl('b',{},e.step),' ',liveEl('span',{class:'name'},e.name)));
  if(e.sub)d.title=e.sub;
  if(e.moves)d.append(e.plain?liveEl('code',{class:'mono'},e.moves):patAlg(e.moves));
  if(e.cross){const c=e.cross,data=liveEl('span',{class:'pat-data'},liveEl('b',{},c.color[0].toUpperCase()+c.color.slice(1)+' cross'),`: shortest ${c.optimal}`);
    for(const l of c.lens||[])data.append(liveEl('span',{class:'len'},l));d.append(data);
    if(c.sols&&c.sols.length){const s=liveEl('div',{class:'pat-sols'});c.sols.slice(0,PAT_SOLS_SHOWN).forEach(sol=>s.append(patAlg(sol)));
      if(c.sols.length>PAT_SOLS_SHOWN)s.append(liveEl('span',{class:'more'},`+${c.sols.length-PAT_SOLS_SHOWN} more`));d.append(s);}}
  if(e.pairs){const s=liveEl('div',{class:'pat-sols'});
    for(const q of e.pairs)s.append(liveEl('div',{class:'pat-pair',title:`The ${q.colors.join('-')} pair, ${q.pos}: case ${q.n}, ${q.grp.toLowerCase()}`},
      liveEl('span',{class:'pos'},q.pos),liveEl('span',{class:'cs'},'Case '+q.n),patAlg(q.moves.join(' '))));
    d.append(s);}
  return d;
}
function patDraw(){
  const list=$('#patList');if(!list)return;list.textContent='';
  if(!PAT.log.length)list.append(liveEl('p',{class:'muted pat-none'},'No patterns yet. Turn the cube: each case it shows goes here, newest first. A new scramble names its cross.'));
  else for(const e of PAT.log)list.append(patEntry(e));
  patCountDraw();
}
// load: the page is loading. The scramble's cross waits a moment then (PAT_LOAD_MS): the first count
// builds the cross table (over a second), and a first visit must find no key written.
const PAT_LOAD_MS=1500;
function patShow(load){
  const p=$('#patPanel');if(!p)return;const on=patWanted();p.classList.toggle('hidden',!on);
  if(!on){clearTimeout(PAT.timer);PAT.timer=0;return;}
  patTogglesDraw();
  if(load===true)setTimeout(()=>{if(store.get('method',null)&&patWanted())patScramble();},PAT_LOAD_MS);else{patScramble();patSchedule(0);}
}
if(typeof document!=='undefined'&&$('#patPanel')){
  patLoad();patDraw();
  $$('#patPanel .pat-tog').forEach(b=>b.onclick=()=>patToggle(b.dataset.pat));
  $('#patClear').onclick=patClear;
  for(const ev of ['cw:step','cw:sequence','cw:yourmove'])document.addEventListener(ev,()=>patSchedule());
  document.addEventListener('cw:scramble',()=>{PAT.goal=null;patScramble();patSchedule();});
  for(const ev of ['cw:tab','cw:method','cw:start'])document.addEventListener(ev,()=>patShow());
  const cc=$('#crossColor');if(cc)cc.addEventListener('change',()=>{PAT.goal=null;patScramble();});
  patShow(true);
}
