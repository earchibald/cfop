// The method chip: a first visit opens the chooser once, the chip switches between CFOP and the
// beginner method, each method keeps its own rail and tab, and the beginner player shows progress
// in place of the timer until "Time my solves".
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
// A fake localStorage (jsdom has none for file: pages), seeded with saved values.
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
  // ----- desktop -----
  let {w,d,errs}=await boot(false);
  const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
  const popOpen=()=>!$('#methodPop').classList.contains('hidden');
  // A first visit asks the cube level (js/start.js). Skip closes it; the chip opens the chooser.
  assert.ok(d.body.classList.contains('starting')&&!popOpen(),'a first visit asks the cube level, not the method');
  assert.strictEqual($$('#start .st-level').length,4,'four levels');
  $('#start [data-close]').click();assert.ok(!d.body.classList.contains('starting'),'Skip closes the level page');
  $('#methodChip').click();
  assert.ok(popOpen(),'the chip opens the method chooser');assert.ok(d.body.classList.contains('pop-open'),'the page behind the chooser is locked');
  assert.strictEqual($('#methodChip').getAttribute('aria-expanded'),'true');
  assert.ok($('#methodLevel')&&/Not set/.test($('#methodLevel').textContent),'the chooser shows the level row');
  assert.strictEqual(d.body.dataset.method,'cfop','CFOP until a method is chosen');
  assert.strictEqual($('#methodName').textContent,'CFOP');
  assert.ok($('#methodPop .mcard[data-method="cfop"]').classList.contains('on'),'the current card is marked');
  assert.strictEqual($$('#methodPop .mcard').length,6,'three puzzles, two methods each');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.ok(!popOpen(),'Escape closes the chooser');assert.ok(!d.body.classList.contains('pop-open'),'and unlocks the page');
  $('#methodChip').click();assert.ok(popOpen(),'the chip opens it again');
  $('#methodPop .mcard[data-method="beginner"]').click();
  assert.ok(!popOpen(),'a card closes the chooser');
  assert.strictEqual(d.body.dataset.method,'beginner');assert.strictEqual($('#methodName').textContent,'Beginner');
  assert.strictEqual(JSON.parse(w.localStorage.getItem('cw:method')),'beginner','the method is saved');
  assert.strictEqual(d.body.dataset.tab,'learn','the beginner home is Learn');
  assert.ok($('#tab-learn').classList.contains('on'));
  assert.strictEqual($$('#brail button').length,5,'five beginner tabs');
  assert.ok($('#brail button[data-tab="learn"]').classList.contains('on'));
  assert.strictEqual(d.body.dataset.begview,'home','the beginner home: no moves are loaded, no player');
  assert.ok(!/z2/.test($('#seqLabel').textContent),'no hidden z2: a beginner holds the cube white up');
  assert.ok(/white on top/.test($('#seqLabel').textContent),'the label says white on top');
  // The beginner player: progress, no timer, until Time my solves.
  assert.strictEqual($('#progSq').children.length,8,'eight progress squares');
  assert.ok(/No steps finished/.test($('#progText').textContent));
  assert.ok(/Basics/.test($('#progNext').textContent),'up next is the basics');
  assert.ok(!d.body.dataset.begtimer,'no timer at first');
  const key=(type,k,code)=>d.dispatchEvent(new w.KeyboardEvent(type,{key:k,code:code||k,bubbles:true,cancelable:true}));
  key('keydown',' ','Space');key('keyup',' ','Space');assert.ok(!$('#timer').classList.contains('run'),'space does not start a hidden timer');
  assert.ok(w.auto.timer,'space plays the moves in beginner mode');key('keydown',' ','Space');key('keyup',' ','Space');assert.ok(!w.auto.timer,'space again pauses');
  // Animation: on by default, one setting for every method.
  assert.strictEqual($('#animBtn').getAttribute('aria-pressed'),'true','animation is on by default');
  w.seqGo(0);w.seqGo(1);assert.ok(w.anim.move,'one step forward turns the layer');
  await sleep(600);assert.ok(!w.anim.move,'the turn ends');assert.ok(w.eval('displayedCube').toFacelets().join()===w.cubeAtSeq(1).toFacelets().join(),'the picture lands on the cube after the move');
  w.seqGo(0);assert.strictEqual(w.anim.move,w.invertAlg([w.seqState.moves[0]]),'one step back turns the layer the other way');
  w.seqGo(6);assert.ok(!w.anim.move,'a jump does not animate');
  key('keydown','a');assert.strictEqual($('#animBtn').getAttribute('aria-pressed'),'false','A turns animation off');
  w.seqGo(7);assert.ok(!w.anim.move,'no turn when off');
  $('#progTimer').click();assert.strictEqual(d.body.dataset.begtimer,'1','Time my solves shows the timer');
  $('#timerBack').click();assert.ok(!d.body.dataset.begtimer,'Progress brings the panel back');
  // Status buttons for the steps feed the panel.
  w.cycleStatus('beg-1');assert.ok($('#progSq').children[0].classList.contains('learning'),'a learning step is yellow');
  w.cycleStatus('beg-1');assert.ok($('#progSq').children[0].classList.contains('finished'),'a finished step is green');
  assert.ok(/1 step finished/.test($('#progText').textContent));
  // Keys 1 to 5 pick beginner tabs; the keys card says so.
  key('keydown','3');assert.strictEqual(d.body.dataset.tab,'practice','key 3 opens Practice');
  $('#helpBtn').click();assert.ok(/–<span class="kbd">5<\/span>/.test($('#helpBox').innerHTML),'the keys card counts five tabs');
  assert.ok(!/timer/.test($('#helpBox').textContent)&&/play, pause/.test($('#helpBox').textContent),'no timer row in beginner mode; space plays');
  assert.ok(/Home/.test($('#helpBox').textContent)&&/five moves/.test($('#helpBox').textContent),'the card lists Home, End and the jump');
  assert.ok(/\?/.test($('#helpBox').textContent),'the card lists the ? key');
  $('#helpBtn').click();assert.ok($('#helpBox').classList.contains('hidden'),'the button closes the card');
  key('keydown','?');assert.ok(!$('#helpBox').classList.contains('hidden'),'? opens the keys card');
  key('keydown','?');assert.ok($('#helpBox').classList.contains('hidden'),'? again closes it');
  // Each method remembers its tab.
  w.goTab('progress');w.setMethod('cfop');assert.strictEqual(d.body.dataset.tab,'solve','CFOP returns to its tab');
  w.goTab('f2l');w.setMethod('beginner');assert.strictEqual(d.body.dataset.tab,'progress','the beginner method returns to its tab');
  w.setMethod('cfop');assert.strictEqual(d.body.dataset.tab,'f2l');
  assert.strictEqual($('#animBtn').getAttribute('aria-pressed'),'false','the setting turned off in beginner mode holds in CFOP');
  assert.ok(/timer/.test(w.helpHTML()),'the CFOP keys card has the timer row');
  $('#animBtn').click();assert.strictEqual($('#animBtn').getAttribute('aria-pressed'),'true','the chip turns it on');
  w.setMethod('beginner');assert.strictEqual($('#animBtn').getAttribute('aria-pressed'),'true','and it is on in beginner mode too');
  w.setMethod('cfop');$('#animBtn').click();
  assert.ok(!/z2/.test($('#seqLabel').textContent)||$('#crossColor').value==='white','CFOP follows the cross color');
  // Progress counts persist.
  w.begProgress.solved();w.begProgress.practiced(3);
  const prog=JSON.parse(w.localStorage.getItem('cw:begProg'));assert.strictEqual(prog.solves,1);assert.strictEqual(prog.steps[3],1);
  assert.deepStrictEqual(errs,[],'no script errors');
  // ----- a second visit: no chooser, the saved method and tab boot -----
  ({w,d,errs}=await boot(false,{'cw:method':'"beginner"','cw:btab':'"cheat"'}));
  assert.ok($('#methodPop').classList.contains('hidden'),'no chooser on a second visit');
  assert.strictEqual(d.body.dataset.method,'beginner','the saved method boots');
  assert.strictEqual(d.body.dataset.tab,'cheat','the saved beginner tab comes back');
  assert.deepStrictEqual(errs,[],'no script errors on the second visit');
  // ----- phone -----
  ({w,d,errs}=await boot(true));
  w.setMethod('beginner');
  assert.strictEqual(d.body.dataset.tab,'learn','Learn is the phone home');
  assert.ok($('#begNextTitle')&&$('#tab-learn .lh-steps'),'the phone home shows Up next and the steps');
  $('#menuBtn').click();assert.strictEqual($$('#menu button').length,5,'the phone menu lists the five beginner tabs');
  assert.deepStrictEqual(errs,[],'no script errors on the phone');
  console.log('method: chooser, chip, rails, progress panel, timer toggle, tab memory ok');process.exit(0);
}catch(e){console.error('method: FAIL',e.message);process.exit(1);}})();
