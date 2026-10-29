// ===== 2×2 speed section: Solve (Ortega and CLL plans), Ortega cases, CLL cases, Reference =====
// Loads after beginner-ui.js. Fills #tab-ssolve, #tab-ortega, #tab-cll and #tab-sref at load.
// Data and solvers: js/speed2.js. Shared helpers from app.js: setSequence, stepHTML, wireSteps,
// openCaseModal, stBtn, cycleStatus, statsRows, pick, rnd, removeRotations, the timer scopes.
// Case status ids are the case ids (two:oll:sune, two:pbl:adj, two:cll:L1); per-case times use
// the same string as the timer scope. All markup is built from fixed strings and the case data;
// every dynamic string goes through esc(), as in every other module.

const TWO_ALL=[...ORTEGA_ALL,...CLL_CASES];
function twoCaseName(id){const a=TWO_ALL.find(x=>x.id===id);return a?(a.group?a.group+' '+a.name:(id.startsWith('two:oll:')?'OLL ':'PBL ')+a.name):id;}
const twoKindOf=a=>a.id.startsWith('two:oll:')?'oll':a.id.startsWith('two:pbl:')?'pbl':'cll';
const twoModeOf=a=>({oll:'oll',pbl:'both',cll:'pll'})[twoKindOf(a)];

// ---------- pictures ----------
// A top view of a 2×2: the four top stickers with the side stickers round them. mode 'oll' grays
// every sticker that is not the top color (the color opposite the bottom face). mode 'both' adds
// the bottom view, seen from below with the front at the top, as PBL needs both layers.
function twoThumb(cube,mode){
  const f=twoFacelets(cube);const top=[3,4,5,0,1,2][f[12]];
  const col=c=>mode==='oll'?(c===top?stickerColor(top):'var(--sticker-X)'):stickerColor(c);
  const s=18,g=6,o=6,W=2*s+1+2*(o+g+2)+1;
  const grid=(cells,[bk,ft,lf,rt])=>{let out='';const x0=o+g+2;
    cells.forEach((c,i)=>{const x=x0+(i%2)*(s+1),y=x0+Math.floor(i/2)*(s+1),fill=col(c);out+=`<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="2" fill="${fill}"/>`+(fill==='var(--sticker-X)'?'':stickerLabel(c,x+s/2,y+s/2,0.6*s));});
    bk.forEach((c,k)=>{out+=`<rect x="${x0+k*(s+1)}" y="${o}" width="${s}" height="${g}" rx="1.5" fill="${col(c)}"/>`;});
    ft.forEach((c,k)=>{out+=`<rect x="${x0+k*(s+1)}" y="${x0+2*(s+1)+1}" width="${s}" height="${g}" rx="1.5" fill="${col(c)}"/>`;});
    lf.forEach((c,k)=>{out+=`<rect x="${o}" y="${x0+k*(s+1)}" width="${g}" height="${s}" rx="1.5" fill="${col(c)}"/>`;});
    rt.forEach((c,k)=>{out+=`<rect x="${x0+2*(s+1)+1}" y="${x0+k*(s+1)}" width="${g}" height="${s}" rx="1.5" fill="${col(c)}"/>`;});
    return out;};
  const up=grid([f[0],f[1],f[2],f[3]],[[f[21],f[20]],[f[8],f[9]],[f[16],f[17]],[f[5],f[4]]]);
  if(mode!=='both')return `<svg viewBox="0 0 ${W} ${W}" aria-hidden="true">${up}</svg>`;
  const down=grid([f[12],f[13],f[14],f[15]],[[f[10],f[11]],[f[23],f[22]],[f[19],f[18]],[f[6],f[7]]]);
  return `<svg viewBox="0 0 ${2*W+8} ${W}" aria-hidden="true">${up}<g transform="translate(${W+8},0)">${down}</g></svg>`;
}
const twoCaseCube=a=>applyAlg(new Cube(),invertAlg(a.alg));
function twoModal(a,tab){return {title:(a.group?a.group+' · ':'')+a.name,statusId:a.id,tab,group:{oll:'Ortega OLL',pbl:'Ortega PBL',cll:'CLL'}[twoKindOf(a)],alg:a.alg,recog:a.recog,why:a.why||'',
  pic:twoThumb(twoCaseCube(a),twoModeOf(a)),play:{start:twoCaseCube(a),moves:parseAlg(a.alg),n:2},setupMoves:removeRotations(parseAlg(invertAlg(a.alg))),noLab:true};}

