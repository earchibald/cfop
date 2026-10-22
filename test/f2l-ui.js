// The F2L Guide panel (js/f2l-ui.js): Guide is the default mode of the F2L tab; the player shows the
// scramble with the cross solved for you; the chips and the step card draw; the hint is a drill
// whose next move is a button; the Right arrow makes the next move (the player grows by one, the
// guide marks it made) and the Left arrow covers it again; a whole step solves its pair and the
// solved list grows; the tree offers the basic way with its case and the arc; a chip click sets the
// target; New scramble starts over; Return to scramble covers every move again and says the way back;
// Set up from current makes the cube as it is the scramble; a drill in the player pauses the guide.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
const w=dom.window;const d=w.document;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const solvedNow=()=>w.f2lStatus(w.fg.X,[]).solved;
const state=()=>{const f=w.fg,s=f.step;return JSON.stringify({step:s&&{slot:s.slot,moves:s.moves.join(' '),n:s.n,busy:s.busy,then:!!s.then,away:s.away,way:s.way},working:f.working,log:f.log.length,made:f.made.length,solved:f.X?solvedNow():null,src:f.src,key:f.key});};
async function until(f,what,n=200){for(let i=0;i<n;i++){if(f())return;await sleep(25);}throw new Error('timed out: '+what+' '+state());}
const tab=n=>$(`#rail button[data-tab="${n}"]`).click();
const moves=()=>$$('#scramble .m').map(e=>e.textContent);
const key=(k,el)=>(el||d.body).dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
const tiles=()=>$$('#fgCard .fg-tile .gm');
const made=()=>tiles().filter(t=>t.classList.contains('f2l-did')).length;
const settled=async()=>until(()=>w.fg.step&&w.fg.step.moves.length&&!w.fg.working&&!w.fg.step.busy&&w.fg.step.then,'a step with its ways');

