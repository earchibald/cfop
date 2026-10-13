// ===== 4×4 advanced section: Solve (reduction with CFOP), Parity drills, Reference =====
// Loads after speed-ui.js. Fills #tab-fsolve, #tab-parity and #tab-fref at load. Data and the
// plan: js/speed4.js. Shared helpers from app.js: setSequence, stepHTML, wireSteps, stBtn,
// cycleStatus, statsRows, rnd, the timer scopes. Case status ids are the case ids (four:oll,
// four:pll, four:pll-adj); per-case times use the same string as the timer scope. All markup is
// built from fixed strings and the case data; every dynamic string goes through esc().

function fourThumb(cube){return `<svg viewBox="40 30 320 300" aria-hidden="true">${renderCube3D(cube.toFacelets(),{yaw:-32,pitch:28,scale:48,n:4})}</svg>`;}
const fourCaseCube=a=>new FourCube().apply(invertAlg(a.alg));

// ---------- Solve ----------
const fourPlanState={plan:null};
function fourRenderPlan(){
  const p=fourPlanState.plan;const out=$('#fwPlanOut');
  if(!p){out.innerHTML='<p class="muted">No plan found for this cube. Check the colors, then try again.</p>';return;}
  const seqFor=[];let cur=scr.cube;
  const html=p.steps.map((st,i)=>{const k='s'+i;seqFor.push([k,cur,st.moves]);cur=applyAlg(cur,st.moves);
    const extra=st.caseId?`<a href="#" class="case-link" data-id="${esc(st.caseId)}">details</a>`:'';
    return stepHTML(st.stage,st.name,st.moves,k,extra);}).join('');
  const face=p.moves.filter(m=>!/^[xyz]/.test(m)).length;
  out.innerHTML=`<div class="panel"><div class="row" style="justify-content:space-between"><div><span class="muted">${face} moves in ${p.steps.length} steps. The centers and the edges follow the guide; the rest is CFOP, with the parity fixes where they fall.${p.solved?'':' This plan does not end solved.'}</span></div><button class="small" id="fwLoad">Load the whole plan into the player</button></div><div>${html}</div></div>`;
  out.querySelectorAll('.alg .m').forEach(el=>{if(/^[xyz]/.test(el.textContent))el.classList.add('rot');});
  wireSteps(out,key=>{const e=seqFor.find(x=>x[0]===key);return {cube:e[1],moves:e[2]};});
  $$('#fwPlanOut .case-link').forEach(el=>el.onclick=e=>{e.preventDefault();goTab('parity');fourShowCase(el.dataset.id);});
  $('#fwLoad').onclick=()=>{setSequence(p.moves,'plan · seed '+scr.seed,scr.cube);seqState.idx=0;applySequence();focusPlayer();};
}
function fourPlan(){$('#fwPlanOut').innerHTML='<p class="muted">Planning…</p>';setTimeout(()=>{let plan=null;try{plan=solveMasterSpeed(scr.cube);}catch(e){plan=null;}fourPlanState.plan=plan;fourRenderPlan();},20);}
function fourMountSolve(){
  $('#tab-fsolve').innerHTML=`<div class="panel"><div class="row" style="justify-content:space-between">
      <div><h2>Guided solve</h2><p class="muted" style="margin:0">Scramble white up, green in front, as the player above shows. Press Plan. The plan reduces the cube (centers, then edges) and solves it with CFOP: cross, four pairs, two-look OLL and PLL. OLL parity shows up after F2L, PLL parity after OLL. Click a move to step through it.</p></div>
      <div class="row"><button class="primary" id="fwPlan">Plan</button></div></div></div>
    <div id="fwPlanOut"><p class="muted">No plan yet. Scramble, then press Plan.</p></div>`;
  $('#fwPlan').onclick=fourPlan;
}

