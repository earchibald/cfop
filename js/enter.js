// ================= Enter a scramble (desktop) =================
// Camera / photo / paint cube reading was removed. The two-phase solver and
// facelet validation stay in solver.js as stubs, ready to derive a scramble
// from a cube state when a reader is added back.
function customName(kind){const d=new Date();const p=n=>String(n).padStart(2,'0');return `${kind}-${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;}
// Derive a scramble from a solved-relative cube state, then load it like a seed.
// cube: a Cube in the standard (white up, green front) frame. The page goes to the Solve tab,
// unless `stay` is set (the F2L guide's Set up from current keeps its tab).
function scrambleFromCube(cube,name,stay){
  const go=()=>{if(!stay)goSolveTab();};
  if(puzzleN()===4){loadState(name||customName('cube'),cube);go();return {ok:true,moves:[]};} // the state itself is the mix-up
  if(puzzleN()===2){ // the corners only: face moves from a solved cube, white up, that give them
    const scr=twoScrambleFor(cube);if(!scr)return {ok:false,errors:['No scramble found.']};
    loadScramble(name||customName('cube'),scr,true);go();return {ok:true,moves:scr};}
  const res=(typeof fromFacelets==='function')?fromFacelets(cube.toFacelets()):{ok:true,cube};
  if(!res.ok)return {ok:false,errors:res.errors};
  const sol=solveTwoPhase(res.cube,{timeMs:1500,target:-1});
  if(!sol)return {ok:false,errors:['No scramble found.']};
  const scr=invertAlg(sol);
  if(!applyAlg(new Cube(),scr).equals(res.cube))return {ok:false,errors:['The scramble does not match the cube.']};
  loadScramble(name||customName('cube'),scr,true);go();return {ok:true,moves:scr};
}
function goSolveTab(){const t=isBeg()?'bsolve':method==='speed2'?'ssolve':method==='speed4'?'fsolve':'solve';if(curTab!==t)goTab(t);focusPlayer();}

function openEnter(){
  if($('#enterBg'))return;
  const bg=document.createElement('div');bg.className='modal-bg';bg.id='enterBg';
  bg.innerHTML=`<div class="modal enter" role="dialog" aria-label="Enter a scramble">
   <button class="close small ghost" id="enterClose" aria-label="Close" title="Close (Esc)">✕</button>
   <h2>Enter a scramble</h2>
   <p class="muted" style="margin-top:0">Type a scramble in standard notation, or paste the letters of a cube state. Twistwright loads it like a seed, so Plan, Cross, auto-step and the timer all work.</p>
   <div class="scan-row"><input id="enterType" placeholder="e.g. R U R' U' F2 D L2 B'" style="flex:1;min-width:260px" title="A scramble in move letters, or the letters of a cube state"><button class="primary" id="enterGo" title="Put this scramble on the cube (Enter)">Load scramble</button></div>
   <div id="enterStatus" class="notice" style="margin-top:10px">Use face turns only: U R F D L B, each with an optional <span class="kbd">'</span> or <span class="kbd">2</span>. A state is one letter per sticker, W R G Y O B, face by face: top, right, front, bottom, left, back. The lab's Copy state writes one.</div>
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
  const t=$('#enterType').value.trim();if(!t)return;
  if(stateLetters(t)){enterState(t);return;}
  let ms;
  try{ms=parseAlg(t);applyAlg(new Cube(),ms);}catch(e){$('#enterStatus').textContent='That scramble has a move I do not know: '+e.message.replace('bad move ','');return;}
  if(ms.some(m=>!FACE_MOVES.includes(m))){$('#enterStatus').textContent="Use face turns only (U R F D L B with ' or 2).";return;}
  closeEnter();loadScramble(customName('typed'),ms,true);goSolveTab();
}
// The letters of a cube state (stateFromText in state-text.js): the cube loads through
// scrambleFromCube, as a scanned or smart cube does. The state must be of the current puzzle. An
// error goes in the dialog, opened where it is not.
function enterState(text){
  const r=stateFromText(text);
  const fail=msg=>{if(!$('#enterBg'))openEnter();$('#enterType').value=text.trim();$('#enterStatus').textContent=msg;};
  if(!r.ok)return fail(r.errors.join(' '));
  const n=puzzleN();
  if(r.n!==n)return fail(`These letters are a ${r.n}x${r.n} state. This is the ${n}x${n}: choose a ${r.n}x${r.n} method first, then load it again.`);
  const res=scrambleFromCube(r.cube,customName('state'));
  if(!res.ok)return fail(res.errors.join(' '));
  closeEnter();
}
// A paste anywhere on the page, outside a field: the letters of a cube state load the cube, as
// from the dialog. Other text is left to the page.
document.addEventListener('paste',e=>{
  const t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;
  const text=e.clipboardData?e.clipboardData.getData('text'):'';
  if(!stateLetters(text))return;
  e.preventDefault();enterState(text);
});
$('#scanBtn').onclick=openEnter;