// ---------- the Solve tab: plans ----------
const twoPlanState={plan:null};
function twRotTiles(container){container.querySelectorAll('.alg .m').forEach(el=>{if(/^[xyz]/.test(el.textContent))el.classList.add('rot');});}
function twoPlanSteps(p){ // [{name, sub, moves, extra, caseId}] for one plan, moves in the engine frame
  const out=[];const first=p.method==='ortega'?'Face':'Layer';const n=p.first.moves.length;
  out.push({name:first,sub:`${COLOR_NAMES[p.first.color]} ${first.toLowerCase()}, ${n} move${n===1?'':'s'}${p.flip?', then '+p.flip+' to put it on the bottom':''}`,moves:[...p.rot,...p.first.moves,...(p.flip?[p.flip]:[])],extra:p.rot.length?'hold the cube: '+p.rot.join(' ')+' first':''});
  for(const s of p.steps){const moves=[...[s.rot,s.preD,s.pre].filter(Boolean),...parseAlg(s.alg),...(s.post?[s.post]:[])];
    const notes=[];if(s.rot)notes.push('turn the cube over');if(s.preD)notes.push('bottom '+s.preD+' first');if(s.pre)notes.push('top '+s.pre+' first');if(s.post)notes.push('then top '+s.post);
    out.push({name:s.stage,sub:(s.case&&s.case.group?s.case.group+' ':'')+s.name,moves,extra:notes.join(' · '),caseId:s.id!=='two:none'?s.id:''});}
  return out;
}
function twoRenderPlan(){
  const o=twoPlanState.plan;if(!o){$('#twPlanOut').innerHTML='<p class="muted">No plan yet. Press Plan.</p>';return;}
  const seqFor=[];
  const col=(plan,key)=>{const steps=twoPlanSteps(plan);let cur=scr.cube;
    const html=steps.map((s,i)=>{const k=key+i;seqFor.push([k,cur,s.moves]);cur=applyAlg(cur,s.moves);
      return stepHTML(s.name,s.sub,s.moves,k,(s.caseId?`<a href="#" class="case-link" data-id="${esc(s.caseId)}" title="Open the details of this case">details</a>`:'')+(s.extra?(s.caseId?' · ':'')+esc(s.extra):''));}).join('');
    const total=plan.moves.filter(m=>!/^[xyz]/.test(m)).length;
    return `<div class="panel tw-plan"><div class="row" style="justify-content:space-between"><h3>${plan.method==='ortega'?'Ortega: face, OLL, PBL':'CLL: layer, one algorithm'}</h3><span class="muted">${total} moves${plan.solved?'':' · does not end solved'}</span></div>${html}<button class="small" data-load="${key}" title="Put this whole plan in the player, from the scramble">Load into the player</button></div>`;};
  $('#twPlanOut').innerHTML=`<div class="grid2">${col(o.ortega,'o')}${col(o.cll,'c')}</div>`;
  twRotTiles($('#twPlanOut'));
  wireSteps($('#twPlanOut'),key=>{const e=seqFor.find(x=>x[0]===key);return {cube:e[1],moves:e[2]};});
  $$('#twPlanOut .case-link').forEach(el=>el.onclick=e=>{e.preventDefault();const a=TWO_ALL.find(x=>x.id===el.dataset.id);if(a)openCaseModal(twoModal(a,twoKindOf(a)==='cll'?'cll':'ortega'));});
  $$('#twPlanOut [data-load]').forEach(b=>b.onclick=()=>{const plan=b.dataset.load==='o'?o.ortega:o.cll;setSequence(plan.moves,(plan.method==='ortega'?'Ortega':'CLL')+' plan · seed '+scr.seed,scr.cube);seqState.idx=0;applySequence();focusPlayer();});
}
function twoPlan(){const color=$('#twColor').value==='any'?'any':0;
  const ortega=solveOrtega(scr.cube,{color}),cll=solveCLL(scr.cube,{color});
  twoPlanState.plan=ortega&&cll?{ortega,cll}:null;twoRenderPlan();}
