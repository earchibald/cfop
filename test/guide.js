// Solve my cube: the entry cards start the guided solve, the guide steps part by part through the
// beginner plan with a stage bar and the whole plan, it ends with "You did it", and a new scramble
// from the seed bar restarts it at part 1.
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
const entry=()=>$$('#tab-bsolve .bcards > .panel').length===3&&!!$('#gdStart');
const guide=()=>!!$('#gdBar')&&!!$('#gdDone');

w.addEventListener('load',async()=>{try{
  await sleep(100);
  w.setMethod('beginner');w.goTab('bsolve');
  assert.ok($('#tab-bsolve').classList.contains('on'),'Solve my cube is the current tab');
  w.newScramble('guide-test-one');

  // The entry view: three cards, scan picked, and the current scramble.
  assert.ok(entry(),'entry view shows three cards');
  assert.ok($('#tab-bsolve .bcards .panel.pick #gdScan'),'Scan with the camera is picked');
  assert.ok($('#gdSeed').textContent.includes('guide-test-one'),'entry names the current scramble');

  // Start with this scramble: the guide at part 1, with the stage bar and the part in the player.
  $('#gdStart').click();
  assert.ok(guide(),'guide view shows');assert.strictEqual(G().i,0,'starts at part 1');
  assert.strictEqual($$('#gdBar .stage').length,8,'stage bar of eight');
  assert.ok($('#gdBar .stage.cur'),'a current stage');
  const first=G().parts[0];
  assert.ok(label().includes('stage '+first.stage.n),'the player label names the stage');
  assert.strictEqual(w.eval('seqState.idx'),0,'the player sits before the part');
  assert.ok(!w.eval('seqState.drill'),'the guide is not a drill');
  assert.ok($('#gdTitle').textContent.trim().length>0,'the part has a title');
  assert.ok($$('#tab-bsolve .gd-moves .m').length>=1,'at least one move tile');
  assert.ok(/^Stage \d of 8 · .+ · part 1 of \d+$/.test(where()),'the this-solve line: '+where());
  assert.ok(/\d+ moves done, about \d+ to go\./.test($('#gdCount').textContent),'moves done and to go');
  assert.ok($('#gdPrev').disabled,'no previous part at part 1');
  if(w.eval("typeof openLesson==='function'"))assert.ok($('#gdLesson'),'Open the lesson shows when Learn is built');

  // Done advances the part. Previous goes back.
  const w0=where();$('#gdDone').click();
  assert.strictEqual(G().i,1,'Done moves to part 2');assert.notStrictEqual(where(),w0,'Done advances the part line');
  assert.ok(label().includes('stage '+G().parts[1].stage.n),'the player follows the part');
  $('#gdPrev').click();assert.strictEqual(G().i,0,'Previous goes back');assert.strictEqual(where(),w0);

  // Show me plays the part in the player.
  $('#gdShow').click();assert.ok(w.eval('auto.timer')>0,'Show me plays the moves');w.stopAuto();
  assert.ok(label().includes('stage '+first.stage.n));

  // The whole plan: every stage as a heading, the current part marked, a row jumps to its part.
  $('#gdPlanBtn').click();
  assert.ok($$('#gdPlan .gd-ph').length>=8,'the whole plan lists eight stage headings');
  assert.ok($('#gdPlan .gd-prow.cur'),'the current part is marked');
  $$('#gdPlan .gd-prow')[3].click();assert.strictEqual(G().i,3,'a plan row jumps to its part');
  $('#gdPlanBtn').click();assert.ok(!$('#gdPlan'),'the plan closes');
  // A click on a done stage jumps to its first part.
  $('#gdBar .stage.cur').click();assert.strictEqual(G().i,3,'the current stage does not jump');

  // Done to the end: You did it, one solve counted.
  const solves0=w.eval('begProgress.data().solves');
  for(let k=0;k<80&&!$('#gdWin');k++)$('#gdDone').click();
  assert.ok($('#gdWin'),'Done to the end reaches You did it');
  assert.ok(/You did it/.test($('#gdWin').textContent)&&/Your cube is solved\./.test($('#gdWin').textContent));
  assert.strictEqual(w.eval('begProgress.data().solves'),solves0+1,'one solve counted');
  assert.strictEqual(w.eval('begProgress.data().solves'),1,'begProgress.data().solves is 1');
  assert.ok(w.eval('displayedCube.isSolvedAny()'),'the player shows the solved cube');
  assert.strictEqual($$('#gdBar .stage.done').length,8,'every stage is done');
  $('#gdBar .stage.done').click();assert.ok(guide()&&G().i===0,'a done stage jumps back into the guide');
  for(let k=0;k<80&&!$('#gdWin');k++)$('#gdDone').click();
  assert.strictEqual(w.eval('begProgress.data().solves'),1,'a solve counts once');

  // Solve again returns to the entry view.
  $('#gdAgain').click();assert.ok(entry(),'Solve again returns to the entry view');
  assert.ok(label().includes('scramble'),'the player shows the scramble');

  // Scramble one for me: a new seed and the guide at part 1.
  const s0=w.eval('scr.seed');$('#gdRandom').click();
  assert.notStrictEqual(w.eval('scr.seed'),s0,'Scramble one for me changes the seed');
  assert.ok(guide(),'Scramble one for me starts the guide');assert.strictEqual(G().i,0);

  // A seed-bar New while the guide shows restarts it at stage 1, part 1.
  $('#gdDone').click();$('#gdDone').click();$('#gdDone').click();assert.strictEqual(G().i,3);
  const s1=w.eval('scr.seed');$('#newSeed').click();
  assert.notStrictEqual(w.eval('scr.seed'),s1,'New changes the seed');
  assert.ok(guide(),'the guide still shows');assert.strictEqual(G().i,0,'New restarts at part 1');
  const n1=G().parts[0].stage.n; // stage 1, unless the daisy is already made on this cube
  assert.ok(new RegExp('^Stage '+n1+' of 8 · .+ · part 1 of \\d+$').test(where()),'New restarts at stage 1 part 1: '+where());
  assert.ok(label().includes('stage '+n1),'the player shows stage 1');

  // My cube looks different returns to the entry view. A cube loaded from another tab that then
  // opens this tab (as scrambleFromCube does) starts the guide.
  $('#gdDiff').click();assert.ok(entry(),'My cube looks different returns to the entry view');
  w.goTab('learn');
  w.eval(`loadScramble('guide-test-two',parseAlg("R U F' L2 D B R' U2 F L"),true);goTab('bsolve');`);
  assert.ok(guide(),'a cube loaded from another tab starts the guide');assert.strictEqual(G().i,0);
  assert.ok(label().includes('stage'),'the player shows the part');
  // Re-entering the tab shows the current part again.
  $('#gdDone').click();w.goTab('learn');w.goTab('bsolve');
  assert.ok(label().includes(G().parts[1].part.title),'re-entering the tab shows the current part');
  // startGuide from elsewhere.
  w.goTab('learn');w.startGuide();assert.ok($('#tab-bsolve').classList.contains('on')&&guide()&&G().i===0,'startGuide opens the guide at part 1');

  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('guide: entry cards, start, stage bar, Done/Previous/Show me, the whole plan, You did it, Solve again, Scramble one, New restarts ok');
  process.exit(0);
}catch(e){console.error('guide: FAIL',e.message,errs);process.exit(1);}});
