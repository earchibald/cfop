// Learn and Cheat sheet: the nine step cards, Continue, a lesson with algorithms, cases and drills,
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
const cont=()=>$('#begContinue');
const nextTitle=()=>$('#begNextTitle').textContent;
const stepName=nx=>nx.n===0?'Basics':'Step '+nx.n;

w.addEventListener('load',async()=>{try{
  await sleep(100);
  w.setMethod('beginner');
  assert.strictEqual(d.body.dataset.tab,'learn','the beginner home is Learn');
  assert.ok($('#tab-learn').classList.contains('on'),'the Learn tab is on');
  assert.strictEqual($$('#tab-learn .bstep').length,9,'nine step cards');
  assert.strictEqual(nextTitle(),'Basics: Get to know your cube','Up next names the basics');
  assert.strictEqual(cont().textContent,'Start →','the first visit says Start');
  assert.ok(card(0).classList.contains('cur'),'the basics card is up next');
  assert.ok(/Corner in, left · Corner in, right/.test(card(3).textContent),'step 3 names its algorithms');
  assert.ok(/Moving Left · Moving Right/.test(card(4).textContent),'step 4 names its moves');
  assert.strictEqual(card(5).querySelector('.tag').textContent,'unlearned');
  assert.ok(!d.body.dataset.lesson,'no lesson open');

  // A lesson: header, algorithms, cases.
  click(card(3));
  assert.strictEqual($('#tab-learn h2').textContent,'The white corners','step 3 opens');
  assert.strictEqual(d.body.dataset.lesson,'1','the lesson flag is set');
  assert.ok(/Step 3 of 8/.test($('#tab-learn .ln-of').textContent));
  assert.strictEqual($$('#tab-learn .ln-algs .ln-box').length,4,'four algorithm boxes');
  assert.strictEqual($$('#tab-learn .ln-case').length,4,'four cases');
  assert.strictEqual($$('#tab-learn .ln-case button[data-ln="case"]').length,4,'each case has Show');
  assert.ok(!$('#tab-learn [data-ln="practice"]')&&!$('#tab-learn [data-ln="solve"]'),'no Practice or Solve my cube in a lesson');
  assert.ok(!$('#tab-learn .ln-text .ln-algs'),'step 3 keeps its algorithms in their own panel');

  // Show on the cube: Corner in, right, as a drill, from the start. Step 3 is held white up.
  click($('#tab-learn button[data-ln="alg"][data-id="cornerRight"]'));
  assert.deepStrictEqual(moves(),["D'","R'",'D','R'],'four moves in the player');
  assert.ok(drill(),'the drill note shows');
  assert.strictEqual($('#scrubPos').textContent,'0 / 4','the player starts at the first move');
  assert.ok(/Corner in, right/.test($('#seqLabel').textContent));
  assert.strictEqual(w.cubeAtSeq(0).toFacelets()[4],0,'the step 3 drill is held white up');
  // The drill starts from a solved cube with the algorithm undone: the moves end solved.
  const end=w.cubeAtSeq(4).toFacelets(),white=w.lnFrame(3).toFacelets();assert.deepStrictEqual(end,white,'the algorithm ends on the solved cube');
  // Why it works opens and closes.
  click($('#tab-learn button[data-ln="why"][data-id="cornerRight"]'));assert.ok($('#tab-learn .ln-why'),'Why it works opens');
  click($('#tab-learn button[data-ln="why"][data-id="cornerRight"]'));assert.ok(!$('#tab-learn .ln-why'),'Why it works closes');
  // A case: Show loads its moves. The last case has its own setup: a white corner on top in the wrong place.
  click($('#tab-learn button[data-ln="case"][data-i="0"]'));assert.deepStrictEqual(moves(),['D','L',"D'","L'"],'the first case loads its moves');assert.ok(drill());
  click($('#tab-learn button[data-ln="case"][data-i="3"]'));assert.deepStrictEqual(moves(),["R'","D'",'R']);
  {const f=w.cubeAtSeq(0).toFacelets();assert.ok(f.slice(0,9).every(x=>x===0),'white face on top');assert.ok(f[9]!==f[13]||f[20]!==f[22],'the top right corner is in the wrong place');}
  // No lesson has a button that loads the goal into the player.
  assert.ok(!$('#tab-learn button[data-ln="goal"]'),'no Show the goal button');
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
  assert.strictEqual(cont().textContent,'Continue →','after a status change the button says Continue');
  assert.ok(nextTitle().startsWith(stepName(nx)+':'),'Up next names the next step');

  // Mark finished on the basics: the next step moves on.
  click(cont());assert.strictEqual($('#tab-learn h2').textContent,'Get to know your cube','Continue opens the basics');
  assert.ok($('#tab-learn button[data-ln="moves"]'),'the basics show the six moves');
  assert.ok(/^Mark finished if this makes sense to you\. You can always come back!$/.test($('#tab-learn .ln-foot > div').textContent),'the basics ask if it makes sense');
  assert.strictEqual($('#tab-learn button[data-ln="moves"]').textContent,'Show the six moves on the cube at the top of the page');
  assert.deepStrictEqual($$('#tab-learn .ln-goals li').map(e=>e.textContent),['Learn the three kinds of pieces','How to hold the cube','The six moves'],'the goal is a list');
  assert.deepStrictEqual($$('#tab-learn .ln-act').map(e=>e.textContent),['centers','edges','corners'],'the three kinds of piece are actions');
  assert.ok(/Every step in the solution tells you how to hold the cube/.test($('#tab-learn .ln-text').textContent),'the How text is the short one');
  assert.ok($('#lnGoalSvg .ln-front'),'the goal picture marks the front');
  assert.strictEqual($$('#lnGoalSvg polygon.pc-center').length,3,'three centers in view carry their kind');
  click($('#tab-learn .ln-act[data-kind="edge"]'));assert.strictEqual($('#tab-learn .ln-pic').dataset.hl,'edge','tapping edges lights the edges');
  assert.strictEqual($$('#tab-learn .ln-mv').length,12,'twelve move tiles, a letter and its mark');
  assert.deepStrictEqual($$('#tab-learn .ln-faces li').map(li=>[...li.querySelectorAll('.ln-mv')].map(b=>b.textContent).join(' ')),['U U\'','D D\'','F F\'','B B\'','R R\'','L L\''],'one row per face');
  // A letter turns the layer on the goal cube, as the player does: no ring of arrows.
  const pts=()=>$$('#lnGoalSvg polygon').map(p=>p.getAttribute('points')).join('|'),fills=()=>$$('#lnGoalSvg polygon').map(p=>p.getAttribute('fill')).join('|');
  const goalPts=pts(),goalFills=fills();
  click($('#tab-learn .ln-mv[data-m="U\'"]'));assert.ok(w.lnTurn.on&&w.lnTurn.m==="U'",'a letter starts the turn');
  assert.strictEqual($('#tab-learn .ln-pic').dataset.turn,"U'",'the picture carries the move');assert.ok(!$('#lnGoalSvg .turn-ring'),'no ring of arrows');
  assert.ok(!$('#tab-learn .ln-pic').dataset.hl,'the piece highlight ends when a turn shows');
  assert.ok(/counterclockwise/.test($('#lnGoalCap').textContent),'the caption says which way');
  assert.strictEqual($$('#lnGoalSvg polygon[class]:not([opacity])').length,15,'the whole top layer stays bright: nine on top, three each on the front and right');
  click($('#tab-learn .ln-mv[data-m="L"]'));assert.ok(/hidden here/.test($('#lnGoalCap').textContent),'a hidden face says so');
  assert.strictEqual($$('#lnGoalSvg polygon.pc-center').length,3,'the cube keeps its view');
  assert.strictEqual($$('#lnGoalSvg polygon[class]:not([opacity])').length,6,'the left layer stays bright: three on the front, three on top');
  // The turn plays out: the layer is part way round, then the moved cube rests, then the goal returns by itself.
  // jsdom redraws the picture slowly on each frame, so the waits are generous.
  w.lnTurn.ms=600;w.lnTurn.rest=400;
  click($('#tab-learn .ln-mv[data-m="R"]'));await sleep(150);assert.ok(w.lnTurn.on&&w.lnTurn.raf,'the layer is turning');
  assert.notStrictEqual(pts(),goalPts,'the layer is part way round: the stickers have moved');
  await sleep(700);assert.ok(w.lnTurn.on&&!w.lnTurn.raf,'the turn is over and the cube rests');
  assert.strictEqual(pts(),goalPts,'the cube is at rest in its view');assert.notStrictEqual(fills(),goalFills,'it shows the cube after R');
  {const want=w.renderCube3D(w.applyAlg(w.lnGoals()[0],['R']).toFacelets(),{yaw:-32,pitch:28,scale:48,cx:200,cy:185,fade:w.lnLayer('R')}).match(/fill="[^"]*"/g).map(f=>f.slice(6,-1)).join('|');
    assert.strictEqual(fills(),want,'the picture is the goal cube after R, drawn by renderCube3D');}
  await sleep(600);assert.ok(!w.lnTurn.on&&$('#lnGoalSvg .ln-front')&&!$('#tab-learn .ln-pic').dataset.turn,'the goal returns by itself');
  assert.strictEqual(fills(),goalFills,'the goal is back');
  w.lnTurn.ms=900;w.lnTurn.rest=2000;
  click($('#tab-learn .ln-mv[data-m="D\'"]'));assert.ok(/hidden here/.test($('#lnGoalCap').textContent));
  w.lnRestoreGoal();assert.ok(!w.lnTurn.on&&$('#lnGoalSvg .ln-front')&&!$('#tab-learn .ln-pic').dataset.turn,'the picture returns');
  click($('#lnMark'));assert.strictEqual(w.begProgress.status(0),'finished','Mark finished sets the status');
  assert.strictEqual($('#tab-learn .stbtn').textContent,'finished','the lesson button follows');
  click($('#tab-learn button[data-ln="list"]'));nx=w.begProgress.next();
  assert.strictEqual(nx.n,1);assert.strictEqual(nextTitle(),'Step 1: The daisy');assert.ok(card(1).classList.contains('cur'));

  // The goal pictures come from a real solve: each step's goal holds.
  const g=w.lnGoals().map(c=>c.toFacelets());
  const D=[27,28,29,30,31,32,33,34,35];
  assert.ok([1,3,5,7].every(i=>g[1][i]===0),'step 1: a daisy of white edges on top');
  assert.ok([28,30,31,32,34].every(i=>g[2][i]===0),'step 2: a white cross on the bottom');
  assert.ok(D.map(i=>i-27).every(i=>g[3][i]===0),'step 3: the white face is complete, on top');
  assert.ok([1,2,4,5].every(f=>[3,4,5,6,7,8].every(p=>g[4][9*f+p]===g[4][9*f+4])),'step 4: two layers solved');
  assert.ok([1,3,4,5,7].every(i=>g[5][i]===3),'step 5: a yellow cross');
  assert.ok([0,1,2,3,4,5,6,7,8].every(i=>g[6][i]===3),'step 6: a yellow face');
  assert.ok(g.every((f,n)=>f[22]===2&&f[4]===(n===3?0:3)),'every goal is held yellow up, green in front, except step 3 white up');

  // The daisy: underlined words light pieces, two algorithms, and the goal shows how it is made.
  w.openLesson(1);await sleep(50);
  assert.strictEqual($$('#tab-learn .ln-text .ln-algs .ln-box').length,2,'the daisy algorithms sit under How');
  assert.ok(!$('#tab-learn .ln-case'),'the daisy has no case list: the demo shows the cases');
  assert.deepStrictEqual($$('#tab-learn .ln-act').map(e=>e.textContent),['yellow center','white edge','petal','top layer','middle layer','bottom layer'],'the daisy words are actions');
  const pic=()=>$('#tab-learn .ln-pic'),lit=()=>$$('#lnGoalSvg polygon.hl-on').length;
  click($('#tab-learn .ln-act[data-kind="ycenter"]'));assert.strictEqual(pic().dataset.hl,'on');assert.strictEqual(lit(),1,'the yellow center lights');
  click($('#tab-learn .ln-act[data-kind="wedges"]'));assert.strictEqual(lit(),6,'the four petals light: four on top, and the front and right tiles of two');
  click($('#tab-learn .ln-act[data-kind="top"]'));assert.strictEqual(lit(),15,'the top layer: nine on top, three on the front and the right');
  click($('#tab-learn .ln-act[data-kind="middle"]'));assert.strictEqual(lit(),6,'the middle layer: three on the front and the right');
  assert.deepStrictEqual($$('#tab-learn .ln-box > b').map(e=>e.textContent),['Bring it up','Flip the edge'],'F2 and the flip are algorithms');
  assert.ok(/bottom layer, white facing down/.test($('#tab-learn .ln-when').textContent),'each says when to use it');
  assert.deepStrictEqual($$('#lnDemoMoves .m').map(e=>e.textContent),['R',"U'",'F2',"R'",'U',"F'"],'the demo moves sit under the goal');
  assert.ok($('#lnDemoMoves').classList.contains('hidden'),'the goal is solved, so the moves stay hidden until the demo plays');
  assert.deepStrictEqual($$('#lnDemoMoves li:not(.grp)').map(li=>li.textContent),['RMove blue-white to Up.',"U'Turn the Up face to leave a space for red-white.",'F2Move red-white to Up.',"R'Move green-white down to the side.",'UTurn the Up face to leave a space for green-white.',"F'Move green-white to Up."],'each move says what it does');
  assert.strictEqual($('#lnDemoMoves li.grp b').textContent,'Flip the edge','the last three moves are the flip');
  w.lnDemo.ms=100;const goalF=w.lnGoals()[1].toFacelets();
  assert.ok($('#tab-learn .ln-pic button[data-ln="demo"]'),'Watch sits on the picture');assert.strictEqual($('#tab-learn button[data-ln="demo"]').textContent,'Watch');
  const scrolls=[];w.scrollTo=o=>scrolls.push(o);
  click($('#tab-learn button[data-ln="demo"]'));assert.ok(w.lnDemo.on);assert.ok(!$('#lnDemoMoves').classList.contains('hidden'),'Watch shows the moves');
  assert.strictEqual(scrolls.length,1,'Watch scrolls the picture to the top');assert.strictEqual(scrolls[0].behavior,'smooth');
  w.scrollTo=()=>{};
  assert.strictEqual($('#tab-learn button[data-ln="demo"]').textContent,'Skip');assert.ok(!pic().dataset.hl,'the highlight ends');
  assert.ok(/One petal/.test($('#lnGoalCap').textContent),'the demo starts with one petal');
  await sleep(120);assert.ok(/Middle layer/.test($('#lnGoalCap').textContent),'the first part says what it does');
  assert.ok($('#lnDemoMoves .m.cur'),'the move that turns is marked');
  await sleep(700);assert.ok(!w.lnDemo.on,'the demo ends');
  assert.ok(/the daisy/.test($('#lnGoalCap').textContent),'it ends on the daisy');
  assert.strictEqual($('#tab-learn button[data-ln="demo"]').textContent,'Watch','no Watch again');assert.ok(!$('#lnDemoMoves .m.cur'));
  click($('#tab-learn button[data-ln="demo"]'));click($('#tab-learn button[data-ln="demo"]'));assert.ok(!w.lnDemo.on,'Skip ends it');
  assert.strictEqual($('#tab-learn button[data-ln="demo"]').textContent,'Watch');assert.ok($('#lnGoalSvg .ln-front'),'the goal picture returns');assert.ok(/the daisy/.test($('#lnGoalCap').textContent),'Skip jumps to the end');
  w.lnDemo.ms=2000;
  {const ms=w.parseAlg(w.begPack().steps[1].demo.moves);assert.deepStrictEqual(w.applyAlg(w.applyAlg(w.lnGoals()[1],w.invertAlg(ms)),ms).toFacelets(),goalF,'the demo ends on the goal');}
  // The cheat sheet says when to use each daisy algorithm.
  assert.ok(/white facing down/.test(w.lnCheatHTML()),'the cheat sheet says when');

  // openLesson: an algorithm step.
  w.goTab('practice');w.openLesson(5);
  assert.strictEqual(d.body.dataset.tab,'learn','openLesson goes to Learn');
  assert.strictEqual($('#tab-learn h2').textContent,'The yellow cross');
  click($('#tab-learn button[data-ln="alg"][data-id="yellowCross"]'));
  assert.deepStrictEqual(moves(),['F','U','R',"U'","R'","F'"],'the algorithm loads');assert.ok(drill());

  // The glossary links "daisy" in the lesson text.
  w.openLesson(2);await sleep(150);
  assert.ok($('#tab-learn .gl[data-gl="daisy"]'),'daisy is a glossary link');
  assert.ok(!$('#tab-learn button .gl, #tab-learn .m .gl, #tab-learn h2 .gl, #tab-learn .tag .gl'),'no link inside a control or a move');

  // The cheat sheet: eight steps, Show loads an algorithm.
  w.goTab('cheat');assert.ok($('#tab-cheat').classList.contains('on'));
  assert.strictEqual($$('#tab-cheat .ln-cs-step').length,8,'eight step panels');
  click($('#tab-cheat button[data-cs="alg"][data-id="yellowEdges"]'));
  assert.strictEqual(moves().length,9,'the yellow edges algorithm loads');assert.ok(drill());
  assert.deepStrictEqual(w.cubeAtSeq(9).toFacelets(),w.lnFrame(8).toFacelets(),'it ends on the solved cube');

  // Show me CFOP switches the method.
  w.goTab('learn');assert.ok(!$('#tab-learn button[data-ln="list"]'),'the Learn rail button returns to the step list');click($('#tab-learn button[data-ln="next"]'));
  assert.strictEqual(d.body.dataset.method,'cfop','Show me CFOP switches');

  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('learn: step list, lessons, drills, status, goals, cheat sheet, glossary ok');process.exit(0);
}catch(e){console.error('learn: FAIL',e.message,errs);process.exit(1);}});