function twoOptimalShow(){const out=$('#twOptOut');out.innerHTML='<p class="muted">Looking it up…</p>';
  setTimeout(()=>{const o=twoOptimal(scr.cube);const moves=[...o.rot,...o.moves];
    out.innerHTML=`<div class="row"><span class="big mono">${esc(moves.join(' '))}</span><span class="muted">${o.moves.length} move${o.moves.length===1?'':'s'}${o.rot.length?', after a turn of the whole cube':''}</span><button class="small" id="twOptLoad" title="Put the optimal solution in the player, from the scramble">Load into the player</button></div>`;
    $('#twOptLoad').onclick=()=>{setSequence(moves,'optimal solution · seed '+scr.seed,scr.cube);seqState.idx=0;applySequence();focusPlayer();};},20);}
function twoMountSolve(){
  $('#tab-ssolve').innerHTML=`<div class="panel"><div class="row" style="justify-content:space-between">
      <div><h2>Guided solve</h2><p class="muted" style="margin:0">Scramble white up, green in front, as the player above shows. Press Plan. The app plans the solve two ways: Ortega (a face, OLL, PBL) and CLL (a layer, then one algorithm). Click a move to step through it.</p></div>
      <div class="row"><select id="twColor" title="Which face or layer to build first"><option value="0">White face first</option><option value="any">Any color: the shortest</option></select><button class="primary" id="twPlan" title="Plan the solve two ways, Ortega and CLL, and show the steps">Plan</button></div></div></div>
    <div id="twPlanOut"><p class="muted">No plan yet. Scramble, then press Plan.</p></div>
    <div class="panel"><h3>Optimal</h3><p class="muted">Every 2×2 position is solvable in 11 moves or fewer. The app can look one solution up from a table of every position. Compare it with the plans above: a method costs moves and buys recognition.</p><div class="row"><button id="twOpt" title="Look up a solution with the fewest moves for this scramble">Show an optimal solution</button></div><div id="twOptOut"></div></div>`;
  $('#twPlan').onclick=twoPlan;$('#twOpt').onclick=twoOptimalShow;$('#twColor').onchange=()=>{if(twoPlanState.plan)twoPlan();};
}

// ---------- the case trainers: Ortega and CLL ----------
const twoState={cur:null,kind:null,hint:false,setup:[],cube:null,sel:new Set(store.get('twoSel',TWO_ALL.map(a=>a.id)))};
function twoSaveSel(){store.set('twoSel',[...twoState.sel]);}
function twoPool(kind){return kind==='ortega'?ORTEGA_ALL:CLL_CASES;}
// Setup moves from solved, white up: face moves only. An OLL drill gets a random PBL under it.
function twoSetupFor(a){const parts=[];
  if(twoKindOf(a)==='oll'&&Math.random()<0.8){parts.push(invertAlg(rnd(ORTEGA_PBL).alg));parts.push(rnd(TWO_AUFS));}
  parts.push(invertAlg(a.alg));parts.push(rnd(TWO_AUFS));
  return removeRotations(parts.flatMap(x=>parseAlg(x)).filter(Boolean));
}
// The answer for the state on the cube: the case, with the turns before and after it.
function twoAnswer(a,cube){const k=twoKindOf(a);
  const r=k==='oll'?twoFindStep(cube,ORTEGA_OLL,twoTopOriented,false):k==='pbl'?twoFindPBL(cube):twoFindStep(cube,CLL_CASES,twoSolved,true);
  if(!r)return null;return {...r,moves:[...[r.rot,r.preD,r.pre].filter(Boolean),...parseAlg(r.alg),...(r.post?[r.post]:[])]};}
