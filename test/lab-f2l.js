// The F2L guide of the lab (lab/f2l.js), without a DOM: on random scrambles with the cross solved,
// every step of both modes solves its target and keeps the cross and the slots before it; a custom
// order and a click target are followed; f2lPairSolutions lists each shortest solution once (a brute
// force agrees on short cases) and its optimal is solveF2LPair's; the combinations solve what they
// say; f2lDone and f2lPart follow a hint; the slot words read as held.
const assert=require('assert');
const run=require('./vm-load')('js/engine.js','lab/f2l.js');
const g=name=>run(name);
// The arrays come from another realm: compare them as JSON.
const J=x=>JSON.parse(JSON.stringify(x)),deq=(a,b,m)=>assert.deepStrictEqual(J(a),J(b),m);
const Cube=g('Cube'),applyAlg=g('applyAlg'),parseAlg=g('parseAlg'),SLOTS=g('SLOTS'),slotSolved=g('slotSolved'),crossSolved=g('crossSolved'),f2lSolved=g('f2lSolved');
const solveCross=g('solveCross'),randomMoveScramble=g('randomMoveScramble'),solveF2LPair=g('solveF2LPair'),reframe=g('reframe');
const f2lSlotWords=g('f2lSlotWords'),f2lState=g('f2lState'),f2lPairSolutions=g('f2lPairSolutions'),f2lNext=g('f2lNext'),f2lThen=g('f2lThen'),f2lCombos=g('f2lCombos'),f2lDone=g('f2lDone'),f2lPart=g('f2lPart'),f2lAlong=g('f2lAlong');
const F2L_ORDER_DEFAULT=g('F2L_ORDER_DEFAULT'),F2L_COMBO_EXTRA=g('F2L_COMBO_EXTRA');
const slot=n=>SLOTS.find(s=>s.name===n),solvedNames=X=>SLOTS.filter(s=>slotSolved(X,s)).map(s=>s.name);
// The optimal of a slot with the solved slots kept, from the fast search; it is checked against
// solveF2LPair (js/engine.js) in the solutions section below.
const opt=(X,n,keep)=>f2lPairSolutions(X,n,keep,{limit:1}).optimal;
// A scramble with its cross solved: the shortest cross after the scramble.
const withCross=seed=>{const c=applyAlg(new Cube(),randomMoveScramble(seed,25));return applyAlg(c,solveCross(c).solutions[0]);};
const T0=Date.now(),lap=n=>console.log(n+' ('+(Date.now()-T0)+' ms)');
const N=40,cubes=[];for(let i=0;i<N;i++)cubes.push(withCross('f2l-'+i));
assert.ok(cubes.every(crossSolved),'the cross is solved on each');

// f2lState: the slots solved, and a done slot that came apart
{const X=applyAlg(new Cube(),parseAlg("R U R'"));const st=f2lState(X,['FR','BL']);
  assert.strictEqual(st.cross,true);deq(st.solved,['FL','BL','BR']);deq(st.broken,['FR'],'FR came apart');}

// Both modes on every scramble: each step solves its target, keeps the cross and the slots solved
// before it, and four steps (or fewer, where a slot is solved by chance) end with F2L solved.
for(const mode of ['shortest','corner']){
  for(let i=0;i<N;i++){
    let X=cubes[i];const done=[];
    for(let k=0;k<4;k++){
      const before=solvedNames(X),r=f2lNext(X,{mode,done});
      if(!r){assert.strictEqual(before.length,4);break;}
      assert.ok(!before.includes(r.slot),'the target is not solved yet');
      if(mode==='corner')assert.strictEqual(r.slot,F2L_ORDER_DEFAULT.find(n=>!before.includes(n)),'by corner: the first open slot in the order');
      else{const lens=F2L_ORDER_DEFAULT.filter(n=>!before.includes(n)).map(n=>({n,len:opt(X,n,before)}));
        const min=Math.min(...lens.map(l=>l.len));assert.strictEqual(r.optimal,min,'shortest: the fewest moves: '+JSON.stringify(lens));
        assert.strictEqual(r.slot,lens.find(l=>l.len===min).n,'ties go to the order');}
      assert.strictEqual(r.moves.length,r.optimal,'the hint is a shortest one');
      X=applyAlg(X,r.moves);
      assert.ok(crossSolved(X),'the cross is kept');assert.ok(slotSolved(X,slot(r.slot)),'the target is solved');
      for(const n of before)assert.ok(slotSolved(X,slot(n)),'a solved slot is kept: '+n);
      done.push(r.slot);
    }
    assert.ok(f2lSolved(X),mode+': F2L solved on scramble '+i);
  }
}
lap('lab-f2l modes ok');

