// ===== What to look for: the Cross tab's tips as cards =====
// Each tip of CROSS_TIPS (js/algs.js) is one row: the title and one line. A click opens it to a
// card: the text, a small cube at the tip's demo state with the cross edges lit (both stickers; the
// pieces of a slot too where a plan makes a pair), and the plan as move tiles in the colors of the
// faces they turn. Play turns the moves one by one (Step: one), the tiles mark the move in view,
// and a line counts the cross edges solved, so the pieces can be followed through the plan. A tip
// with two plans has a chip for each. A plan made of parts shows each part on its own line, then
// the parts joined: the moves that cancel are struck through, with what they cancel to.
// One card open at a time. The cube is the virtual cube's (screenCube, no keys). The markup is
// built from CROSS_TIPS, our own data, with every text through esc().
const LOOK={open:-1,plan:0,idx:0,timer:0,sc:null};
const LOOK_MS=900,LOOK_TURN=420;
const LOOK_VIEW={yaw:-32,pitch:-30}; // from below: the cross is on the bottom
// The plan's moves, the parts one after the other.
function lookMoves(p){return p.parts?p.parts.flatMap(x=>parseAlg(x.moves)):parseAlg(p.moves);}
// Join a and b, as the moves are turned: the end of a and the start of b on one face add up round
// the four (cubeTabMerge). Returns the joined moves and, for each part, the indices of the moves
// that merged, with a note in words for each merge.
function lookJoin(a,b){
  const A=a.slice(),B=b.slice(),cutA=new Set(),cutB=new Set(),notes=[];let i=A.length-1,j=0,out=null;
  while(i>=0&&j<B.length&&A[i][0]===B[j][0]){
    const m=cubeTabMerge([A[i]],B[j]);cutA.add(i);cutB.add(j);
    notes.push(m.length?`${A[i]} then ${B[j]} is ${m[0]}`:`${A[i]} then ${B[j]} cancel`);
    if(m.length){out=m[0];j++;break;}i--;j++;}
  const joined=A.slice(0,Math.min(...[...cutA,A.length])).concat(out?[out]:[],B.slice(j));
  return {joined,cutA,cutB,notes};
}
// The cube at the demo's start, as held for the cross color in use (phys).
function lookStart(demo){return phys(applyAlg(new Cube(),parseAlg(demo.setup)));}
// The stickers to light: every cross edge, both stickers, by color; and a slot's corner and edge.
function lookLit(c,slots){
  const f=c.toFacelets(),cc=c.center[3],lit=new Set();
  for(const [a,b] of edgeFacelet)if(f[a]===cc||f[b]===cc){lit.add(a);lit.add(b);}
  for(const name of slots||[]){const sl=SLOTS.find(s=>s.name===name);if(!sl)continue;
    const cols=cornerColor[sl.corner].map(x=>c.center[x]).sort().join(),ecol=edgeColor[sl.edge].map(x=>c.center[x]).sort().join();
    for(const fs of cornerFacelet)if(fs.map(i=>f[i]).sort().join()===cols)fs.forEach(i=>lit.add(i));
    for(const fs of edgeFacelet)if(fs.map(i=>f[i]).sort().join()===ecol)fs.forEach(i=>lit.add(i));}
  return lit;
}
// Cross edges solved on a held cube: the edge at each bottom place shows the bottom color down and
// its side center's color on the side.
function lookSolvedCount(c){const f=c.toFacelets();let n=0;for(const e of [4,5,6,7]){const [a,b]=edgeFacelet[e];if(f[a]===c.center[3]&&f[b]===c.center[Math.floor(b/9)])n++;}return n;}
function lookTiles(moves,base,from,cut){const fc=seqFaceColors(base,moves);
  return moves.map((m,i)=>`<span class="m${fc[i]>=0?' fc c'+fc[i]:''}${cut&&cut.has(i)?' cx':''}" data-k="${from+i}">${fmtMove(m)}</span>`).join('');}
function lookPlanHTML(demo,p){
  const base=lookStart(demo);
  if(!p.parts)return `<div class="scramble look-moves">${lookTiles(parseAlg(p.moves),base,0)}</div>`;
  const a=parseAlg(p.parts[0].moves),b=parseAlg(p.parts[1].moves),J=lookJoin(a,b);
  return `<div class="look-part"><span class="st-lbl">${esc(p.parts[0].name)}</span><div class="scramble look-moves">${lookTiles(a,base,0,J.cutA)}</div></div>
    <div class="look-part"><span class="st-lbl">${esc(p.parts[1].name)}</span><div class="scramble look-moves">${lookTiles(b,applyAlg(base,a),a.length,J.cutB)}</div></div>
    <div class="look-join"><span class="st-lbl">Joined</span><div class="scramble">${lookTiles(J.joined,base,-100)}</div><span class="muted">${esc(J.notes.join('. '))}. ${a.length+b.length} moves become ${J.joined.length}.</span></div>`;
}
function lookCardHTML(t){const d=t.demo;
  return `<div class="look-card" id="lookCard"><p>${esc(t.d)}</p>
    ${d.plans.length>1?`<div class="st-seg look-plans" role="group" aria-label="Plans">${d.plans.map((p,k)=>`<button type="button" data-plan="${k}" aria-pressed="${k===LOOK.plan}" title="Show this plan on the cube">${esc(p.name)}</button>`).join('')}</div>`:''}
    <div class="look-body"><div class="look-cube" id="lookCube" title="Drag to look around the cube. Double-click to put it back."></div>
      <div class="look-side"><div id="lookPlan">${lookPlanHTML(d,d.plans[LOOK.plan])}</div>
        <div class="row look-ctl"><button type="button" class="small primary" id="lookPlay" title="Turn the moves one by one">▷ Play</button><button type="button" class="small" id="lookStep" title="Turn the next move">Step ▶</button><button type="button" class="small ghost" id="lookReset" title="Back to the start">⏮ Start</button></div>
        <p class="look-say" id="lookSay" aria-live="polite"></p><p class="muted look-why">${esc(d.say)}</p></div></div></div>`;}