function twoNext(kind){
  const pool=twoPool(kind).filter(a=>twoState.sel.has(a.id));const out=$('#twCur-'+kind);
  if(!pool.length){out.innerHTML='<p>Select at least one case.</p>';return;}
  const a=pick(pool,$('#twProb-'+kind).value==='realistic');
  Object.assign(twoState,{cur:a,kind,hint:false});const setup=twoSetupFor(a);twoState.setup=setup;twoState.cube=applyAlg(new Cube(),setup);
  currentLabel=()=>twoCaseName(a.id);timer.scope=a.id;renderTimes();
  view.mode='3d';view.yaw=-32;view.pitch=28;setSequence(setup,'setup for case (from solved, white up)',undefined,'2×2 case');twoRenderCurrent(kind);
}
function twoRenderCurrent(kind){
  const a=twoState.cur;const out=$('#twCur-'+kind);if(!a||twoState.kind!==kind){out.innerHTML='<p class="muted">Press Next case to start a drill. The cube shows the case with a random top turn. Your scramble is kept. Press Back to scramble to return to it.</p>';return;}
  const arr=times[a.id]||[];const ans=twoState.hint?twoAnswer(a,twoState.cube):null;
  const notes=ans?[ans.rot?'Turn the cube over first.':'',ans.preD?'Bottom '+ans.preD+' first.':'',ans.pre?'Top '+ans.pre+' first.':'',a.recog,ans.post?'Then top '+ans.post+'.':''].filter(Boolean).join(' '):'';
  out.innerHTML=`<div class="row" style="justify-content:space-between"><div><span class="tag">${esc({oll:'OLL',pbl:'PBL',cll:'CLL · '+a.group}[twoKindOf(a)])}</span><b ${twoState.hint?'id="twName" style="cursor:pointer;text-decoration:underline dotted" title="Open case details"':''}>${twoState.hint?esc(a.name):'?'}</b> <span class="muted" style="font-size:14px">${arr.length?`mean ${fmt(arr.reduce((x,y)=>x+y.ms,0)/arr.length)} over ${arr.length}`:'no times yet'}</span></div><div style="width:${twoKindOf(a)==='pbl'?150:90}px">${twoThumb(twoState.cube,twoModeOf(a))}</div></div>
  <div style="margin-top:8px">${twoState.hint?(ans?`<div class="big">${esc(ans.moves.join(' '))}</div><div class="muted">${esc(notes)}</div>`:`<div class="big">${esc(a.alg)}</div>`)+`<div class="row" style="margin-top:6px"><button class="small" id="twPlay" title="Put the solution in the player, from the case on the cube">Step through on cube</button></div>`:'<span class="muted">Answer hidden. Press H or Reveal.</span>'}</div>`;
  const nb=$('#twName');if(nb)nb.onclick=()=>openCaseModal(twoModal(a,kind));
  const p=$('#twPlay');if(p)p.onclick=()=>{const m=ans?ans.moves:parseAlg(a.alg);setSequence(m,'solution for this case — press ▶ to step',twoState.cube,'2×2 case');seqState.idx=0;applySequence();focusPlayer();};
}
function twoGroups(kind){return kind==='ortega'?[['OLL: orient the top',ORTEGA_OLL],['PBL: permute both layers',ORTEGA_PBL]]:CLL_GROUPS.map(g=>[g,CLL_CASES.filter(a=>a.group===g)]);}
function twoRenderGrid(kind){
  const el=$('#twGrid-'+kind);if(!el)return;
  el.innerHTML=twoGroups(kind).map(([g,list])=>`<h3 style="margin:10px 0 6px;font-size:14px;color:var(--muted)">${esc(g)}</h3><div class="cases">${list.map(a=>`<div class="case ${twoState.sel.has(a.id)?'sel':''}" data-id="${esc(a.id)}" tabindex="0" title="Open details. Shift-click to add or remove from training.">${twoThumb(twoCaseCube(a),twoModeOf(a))}<div>${esc(a.name)}</div>${stBtn(a.id)}</div>`).join('')}</div>`).join('');
  el.querySelectorAll('.case').forEach(c=>{const id=c.dataset.id;
    c.onclick=e=>{if(e.target.closest('.stbtn'))return;if(e.shiftKey){if(twoState.sel.has(id))twoState.sel.delete(id);else twoState.sel.add(id);twoSaveSel();twoRenderGrid(kind);return;}openCaseModal(twoModal(TWO_ALL.find(a=>a.id===id),kind));};
    c.onkeydown=e=>{if(e.key==='Enter'&&e.target===c)c.click();};});
}
function twoRenderStats(kind){const t=$('#twStats-'+kind);if(!t)return;const rows=statsRows(twoPool(kind).map(a=>({name:(a.group?a.group+' ':'')+a.name,group:{oll:'OLL',pbl:'PBL',cll:'CLL'}[twoKindOf(a)],scope:a.id,id:a.id})));
  t.innerHTML=rows?'<tr><th>Case</th><th>Group</th><th>n</th><th>mean</th><th>best</th><th>status</th></tr>'+rows:'<tr><td class="muted">No case times yet. Times recorded in a case drill are stored per case.</td></tr>';}