// A custom order is followed; a click target is taken next and the order resumes after it.
{const order=['BR','FL','FR','BL'];
  for(let i=0;i<10;i++){let X=cubes[i];const seen=[];
    for(;;){const r=f2lNext(X,{mode:'corner',order});if(!r)break;seen.push(r.slot);X=applyAlg(X,r.moves);}
    const open=order.filter(n=>!slotSolved(cubes[i],slot(n)));
    deq(seen.filter(n=>open.includes(n)).slice(0,1),open.slice(0,1),'the first open slot of the order goes first');
    deq(seen.filter(n=>open.includes(n)).length,seen.length);}
  const X0=cubes.find(X=>solvedNames(X).length===0);
  let X=X0;const r1=f2lNext(X,{mode:'corner',order,target:'BL'});assert.strictEqual(r1.slot,'BL','the click target is taken first');
  X=applyAlg(X,r1.moves);const rest=[];
  for(;;){const r=f2lNext(X,{mode:'corner',order});if(!r)break;rest.push(r.slot);X=applyAlg(X,r.moves);}
  assert.strictEqual(rest[0],'BR','the order resumes after it: '+rest.join(' '));
  assert.ok(f2lSolved(X));
  const sh=f2lNext(X0,{mode:'shortest',target:'BL'});assert.strictEqual(sh.slot,'BL','shortest keeps a click target');
  const sol=f2lNext(applyAlg(X0,r1.moves),{mode:'corner',order,target:'BL'});assert.notStrictEqual(sol.slot,'BL','a solved target is not taken again');}
lap('lab-f2l order ok');

// f2lPairSolutions: each shortest solution once, each solves and keeps, none holds a shorter one, the
// optimal is solveF2LPair's. A brute force with the same rules lists the same solutions on short cases.
{const goalOk=(X,s,keep)=>crossSolved(X)&&slotSolved(X,slot(s))&&keep.every(k=>slotSolved(X,slot(k)));
  for(let i=0;i<N;i++){
    const X=cubes[i],keep=solvedNames(X),s=F2L_ORDER_DEFAULT.find(n=>!keep.includes(n));if(!s)continue;
    const r=f2lPairSolutions(X,s,keep,{limit:1000});
    assert.ok(!r.partial&&!r.capped,'a full answer');
    if(i<12){const sp=solveF2LPair(X,slot(s),keep.map(slot),13,40000000);assert.ok(sp,'solveF2LPair answers');assert.strictEqual(r.optimal,sp.length,'the optimal is solveF2LPair\'s');}
    const sols=r.byLen[r.optimal];assert.ok(sols.length>=1);assert.strictEqual(new Set(sols).size,sols.length,'each once');
    for(const sol of sols){const ms=sol.split(' ');assert.strictEqual(ms.length,r.optimal);
      assert.ok(goalOk(applyAlg(X,ms),s,keep),'it solves: '+sol);
      for(let k=1;k<ms.length;k++)assert.ok(!goalOk(applyAlg(X,ms.slice(0,k)),s,keep),'no shorter one inside: '+sol);
      for(let k=1;k<ms.length;k++)assert.notStrictEqual(ms[k][0],ms[k-1][0],'no face twice in a row');}
  }
  // the brute force: every canonical sequence up to the length, with the same rules
  const pi=g('pieceIndexCorner'),pe=g('pieceIndexEdge'),FACE_MOVES=g('FACE_MOVES');
  const brute=(X,s,keep,L)=>{const sl=[s,...keep].map(slot),key=c=>[4,5,6,7].map(e=>pe(c,e)).concat(...sl.map(q=>[pi(c,q.corner),pe(c,q.edge)])).join();
    const out=[];const rec=(c,path,lf)=>{if(path.length&&goalOk(c,s,keep)){if(path.length===L)out.push(path.join(' '));return;}if(path.length===L)return;
      for(let i=0;i<18;i++){const f=(i/3)|0;if(f===lf)continue;if(lf>=0&&f>=3&&f-3===lf)continue;const n=applyAlg(c,[FACE_MOVES[i]]);if(key(n)===key(c))continue;path.push(FACE_MOVES[i]);rec(n,path,f);path.pop();}};
    rec(X,[],-1);return out.sort();};
  for(const alg of ["R U R'","U R U' R'","F' U' F","L' U L","R U2 R' U","B U B' U2","R' F R F'"]){
    const X=applyAlg(new Cube(),parseAlg(alg)),keep=solvedNames(X),s=F2L_ORDER_DEFAULT.find(n=>!keep.includes(n));
    const r=f2lPairSolutions(X,s,keep,{extra:1,limit:1000});
    for(const L of [r.optimal,r.optimal+1])deq((r.byLen[L]||[]).slice().sort(),brute(X,s,keep,L),'the same solutions as the brute force: '+alg+', length '+L);
  }
  // a node limit gives what was found, marked partial
  const p=f2lPairSolutions(cubes[0],F2L_ORDER_DEFAULT.find(n=>!slotSolved(cubes[0],slot(n))),[],{nodeLimit:50});assert.ok(p.partial,'partial past the node limit');}