function crossLookDraw(){
  const box=$('#crossTips');if(!box)return;lookStop();LOOK.sc=null;
  box.innerHTML=`<div class="look-list">${CROSS_TIPS.map((t,i)=>`<div class="look${i===LOOK.open?' open':''}"><button type="button" class="look-row" data-look="${i}" aria-expanded="${i===LOOK.open}" title="${i===LOOK.open?'Close this card':'Open this card: the cube shows it'}"><b>${esc(t.t)}</b><span class="muted">${esc(t.s)}</span><span class="look-chev" aria-hidden="true">${i===LOOK.open?'▾':'▸'}</span></button>${i===LOOK.open?lookCardHTML(t):''}</div>`).join('')}</div>`;
  box.querySelectorAll('[data-look]').forEach(b=>b.onclick=()=>{const i=+b.dataset.look;LOOK.open=LOOK.open===i?-1:i;LOOK.plan=0;LOOK.idx=0;crossLookDraw();});
  if(LOOK.open<0)return;
  const t=CROSS_TIPS[LOOK.open];
  box.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{LOOK.plan=+b.dataset.plan;LOOK.idx=0;crossLookDraw();});
  LOOK.sc=screenCube($('#lookCube'),{keys:false,label:'The cube for this card',view:LOOK_VIEW});
  $('#lookPlay').onclick=()=>{if(LOOK.timer){lookStop();lookDraw();return;}if(LOOK.idx>=lookMoves(t.demo.plans[LOOK.plan]).length){LOOK.idx=0;lookDraw();}lookPlay();};
  $('#lookStep').onclick=()=>{lookStop();lookStep();};
  $('#lookReset').onclick=()=>{lookStop();LOOK.idx=0;lookDraw();};
  lookDraw();
}
function lookStop(){if(LOOK.timer){clearInterval(LOOK.timer);LOOK.timer=0;}const b=$('#lookPlay');if(b)b.textContent='▷ Play';}
function lookPlay(){if(!lookStep())return;LOOK.timer=setInterval(()=>{if(!lookStep())lookStop();},LOOK_MS);const b=$('#lookPlay');if(b)b.textContent='❚❚ Pause';}
function lookPlanNow(){const t=CROSS_TIPS[LOOK.open];return t?{t,p:t.demo.plans[LOOK.plan]}:null;}
// The next move turns on the cube, and the lit pieces follow it. False at the end.
function lookStep(){const P=lookPlanNow();if(!P||!LOOK.sc)return false;const ms=lookMoves(P.p);
  if(LOOK.idx>=ms.length)return false;const m=ms[LOOK.idx];LOOK.idx++;
  const sc=LOOK.sc,at=LOOK.idx,c=applyAlg(lookStart(P.t.demo),ms.slice(0,at));sc.turn(m,{dur:LOOK_TURN});lookMark();
  setTimeout(()=>{if(LOOK.sc===sc&&LOOK.idx===at){sc.fade=lookLit(c,P.p.slot?[P.p.slot]:P.t.demo.lit);sc.draw();}},LOOK_TURN+20); // the lit stickers move with the turn
  return LOOK.idx<ms.length;}
// The cube at the step in view, lit, and the tiles and the count.
function lookDraw(){const P=lookPlanNow();if(!P||!LOOK.sc)return;const ms=lookMoves(P.p);
  const c=applyAlg(lookStart(P.t.demo),ms.slice(0,LOOK.idx));LOOK.sc.set(c,lookLit(c,P.p.slot?[P.p.slot]:P.t.demo.lit));lookMark();}
function lookMark(){const P=lookPlanNow();if(!P)return;const ms=lookMoves(P.p),i=LOOK.idx;
  $$('#lookPlan .look-moves .m').forEach(el=>{const k=+el.dataset.k;el.classList.toggle('done',k<i);el.classList.toggle('cur',k===i-1);});
  const c=applyAlg(lookStart(P.t.demo),ms.slice(0,i)),n=lookSolvedCount(c);
  const pair=i===ms.length&&P.p.slot&&slotSolved(applyAlg(new Cube(),parseAlg(P.t.demo.setup).concat(ms)),SLOTS.find(s=>s.name===P.p.slot));
  const say=$('#lookSay');if(say)say.textContent=(i===0?`Start: ${n} of 4 cross edges solved. ${ms.length} move${ms.length>1?'s':''} to go.`:`After ${ms[i-1]}, move ${i} of ${ms.length}: ${n} of 4 cross edges solved.`)+(pair?` The ${P.p.slot} pair is in too.`:'');}
if(typeof document!=='undefined'){
  crossLookDraw();
  // A change of the cross color changes the hold; a tab change stops the play.
  const cc=$('#crossColor');if(cc)cc.addEventListener('change',()=>{if(LOOK.open>=0)crossLookDraw();});
  document.addEventListener('cw:tab',e=>{if(e.detail!=='cross')lookStop();});
}