w.addEventListener('load',async()=>{try{
  await sleep(100);
  // Guide is the default mode, with the scramble and the dashed solved part in the player.
  tab('f2l');
  assert.ok($('#f2lMode button[data-m="guide"]').classList.contains('on'),'Guide is the default mode');
  assert.ok(!$('#f2lGuide').classList.contains('hidden')&&$('#f2lLive').classList.contains('hidden'),'the Guide panel shows');
  // A scramble with no pair solved by chance, so four steps lie ahead.
  let seed,scr;
  for(let k=1;k<9;k++){$('#seed').value='guide-'+k;$('#reScramble').click();seed=$('#seed').value;scr=Array.from(w.scr.moves);
    await until(()=>moves().length>scr.length&&!$('#fgMain').hidden&&w.fg.X,'the guide reads the cube');
    if(solvedNow().length===0)break;}
  assert.strictEqual(solvedNow().length,0,'no pair solved at the start');
  assert.ok($('#seqLabel').textContent.includes('seed '+seed),'the player keeps the seed');
  assert.deepStrictEqual(moves().slice(0,scr.length),scr,'the scramble comes first');
  assert.ok($$('#scramble .m').slice(scr.length).every(e=>e.classList.contains('rot')),'the solved part is dashed');
  assert.ok(/the screen cube/.test($('#fgCube').textContent),'the cube line names the screen');
  assert.ok(/cross on the bottom: made/.test($('#fgCross').textContent),'the cross is made');
  assert.strictEqual($$('#fgChips .fg-chip').length,4,'four chips');
  await settled();
  assert.strictEqual($$('#fgChips .fg-chip[aria-current]').length,1,'one target');
  const s=w.fg.step,n0=s.moves.length;
  assert.ok(n0>0&&tiles().length===n0,'the hint has a tile per move');
  assert.ok(tiles()[0].classList.contains('f2l-first')&&tiles()[0].dataset.next,'the first move is in clear and is the next');
  assert.ok(tiles().slice(1).every(t=>t.classList.contains('sp-m')),'every other move is covered');
  assert.ok(!$('#fgCard').textContent.includes('Reveal'),'no Reveal');
  assert.ok($$('#fgCard .fg-tile small').length>=1&&/pair goes in/.test($('#fgCard').textContent),'the arc labels the moves');
  // The tree: a Shortest way in use, a Basic way with its case; the basic way is a hint too.
  const ways=$$('#fgTree button');
  assert.ok(ways.length>=2&&ways[0].dataset.use==='short'&&ways[0].getAttribute('aria-pressed')==='true','Shortest is in use');
  const basic=ways.find(b=>b.dataset.use==='basic');assert.ok(basic&&/case \d+/.test(basic.textContent),'the basic way names a case');
  click(basic);await until(()=>w.fg.step.way==='basic','the basic way in use');
  assert.ok(/As the book writes it/.test($('#fgCard').textContent)&&$('#fgCard button[data-case]'),'the book line and the case details');
  assert.ok(tiles().length===w.fg.step.moves.length&&tiles()[0].dataset.next,'the basic hint is a drill too');
  click($('#fgTree button[data-use="short"]'));await until(()=>w.fg.step.way==='short','back to the shortest');
  // The Right arrow makes the next move: the player grows by one and the move is marked made.
  const len0=moves().length,first=tiles()[0].textContent;
  key('ArrowRight');
  assert.strictEqual(moves().length,len0+1,'the player grows by one');assert.strictEqual(moves()[len0],first,'the move made');
  assert.strictEqual(made(),1,'one move made');assert.ok(tiles()[1].dataset.next&&tiles()[1].classList.contains('sp-m'),'the next is the second move');
  assert.ok(/1 made/.test($('#fgCard .cnt').textContent),'the count says 1 made');
  assert.ok(!$('#fgReturn').disabled,'Return to scramble is enabled');
  assert.ok($$('#fgTree button').every(b=>b.disabled),'the ways close once a move is made');
  // The Left arrow covers it again.
  key('ArrowLeft');
  assert.strictEqual(moves().length,len0,'the player shrinks');assert.strictEqual(made(),0,'nothing made');
  assert.ok($('#fgReturn').disabled,'Return to scramble is off at the scramble');
  // A click on the next tile makes it. The whole step solves its pair.
  click(tiles()[0]);assert.strictEqual(made(),1,'a click makes the move');
  const target=w.fg.step.slot;
  for(let i=0;i<20&&w.fg.step&&w.fg.step.slot===target;i++)key('ArrowRight');
  await until(()=>w.fg.log.length===1,'the pair goes on the solved list');
  assert.strictEqual(w.fg.log[0].slots[0],target);assert.ok(/Solved pairs/.test($('#fgDone').textContent)&&/shortest was/.test($('#fgDone').textContent),'the solved list shows');
  assert.ok($(`#fgChips .fg-chip[data-chip="${target}"]`).classList.contains('solved'),'the chip is solved');
  await settled();
  assert.notStrictEqual(w.fg.step.slot,target,'the next target');
  // A chip click sets the target.
  const other=$$('#fgChips .fg-chip').find(b=>!b.classList.contains('solved')&&!b.classList.contains('target'));
  if(other){click(other);await until(()=>w.fg.step&&w.fg.step.slot===other.dataset.chip&&w.fg.step.moves.length,'the clicked pair is the target');}
  // Return to scramble: every move covered again, the way back said.
  click($('#fgReturn'));
  assert.strictEqual(moves().length,len0,'the player is back at the scramble');assert.strictEqual(w.fg.made.length,0);
  assert.ok(/Back to the scramble/.test($('#fgCube').textContent)&&$('#fgCube code'),'the way back is said');
  assert.strictEqual(w.fg.log.length,0,'the solved list is empty again');
  // Then and the count.
  await settled();
  assert.ok(/of 4 pairs/.test($('#fgCount').textContent),'the count');
  // Mode and order.
  click($('#fgCorner'));assert.strictEqual($('#fgCorner').getAttribute('aria-pressed'),'true');
  await until(()=>w.fg.step&&w.fg.step.moves.length,'a step by corner');
  assert.strictEqual(w.fg.step.slot,w.fg.order.find(n=>!w.fg.done.includes(n)&&!solvedNow().includes(n)),'by corner: the first open in the order');
  click($('#fgOrderBtn'));assert.ok(!$('#fgOrder').hidden&&$$('#fgOrder .fg-ord').length===4,'the order row');
  const o0=w.fg.order.slice();click($(`#fgOrder button[data-ord="${o0[0]}"][data-dir="1"]`));assert.deepStrictEqual(Array.from(w.fg.order).slice(0,2),[o0[1],o0[0]],'a pair moves one place later');
  click($('#fgShortest'));
  // Set up from current: the cube as it is becomes the scramble, and the guide starts over there.
  await settled();key('ArrowRight');key('ArrowRight');
  const X=w.fg.X;click($('#fgSetup'));
  await until(()=>$('#seed').placeholder.startsWith('setup-'),'a setup scramble');
  await until(()=>w.fg.X&&!w.fg.made.length&&w.fg.key&&w.fg.key.endsWith($('#seed').placeholder),'the guide restarts');
  assert.ok(w.toFrame(w.scr.cube).equals(X),'the scramble gives the cube as it was');
  assert.ok(/your cube, read/.test($('#fgCube').textContent),'the cube line says a real cube');
  // N starts a new scramble; the guide follows it.
  key('n');await until(()=>$('#seed').value&&$('#seed').value!==seed,'a new seed');
  await until(()=>w.fg.X&&w.fg.key&&w.fg.key.endsWith($('#seed').value),'the guide reads the new scramble');
  // A drill from the OLL tab pauses the guide; Back to scramble resumes it.
  tab('ll');$('#llNext').click();tab('f2l');
  assert.ok(!$('#fgDrill').hidden&&/A drill is in the player/.test($('#fgCross').textContent)&&$('#fgMain').hidden,'the guide pauses for a drill');
  key('ArrowRight');assert.strictEqual(w.fg.made.length,0,'no move while a drill is in');
  $('#drillBack').click();await until(()=>!$('#fgMain').hidden,'the guide resumes');
  // The other modes still work.
  $('#f2lMode button[data-m="live"]').click();assert.ok($('#f2lGuide').classList.contains('hidden')&&!$('#f2lLive').classList.contains('hidden'),'Live mode');
  $('#f2lMode button[data-m="cases"]').click();assert.ok(!$('#f2lCaseGrid').closest('.panel').classList.contains('hidden'),'Cases mode');
  $('#f2lMode button[data-m="guide"]').click();await until(()=>!$('#fgMain').hidden,'Guide again');
  // Keys: the badges, and the Right arrow outside the guide still steps the player.
  await settled();assert.ok($('#fgNew .hk')&&$('#fgCard .fg-hk'),'key badges');
  tab('solve');const i0=w.seqState.idx;key('ArrowLeft');assert.strictEqual(w.seqState.idx,i0-1,'the arrows are the player\'s on another tab');
  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('f2l-ui: Guide mode, the drill, the arrows, the tree, the solved list, return and set up ok');process.exit(0);
}catch(e){console.error('f2l-ui: FAIL',e.message,errs);process.exit(1);}});