lap('lab-f2l solutions ok');

// f2lThen: from the cube after the hint, the slots still to do in the mode's order (a slot solved by
// chance on the way drops out), each count the optimal from the cube before it
for(let i=0;i<10;i++){
  const X=cubes[i],r=f2lNext(X,{mode:'corner'}),Y=applyAlg(X,r.moves),th=f2lThen(Y,{mode:'corner'});
  let Z=Y;
  for(const t of th){const keep=solvedNames(Z);assert.strictEqual(t.slot,F2L_ORDER_DEFAULT.find(n=>!keep.includes(n)),'the next open slot in the order');
    assert.strictEqual(t.n,opt(Z,t.slot,keep),'the count is the optimal from the cube before it');
    Z=applyAlg(Z,f2lNext(Z,{mode:'corner'}).moves);}
  assert.ok(f2lSolved(Z),'the list runs to the end of F2L');
}
lap('lab-f2l then ok');

// Combinations: an "also" line solves both slots within the extra; a "setup" line solves the target,
// its after is the true optimal of the next slot from there, and it beats the plain hint.
{let also=0,setups=0;
  for(let i=0;i<N;i++){
    const X=cubes[i],keep=solvedNames(X),r=f2lNext(X,{mode:'shortest'});if(!r)continue;
    const others=F2L_ORDER_DEFAULT.filter(n=>n!==r.slot&&!keep.includes(n));
    const c=f2lCombos(X,r.slot,keep,others,{nodeLimit:3000000});
    for(const a of c.also){also++;const Y=applyAlg(X,a.moves);
      assert.ok(crossSolved(Y)&&slotSolved(Y,slot(r.slot))&&slotSolved(Y,slot(a.slot))&&keep.every(k=>slotSolved(Y,slot(k))),'also makes both');
      assert.ok(a.moves.length<=r.optimal+F2L_COMBO_EXTRA,'within the extra');}
    if(c.setup){setups++;const s=c.setup,Y=applyAlg(X,s.moves);
      assert.strictEqual(s.moves.length,r.optimal,'a shortest solution of the target');assert.ok(slotSolved(Y,slot(r.slot))&&crossSolved(Y),'it solves the target');
      const k2=solvedNames(Y);assert.strictEqual(s.after,opt(Y,s.slot,k2),'after is the true optimal');
      const open=F2L_ORDER_DEFAULT.filter(n=>!k2.includes(n));assert.strictEqual(s.after,Math.min(...open.map(n=>opt(Y,n,k2))),'of the slot the mode takes next');
      assert.ok(s.after<s.plain,'it beats the plain hint');
      const P=applyAlg(X,r.moves),kp=solvedNames(P),op=F2L_ORDER_DEFAULT.filter(n=>!kp.includes(n));
      assert.strictEqual(s.plain,Math.min(...op.map(n=>opt(P,n,kp))),'plain is the next step after the plain hint');}
  }
  assert.ok(also>0,'some scrambles have an also line: '+also);assert.ok(setups>0,'and a setup line: '+setups);}
