// Practice and Progress: pick a step, New cube dashes the steps solved for you, Reveal shows the
// moves, a row loads the player, Solved it counts a round, and the Progress tab shows the counts,
// a status button per step, and a reset that zeroes the counts.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');const assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/<link[^>]*fonts[^>]*>/g,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>{if(!/CSS|Not implemented/.test(e.message))errs.push(e.message);});
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,url:'file://'+path.join(__dirname,'..','index.html'),virtualConsole:vc,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.scrollTo=()=>{};}});
const w=dom.window;const d=w.document;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
const $=s=>d.querySelector(s),$$=s=>[...d.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const click=el=>{assert.ok(el,'nothing to click');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));};
const label=()=>$('#seqLabel').textContent;
const key=(type,k,code)=>d.dispatchEvent(new w.KeyboardEvent(type,{key:k,code:code||k,bubbles:true,cancelable:true}));

w.addEventListener('load',async()=>{try{
  await sleep(100);
  w.setMethod('beginner');w.goTab('practice');
  assert.ok($('#tab-practice').classList.contains('on'),'the Practice tab is on');

  // Eight step buttons, choose step 3.
  assert.strictEqual($$('#prSteps button').length,8,'eight step buttons');
  click($('#prSteps button[data-n="3"]'));
  assert.ok($('#prSteps button[data-n="3"]').classList.contains('on'),'step 3 is on');

  // New cube: the player dashes steps 1 and 2, the base is the daisy-and-cross cube for step 3.
  click($('#prNew'));
  assert.ok(label().includes('steps 1 to 2'),'the label names steps 1 to 2: '+label());
  const n=w.scr.moves.length;
  const tiles=$$('#scramble .m');
  assert.ok(tiles.length>n,'the player holds more than the scramble moves');
  assert.ok(tiles.slice(n).every(t=>t.classList.contains('rot')),'every move after the scramble is dashed');
  assert.ok(tiles.slice(0,n).every(t=>!t.classList.contains('rot')),'the scramble moves themselves are not dashed');

  // The practice cube: the white cross is done, the cube is not solved.
  const full=w.cubeAtSeq(w.seqState.moves.length);
  const f=full.toFacelets();
  assert.strictEqual(f[28],f[31]);assert.strictEqual(f[30],f[31]);assert.strictEqual(f[32],f[31]);assert.strictEqual(f[34],f[31]);
  assert.ok(!full.isSolved(),'the cube is not solved after steps 1 and 2');

  // Reveal: at least one part row with moves.
  assert.ok(!$('#prGoal .pr-row'),'no rows before Reveal');
  click($('#prReveal'));
  const rows=$$('#prGoal .pr-row');
  assert.ok(rows.length>=1,'at least one part row');
  assert.ok($$('#prGoal .pr-row .ms .m').length>=1,'a row shows move tiles');

  // A row click loads the player with a practice label.
  click(rows[0]);
  assert.ok(label().startsWith('practice'),'the label starts with practice: '+label());

  // Solved it: counts a round and starts a new cube.
  assert.strictEqual(w.begProgress.data().practiced,0);
  click($('#prSolved'));
  assert.strictEqual(w.begProgress.data().practiced,1,'one round practiced');
  assert.ok(label().includes('steps 1 to 2'),'Solved it starts a new cube on the same step');

  // The Progress tab: the practiced tile and a status button per step.
  w.goTab('progress');
  assert.ok($('#tab-progress').classList.contains('on'));
  assert.strictEqual($('#prPract').textContent,'1','the practiced tile shows 1');
  assert.strictEqual($$('#prTable .stbtn').length,9,'a status button for Basics and steps 1 to 8');

  // startPractice(5): switches to Practice, step 5 on, a new cube dashing steps 1 to 4.
  w.startPractice(5);
  assert.strictEqual(d.body.dataset.tab,'practice','startPractice goes to Practice');
  assert.ok($('#prSteps button[data-n="5"]').classList.contains('on'),'step 5 is on');
  assert.ok(label().includes('steps 1 to 4'),'the label names steps 1 to 4: '+label());

  // Reset: a themed confirm dialog; Enter resets the practiced count to zero.
  w.goTab('progress');
  click($('#prReset'));
  assert.ok($('#askBg'),'the reset dialog opens');
  assert.ok($('#askTitle').textContent.includes('Reset'),'the dialog names the action');
  key('keydown','Enter');
  assert.ok(!$('#askBg'),'Enter closes the dialog');
  assert.strictEqual(w.begProgress.data().practiced,0,'the practiced count is reset');
  assert.strictEqual($('#prPract').textContent,'0','the Progress tab follows');

  assert.deepStrictEqual(errs,[],'no script errors');
  console.log('practice: step picker, new cube, reveal, row play, solved it, progress, reset ok');process.exit(0);
}catch(e){console.error('practice: FAIL',e.message,errs);process.exit(1);}});
