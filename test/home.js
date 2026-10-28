// The beginner home on Learn (Up next with the goal, the cube line, the steps), Mix it up with me on
// Solve my cube, the letters view, the player dress (captions, the Key panel, Back to my cube), and
// the three views home / mix / player.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
const w=dom.window;const d=w.document;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const click=el=>{assert.ok(el,'nothing to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));};
const view=()=>d.body.dataset.begview;
const label=()=>$('#seqLabel').textContent;
const moves=()=>$$('#scramble .m').map(e=>e.textContent);
const caps=()=>$$('#scramble .mt small').map(e=>e.textContent);
const mixTitle=()=>$('#begMixTitle')&&$('#begMixTitle').textContent;
const G=()=>w.eval('guideState');
const faceWord={U:'top',D:'bottom',F:'front',B:'back',R:'right',L:'left'};

w.addEventListener('load',async()=>{try{
  await sleep(100);
  // CFOP: no captions.
  assert.ok(!$$('#scramble .mt').length,'CFOP tiles carry no captions');
  assert.ok(!$('#begHome')&&!$('#begAsk'),'the old home is gone');

  w.setMethod('beginner');
  assert.strictEqual(d.body.dataset.tab,'learn');
  assert.strictEqual(view(),'home','the home: no player');
  assert.ok(!/z2/.test(label()),'no hidden z2');
  // The Learn home: Up next with the goal picture, the cube line, the two ways on, the steps.
  assert.ok(/Up next · Basics/.test($('#tab-learn .lh-next').textContent));
  assert.strictEqual($('#begNextTitle').textContent,'Get to know your cube');
  assert.ok(/No cube needed yet/.test($('#begNextText').textContent));
  assert.ok($('#tab-learn .lh-pic svg polygon'),'the goal on a picture');
  assert.ok(/Regular cube/.test($('#begCubeLine').textContent)&&$('#begCubeChange'),'the cube line with Change');
  assert.strictEqual($('#begContinue').textContent,'Start the basics →');
  assert.ok($('#tab-learn [data-ln="solve"]:not(#begContinue)'),'Solve my cube with help');
  assert.strictEqual($$('#tab-learn .lh-step').length,9,'the nine steps beside it');
  assert.ok(/0 of 9 learned/.test($('#tab-learn .lh-steps').textContent));
  assert.ok($$('#tab-learn .lh-step')[0].classList.contains('cur'),'the next step is marked');
  assert.ok(/Not started/.test($$('#tab-learn .lh-step')[1].textContent));
  // No baggage: no cube question, no white-up hold picture, no letters link on the home.
  assert.ok(!/What does your cube look like/.test(d.body.textContent),'no cube question');
  assert.ok(!$('[data-beg="letters"]')&&!$('.beg-hold'),'no letters link, no hold picture');
  // Start opens the lesson; the list comes back.
  click($('#begContinue'));
  assert.strictEqual(d.body.dataset.lesson,'1','Start opens the basics lesson');
  assert.strictEqual($('#tab-learn h2').textContent,'Get to know your cube');
  click($('#tab-learn button[data-ln="list"]'));assert.ok(!d.body.dataset.lesson);
  // A step in the list opens its lesson.
  click($$('#tab-learn .lh-step')[4]);assert.strictEqual(d.body.dataset.lesson,'1');assert.ok(/middle layer/i.test($('#tab-learn h2').textContent));
  click($('#tab-learn button[data-ln="list"]'));
  // Solve my cube with help goes to the tab.
  click($('#tab-learn [data-ln="solve"]:not(#begContinue)'));assert.strictEqual(d.body.dataset.tab,'bsolve');w.goTab('learn');

  // The letters view (from the player or a mix-up): the scramble white up, the seed bar, a way back.
  w.showBegLetters();
  assert.strictEqual(view(),'player','letters shows the player');
  assert.ok(d.body.hasAttribute('data-begletters'),'the seed bar is on in the letters view');
  assert.strictEqual(moves().join(' '),w.scr.moves.join(' '),'the player holds the scramble moves, nothing more');
  assert.ok(/white on top/.test(label()));
  assert.strictEqual(w.cubeAtSeq(0).toFacelets()[4],0,'the cube starts white up');
  assert.strictEqual(caps().length,moves().length,'a caption under every tile');
  moves().forEach((m,i)=>assert.strictEqual(caps()[i],faceWord[m[0]]+' '+(m.length===1?'↻':m[1]==="'"?'↺':'×2'),'caption for '+m));
  assert.ok(/Your cube as letters/.test($('#begBar').textContent),'the bar names the view');
  $('#newSeed').click();assert.strictEqual(view(),'player','New keeps the letters view');assert.ok(d.body.hasAttribute('data-begletters'));
  click($('#begBack'));
  assert.strictEqual(view(),'home','Back to my cube returns to the home');
  assert.ok(!d.body.hasAttribute('data-begletters'));assert.ok($('#begBar').classList.contains('hidden'));

  // The Key panel: on by default for a beginner, toggles, hides the progress panel while open.
  assert.ok(d.body.hasAttribute('data-key'),'the Key is open by default');
  assert.strictEqual($('#keyBtn').getAttribute('aria-expanded'),'true');
  assert.ok(/counterclockwise/.test($('#keyPanel').textContent));
  $('#keyBtn').click();assert.ok(!d.body.hasAttribute('data-key'),'Key closes');
  $('#keyBtn').click();assert.ok(d.body.hasAttribute('data-key'));
  $('#keyLesson').click();assert.strictEqual($('#tab-learn h2').textContent,'Get to know your cube','the Key opens the basics');
  click($('#tab-learn button[data-ln="list"]'));

  // A lesson's Show: the player with a drill, the bar says Back to my cube.
  w.openLesson(3);click($('#tab-learn button[data-ln="alg"][data-id="cornerRight"]'));
  assert.strictEqual(view(),'player');assert.strictEqual(moves().join(' '),"D' R' D R");
  assert.strictEqual(caps().join(','),'bottom ↺,right ↺,bottom ↻,right ↻','captions in words');
  assert.ok(/Lesson: Corner in, right/.test($('#begBar').textContent)&&/Your own cube is kept/.test($('#begBar').textContent),'the bar names the drill');
  assert.ok(!d.body.hasAttribute('data-begletters'),'no seed bar for a drill');
  click($('#begBack'));assert.strictEqual(view(),'home','Back to my cube ends the drill');assert.ok(!w.seqState.drill);
  click($('#tab-learn button[data-ln="list"]'));

  // Mix it up with me, on Solve my cube: a new scramble, one turn at a time, in words.
  await sleep(5);w.goTab('bsolve');const seed0=w.scr.seed; // a New on another tab opens the guide only in the same tick
  click($('#tab-bsolve [data-beg="mix"]'));
  assert.strictEqual(view(),'mix','the walkthrough');assert.strictEqual(d.body.dataset.tab,'bsolve');
  assert.ok($('#tab-bsolve #begMix')&&!$('#tab-bsolve .st-card'),'the walkthrough takes the place of the cards');
  assert.notStrictEqual(w.scr.seed,seed0,'a fresh mix-up');
  const ms=w.begMix.moves;assert.strictEqual(ms.join(' '),w.scr.moves.join(' '),'the walkthrough follows the scramble');
  const n=ms.length;assert.ok(n>=20);
  assert.ok(new RegExp('turn 1 of '+n).test($('#begMix').textContent));
  assert.ok(/white on top, green toward you/.test($('#begMix').textContent),'it names the hold');
  assert.strictEqual(mixTitle(),`Turn the ${faceWord[ms[0][0]]} face`+(ms[0].endsWith('2')?' twice':ms[0].endsWith("'")?' the other way':''));
  assert.ok($('#begMix .beg-tile').textContent===ms[0]);
  assert.ok($('#begMixCube polyline'),'an arrow on the picture');
  assert.ok($$('#begMixCube polygon[opacity]').length>0,'the other faces are dim');
  assert.ok($('#begMix [data-beg="mixBack"]').disabled,'no Back at turn 1');
  click($('#begMix [data-beg="mixNext"]'));await sleep(600);
  assert.strictEqual(w.begMix.i,1);assert.ok(new RegExp('turn 2 of '+n).test($('#begMix').textContent));
  assert.strictEqual(JSON.stringify(w.begMixCubeAt(1).toFacelets()),JSON.stringify(w.applyAlg(w.begMixCubeAt(0),[ms[0]]).toFacelets()),'turn 1 applied');
  click($('#begMix [data-beg="mixBack"]'));assert.strictEqual(w.begMix.i,0,'Back goes back a turn');
  // Letters from the walkthrough, and back into it.
  click($('#begMix [data-beg="letters"]'));assert.strictEqual(view(),'player');assert.strictEqual(moves().join(' '),ms.join(' '));
  click($('#begBack'));assert.strictEqual(view(),'mix','Back to my cube returns to the walkthrough');
  // Skip to the end: the cube is mixed up and still white up; the turn-over comes next.
  click($('#begMix [data-beg="mixEnd"]'));
  assert.strictEqual(w.begMix.i,n);
  assert.ok(/Your cube is mixed up/.test($('#begMix').textContent)&&/Next: yellow on top/.test($('#begMix').textContent));
  assert.ok(!$('#begMixCube polyline'),'no arrow at the end');
  assert.strictEqual(JSON.stringify(w.begMixCubeAt(n).toFacelets()),JSON.stringify(w.scr.cube.toFacelets()),'the mixed cube is the scramble, white up');
  // Start my solve: the guide, on the turn-over screen.
  click($('#begMix [data-beg="mixSolve"]'));
  assert.strictEqual(G().view,'guide');assert.ok($('#gdTurn'),'the turn-over screen first');assert.ok(!w.begMix.on);
  assert.ok($('#begBar').classList.contains('hidden'),'no bar for the guide itself');
  // A new seed from elsewhere ends a walkthrough.
  $('#gdDone').click();$('#gdDiff').click();click($('#tab-bsolve [data-beg="mix"]'));assert.strictEqual(view(),'mix');
  w.newScramble('home-other');assert.ok(!w.begMix.on,'another scramble ends the walkthrough');assert.strictEqual(view(),'home');assert.ok($('#tab-bsolve .st-card'),'the cards come back');
  // Stop.
  click($('#tab-bsolve [data-beg="mix"]'));click($('#begMix [data-beg="mixStop"]'));assert.strictEqual(view(),'home');assert.ok($('#tab-bsolve .st-card'));

  // The progress feeds Up next.
  w.goTab('learn');w.cycleStatus('beg-0');w.cycleStatus('beg-0');
  assert.strictEqual($('#begNextTitle').textContent,'The daisy');
  assert.ok(/Up next · Step 1 of 8/.test($('#tab-learn .lh-next').textContent));
  assert.ok($$('#tab-learn .lh-step')[1].classList.contains('cur'),'the next step is marked');
  assert.ok(/Learned/.test($$('#tab-learn .lh-step')[0].textContent)&&/1 of 9 learned/.test($('#tab-learn .lh-steps').textContent));
  assert.strictEqual($('#begContinue').textContent,'Start the daisy →');

  // Back to CFOP: the player shows as before, with no captions.
  w.setMethod('cfop');assert.ok(!$$('#scramble .mt').length,'CFOP tiles carry no captions');
  assert.ok($('#autoPlay').textContent.includes('Auto-step'));
  w.setMethod('beginner');assert.ok($('#autoPlay').textContent.includes('Show me'),'the beginner auto-step says Show me');

  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('home: up next, the steps, the cube line, letters, key, back to my cube, mix it up with me on Solve my cube, views ok');process.exit(0);
}catch(e){console.error('home: FAIL',e.message,errs,e.stack.split('\n').slice(1,4).join(' | '));process.exit(1);}});
