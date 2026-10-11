// The beginner home: Up next, Your cube, Mix it up with me, the letters view, the player dress
// (captions, the Key panel, Back to my cube), and the three views ask / mix / player.
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
  // CFOP: no home, no captions, no Key.
  assert.ok(!$$('#scramble .mt').length,'CFOP tiles carry no captions');
  assert.ok($('#begNext').innerHTML.length>0,'the home is rendered even while hidden');

  w.setMethod('beginner');
  assert.strictEqual(d.body.dataset.tab,'learn');
  assert.strictEqual(view(),'ask','the home opens on the question');
  assert.ok(!/z2/.test(label()),'no hidden z2');
  // Up next.
  assert.strictEqual($('#begNextTitle').textContent,'Basics: Get to know your cube');
  assert.ok(/No cube needed yet/.test($('#begNextText').textContent));
  assert.strictEqual($$('#begNext .psq i').length,8,'eight squares');
  assert.ok(/0 of 8 steps finished/.test($('#begNext').textContent));
  // Your cube.
  assert.ok(/What does your cube look like right now\?/.test($('#begAsk h2').textContent));
  assert.ok(/White on top, green facing you/.test($('#begAsk').textContent),'the hold line says white on top');
  assert.ok($('#begAsk svg polygon'),'a cube picture');
  assert.strictEqual($$('#begAsk .beg-card').length,2,'two cards');
  assert.ok($('#begAsk .primary[data-beg="scan"]'),'Scan is the first choice on the first card');
  assert.ok($('#begAsk [data-beg="paint"]')&&!$('#begAsk [data-beg="paint"]').disabled,'Paint is on');
  assert.ok($('#begAsk .primary[data-beg="mix"]'),'Mix it up with me');
  assert.ok($('#begAsk [data-beg="screen"]'),'Practice on the screen only');
  assert.ok($('#begAsk [data-beg="letters"]'),'Show the scramble as letters');
  // Continue opens the lesson; the home hides inside a lesson and comes back with the list.
  click($('#begContinue'));
  assert.strictEqual(d.body.dataset.lesson,'1','Continue opens the basics lesson');
  assert.strictEqual($('#tab-learn h2').textContent,'Get to know your cube');
  click($('#tab-learn button[data-ln="list"]'));assert.ok(!d.body.dataset.lesson);
  // Pick another step stays on the list.
  click($('#begPick'));assert.strictEqual(d.body.dataset.tab,'learn');assert.ok(!d.body.dataset.lesson);

  // The letters view: the player with the scramble white up, the seed bar, and a way back.
  click($('#begAsk [data-beg="letters"]'));
  assert.strictEqual(view(),'player','letters shows the player');
  assert.ok(d.body.hasAttribute('data-begletters'),'the seed bar is on in the letters view');
  assert.strictEqual(moves().join(' '),w.scr.moves.join(' '),'the player holds the scramble moves, nothing more');
  assert.ok(/white on top/.test(label()));
  assert.strictEqual(w.cubeAtSeq(0).toFacelets()[4],0,'the cube starts white up');
  assert.strictEqual(caps().length,moves().length,'a caption under every tile');
  moves().forEach((m,i)=>assert.strictEqual(caps()[i],faceWord[m[0]]+' '+(m.length===1?'↻':m[1]==="'"?'↺':'×2'),'caption for '+m));
  assert.ok(/Your cube as letters/.test($('#begBar').textContent),'the bar names the view');
  assert.ok($('#begSolveNow'),'the bar offers to solve it');
  // New in the seed bar keeps the letters view.
  $('#newSeed').click();assert.strictEqual(view(),'player','New keeps the letters view');assert.ok(d.body.hasAttribute('data-begletters'));
  click($('#begBack'));
  assert.strictEqual(view(),'ask','Back to my cube returns to the question');
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
  assert.strictEqual(view(),'player');assert.deepStrictEqual(moves(),["D'","R'",'D','R']);
  assert.deepStrictEqual(caps(),['bottom ↺','right ↺','bottom ↻','right ↻'],'captions in words');
  assert.ok(/Lesson: Corner in, right/.test($('#begBar').textContent)&&/Your own cube is kept/.test($('#begBar').textContent),'the bar names the drill');
  assert.ok(!d.body.hasAttribute('data-begletters'),'no seed bar for a drill');
  click($('#begBack'));assert.strictEqual(view(),'ask','Back to my cube ends the drill');assert.ok(!w.seqState.drill);
  click($('#tab-learn button[data-ln="list"]'));

  // Mix it up with me: a new scramble, one turn at a time, in words.
  const seed0=w.scr.seed;
  click($('#begAsk [data-beg="mix"]'));
  assert.strictEqual(view(),'mix','the walkthrough replaces the question');
  assert.notStrictEqual(w.scr.seed,seed0,'a fresh mix-up');
  const ms=w.begMix.moves;assert.strictEqual(ms.join(' '),w.scr.moves.join(' '),'the walkthrough follows the scramble');
  const n=ms.length;assert.ok(n>=20);
  assert.ok(new RegExp('Turn 1 of '+n).test($('#begMix').textContent));
  assert.strictEqual(mixTitle(),`Turn the ${faceWord[ms[0][0]]} face`+(ms[0].endsWith('2')?' twice':ms[0].endsWith("'")?' the other way':''));
  assert.ok($('#begMix .beg-tile').textContent===ms[0]);
  assert.ok($('#begMixCube polyline'),'an arrow on the picture');
  assert.ok($$('#begMixCube polygon[opacity]').length>0,'the other faces are dim');
  assert.ok(new RegExp(ms[0][0]+"' with a mark means counterclockwise").test($('#begMix').textContent),'the key line uses this letter');
  assert.ok($('#begMix [data-beg="mixBack"]').disabled,'no Back at turn 1');
  // Next, Back, and the cube state behind the picture.
  click($('#begMix [data-beg="mixNext"]'));await sleep(600);
  assert.strictEqual(w.begMix.i,1);assert.ok(new RegExp('Turn 2 of '+n).test($('#begMix').textContent));
  assert.strictEqual(mixTitle(),`Turn the ${faceWord[ms[1][0]]} face`+(ms[1].endsWith('2')?' twice':ms[1].endsWith("'")?' the other way':''));
  assert.deepStrictEqual(w.begMixCubeAt(1).toFacelets(),w.applyAlg(w.begMixCubeAt(0),[ms[0]]).toFacelets(),'turn 1 applied');
  click($('#begMix [data-beg="mixBack"]'));assert.strictEqual(w.begMix.i,0,'Back goes back a turn');
  // Letters from the walkthrough, and back into it.
  click($('#begMix [data-beg="letters"]'));assert.strictEqual(view(),'player');assert.strictEqual(moves().join(' '),ms.join(' '));
  click($('#begBack'));assert.strictEqual(view(),'mix','Back to my cube returns to the walkthrough');
  // A tab change keeps the walkthrough.
  w.goTab('practice');assert.strictEqual(view(),'mix');w.goTab('learn');assert.strictEqual(view(),'mix');
  // Skip to the end: the cube is mixed up and still white up.
  click($('#begMix [data-beg="mixEnd"]'));
  assert.strictEqual(w.begMix.i,n);
  assert.ok(/Your cube is mixed up\. Keep holding it white on top\./.test($('#begMix').textContent));
  assert.ok(!$('#begMixCube polyline'),'no arrow at the end');
  assert.deepStrictEqual(w.begMixCubeAt(n).toFacelets(),w.scr.cube.toFacelets(),'the mixed cube is the scramble, white up');
  assert.ok($('#begMix [data-beg="mixSolve"]')&&$('#begMix [data-beg="mixLearn"]'));
  // Learn first: the question comes back and knows the cube.
  click($('#begMix [data-beg="mixLearn"]'));
  assert.strictEqual(d.body.dataset.lesson,'1','Learn first opens the basics');
  click($('#tab-learn button[data-ln="list"]'));
  assert.strictEqual(view(),'ask');assert.ok(!w.begMix.on);
  assert.ok(/Your mixed-up cube is loaded/.test($('#begAsk').textContent),'the question remembers the mixed-up cube');
  assert.ok($('#begAsk [data-beg="solveNow"]'));
  // Solve it: the guide at part 1, the turn-over first.
  click($('#begAsk [data-beg="solveNow"]'));
  assert.strictEqual(d.body.dataset.tab,'bsolve');assert.strictEqual(view(),'player');
  assert.strictEqual(G().view,'guide');assert.strictEqual(G().i,0);
  assert.strictEqual(moves()[0],'z2');assert.strictEqual(caps()[0],'turn over');
  assert.strictEqual(moves().length,1+G().parts[0].seq.length-1);
  assert.ok($('#begBar').classList.contains('hidden'),'no bar for the guide itself');
  // Mix it up with me from the Solve my cube entry too, and Start solving from the end.
  $('#gdDiff').click();assert.strictEqual(view(),'ask');
  click($('#tab-bsolve [data-beg="mix"]'));assert.strictEqual(view(),'mix');
  click($('#begMix [data-beg="mixEnd"]'));click($('#begMix [data-beg="mixSolve"]'));
  assert.strictEqual(G().view,'guide');assert.strictEqual(view(),'player');assert.ok(!w.begMix.on);
  // A new seed from elsewhere ends a walkthrough.
  $('#gdDiff').click();click($('#tab-bsolve [data-beg="mix"]'));assert.strictEqual(view(),'mix');
  w.newScramble('home-other');assert.ok(!w.begMix.on,'another scramble ends the walkthrough');assert.strictEqual(view(),'ask');
  // Stop.
  click($('#tab-bsolve [data-beg="mix"]'));click($('#begMix [data-beg="mixStop"]'));assert.strictEqual(view(),'ask');

  // Practice on the screen only from the home.
  w.goTab('learn');const s1=w.scr.seed;click($('#begAsk [data-beg="screen"]'));
  assert.notStrictEqual(w.scr.seed,s1);assert.strictEqual(d.body.dataset.tab,'bsolve');assert.strictEqual(G().view,'guide');

  // The progress feeds Up next.
  w.cycleStatus('beg-0');w.cycleStatus('beg-0');
  assert.strictEqual($('#begNextTitle').textContent,'Step 1: The daisy');
  assert.ok($$('#begNext .psq i')[0].classList.contains('cur'),'the next step is marked');
  assert.strictEqual($('#begContinue').textContent,'Continue →');

  // Back to CFOP: the player shows as before, with no captions.
  w.setMethod('cfop');assert.ok(!$$('#scramble .mt').length,'CFOP tiles carry no captions');
  assert.ok($('#autoPlay').textContent.includes('Auto-step'));
  w.setMethod('beginner');assert.ok($('#autoPlay').textContent.includes('Show me'),'the beginner auto-step says Show me');

  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('home: up next, your cube, letters, key, back to my cube, mix it up with me, views ok');process.exit(0);
}catch(e){console.error('home: FAIL',e.message,errs);process.exit(1);}});