function twoMountTrainer(kind,title,intro){
  const K=kind==='ortega'?'Ortega':'Cll';
  $('#tab-'+kind).innerHTML=`<div class="panel"><div class="row" style="justify-content:space-between">
      <div><h2>${esc(title)}</h2><p class="muted" style="margin:0">${esc(intro)} Select cases, then train. The button under each case changes its status: Not started → Learning → Learned. Click a case to open its details. Shift-click a case to add it to training or remove it.</p></div>
      <div class="row"><select id="twProb-${kind}" title="Balanced: every case as often. Realistic: as often as it comes up in a solve"><option value="balanced">Balanced</option><option value="realistic">Realistic probability</option></select><button class="primary" id="twNext${K}" title="Put a case from the selected ones on the cube">Next case<span class="hk" aria-hidden="true">N</span></button><button id="twReveal${K}" title="Show the algorithm for the case on the cube">Reveal<span class="hk" aria-hidden="true">H</span></button></div></div></div>
    <div class="panel" id="twCur-${kind}"></div>
    <div class="panel"><div class="row" style="justify-content:space-between"><h3>Cases</h3><span class="legend"><span><i class="unlearned"></i>Not started</span><span><i style="background:var(--sticker-Y)"></i>Learning</span><span><i style="background:var(--sticker-G)"></i>Learned</span></span><span><button class="small ghost" data-sel="all" title="Train every case">Select all</button><button class="small ghost" data-sel="none" title="Train no case">None</button><button class="small ghost" data-sel="open" title="Train the cases not yet Learned">Not learned</button></span></div><div id="twGrid-${kind}"></div></div>
    <div class="panel"><h3>Per-case times</h3><div class="wide"><table id="twStats-${kind}"></table></div></div>`;
  $('#twNext'+K).onclick=()=>twoNext(kind);$('#twReveal'+K).onclick=()=>{if(!twoState.cur||twoState.kind!==kind)return;twoState.hint=!twoState.hint;twoRenderCurrent(kind);};
  $$('#tab-'+kind+' [data-sel]').forEach(b=>b.onclick=()=>{const pool=twoPool(kind);if(b.dataset.sel==='all')pool.forEach(a=>twoState.sel.add(a.id));else if(b.dataset.sel==='none')pool.forEach(a=>twoState.sel.delete(a.id));else pool.forEach(a=>{if(llState.status[a.id]==='finished')twoState.sel.delete(a.id);else twoState.sel.add(a.id);});twoSaveSel();twoRenderGrid(kind);});
  twoRenderCurrent(kind);twoRenderGrid(kind);twoRenderStats(kind);
}