// ---------- Parity ----------
const fourState={cur:null,hint:false,setup:[],cube:null};
function fourSetupFor(a){return [...parseAlg(invertAlg(a.alg)),rnd(TWO_AUFS)].filter(Boolean);}
function fourNext(){
  const a=rnd(FOUR_PARITY);Object.assign(fourState,{cur:a,hint:false});const setup=fourSetupFor(a);fourState.setup=setup;fourState.cube=new FourCube().apply(setup);
  currentLabel=()=>a.name;timer.scope=a.id;renderTimes();
  view.mode='3d';view.yaw=-32;view.pitch=28;setSequence(setup,'setup for case (from solved, white up)',undefined,'4×4 case');fourRenderCurrent();
}
function fourShowCase(id){const a=FOUR_PARITY.find(x=>x.id===id);if(!a)return;Object.assign(fourState,{cur:a,hint:true,setup:parseAlg(invertAlg(a.alg)),cube:fourCaseCube(a)});
  setSequence(fourState.setup,'setup for '+a.name+' (from solved, white up)',undefined,'4×4 case');fourRenderCurrent();}
// The answer for the state on the cube: a top turn to the hold the case wants, the algorithm, and a top turn after.
function fourAnswer(a,cube){const ms=parseAlg(a.alg);for(const pre of TWO_AUFS)for(const post of TWO_AUFS){const moves=[pre,...ms,post].filter(Boolean);if(cube.apply(moves).isSolved())return {pre,post,moves};}return {pre:'',post:'',moves:ms};}
function fourRenderCurrent(){
  const a=fourState.cur;const out=$('#fwCur');if(!a){out.innerHTML='<p class="muted">Press Next case to start a drill. The cube shows one of the three parity cases with a random top turn. Your scramble is kept. Press Back to scramble to return to it.</p>';return;}
  const arr=times[a.id]||[];const ans=fourState.hint?fourAnswer(a,fourState.cube):null;
  const notes=ans?[ans.pre?'Top '+ans.pre+' first.':'',a.recog,ans.post?'Then top '+ans.post+'.':''].filter(Boolean).join(' '):'';
  out.innerHTML=`<div class="row" style="justify-content:space-between"><div><span class="tag">4×4 parity</span><b>${fourState.hint?esc(a.name):'?'}</b> <span class="muted" style="font-size:14px">${arr.length?`mean ${fmt(arr.reduce((x,y)=>x+y.ms,0)/arr.length)} over ${arr.length}`:'no times yet'}</span></div><div style="width:110px">${fourThumb(fourState.cube)}</div></div>
  <div style="margin-top:8px">${fourState.hint?`<div class="big">${esc(ans.moves.join(' '))}</div><div class="muted">${esc(notes)}</div><div class="sec" style="margin-top:6px"><b>Why it works</b> ${esc(a.why)}</div><div class="row" style="margin-top:6px"><button class="small" id="fwPlay">Step through on cube</button>${stBtn(a.id)}</div>`:'<span class="muted">Answer hidden. Press H or Reveal.</span>'}</div>`;
  const p=$('#fwPlay');if(p)p.onclick=()=>{setSequence(ans.moves,'solution for this case — press ▶ to step',fourState.cube,'4×4 case');seqState.idx=0;applySequence();focusPlayer();};
}
function fourRenderGrid(){const el=$('#fwGrid');if(!el)return;
  el.innerHTML=`<div class="cases">${FOUR_PARITY.map(a=>`<div class="case" data-id="${esc(a.id)}" tabindex="0" title="Open this case">${fourThumb(fourCaseCube(a))}<div>${esc(a.name)}</div>${stBtn(a.id)}</div>`).join('')}</div>`;
  el.querySelectorAll('.case').forEach(c=>{c.onclick=e=>{if(e.target.closest('.stbtn'))return;fourShowCase(c.dataset.id);focusPlayer();};c.onkeydown=e=>{if(e.key==='Enter'&&e.target===c)c.click();};});}
function fourRenderStats(){const t=$('#fwStats');if(!t)return;const rows=statsRows(FOUR_PARITY.map(a=>({name:a.name,group:'parity',scope:a.id,id:a.id})));
  t.innerHTML=rows?'<tr><th>Case</th><th>Group</th><th>n</th><th>mean</th><th>best</th><th>status</th></tr>'+rows:'<tr><td class="muted">No case times yet. Times recorded in a case drill are stored per case.</td></tr>';}
