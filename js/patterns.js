// ================= Pattern recognition =================
// What the cube shows, in CFOP terms, for the Patterns sheet of the site (js/patterns-ui.js) and the
// Patterns window of the lab (lab/lab.js). Pure: no DOM. Loads after js/stage.js and js/f2l.js.
// Three kinds, each turned on or off by the user: 'cross' (the cross on the bottom as held at a new
// scramble: its shortest length, the count of its solutions by length and the shortest ones; then
// the moves it took once it is made), 'f2l' (each free pair as one of the 41 cases, with its book
// moves) and 'll' (the two-look OLL or PLL case, with its algorithm). The cube comes in as held
// (cfopStage), and every move that comes out reads as held.
// What the lab taught: read the cube as held, with the cross on the bottom; name a case once until
// another comes or the cube is solved; show a case's moves covered, the first move in clear; keep
// the moves the user made for the cross plain; read only when the cube has been still a moment
// (PAT_STILL), so a fast run of turns does not name every state it passes.
// patCross(held, max)             {color, optimal, made, lens, sols}: the cross on the bottom as held
// patF2L(held, prefer)            [{slot, pos, colors, n, grp, moves}]: each free pair's case, or null
// patLL(held, prefer)             {stage, step, name, moves, sub}: the two-look case, or null
// patTracker()                    the state of the once-only rule: {f2l, ll} last keys
// patStep(T, held, on, prefer)    the new entries of a read, by the once-only rule: [{kind, ...}]
//                                 on: {cross, f2l, ll}; a cross made is the caller's (its moves)
// patCrossMade(held, color)       the cross of `color` is made and on the bottom, as held
const PAT_KINDS=['cross','f2l','ll'];
const PAT_NAMES={cross:'Cross',f2l:'F2L',ll:'OLL · PLL'};
const PAT_LL_STEPS={eo:'OLL edges',co:'OLL corners',cp:'PLL corners',ep:'PLL edges'};
const PAT_CROSS_MAX=7;   // the cross solutions are counted up to this many moves
const PAT_STILL=1000;    // ms the cube must stay still before a read
const PAT_COLOR_NAMES=['white','red','green','yellow','orange','blue'];
// The cross on the bottom as held: reframe puts the bottom as held where the engine's D cross is,
// so the solutions read as held.
function patCross(held,max=PAT_CROSS_MAX){
  const color=PAT_COLOR_NAMES[held.center[3]],r=crossSolutions(reframe(held),max),made=r.optimal===0;
  const lens=[];if(!made&&r.optimal!=null)for(let n=r.optimal;n<=max;n++)lens.push(n+' moves: '+(r.byLen[n]||[]).length);
  if(!made&&!lens.length)lens.push('none in '+max+' moves or fewer');
  return {color,optimal:r.optimal,made,lens,sols:(r.optimal?r.byLen[r.optimal]:null)||[]};
}
function patCrossMade(held,color){
  const st=cfopStage(held,color);return st.stage!=='cross'&&st.down===color;
}
// Each pair that is free (its corner and its edge on top, or at home but not solved) as one of the
// 41 cases: the textbook way (f2lBasic) with no piece to free. The moves turn the cube so the cross
// is down where it is not, then put the slot at the front right (a y turn), then the case.
function patF2L(held,prefer){
  if(typeof f2lBasic!=='function')return null;
  const st=cfopStage(held,prefer);if(st.stage!=='f2l')return null;
  const H=st.turn.length?applyAlg(held,st.turn):held,X=reframe(H),keep=f2lKeep(X),words=f2lSlotWords(H),out=[];
  for(const name of f2lOpen(X)){
    const s=f2lSlot(name),cp=X.cp.indexOf(s.corner),ep=X.ep.indexOf(s.edge);
    if((cp>=4&&cp!==s.corner)||(ep>=4&&ep!==s.edge))continue; // a piece stuck in another slot: no case yet
    const b=f2lBasic(X,name,keep),c=b&&b.steps.find(x=>x.kind==='case');if(!c)continue;
    out.push({slot:name,pos:words[name].pos,colors:words[name].colors.slice(0,2),n:c.n,grp:c.grp,moves:[...st.turn,...b.moves]});
  }
  return out;
}
function patLL(held,prefer){
  const st=cfopStage(held,prefer),step=PAT_LL_STEPS[st.stage];
  return step?{stage:st.stage,step,name:st.name,moves:st.moves,sub:st.sub}:null;
}
function patTracker(){return {f2l:'',ll:''};}
// One read: the entries it adds. A case goes in once, until another case of its kind comes; a solved
// cube, or a cube past that kind, starts the once over. F2L is one entry for the free pairs together.
function patStep(T,held,on,prefer){
  const out=[];if(!held)return out;
  const st=cfopStage(held,prefer);
  if(st.stage==='solved'){T.f2l=T.ll='';return out;}
  if(on.f2l&&st.stage==='f2l'){
    const pairs=patF2L(held,prefer)||[],key=pairs.map(p=>p.slot+':'+p.n).join(' ');
    if(key&&key!==T.f2l)out.push({kind:'f2l',step:'F2L',name:pairs.length===1?'Case '+pairs[0].n:pairs.map(p=>p.n).join(', '),pairs,
      sub:pairs.map(p=>`${p.pos}: case ${p.n}, ${p.grp.toLowerCase()}`).join('. ')+'.'});
    T.f2l=key;
  }else if(st.stage!=='f2l')T.f2l='';
  if(on.ll&&PAT_LL_STEPS[st.stage]){
    const key=st.stage+':'+st.name;
    if(key!==T.ll)out.push({kind:'ll',step:PAT_LL_STEPS[st.stage],name:st.name,moves:st.moves,sub:st.sub});
    T.ll=key;
  }else if(!PAT_LL_STEPS[st.stage])T.ll='';
  return out;
}