// ---------- the Reference tab ----------
function twoRefCard(a,tab){return `<div class="rcard ref-row" data-id="${esc(a.id)}" data-tab="${tab}" title="Open details">${twoThumb(twoCaseCube(a),twoModeOf(a))}<div><div class="nm">${esc(a.name)}</div><div class="rec">${esc(a.recog)}</div><div class="alg">${spoilAlg(a.alg)}</div></div></div>`;}
function twoMountRef(){
  $('#tab-sref').innerHTML=`<div class="panel"><h2>2×2 reference</h2><p class="muted">Three ways to solve a 2×2, from easiest to fastest. Click any case to open it: picture, recognition, and buttons to set it on the cube.</p>${refAllBox()}
    <div class="grid2">
      <div class="tip"><b>The beginner method</b>One layer corner by corner, the yellow face with Up, Over, Down, then the yellow corners with the chant. Two algorithms. About 45 moves. Open it from the chip in the top bar: 2×2 · Beginner.</div>
      <div class="tip"><b>Ortega</b>A face of one color (not a layer), then OLL orients the top (7 cases), then PBL permutes both layers at once (5 cases). Twelve algorithms. About 25 moves. The Ortega tab trains it.</div>
      <div class="tip"><b>CLL</b>A whole layer, then one algorithm for the top: 42 cases, nine of them shared with Ortega. About 18 moves. The CLL tab trains it.</div>
      <div class="tip"><b>After CLL: EG</b>A face, then one algorithm that fixes the bottom layer too. EG-1 (43 cases) for a bottom with a bar, EG-2 (43) for a diagonal bottom. Not in the app yet.</div>
    </div></div>
    <div class="grid2 refcols">
      <div class="panel"><h3>Ortega OLL (7)</h3><p class="muted">The bottom face is one color. Only the top color matters, so the other stickers are gray. Hold the case as the picture shows.</p><div class="rcards">${ORTEGA_OLL.map(a=>twoRefCard(a,'ortega')).join('')}</div></div>
      <div class="panel"><h3>Ortega PBL (5)</h3><p class="muted">Both layers are oriented. Left: the top, seen from above. Right: the bottom, seen from below with the front at the top. A bar is two neighboring corners that share a color.</p><div class="rcards">${ORTEGA_PBL.map(a=>twoRefCard(a,'ortega')).join('')}</div></div>
    </div>
    <div class="panel"><h3>CLL (42)</h3><p class="muted">The bottom layer is solved. The group is the OLL shape; the picture tells the cases of a group apart.</p>${CLL_GROUPS.map(g=>`<h3 class="sub">${esc(g)}</h3><div class="rcards">${CLL_CASES.filter(a=>a.group===g).map(a=>twoRefCard(a,'cll')).join('')}</div>`).join('')}</div>
    <div class="panel"><h3>Notation</h3><p>Face turns: <span class="mono">U R F D L B</span>, clockwise as you look at that face. <span class="mono">'</span> is counterclockwise, <span class="mono">2</span> a half turn. <span class="mono">x y z</span> turn the whole cube like R, U, F. A 2×2 has no middle layer, so <span class="mono">R</span> and <span class="mono">L'</span> give the same cube, held differently: the app writes every 2×2 scramble with R, U and F only, as the WCA does.</p><p>Scrambles are applied white up, green in front. A plan may start with a whole-cube turn (dashed) when the corner at the bottom back left has moved: hold the cube that way, then turn faces.</p></div>`;
  $$('#tab-sref .ref-row').forEach(el=>el.onclick=()=>{const a=TWO_ALL.find(x=>x.id===el.dataset.id);if(a)openCaseModal(twoModal(a,el.dataset.tab));});
}

// ---------- mount and events ----------
twoMountSolve();
twoMountTrainer('ortega','Ortega: OLL and PBL','Make a face of one color, orient the top, then permute both layers at once.');
twoMountTrainer('cll','CLL: the last layer in one look','Solve a whole layer, then one algorithm orients and permutes the four top corners.');
twoMountRef();
document.addEventListener('cw:status',e=>{if(!String(e.detail).startsWith('two:'))return;twoRenderGrid('ortega');twoRenderGrid('cll');twoRenderStats('ortega');twoRenderStats('cll');});
document.addEventListener('cw:tab',e=>{if(e.detail==='ortega'||e.detail==='cll')twoRenderStats(e.detail);});
document.addEventListener('cw:scramble',()=>{twoPlanState.plan=null;if($('#twPlanOut'))$('#twPlanOut').innerHTML='<p class="muted">New scramble. Press Plan.</p>';if($('#twOptOut'))$('#twOptOut').innerHTML='';});
const _twRT=renderTimes;renderTimes=function(){_twRT();if(curTab==='ortega'||curTab==='cll')twoRenderStats(curTab);};
