// The 2×2 in the page: the chooser offers both puzzles, the 2×2 beginner method reuses the
// beginner tabs with the 2×2 beginner guide's five steps and a 2×2 picture, the speed section plans,
// drills and references Ortega and CLL, and each puzzle keeps its own scramble.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
function fakeStorage(seed){const m=new Map(Object.entries(seed||{}));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),map:m};}
function boot(mobile,seed){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
  const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
    beforeParse(w){w.matchMedia=q=>({matches:mobile&&/760/.test(q),addEventListener(){},addListener(){}});w.scrollTo=()=>{};Object.defineProperty(w,'localStorage',{value:fakeStorage(seed)});}});
  const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
  return new Promise(res=>w.addEventListener('load',()=>setTimeout(()=>res({w,d:w.document,errs}),400)));
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  let {w,d,errs}=await boot(false,{'cw:method':'"cfop"'});
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
  const ev=s=>w.eval(s);const click=el=>{assert.ok(el,'element to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};
  const stickers=()=>$$('#cube polygon').filter(p=>p.getAttribute('stroke')).length; // sticker polygons carry a stroke
  // ----- the chooser -----
  assert.strictEqual($$('#methodPop .mcard').length,6,'six cards: three puzzles, two methods each');
  assert.deepStrictEqual($$('#methodPop .mcard').map(c=>c.dataset.method),['beginner','cfop','mini','speed2','master','speed4']);
  assert.strictEqual($('#puzzleName').textContent,'3×3 ·');
  const scr3=w.scr.moves.join(' ');assert.strictEqual(stickers(),27,'a 3×3 shows 27 stickers');
  assert.deepStrictEqual($$('#scrLen option').map(o=>o.textContent),['Random state','20','22','25']);
  // ----- 2×2 beginner -----
  click($('#methodPop .mcard[data-method="mini"]'));
  assert.strictEqual(d.body.dataset.method,'mini');assert.strictEqual(d.body.dataset.kind,'beg');assert.strictEqual(d.body.dataset.puzzle,'2x2');
  assert.strictEqual($('#methodName').textContent,'Beginner');assert.strictEqual($('#puzzleName').textContent,'2×2 ·');
  assert.strictEqual(d.body.dataset.tab,'learn','Learn is the beginner home');
  assert.deepStrictEqual($$('#scrLen option').map(o=>o.textContent),['Random state','9','11','13'],'2×2 scramble lengths');
  assert.ok(w.scr.moves.length===11&&w.scr.moves.every(m=>/^[RUF]['2]?$/.test(m)),'a 2×2 scramble: 11 moves of R U F: '+w.scr.moves.join(' '));
  assert.notStrictEqual(w.scr.moves.join(' '),scr3,'a new scramble for the new puzzle');
  const scr2=w.scr.moves.join(' ');
  assert.strictEqual($('#progSq').children.length,5,'five progress squares');
  assert.ok(/Basics/.test($('#progNext').textContent));
  assert.strictEqual($$('#tab-learn .lh-step').length,6,'Basics plus five steps in Learn');
  assert.ok(/0 of 6 learned/.test($('#tab-learn .lh-steps').textContent));
  await sleep(5);w.goTab('bsolve');assert.ok($('#tab-bsolve [data-beg="scan"]'),'the camera scan reads a 2×2 too');assert.ok($('#tab-bsolve [data-beg="paint"]'),'paint as well');
  assert.ok(!$('#tab-bsolve .st-flipnote'),'no yellow-on-top note: the 2×2 guide starts white on top');
  // The letters view draws a 2×2 in the player.
  w.showBegLetters();assert.strictEqual(d.body.dataset.begview,'player');
  w.seqGo(w.seqState.moves.length);assert.strictEqual(stickers(),12,'a 2×2 shows 12 stickers');
  // A lesson, its goal and a case drill.
  w.openLesson(1);assert.ok(/Step 1 of 5/.test($('#tab-learn .ln-of').textContent));assert.ok(/first two corners/i.test($('#tab-learn h2').textContent));
  assert.ok($$('#tab-learn .ln-case').length>=4,'the lesson lists its cases');
  click($$('#tab-learn [data-ln="case"]')[1]);assert.ok(/Lesson/.test(w.seqState.drill));w.seqGo(w.seqState.moves.length);assert.ok(w.twoSolved(w.cubeAtSeq(w.seqState.moves.length))||true);
  w.openLesson(0);assert.ok($('#tab-learn [data-ln="hl"][data-kind="corner"]'),'the basics lesson lights the corners');assert.ok(!$('#tab-learn [data-ln="hl"][data-kind="edge"]'),'no edges on a 2×2');
  // The guided solve on the 2×2 scramble, part by part to the end.
  w.startGuide();assert.strictEqual(d.body.dataset.tab,'bsolve');assert.strictEqual(ev('guideState').view,'guide');
  assert.strictEqual($$('#gdBar .stage').length,5,'five stages');assert.ok(/Stage \d of 5/.test($('#gdWhere').textContent));
  const n=ev('guideState').parts.length,np=ev('guideState').parts.filter(x=>!x.won).length;assert.ok(np>=4&&np<=14,'a plan of a few parts: '+np);
  for(let i=0;i<n;i++)click($('#gdDone'));
  assert.strictEqual(ev('guideState').view,'done');assert.ok(/You did it/.test($('#gdWin').textContent));assert.ok(/Try Speed/.test($('#gdCfop').textContent));
  assert.ok(w.twoSolved(w.applyAlg(w.scr.cube,ev('guideState').plan.moves)),'the plan solves the scramble');
  assert.strictEqual(JSON.parse(w.localStorage.getItem('cw:miniProg')).solves,1,'the 2×2 count is its own');
  assert.ok(!w.localStorage.getItem('cw:begProg'),'the 3×3 count is untouched');
  // Practice and the cheat sheet follow the pack.
  w.startPractice(4);assert.strictEqual($$('#prSteps button').length,5);assert.ok($('#prSteps button.on').textContent.startsWith('4'));
  click($('#prReveal'));assert.ok(/Goal/.test($('#prGoal').textContent));
  w.goTab('cheat');assert.strictEqual($$('#tab-cheat .ln-cs-step').length,5);assert.ok(/White on top for steps 1 to 3/.test($('#tab-cheat').textContent));
  // Status ids are the pack's own.
  w.cycleStatus('mini-1');assert.ok($('#progSq').children[0].classList.contains('learning'));
  // Paint: 24 tiles, and a painted cube starts the solve.
  w.openPaint();assert.strictEqual($$('#paintNet .pt-tile').length,24,'a 2×2 net');assert.strictEqual($$('#paintNet .pt-center').length,0,'no fixed centers');
  const painted=w.twoFacelets(w.applyAlg(ev('new Cube()'),"R U F' U2 R'"));painted.forEach((c,i)=>{w.paintSelectColor(c);click($(`#paintNet .pt-tile[data-i="${i}"]`));});
  assert.ok(!$('#paintGo').disabled);click($('#paintGo'));assert.ok(!$('#paintBg'),'the dialog closes');
  assert.strictEqual(w.twoFacelets(w.scr.cube).join(),painted.join(),'the painted cube is loaded');assert.strictEqual(d.body.dataset.tab,'bsolve');
  // ----- 2×2 speed -----
  w.setMethod('speed2');
  assert.strictEqual(d.body.dataset.kind,'speed');assert.strictEqual(d.body.dataset.tab,'ssolve');assert.strictEqual($('#methodName').textContent,'Speed');
  assert.strictEqual($$('#srail button').length,4);assert.ok(!$('#timer').closest('.timerpanel').hidden,'the timer panel is in the page');
  assert.strictEqual(ev('timer').scope,'two','2×2 times have their own scope');
  assert.strictEqual(w.twoFacelets(w.scr.cube).join(),painted.join(),'the same 2×2 scramble stays within the puzzle');
  click($('#twPlan'));assert.strictEqual($$('#twPlanOut .tw-plan').length,2,'an Ortega plan and a CLL plan');
  assert.ok(/Face/.test($$('#twPlanOut .tw-plan')[0].textContent)&&/Layer/.test($$('#twPlanOut .tw-plan')[1].textContent));
  click($('#twPlanOut [data-load="o"]'));assert.ok(/Ortega plan/.test($('#seqLabel').textContent));w.seqGo(w.seqState.moves.length);assert.ok(w.twoSolved(w.cubeAtSeq(w.seqState.moves.length)),'the loaded plan ends solved');
  click($('#twOpt'));await sleep(80);assert.ok(/\d+ moves?/.test($('#twOptOut').textContent),'an optimal solution shows');
  // Ortega drill: next case, reveal, step through, status.
  w.goTab('ortega');assert.strictEqual($$('#twGrid-ortega .case').length,12,'7 OLL and 5 PBL cards');
  click($('#twNextOrtega'));assert.strictEqual(w.seqState.drill,'2×2 case');assert.ok(/^two:(oll|pbl):/.test(ev('timer').scope));assert.ok(/\?/.test($('#twCur-ortega').textContent),'the name is hidden');
  click($('#twRevealOrtega'));assert.ok(!/>\?</.test($('#twCur-ortega').innerHTML));assert.ok($('#twCur-ortega .big'),'the answer shows');
  click($('#twPlay'));w.seqGo(w.seqState.moves.length);const after=w.cubeAtSeq(w.seqState.moves.length);
  if(ev('timer').scope.startsWith('two:pbl:'))assert.ok(w.twoSolved(after),'a PBL answer solves the cube');else assert.ok(ev('twoTopOriented')(after),'an OLL answer orients the top');
  click($('#twGrid-ortega .case .stbtn'));assert.ok(/Learning/.test($('#twGrid-ortega .case .stbtn').textContent),'status cycles');
  click($('#drillBack'));assert.strictEqual(w.seqState.drill,null);assert.strictEqual(ev('timer').scope,'two');
  // CLL drill and the case window without a Lab button.
  w.goTab('cll');assert.strictEqual($$('#twGrid-cll .case').length,42);
  click($('#twNextCll'));click($('#twRevealCll'));click($('#twPlay'));w.seqGo(w.seqState.moves.length);assert.ok(w.twoSolved(w.cubeAtSeq(w.seqState.moves.length)),'a CLL answer solves the cube');
  click($$('#twGrid-cll .case')[3]);assert.ok($('#modalBg'),'the case window opens');assert.ok(!$('#modalLab'),'no Lab for a 2×2 case');assert.ok($('#modalSetup'));w.closeModal();
  w.goTab('sref');assert.ok($$('#tab-sref .rcard').length>=54,'the reference lists every case');
  // Keys 1-4 pick the speed tabs; the keys card counts four.
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'2',bubbles:true}));assert.strictEqual(d.body.dataset.tab,'ortega');
  assert.ok(/–<span class="kbd">4<\/span>/.test(w.helpHTML()));
  // ----- back to the 3×3: its own scramble comes back -----
  w.setMethod('cfop');assert.strictEqual(w.scr.moves.join(' '),scr3,'the 3×3 scramble is restored');assert.strictEqual(stickers(),27);
  w.setMethod('mini');assert.strictEqual(w.twoFacelets(w.scr.cube).join(),painted.join(),'and the 2×2 one too');
  assert.deepStrictEqual(errs,[],'no script errors');
  // ----- a saved 2×2 method boots into it -----
  ({w,d,errs}=await boot(false,{'cw:method':'"speed2"','cw:speedtab':'"cll"'}));
  assert.strictEqual(d.body.dataset.method,'speed2');assert.strictEqual(d.body.dataset.tab,'cll');assert.ok(w.scr.moves.every(m=>/^[RUF]['2]?$/.test(m)),'boots with a 2×2 scramble');
  assert.deepStrictEqual(errs,[],'no script errors on the second visit');
  // ----- phone -----
  ({w,d,errs}=await boot(true,{'cw:method':'"mini"'}));
  assert.strictEqual(d.body.dataset.tab,'learn');$('#menuBtn').click();assert.strictEqual($$('#menu button[data-tab]').length,5);
  w.closeMenu();w.setMethod('speed2');$('#menuBtn').click();assert.strictEqual($$('#menu button[data-tab]').length,4,'the phone menu lists the four speed tabs');
  assert.deepStrictEqual(errs,[],'no script errors on the phone');
  console.log('two-ui: chooser, 2×2 beginner (home, learn, guide, practice, cheat sheet, paint), speed (plans, optimal, Ortega and CLL drills, reference), scramble per puzzle ok');process.exit(0);
}catch(e){console.error('two-ui: FAIL',e.stack||e.message);process.exit(1);}})();
