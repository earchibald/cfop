// The 4×4 in the page: the chooser offers it, the beginner method reuses the beginner tabs with
// the Master guide's ten steps and a 4×4 picture, paint takes 96 tiles, and the advanced section
// plans, drills parity and references.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
function fakeStorage(seed){const m=new Map(Object.entries(seed||{}));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),map:m};}
function boot(mobile,seed){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
    beforeParse(w){w.matchMedia=q=>({matches:mobile&&/760/.test(q),addEventListener(){},addListener(){}});w.scrollTo=()=>{};Object.defineProperty(w,'localStorage',{value:fakeStorage(seed)});}});
  const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
  return new Promise(res=>w.addEventListener('load',()=>setTimeout(()=>res({w,d:w.document,errs}),500)));
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  let {w,d,errs}=await boot(false,{'cw:method':'"cfop"'});
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];const ev=s=>w.eval(s);
  const click=el=>{assert.ok(el,'element to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};
  const stickers=()=>$$('#cube polygon').filter(p=>p.getAttribute('stroke')).length;
  assert.strictEqual($$('#methodPop .mcard').length,6,'three puzzles, two methods each');
  const scr3=w.scr.moves.join(' ');
  // ----- 4×4 beginner -----
  click($('#methodPop .mcard[data-method="master"]'));
  assert.strictEqual(d.body.dataset.method,'master');assert.strictEqual(d.body.dataset.kind,'beg');assert.strictEqual(d.body.dataset.puzzle,'4x4');
  assert.strictEqual($('#puzzleName').textContent,'4×4 ·');assert.strictEqual(d.body.dataset.tab,'learn');
  assert.deepStrictEqual($$('#scrLen option').map(o=>o.textContent),['30','40','50']);
  assert.ok(w.scr.moves.length===40&&w.scr.moves.every(m=>/^(?:[UDLRFB]|Uu|Rr|Ff)['2]?$/.test(m)),'a 4×4 scramble: '+w.scr.moves.join(' '));
  assert.ok(w.scr.cube.isFour,'the scramble state is a 4×4');
  assert.strictEqual($('#progSq').children.length,10,'ten progress squares');
  assert.strictEqual($$('#tab-learn .bstep').length,11,'Basics plus ten steps in Learn');assert.ok(/the ten steps/.test($('#tab-learn').textContent));
  assert.ok($$('#begAsk .face.f4').length===2,'4×4 face thumbs');assert.ok($('#begAsk [data-beg="scan"]'),'the 4×4 home offers the camera');
  click($('#begAsk [data-beg="letters"]'));w.seqGo(w.seqState.moves.length);assert.strictEqual(stickers(),48,'a 4×4 shows 48 stickers');
  assert.ok($$('#scramble .mt small').some(el=>/2 layers|inside/.test(el.textContent)),'captions name the two-layer and inside turns');
  // the mix-up walkthrough names a wide turn
  click($('#begAsk [data-beg="mix"]'));assert.strictEqual(d.body.dataset.begview,'mix');const titles=[];for(let i=0;i<12;i++){titles.push($('#begMixTitle').textContent);click($('#begMix [data-beg="mixNext"]'));}
  assert.ok(titles.some(t=>/two layers|inside/.test(t)),'the walkthrough says "two layers" or "inside": '+titles.join(' / '));click($('#begMix [data-beg="mixStop"]'));
  // a lesson with the guide's own algorithm, and the basics with three kinds of piece
  w.openLesson(1);assert.ok(/Step 1 of 10/.test($('#tab-learn .ln-of').textContent));assert.ok(/Rr/.test($('#tab-learn .ln-algs').textContent));
  click($$('#tab-learn [data-ln="alg"]')[0]);assert.ok(/Lesson/.test(w.seqState.drill));w.seqGo(w.seqState.moves.length);assert.ok(w.fourSolved(w.cubeAtSeq(w.seqState.moves.length).toFacelets()),'the algorithm drill ends on the solved cube');
  w.openLesson(0);assert.strictEqual($$('#tab-learn [data-ln="hl"]').length,3,'corners, center tiles and edge pieces light up');
  click($('#tab-learn [data-ln="face"][data-m="R"]'));assert.ok($('#tab-learn .turn-ring'),'a ring shows the turn on the 4×4 goal cube');
  w.openLesson(7);assert.ok(/parity/i.test($('#tab-learn').textContent),'the yellow cross lesson teaches the parity');
  // the guided solve, part by part to the end
  w.startGuide();assert.strictEqual(ev('guideState').view,'guide');assert.strictEqual($$('#gdBar .stage').length,10);assert.ok(/Stage 1 of 10/.test($('#gdWhere').textContent));
  const n=ev('guideState').parts.length;assert.ok(n>=30&&n<=80,'a plan of many parts: '+n);
  for(let i=0;i<n;i++)click($('#gdDone'));
  assert.strictEqual(ev('guideState').view,'done');assert.ok(/Try Advanced/.test($('#gdCfop').textContent));
  assert.ok(w.fourSolved(w.applyAlg(w.scr.cube,ev('guideState').plan.moves).toFacelets()),'the plan solves the scramble');
  assert.strictEqual(JSON.parse(w.localStorage.getItem('cw:masterProg')).solves,1);
  // practice, cheat sheet, status ids
  w.startPractice(2);assert.strictEqual($$('#prSteps button').length,10);click($('#prReveal'));assert.ok(/Goal/.test($('#prGoal').textContent));
  w.goTab('cheat');assert.strictEqual($$('#tab-cheat .ln-cs-step').length,10);assert.ok(/parity/i.test($('#tab-cheat').textContent));
  w.cycleStatus('master-1');assert.ok($('#progSq').children[0].classList.contains('learning'));
  // paint: 96 tiles, a painted cube is the mix-up
  w.openPaint();assert.strictEqual($$('#paintNet .pt-tile').length,96);assert.strictEqual($$('#paintNet .pt-center').length,0);
  const painted=w.fourApply(ev('FOUR_SOLVED'),"Rr U F' Uu2 R'");painted.forEach((c,i)=>{w.paintSelectColor(c);click($(`#paintNet .pt-tile[data-i="${i}"]`));});
  assert.ok(!$('#paintGo').disabled);click($('#paintGo'));assert.ok(!$('#paintBg'));
  assert.strictEqual(w.scr.cube.toFacelets().join(),painted.join(),'the painted cube is loaded');assert.strictEqual(w.scr.moves.length,0,'with no moves behind it');assert.strictEqual(d.body.dataset.tab,'bsolve');
  w.startGuide();assert.ok(ev('guideState').view==='guide'&&ev('guideState').plan.solved,'the painted cube gets a plan');
  // ----- 4×4 advanced -----
  w.setMethod('speed4');
  assert.strictEqual(d.body.dataset.kind,'speed');assert.strictEqual(d.body.dataset.tab,'fsolve');assert.strictEqual($('#methodName').textContent,'Advanced');
  assert.strictEqual($$('#frail button').length,3);assert.strictEqual(ev('timer').scope,'four');
  assert.strictEqual(w.scr.cube.toFacelets().join(),painted.join(),'the 4×4 scramble stays within the puzzle');
  click($('#fwPlan'));await sleep(1500);assert.ok($$('#fwPlanOut .step').length>=8,'a plan with centers, edges, hold, cross, pairs and the last layer');
  assert.ok(/Solve the centers/.test($('#fwPlanOut').textContent)&&/Cross/.test($('#fwPlanOut').textContent));
  click($('#fwLoad'));w.seqGo(w.seqState.moves.length);assert.ok(w.fourSolved(w.cubeAtSeq(w.seqState.moves.length).toFacelets()),'the loaded plan ends solved');
  w.goTab('parity');assert.strictEqual($$('#fwGrid .case').length,3);
  click($('#fwNext'));assert.strictEqual(w.seqState.drill,'4×4 case');assert.ok(/^four:/.test(ev('timer').scope));assert.ok(/\?/.test($('#fwCur').textContent));
  click($('#fwReveal'));assert.ok($('#fwCur .big'));click($('#fwPlay'));w.seqGo(w.seqState.moves.length);assert.ok(w.fourSolved(w.cubeAtSeq(w.seqState.moves.length).toFacelets()),'the answer solves the drill');
  click($('#fwGrid .case .stbtn'));assert.ok(/learning/.test($('#fwGrid .case .stbtn').textContent));
  click($('#drillBack'));assert.strictEqual(ev('timer').scope,'four');
  w.goTab('fref');assert.ok(/Yau/.test($('#tab-fref').textContent)&&$$('#tab-fref .rcard').length===3);
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'2',bubbles:true}));assert.strictEqual(d.body.dataset.tab,'parity');
  // back to the 3×3 and the 2×2: their own scrambles
  w.setMethod('cfop');assert.strictEqual(w.scr.moves.join(' '),scr3);assert.strictEqual(stickers(),27);
  w.setMethod('master');assert.strictEqual(w.scr.cube.toFacelets().join(),painted.join());
  assert.deepStrictEqual(errs,[],'no script errors');
  ({w,d,errs}=await boot(false,{'cw:method':'"speed4"'}));
  assert.strictEqual(d.body.dataset.method,'speed4');assert.ok(w.scr.cube.isFour,'boots with a 4×4 scramble');assert.deepStrictEqual(errs,[]);
  ({w,d,errs}=await boot(true,{'cw:method':'"master"'}));
  assert.strictEqual(d.body.dataset.tab,'learn');w.closeMenu();w.setMethod('speed4');$('#menuBtn').click();assert.strictEqual($$('#menu button').length,3,'the phone menu lists the three advanced tabs');
  assert.deepStrictEqual(errs,[],'no script errors on the phone');
  console.log('four-ui: chooser, 4×4 beginner (home, mix-up, learn, guide, practice, cheat sheet, paint), advanced (plan, parity drill, reference), scramble per puzzle ok');process.exit(0);
}catch(e){console.error('four-ui: FAIL',e.stack||e.message);process.exit(1);}})();
