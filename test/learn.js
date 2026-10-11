// Learn and Cheat sheet: the nine step cards, Continue, a lesson with triggers, cases and drills,
// the status button and Mark finished, the goal pictures, the cheat sheet, and the glossary links.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
const w=dom.window;const d=w.document;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const moves=()=>$$('#scramble .m').map(e=>e.textContent);
const drill=()=>!$('#drillNote').classList.contains('hidden');
const click=el=>{assert.ok(el,'nothing to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));};
const card=n=>$(`#tab-learn .bstep[data-n="${n}"]`);
const cont=()=>$('#lnContinue');
const stepName=nx=>nx.n===0?'Basics':'Step '+nx.n;

w.addEventListener('load',async()=>{try{
  await sleep(100);
  w.setMethod('beginner');
  assert.strictEqual(d.body.dataset.tab,'learn','the beginner home is Learn');
  assert.ok($('#tab-learn').classList.contains('on'),'the Learn tab is on');
  assert.strictEqual($$('#tab-learn .bstep').length,9,'nine step cards');
  assert.strictEqual(cont().textContent,'Start: Basics','Start names the basics');
  assert.ok(card(0).classList.contains('cur'),'the basics card is up next');
  assert.ok(/Left Trigger, Right Trigger/.test(card(3).textContent),'step 3 names its triggers');
  assert.ok(/Move Left, Move Right/.test(card(4).textContent),'step 4 names its moves');
  assert.strictEqual(card(5).querySelector('.tag').textContent,'unlearned');
  assert.ok(!d.body.dataset.lesson,'no lesson open');

  // A lesson: header, triggers, cases.
  click(card(3));
  assert.strictEqual($('#tab-learn h2').textContent,'The white corners','step 3 opens');
  assert.strictEqual(d.body.dataset.lesson,'1','the lesson flag is set');
  assert.ok(/Step 3 of 8/.test($('#tab-learn .ln-of').textContent));
  assert.strictEqual($$('#tab-learn .ln-trigs .ln-box').length,2,'two trigger boxes');
  assert.strictEqual($$('#tab-learn .ln-case').length,4,'four cases');
  assert.strictEqual($$('#tab-learn .ln-case button[data-ln="case"]').length,4,'each case has Show');

  // Show on the cube: the Right Trigger, as a drill, from the start.
  click($('#tab-learn button[data-ln="trig"][data-id="right"]'));
  assert.deepStrictEqual(moves(),['R','U',"R'"],'three moves in the player');
  assert.ok(drill(),'the drill note shows');
  assert.strictEqual($('#scrubPos').textContent,'0 / 3','the player starts at the first move');
  assert.ok(/Right Trigger/.test($('#seqLabel').textContent));
  // The drill starts from a solved cube with the trigger undone: the moves end solved.
  const end=w.cubeAtSeq(3).toFacelets(),held=w.lnHeld().toFacelets();assert.deepStrictEqual(end,held,'the trigger ends on the solved cube');
  // Why it works opens and closes.
  click($('#tab-learn button[data-ln="why"][data-id="right"]'));assert.ok($('#tab-learn .ln-why'),'Why it works opens');
  click($('#tab-learn button[data-ln="why"][data-id="right"]'));assert.ok(!$('#tab-learn .ln-why'),'Why it works closes');
  // A case: Show loads its moves.
  click($('#tab-learn button[data-ln="case"][data-i="0"]'));assert.deepStrictEqual(moves(),["L'","U'",'L'],'the first case loads its moves');assert.ok(drill());
  // Show the goal: no moves, the goal cube.
  click($('#tab-learn button[data-ln="goal"]'));assert.strictEqual(moves().length,0,'the goal has no moves');assert.ok(drill());
  $('#drillBack').click();assert.ok(!drill(),'Back to scramble');

  // The status button cycles; the lesson and the list follow.
  click($('#tab-learn .stbtn'));assert.strictEqual($('#tab-learn .stbtn').textContent,'learning');
  click($('#tab-learn .stbtn'));assert.strictEqual($('#tab-learn .stbtn').textContent,'finished','two taps: finished');
  assert.ok($('#lnMark').disabled,'Mark finished is off for a finished step');
  assert.strictEqual($('#tab-learn h2').textContent,'The white corners','the lesson stays open');
  click($('#tab-learn button[data-ln="list"]'));
  assert.ok(!d.body.dataset.lesson,'the list clears the lesson flag');
  assert.strictEqual(card(3).querySelector('.tag').textContent,'finished','the card chip follows');
  let nx=w.begProgress.next();assert.strictEqual(nx.n,0,'the basics are still next');
  assert.strictEqual(cont().textContent,'Continue: '+stepName(nx),'Continue names the next step');

  // Mark finished on the basics: the next step moves on.
  click(cont());assert.strictEqual($('#tab-learn h2').textContent,'Get to know your cube','Continue opens the basics');
  assert.ok($('#tab-learn button[data-ln="moves"]'),'the basics show the six moves');
  click($('#lnMark'));assert.strictEqual(w.begProgress.status(0),'finished','Mark finished sets the status');
  assert.strictEqual($('#tab-learn .stbtn').textContent,'finished','the lesson button follows');
  click($('#tab-learn button[data-ln="list"]'));nx=w.begProgress.next();
  assert.strictEqual(nx.n,1);assert.strictEqual(cont().textContent,'Continue: Step 1');assert.ok(card(1).classList.contains('cur'));

  // The goal pictures come from a real solve: each step's goal holds.
  const g=w.lnGoals().map(c=>c.toFacelets());
  const D=[27,28,29,30,31,32,33,34,35];
  assert.ok([1,3,5,7].every(i=>g[1][i]===0),'step 1: a daisy of white edges on top');
  assert.ok([28,30,31,32,34].every(i=>g[2][i]===0),'step 2: a white cross on the bottom');
  assert.ok(D.every(i=>g[3][i]===0),'step 3: the white face is complete');
  assert.ok([1,2,4,5].every(f=>[3,4,5,6,7,8].every(p=>g[4][9*f+p]===g[4][9*f+4])),'step 4: two layers solved');
  assert.ok([1,3,4,5,7].every(i=>g[5][i]===3),'step 5: a yellow cross');
  assert.ok([0,1,2,3,4,5,6,7,8].every(i=>g[6][i]===3),'step 6: a yellow face');
  assert.ok(g.every(f=>f[22]===2&&f[4]===3),'every goal is held yellow up, green in front');

  // openLesson: an algorithm step.
  w.goTab('practice');w.openLesson(5);
  assert.strictEqual(d.body.dataset.tab,'learn','openLesson goes to Learn');
  assert.strictEqual($('#tab-learn h2').textContent,'The yellow cross');
  click($('#tab-learn button[data-ln="alg"][data-id="yellowCross"]'));
  assert.deepStrictEqual(moves(),['F','R','U',"R'","U'","F'"],'the algorithm loads');assert.ok(drill());

  // The glossary links "daisy" in the lesson text.
  w.openLesson(2);await sleep(150);
  assert.ok($('#tab-learn .gl[data-gl="daisy"]'),'daisy is a glossary link');
  assert.ok(!$('#tab-learn button .gl, #tab-learn .m .gl, #tab-learn h2 .gl, #tab-learn .tag .gl'),'no link inside a control or a move');

  // The cheat sheet: eight steps, Show loads an algorithm.
  w.goTab('cheat');assert.ok($('#tab-cheat').classList.contains('on'));
  assert.strictEqual($$('#tab-cheat .ln-cs-step').length,8,'eight step panels');
  click($('#tab-cheat button[data-cs="alg"][data-id="edgeCycle"]'));
  assert.strictEqual(moves().length,9,'the yellow edges algorithm loads');assert.ok(drill());
  assert.deepStrictEqual(w.cubeAtSeq(9).toFacelets(),w.lnHeld().toFacelets(),'it ends on the solved cube');

  // Show me CFOP switches the method.
  w.goTab('learn');assert.ok(!$('#tab-learn button[data-ln="list"]'),'the Learn rail button returns to the step list');click($('#tab-learn button[data-ln="cfop"]'));
  assert.strictEqual(d.body.dataset.method,'cfop','Show me CFOP switches');

  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('learn: step list, lessons, drills, status, goals, cheat sheet, glossary ok');process.exit(0);
}catch(e){console.error('learn: FAIL',e.message,errs);process.exit(1);}});