lap('lab-f2l combos ok');

// f2lDone counts a prefix of the hint; a move off it gives -1, and back on it the prefix again.
// f2lPart: one quarter of a half turn.
{const X=cubes[0],r=f2lNext(X,{mode:'corner'}),h=r.moves,at=n=>applyAlg(X,h.slice(0,n));
  for(let n=0;n<=h.length;n++)assert.strictEqual(f2lDone(X,h,at(n)),n,'the prefix of '+n);
  const off=h[1][0]==='F'?'B':'F',o=applyAlg(at(1),[off]);assert.strictEqual(f2lDone(X,h,o),-1,'a move off the hint');
  assert.strictEqual(f2lDone(X,h,applyAlg(o,[off+"'"])),1,'and back: the longest prefix that still matches');
  const hh=['R','U2',"R'"],Y=applyAlg(X,['R','U']);assert.strictEqual(f2lDone(X,hh,Y),-1);assert.strictEqual(f2lPart(X,hh,Y),1,'one quarter of the U2');
  assert.strictEqual(f2lPart(X,hh,applyAlg(X,['R',"U'"])),1,'either way');assert.strictEqual(f2lPart(X,hh,applyAlg(X,['R','F'])),-1);}
// f2lAlong: off the hint but on another shortest solution, or on the hint with two opposite faces in
// the other order, gives that list and the moves made; off every one gives null.
{const X=new Cube(),h=['R',"L'",'U','F2'],sols=['R L\' U F2','F U F2 B'],J=x=>JSON.stringify(x); // the vm's arrays are not this realm's: compare as text
  assert.strictEqual(J(f2lAlong(X,h,sols,applyAlg(X,["L'"]))),J({moves:["L'",'R','U','F2'],n:1}),'the opposite faces in the other order');
  assert.strictEqual(J(f2lAlong(X,h,sols,applyAlg(X,["L'",'R','U']))),J({moves:["L'",'R','U','F2'],n:3}));
  assert.strictEqual(J(f2lAlong(X,h,sols,applyAlg(X,['F','U']))),J({moves:['F','U','F2','B'],n:2}),'another shortest solution');
  assert.strictEqual(J(f2lAlong(X,h,sols,applyAlg(X,['F','U',"F'"]))),J({moves:['F','U','F2','B'],n:2}),'one quarter of its half turn');
  assert.strictEqual(f2lAlong(X,h,sols,applyAlg(X,['D'])),null,'off every one');
  assert.strictEqual(f2lAlong(X,h,[],applyAlg(X,['R','U'])),null,'on the hint itself is not its job');}

// The slot words as held: yellow up, green toward you puts orange on the right and white below
{const held=applyAlg(new Cube(),['z2']);assert.strictEqual(held.center[0],3);assert.strictEqual(held.center[2],2);
  const w=f2lSlotWords(held);deq(w.FR,{pos:'front right',colors:['green','orange','white']});
  deq(w.BL,{pos:'back left',colors:['blue','red','white']});
  // and the engine frame: R as held turns the right face as held, so the FR pair of the reframed cube is the front right as held
  const X=reframe(applyAlg(held,["R","U","R'"]));assert.ok(!slotSolved(X,slot('FR'))&&slotSolved(X,slot('FL')),'R U R\' as held takes the front right pair out');
  const w0=f2lSlotWords(new Cube());deq(w0.FR.colors,['green','red','yellow'],'white up: green, red, yellow');}
console.log('lab-f2l ok');
