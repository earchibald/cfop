// Solve my cube: the entry cards start the guided solve, the guide stops on a hold screen before
// the first move (yellow on top, green facing you, the real cube in the player), steps part by part through the beginner
// plan with the hold on every part, a stage bar and the whole plan, it ends with "You did it", and
// a new scramble from the seed bar restarts it at part 1.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
const w=dom.window;const d=w.document;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const label=()=>$('#seqLabel').textContent;
const where=()=>$('#gdWhere').textContent;
const G=()=>w.eval('guideState');
const entry=()=>$$('#tab-bsolve .st-card').length===2&&!!$('#gdStart');
const turn=()=>!!$('#gdTurn');
const guide=()=>!!$('#gdBar')&&!!$('#gdDone');

w.addEventListener('load',async()=>{try{
  await sleep(100);
  w.setMethod('beginner');w.goTab('bsolve');
  assert.ok($('#tab-bsolve').classList.contains('on'),'Solve my cube is the current tab');
  w.newScramble('guide-test-one');

  // The entry view: two cards for a regular cube (mix it up with me; scan or paint) and the current scramble.
  assert.ok(entry(),'entry view shows the two cards');
  assert.ok($('#tab-bsolve .st-card .primary[data-beg="mix"]'),'Mix it up with me is offered');
  assert.ok($('#tab-bsolve .st-card .primary[data-beg="scan"]'),'Scan it with the camera is offered');
  assert.ok(!$('#tab-bsolve .st-flipnote')&&!/white on top/i.test($('#tab-bsolve').textContent),'no turn-over note, no white on top');
  assert.ok(!$('#tab-bsolve .beg-hold'),'no white-up hold picture');
  assert.ok($('#gdSeed').textContent.includes('guide-test-one'),'entry names the current scramble');
  assert.strictEqual(d.body.dataset.begview,'home','no player on the entry view');

  // Start with this scramble: the hold screen first. One line: yellow on top, green facing you.
  $('#gdStart').click();
  assert.ok(turn(),'the guide opens on the hold screen');assert.strictEqual(G().i,0,'it is entry 1');
  assert.ok(G().parts[0].turn&&G().parts[0].from==='white'&&G().parts[0].to==='yellow','white on top to yellow on top');
  assert.strictEqual($('#gdTitle').textContent.replace(/\s+/g,' ').trim(),'Now, hold the cube with the YELLOW CENTER on top and the GREEN CENTER facing you.','the hold in one line');
  assert.ok(!/white on top|z2|basics/i.test($('#gdTurn').textContent),'no white on top, no z2, no basics');
  assert.ok(!$('#gdShow')&&!$('#gdTurnCube'),'no turn picture and no Show me the turn again');
  assert.strictEqual($$('#gdBar .stage').length,8,'stage bar of eight');
  assert.strictEqual(d.body.dataset.begview,'player','the player shows the cube');
  assert.strictEqual(d.body.dataset.gd,'hold','the cube beside the hold');
  assert.strictEqual(w.eval('seqState.moves.length'),0,'no moves to step');
  assert.strictEqual(w.cubeAtSeq(0).toFacelets()[4],3,'the player shows the real cube yellow on top');
  assert.strictEqual(JSON.stringify(w.cubeAtSeq(0).toFacelets()),JSON.stringify(w.applyAlg(w.scr.cube,['z2']).toFacelets()),'the real scramble, held so');
  assert.strictEqual(G().parts[0].before.toFacelets()[4],0,'before the hold the top center is white');
  assert.strictEqual(G().parts[0].after.toFacelets()[4],3,'after it the top center is yellow');
  assert.ok(/Start stage 1: the daisy/.test($('#gdDone').textContent),'the button starts the daisy');

  // Yellow is on top: part 1, already turned over, with no z2 in it.
  $('#gdDone').click();
  assert.ok(guide()&&!turn(),'part 1 shows');assert.strictEqual(G().i,1);
  assert.strictEqual(d.body.dataset.begview,'player','the part shows the player');
  assert.strictEqual(d.body.dataset.gd,'part','the cube beside the part');
  assert.ok($('#tab-bsolve .gd-row2 .gd-key')&&$('#tab-bsolve .gd-row2 #gdNext'),'the key and Coming up in one row');
  const first=G().parts[1];
  assert.ok(label().includes('stage '+first.stage.n),'the player label names the stage');
  assert.strictEqual(w.eval('seqState.idx'),0,'the player sits before the part');
  assert.ok(!w.eval('seqState.drill'),'the guide is not a drill');
  assert.ok($('#gdTitle').textContent.trim().length>0,'the part has a title');
  assert.ok($$('#tab-bsolve .gd-moves .m').length>=1,'at least one move tile');
  assert.ok(!$$('#tab-bsolve .gd-moves .m').some(m=>m.textContent==='z2'),'no z2 in the part');
  // A tile is a step: a click shows the cube after it, and the player lights it.
  const tiles=$$('#tab-bsolve .gd-moves .m[data-k]');assert.strictEqual(tiles.length,first.seq.length,'a tile per move');
  assert.ok(tiles.some(t=>/\bfc c\d\b/.test(t.className)),'the tiles carry face colors');
  tiles[0].click();assert.strictEqual(w.eval('seqState.idx'),1,'a tile click steps to it');
  assert.ok(tiles[0].classList.contains('cur'),'the tile is lit');
  w.eval('seqGo(0)');assert.ok(!tiles[0].classList.contains('cur'),'the light follows the player');
  assert.ok(!w.eval('seqState.moves').includes('z2'),'nor in the player');
  assert.strictEqual(w.cubeAtSeq(0).toFacelets()[4],3,'the part starts yellow up');
  assert.ok(/Yellow on top/.test($('#tab-bsolve .gd-part .gd-hold').textContent),'the hold on the part');
  // A daisy part: two lines. The hold, then one line names the moves above the tiles.
  const li=$$('#tab-bsolve .gd-steps > li');assert.strictEqual(li.length,2,'a daisy part has two lines');
  assert.ok(/Hold the cube/.test(li[0].textContent),'the hold line');
  assert.ok(/^(Flip|Turn) .*the \w+-white edge .*\(.+\)\./.test(li[1].textContent),'the second line names the edge and its moves');
  assert.ok(li[1].querySelector('.gd-moves'),'the tiles sit under the second line');
  // A part in a later stage has the same two lines.
  const later=G().parts.findIndex(x=>x.stage.n>4&&!x.turn);
  w.eval(`guideState.i=${later};gdRender()`);
  const li2=$$('#tab-bsolve .gd-steps > li');assert.strictEqual(li2.length,2,'a later part has two lines');
  assert.ok(/\(.+\)\./.test(li2[1].textContent)&&li2[1].querySelector('.gd-moves'),'its second line names the moves above the tiles');
  // The white corners are done white on top: a hold screen before them, and one after.
  const turns=G().parts.filter(x=>x.turn).map(x=>x.to);
  assert.strictEqual(JSON.stringify(turns),'["yellow","white","yellow"]','three holds: yellow, white for the corners, yellow again');
  w.eval(`guideState.i=${G().parts.findIndex((x,i)=>i>0&&x.turn)};gdRender()`);
  assert.ok(turn()&&/hold the cube with the WHITE CENTER on top/.test($('#gdTitle').textContent),'the corners hold says white on top');
  w.eval('guideState.i=1;gdRender();gdLoadPart(true)');
  assert.deepStrictEqual(w.cubeAtSeq(w.seqState.moves.length).toFacelets(),first.after.toFacelets(),'the part ends on its after cube');
  assert.ok($$('#scramble .mt small').length>=1,'beginner tiles carry captions');
  assert.ok(/^Stage \d of 8 · .+ · part 1 of \d+$/.test(where()),'the this-solve line: '+where());
  assert.ok(/\d+ moves done, about \d+ to go\./.test($('#gdCount').textContent),'moves done and to go');
  if(w.eval("typeof openLesson==='function'"))assert.ok($('#gdLesson'),'Open the lesson shows when Learn is built');

  // Done advances the part. Previous goes back.
  const w0=where();$('#gdDone').click();
  assert.strictEqual(G().i,2,'Done moves to the next part');assert.notStrictEqual(where(),w0,'Done advances the part line');
  assert.ok(label().includes('stage '+G().parts[2].stage.n),'the player follows the part');
  $('#gdPrev').click();assert.strictEqual(G().i,1,'Previous goes back');assert.strictEqual(where(),w0);

  // Show me plays the part in the player.
  $('#gdShow').click();assert.ok(w.eval('auto.timer')>0,'Show me plays the moves');w.stopAuto();
  assert.ok(label().includes('stage '+first.stage.n));

  // The whole plan: every stage as a heading, the current part marked, a row jumps to its part.
  $('#gdPlanBtn').click();
  assert.ok($$('#gdPlan .gd-ph').length>=8,'the whole plan lists eight stage headings');
  assert.ok($('#gdPlan .gd-prow.cur'),'the current part is marked');
  $$('#gdPlan .gd-prow')[3].click();assert.strictEqual(G().i,4,'a plan row jumps to its part, past the hold screen');assert.ok(!G().parts[4].turn);
  $('#gdPlanBtn').click();assert.ok(!$('#gdPlan'),'the plan closes');
  // A click on a done stage jumps to its first part.
  $('#gdBar .stage.cur').click();assert.strictEqual(G().i,4,'the current stage does not jump');

  // Done to the end: You did it, one solve counted.
  const solves0=w.eval('begProgress.data().solves');
  for(let k=0;k<80&&!$('#gdWin');k++)$('#gdDone').click();
  assert.ok($('#gdWin'),'Done to the end reaches You did it');
  assert.ok(/You did it/.test($('#gdWin').textContent)&&/Your cube is solved\./.test($('#gdWin').textContent));
  assert.strictEqual(w.eval('begProgress.data().solves'),solves0+1,'one solve counted');
  assert.strictEqual(w.eval('begProgress.data().solves'),1,'begProgress.data().solves is 1');
  assert.ok(w.eval('displayedCube.isSolvedAny()'),'the player shows the solved cube');
  assert.strictEqual($$('#gdBar .stage.done').length,8,'every stage is done');
  $('#gdBar .stage.done').click();assert.ok((guide()||turn())&&G().i===0,'a done stage jumps back into the guide');
  for(let k=0;k<80&&!$('#gdWin');k++)$('#gdDone').click();
  assert.strictEqual(w.eval('begProgress.data().solves'),1,'a solve counts once');

  // Solve again returns to the entry view.
  $('#gdAgain').click();assert.ok(entry(),'Solve again returns to the entry view');
  assert.ok(label().includes('your cube'),'the player holds the user\'s cube again');assert.strictEqual(d.body.dataset.begview,'home','and the entry view, with no player');

  // The virtual cube: one card mixes it up, and the guide starts on the hold screen.
  const src0=w.cubeSrc;w.cubeSrc=()=>'screen';w.gdRender(); // this file:// page cannot store a choice
  assert.ok(/virtual cube/.test($('#tab-bsolve .gd-entry').textContent)&&!$('#tab-bsolve [data-beg="scan"]'),'the virtual cube has its own card');
  const s0=w.eval('scr.seed');$('#tab-bsolve [data-beg="screen"]').click();
  assert.notStrictEqual(w.eval('scr.seed'),s0,'Mix it up and solve it changes the seed');
  assert.ok(turn(),'it starts the guide on the hold screen');assert.strictEqual(G().i,0);
  $('#gdDone').click();assert.ok(!$$('#scramble .m').some(m=>m.textContent==='z2'),'the part after has no turn-over');assert.strictEqual(G().i,1);
  assert.strictEqual(w.cubeAtSeq(0).toFacelets()[4],3,'it starts yellow up');
  w.cubeSrc=src0;

  // A seed-bar New while the guide shows restarts it at stage 1, part 1.
  $('#gdDone').click();$('#gdDone').click();assert.strictEqual(G().i,3);
  const s1=w.eval('scr.seed');$('#newSeed').click();
  assert.notStrictEqual(w.eval('scr.seed'),s1,'New changes the seed');
  assert.ok(turn(),'the guide still shows, at the hold screen');assert.strictEqual(G().i,0,'New restarts at the start');
  $('#gdDone').click();
  const n1=G().parts[1].stage.n; // stage 1, unless the daisy is already made on this cube
  assert.ok(new RegExp('^Stage '+n1+' of 8 · .+ · part 1 of \\d+$').test(where()),'New restarts at stage 1 part 1: '+where());
  assert.ok(label().includes('stage '+n1),'the player shows stage 1');

  // My cube looks different returns to the entry view. A cube loaded from another tab that then
  // opens this tab (as scrambleFromCube does) starts the guide.
  $('#gdDiff').click();assert.ok(entry(),'My cube looks different returns to the entry view');
  w.goTab('learn');
  w.eval(`loadScramble('guide-test-two',parseAlg("R U F' L2 D B R' U2 F L"),true);goTab('bsolve');`);
  assert.ok(turn(),'a cube loaded from another tab starts the guide');assert.strictEqual(G().i,0);
  assert.strictEqual(d.body.dataset.begview,'player','the player shows the cube held for the hold screen');
  // Re-entering the tab shows the current part again.
  $('#gdDone').click();w.goTab('learn');w.goTab('bsolve');
  assert.ok(label().includes(G().parts[1].part.title),'re-entering the tab shows the current part');
  // startGuide from elsewhere.
  w.goTab('learn');w.startGuide();assert.ok($('#tab-bsolve').classList.contains('on')&&turn()&&G().i===0,'startGuide opens the guide at the start');

  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('guide: entry cards, the hold screens (the real cube in the player), the hold, the tiles as steps, the key row, start, stage bar, Done/Previous/Show me, the whole plan, You did it, Solve again, Scramble one, New restarts ok');
  process.exit(0);
}catch(e){console.error('guide: FAIL',e.message,errs);process.exit(1);}});