function fourMountParity(){
  $('#tab-parity').innerHTML=`<div class="panel"><div class="row" style="justify-content:space-between">
      <div><h2>Parity</h2><p class="muted" style="margin:0">The two things a 4×4 does that a 3×3 cannot: one edge pair turned over (OLL parity) and two edge pairs swapped (PLL parity). Learn to see them and to fix them without breaking stride. The button under each case changes its status. Click a case to open it.</p></div>
      <div class="row"><button class="primary" id="fwNext">Next case</button><button id="fwReveal">Reveal</button></div></div></div>
    <div class="panel" id="fwCur"></div>
    <div class="panel"><h3>Cases</h3><div id="fwGrid"></div></div>
    <div class="panel"><h3>Per-case times</h3><div class="wide"><table id="fwStats"></table></div></div>`;
  $('#fwNext').onclick=fourNext;$('#fwReveal').onclick=()=>{if(!fourState.cur)return;fourState.hint=!fourState.hint;fourRenderCurrent();};
  fourRenderCurrent();fourRenderGrid();fourRenderStats();
}

// ---------- Reference ----------
function fourMountRef(){
  $('#tab-fref').innerHTML=`<div class="panel"><h2>4×4 reference</h2><p class="muted">Three ways to solve a 4×4, from easiest to fastest.</p>${refAllBox()}
    <div class="grid2">
      <div class="tip"><b>The beginner method</b>The Rubik's Master guide: build the six centers one tile at a time, pair the twelve edges, then solve it like a 3×3 with the two parity fixes. About 320 moves. Open it from the chip in the top bar: 4×4 · Beginner.</div>
      <div class="tip"><b>Reduction with CFOP</b>The same two stages, then cross, F2L, OLL and PLL. OLL parity after F2L, PLL parity after OLL. The Solve tab plans it on your scramble. The next gains are in the reduction: build centers in bars of two, pair edges three at a time.</div>
      <div class="tip"><b>Yau</b>What the fast solvers do. 1. Two opposite centers, white and yellow. 2. Three white cross edges, placed round the white center. 3. The last four centers, holding white on the left so the cross edges stay. 4. The last cross edge. 5. Pair the eight other edges, three-two-three, with slice turns that keep the cross. 6. The 3×3 stage: F2L, OLL, PLL, with the same parity fixes. The cross is done when reduction ends, and every center turn is a slice turn you can see.</div>
      <div class="tip"><b>Notation</b>A capital letter turns an outside face. A small letter turns the inside slice next to it (the guide's r; others write 2R). Two letters, Rr, turn both as one (others write Rw). x y z turn the whole cube. Slice turns move center tiles and edge pieces; outside turns never break a center or a pair.</div>
    </div></div>
    <div class="panel"><h3>The parity algorithms</h3><p class="muted">Click a case to put it on the cube.</p><div class="rcards">${FOUR_PARITY.map(a=>`<div class="rcard ref-row" data-id="${esc(a.id)}" title="Open this case">${fourThumb(fourCaseCube(a))}<div><div class="nm">${esc(a.name)}</div><div class="rec">${esc(a.recog)}</div><div class="alg">${spoilAlg(a.alg)}</div></div></div>`).join('')}</div></div>
    <div class="panel"><h3>The guide's algorithms</h3><div class="wide"><table><tr><th>Name</th><th>Algorithm</th><th>What it does</th></tr>${['centerFront','centerDown','lineUp','pairEdges','ollParity','pllParity'].map(k=>{const a=MASTER_ALGS[k];return `<tr><td>${esc(a.name)}</td><td class="ref-alg">${spoilAlg(a.alg)}</td><td class="muted">${esc(a.why)}</td></tr>`;}).join('')}</table></div></div>`;
  $$('#tab-fref .ref-row').forEach(el=>el.onclick=()=>{goTab('parity');fourShowCase(el.dataset.id);focusPlayer();});
}

fourMountSolve();fourMountParity();fourMountRef();
document.addEventListener('cw:status',e=>{if(!String(e.detail).startsWith('four:'))return;fourRenderGrid();fourRenderStats();if(fourState.cur&&fourState.hint)fourRenderCurrent();});
document.addEventListener('cw:tab',e=>{if(e.detail==='parity')fourRenderStats();});
document.addEventListener('cw:scramble',()=>{fourPlanState.plan=null;if($('#fwPlanOut'))$('#fwPlanOut').innerHTML='<p class="muted">New scramble. Press Plan.</p>';});
const _fwRT=renderTimes;renderTimes=function(){_fwRT();if(curTab==='parity')fourRenderStats();};
