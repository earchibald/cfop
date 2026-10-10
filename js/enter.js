// ================= Enter a scramble (desktop) =================
// Camera / photo / paint cube reading was removed. The two-phase solver and
// facelet validation stay in solver.js as stubs, ready to derive a scramble
// from a cube state when a reader is added back.
function customName(kind){const d=new Date();const p=n=>String(n).padStart(2,'0');return `${kind}-${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;}
// Derive a scramble from a solved-relative cube state, then load it like a seed.
// Kept for the future cube reader. cube: a Cube in the standard (white up, green front) frame.
function scrambleFromCube(cube,name){
  const res=(typeof fromFacelets==='function')?fromFacelets(cube.toFacelets()):{ok:true,cube};
  if(!res.ok)return {ok:false,errors:res.errors};
  const sol=solveTwoPhase(res.cube,{timeMs:1500,target:-1});
  if(!sol)return {ok:false,errors:['No scramble found.']};
  const scr=invertAlg(sol);
  if(!applyAlg(new Cube(),scr).equals(res.cube))return {ok:false,errors:['The scramble does not match the cube.']};
  loadScramble(name||customName('cube'),scr,true);goSolveTab();return {ok:true,moves:scr};
}
function goSolveTab(){const b=$$('#rail button').find(x=>x.dataset.tab==='solve');if(b&&!b.classList.contains('on'))b.click();focusPlayer();}

function openEnter(){
  if($('#enterBg'))return;
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='enterBg';
  bg.innerHTML=`<div class="modal enter" role="dialog" aria-label="Enter a scramble">
   <button class="close small ghost" id="enterClose" aria-label="Close">✕</button>
   <h2>Enter a scramble</h2>
   <p class="muted" style="margin-top:0">Type a scramble in standard notation. Twistwright loads it like a seed, so Plan, Cross, auto-step and the timer all work.</p>
   <div class="scan-row"><input id="enterType" placeholder="e.g. R U R' U' F2 D L2 B'" style="flex:1;min-width:260px"><button class="primary" id="enterGo">Load scramble</button></div>
   <div id="enterStatus" class="notice" style="margin-top:10px">Use face turns only: U R F D L B, each with an optional <span class="kbd">'</span> or <span class="kbd">2</span>.</div>
  </div>`;
  document.body.appendChild(bg);
  bg.addEventListener('click',e=>{if(e.target===bg)closeEnter();});
  $('#enterClose').onclick=closeEnter;
  $('#enterGo').onclick=enterLoad;
  document.addEventListener('keydown',enterKeys,true);
  setTimeout(()=>$('#enterType').focus(),20);
}
function closeEnter(){document.removeEventListener('keydown',enterKeys,true);const b=$('#enterBg');if(b)b.remove();}
function enterKeys(e){
  if(!$('#enterBg'))return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeEnter();return;}
  if(e.key==='Enter'){e.preventDefault();e.stopPropagation();enterLoad();return;}
  e.stopPropagation(); // keep tab/timer keys out while typing
}
function enterLoad(){
  const t=$('#enterType').value.trim();if(!t)return;let ms;
  try{ms=parseAlg(t);applyAlg(new Cube(),ms);}catch(e){$('#enterStatus').textContent='That scramble has a move I do not know: '+e.message.replace('bad move ','');return;}
  if(ms.some(m=>!FACE_MOVES.includes(m))){$('#enterStatus').textContent="Use face turns only (U R F D L B with ' or 2).";return;}
  closeEnter();loadScramble(customName('typed'),ms,true);goSolveTab();
}
$('#scanBtn').onclick=openEnter;

